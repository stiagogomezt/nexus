/**
 * NEXUS Finance — Natural Language Intent Builder
 * =====================================================
 * Uses Gemini to parse a natural language financial sentence into
 * a structured EntryIntent. Gemini's output is SCHEMA-VALIDATED before
 * being returned. Gemini NEVER writes to the database.
 *
 * Architecture:
 *  User text → Gemini (structured JSON output) → schema validation → PendingIntent
 */

import { parseDate, classifyCategory, parseAmount } from './parsers'
import type {
  PendingIntent,
  EntryLineItem,
  ExpenseLineItem,
  IncomeLineItem,
  InternalTransferLineItem,
  MissingField,
} from '@/types/ai-entry'
import type { Account } from '@/types'

// ─────────────────────────────────────────────────────────────
// GEMINI SCHEMA — what we ask Gemini to return
// ─────────────────────────────────────────────────────────────

interface GeminiOperation {
  op: 'EXPENSE' | 'INCOME' | 'INTERNAL_TRANSFER' | 'ACCOUNT_ADJUSTMENT'
  description: string
  amount_raw: string        // raw text, we parse the number ourselves
  category_hint?: string    // optional category hint
  source?: string           // for INCOME
  from_account?: string     // for INTERNAL_TRANSFER
  to_account?: string       // for INTERNAL_TRANSFER
  date_expression?: string  // "hoy", "ayer", "el 20 de septiembre", etc.
  is_recurring?: boolean
  notes?: string
}

interface GeminiParseOutput {
  operations: GeminiOperation[]
  ambiguous: boolean
  clarification_question?: string
}

// ─────────────────────────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────

const PARSE_SYSTEM_PROMPT = `Eres el parser de intenciones financieras de NEXUS Finance.
Tu ÚNICA tarea es convertir texto en español sobre movimientos financieros en un JSON estructurado.

REGLAS ESTRICTAS:
1. NUNCA inventes montos. Si no está claro, pon amount_raw como el fragmento original.
2. NUNCA calcules balances ni totales. Solo describe operaciones individuales.
3. NUNCA incluyas datos bancarios, contraseñas, cuentas externas.
4. Solo opera con: EXPENSE, INCOME, INTERNAL_TRANSFER, ACCOUNT_ADJUSTMENT.
5. Separa múltiples gastos en múltiples operaciones distintas.
6. Devuelve SIEMPRE JSON válido con el esquema exacto pedido.
7. Para category_hint usa SOLO estas categorías: vivienda, alimentacion, transporte, educacion, servicios, tecnologia, entretenimiento, compras, salud, suscripciones, otros.
8. Para date_expression captura exactamente lo que dijo el usuario: "hoy", "ayer", "el lunes", "el 20 de septiembre".

ESQUEMA DE RESPUESTA:
{
  "operations": [
    {
      "op": "EXPENSE|INCOME|INTERNAL_TRANSFER|ACCOUNT_ADJUSTMENT",
      "description": "descripción corta",
      "amount_raw": "el texto original del monto",
      "category_hint": "categoria (para EXPENSE)",
      "source": "fuente de ingreso (para INCOME)",
      "from_account": "cuenta origen (para INTERNAL_TRANSFER)",
      "to_account": "cuenta destino (para INTERNAL_TRANSFER)",
      "date_expression": "expresión de fecha como la dijo el usuario",
      "is_recurring": false,
      "notes": null
    }
  ],
  "ambiguous": false,
  "clarification_question": null
}

Si el texto no describe ningún movimiento financiero claro, devuelve:
{"operations":[],"ambiguous":true,"clarification_question":"¿Qué movimiento deseas registrar?"}`

// ─────────────────────────────────────────────────────────────
// INTENT BUILDER
// ─────────────────────────────────────────────────────────────

export async function buildIntentFromText(
  text: string,
  userAccounts: Account[],
  referenceDate?: string
): Promise<PendingIntent> {
  const today = referenceDate ? new Date(referenceDate) : new Date()
  const todayISO = today.toISOString().split('T')[0]

  // ── 1. Ask Gemini to parse the intent ──────────────────────
  let geminiOutput: GeminiParseOutput

  try {
    const geminiApiKey = process.env.GEMINI_API_KEY
    if (!geminiApiKey) {
      // Fallback: parse locally without Gemini
      geminiOutput = localFallbackParse(text, todayISO)
    } else {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: PARSE_SYSTEM_PROMPT }] },
            contents: [{ role: 'user', parts: [{ text }] }],
            generationConfig: {
              temperature: 0.1,
              topP: 0.8,
              maxOutputTokens: 1024,
              responseMimeType: 'application/json',
            },
          }),
        }
      )

      if (!response.ok) {
        geminiOutput = localFallbackParse(text, todayISO)
      } else {
        const data = await response.json()
        const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
        try {
          geminiOutput = JSON.parse(rawJson)
          if (!Array.isArray(geminiOutput.operations)) {
            geminiOutput = localFallbackParse(text, todayISO)
          }
        } catch {
          geminiOutput = localFallbackParse(text, todayISO)
        }
      }
    }
  } catch {
    geminiOutput = localFallbackParse(text, todayISO)
  }

  // ── 2. Convert Gemini operations to typed line items ───────
  const operations: EntryLineItem[] = []
  const missingFields: MissingField[] = []

  for (const op of geminiOutput.operations || []) {
    const amount = parseAmount(op.amount_raw || '')
    if (!amount || amount <= 0) {
      missingFields.push({ field: 'amount', message: `No se pudo interpretar el monto: "${op.amount_raw}"` })
      continue
    }

    const dateExpr = op.date_expression || 'hoy'
    const date = parseDate(dateExpr, today)

    if (op.op === 'EXPENSE') {
      const catRaw = op.category_hint || op.description || ''
      const classified = classifyCategory(catRaw)
      const item: ExpenseLineItem = {
        type: 'EXPENSE',
        description: op.description || 'Gasto',
        amount,
        category_name: classified.category,
        category_confidence: classified.confidence,
        date,
        payment_method: 'debit',
        is_essential: false,
        notes: op.notes || null || undefined,
      }
      operations.push(item)
    }

    if (op.op === 'INCOME') {
      const item: IncomeLineItem = {
        type: 'INCOME',
        description: op.description || 'Ingreso',
        amount,
        source: op.source || 'Otros',
        income_type: 'other',
        date,
        is_recurring: op.is_recurring ?? false,
        notes: op.notes || null || undefined,
      }
      if (!op.source) {
        missingFields.push({ field: 'source', message: 'No se especificó la fuente del ingreso. ¿De dónde proviene?' })
      }
      operations.push(item)
    }

    if (op.op === 'INTERNAL_TRANSFER') {
      const fromAcc = matchAccount(op.from_account, userAccounts)
      const toAcc = matchAccount(op.to_account, userAccounts)
      if (!fromAcc) {
        missingFields.push({ field: 'account', message: `No se encontró la cuenta de origen "${op.from_account || '—'}"` })
      }
      if (!toAcc) {
        missingFields.push({ field: 'account', message: `No se encontró la cuenta destino "${op.to_account || '—'}"` })
      }
      const item: InternalTransferLineItem = {
        type: 'INTERNAL_TRANSFER',
        description: op.description || `Transferencia ${op.from_account || ''} → ${op.to_account || ''}`,
        amount,
        from_account_id: fromAcc?.id || null,
        from_account_name: fromAcc?.name || op.from_account || '?',
        to_account_id: toAcc?.id || null,
        to_account_name: toAcc?.name || op.to_account || '?',
        date,
        notes: op.notes || null || undefined,
      }
      operations.push(item)
    }
  }

  // ── 3. Compute totals ──────────────────────────────────────
  let totalIncome = 0
  let totalExpense = 0
  for (const op of operations) {
    if (op.type === 'INCOME') totalIncome += op.amount
    if (op.type === 'EXPENSE') totalExpense += op.amount
  }

  // ── 4. Build preview lines ─────────────────────────────────
  const previewLines = buildPreviewLines(operations)

  const intentId = `intent-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`

  return {
    intent_id: intentId,
    original_text: text,
    operations,
    total_income: totalIncome,
    total_expense: totalExpense,
    net_change: totalIncome - totalExpense,
    missing_fields: missingFields,
    requires_clarification:
      geminiOutput.ambiguous === true || missingFields.length > 0,
    clarification_question:
      geminiOutput.clarification_question || undefined,
    preview_lines: previewLines,
    parsed_at: new Date().toISOString(),
    source: 'ai_quick_entry',
  }
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function matchAccount(name: string | undefined, accounts: Account[]): Account | null {
  if (!name) return null
  const lower = name.toLowerCase()
  return (
    accounts.find(
      (a) =>
        a.name.toLowerCase().includes(lower) || lower.includes(a.name.toLowerCase())
    ) || null
  )
}

function buildPreviewLines(ops: EntryLineItem[]): string[] {
  return ops.map((op) => {
    const fmt = (n: number) => `$${n.toLocaleString('es-CO')}`
    if (op.type === 'EXPENSE') {
      return `💸 Gasto — ${op.description} — ${fmt(op.amount)} (${op.category_name})`
    }
    if (op.type === 'INCOME') {
      return `💰 Ingreso — ${op.description} — ${fmt(op.amount)} (${op.source})`
    }
    if (op.type === 'INTERNAL_TRANSFER') {
      return `🔄 Transferencia — ${op.from_account_name} → ${op.to_account_name} — ${fmt(op.amount)}`
    }
    if (op.type === 'ACCOUNT_ADJUSTMENT') {
      return `⚖️ Ajuste — ${op.description} — ${fmt(op.amount)}`
    }
    return ''
  })
}

// ─────────────────────────────────────────────────────────────
// LOCAL FALLBACK PARSER (when Gemini is unavailable)
// Uses regex heuristics to detect EXPENSE / INCOME from simple phrases
// ─────────────────────────────────────────────────────────────

function localFallbackParse(text: string, todayISO: string): GeminiParseOutput {
  const ops: GeminiOperation[] = []
  const lower = text.toLowerCase()

  // 1. Detect global date expression
  let dateExpr = 'hoy'
  if (/\banteayer\b/.test(lower)) dateExpr = 'anteayer'
  else if (/\bayer\b/.test(lower)) dateExpr = 'ayer'
  else {
    const dateMatch = text.match(/\bel\s+(\d{1,2}\s+de\s+[a-záéíóú]+|\b(?:lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\b)/i)
    if (dateMatch) dateExpr = dateMatch[1]
  }

  // 2. Check for internal transfer pattern: "Pasé 200.000 de Bancolombia a Nequi"
  const transferMatch = text.match(
    /(?:^|\s)(?:pas[eé]|transfer[ií]|mov[ií])\s+(\$?[\d.,]+(?:\s*(?:mil(?:lones?)?|k))?)\s+de\s+([A-Za-z0-9áéíóúñÁÉÍÓÚÑ\s]+?)\s+a\s+([A-Za-z0-9áéíóúñÁÉÍÓÚÑ\s]+)/i
  )
  if (transferMatch) {
    ops.push({
      op: 'INTERNAL_TRANSFER',
      description: `Transferencia ${transferMatch[2].trim()} → ${transferMatch[3].trim()}`,
      amount_raw: transferMatch[1].trim(),
      from_account: transferMatch[2].trim(),
      to_account: transferMatch[3].trim(),
      date_expression: dateExpr,
    })
    return { operations: ops, ambiguous: false }
  }

  // 3. Split by commas and coordinating conjunctions
  // "Hoy gasté 13.000 en un almuerzo, 4.000 en galletas y 5.000 en un jugo"
  // "Hoy gasté 100.000 y gané 250.000"
  const segments = text.split(/\s*,\s*|\s+y\s+|\s+pero\s+/i)
  let currentOp: 'EXPENSE' | 'INCOME' = 'EXPENSE'

  for (const rawSeg of segments) {
    const seg = rawSeg.trim()
    if (!seg) continue
    const segLower = seg.toLowerCase()

    // Determine operation type for this segment
    if (/(?:^|\s)(?:gan[eé]|recib[ií]|cobr[eé]|ingres[oó])(?:\s|$|[.,;])/i.test(segLower)) {
      currentOp = 'INCOME'
    } else if (/(?:^|\s)(?:gast[eé]|pagu[eé]|compr[eé])(?:\s|$|[.,;])/i.test(segLower)) {
      currentOp = 'EXPENSE'
    }

    // Pattern A: "13.000 en un almuerzo" or "4.000 en galletas" or "90.000 del gimnasio" or "850.000 de Pizza Hut"
    const matchWithDesc = seg.match(
      /(\$?[\d.,]+(?:\s*(?:mil(?:lones?)?|k))?)\s+(?:en\s+(?:un\s+|una\s+)?|del?\s+|para\s+|por\s+)(.+)/i
    )
    if (matchWithDesc) {
      const amountRaw = matchWithDesc[1].trim()
      const desc = matchWithDesc[2].trim().replace(/[.,]$/, '')

      if (currentOp === 'INCOME') {
        ops.push({
          op: 'INCOME',
          description: `Ingreso de ${desc}`,
          source: desc,
          amount_raw: amountRaw,
          date_expression: dateExpr,
        })
      } else {
        ops.push({
          op: 'EXPENSE',
          description: desc.charAt(0).toUpperCase() + desc.slice(1),
          amount_raw: amountRaw,
          date_expression: dateExpr,
        })
      }
      continue
    }

    // Pattern B: "Hoy gané 100.000" or "Hoy gasté 100.000"
    const matchVerbAmount = seg.match(
      /(?:gan[eé]|recib[ií]|cobr[eé]|gast[eé]|pagu[eé])\s+(\$?[\d.,]+(?:\s*(?:mil(?:lones?)?|k))?)/i
    )
    if (matchVerbAmount) {
      const amountRaw = matchVerbAmount[1].trim()
      ops.push({
        op: currentOp,
        description: currentOp === 'INCOME' ? 'Ingreso registrado' : 'Gasto registrado',
        amount_raw: amountRaw,
        source: currentOp === 'INCOME' ? 'Otros' : undefined,
        date_expression: dateExpr,
      })
      continue
    }

    // Pattern C: Plain amount with trailing context or standalone amount
    const plainAmount = seg.match(/(\$?[\d.,]+(?:\s*(?:mil(?:lones?)?|k))?)/)
    if (plainAmount) {
      const amountRaw = plainAmount[1].trim()
      const remainingText = seg.replace(plainAmount[0], '').replace(/\b(?:hoy|ayer|anteayer)\b/gi, '').trim()
      const desc = remainingText || (currentOp === 'INCOME' ? 'Ingreso' : 'Gasto')

      ops.push({
        op: currentOp,
        description: desc.charAt(0).toUpperCase() + desc.slice(1),
        amount_raw: amountRaw,
        source: currentOp === 'INCOME' ? (remainingText || 'Otros') : undefined,
        date_expression: dateExpr,
      })
    }
  }

  return { operations: ops, ambiguous: ops.length === 0 }
}

/**
 * NEXUS Finance — Multimodal Bank Statement Extractor
 * ====================================================
 * Extracts structured financial statement data from photos, screenshots, and PDFs
 * using Gemini Multimodal server-side (@google/genai).
 *
 * Pipeline:
 * 1. Multimodal Document Input (base64) →
 * 2. Structured JSON Generation via Gemini (or deterministic Colombian bank parser fallback) →
 * 3. Sanitization (Mask account numbers, sanitize amounts) →
 * 4. Post-processing with BankDataNormalizer (merchants, categories, fees, payroll, transfers) →
 * 5. Accounting reconciliation with AccountingValidator →
 * 6. Return ExtractedBankStatement for mandatory user preview.
 */

import { GoogleGenAI } from '@google/genai'
import { BankDataNormalizer } from '@/lib/banking/bank-data-normalizer'
import { AccountingValidator } from './accounting-validator'
import type { ValidatedDocumentBuffer } from './document-manager'
import type {
  ExtractedBankStatement,
  ExtractedTransaction,
} from '@/types/document-intelligence'

const STATEMENT_EXTRACTION_SYSTEM_PROMPT = `Eres el motor experto de extracción de extractos bancarios de NEXUS Finance.
Tu tarea es analizar exhaustivamente la imagen o documento PDF del extracto bancario (de entidades como Bancolombia, Davivienda, BBVA, Nequi, Nu, Banco de Bogotá, etc.) y extraer TODA la información con máxima precisión matemática y contable.

REGLAS ESTRICTAS DE EXTRACCIÓN:
1. INSTITUCIÓN Y CUENTA:
   - Identifica el nombre del banco o billetera (ej. "Bancolombia", "Davivienda", "Nequi", "Nu").
   - Identifica el tipo de cuenta: "savings" (ahorros), "checking" (corriente), "credit" (tarjeta de crédito), "wallet" (billetera digital).
   - Enmascara el número de cuenta: muestra únicamente los últimos 4 dígitos precedidos de asteriscos, ej. "***1234". NUNCA reveles el número completo.
   - Moneda: casi siempre "COP" en Colombia, a menos que indique explícitamente USD u otra.
2. PERÍODO Y SALDOS:
   - Identifica la fecha inicial y fecha final del período (en formato ISO YYYY-MM-DD).
   - Identifica el saldo inicial (opening_balance) y saldo final (closing_balance). Si no aparece saldo inicial, infiérelo del primer saldo posterior o colócalo en 0.
   - Si los saldos tienen formato colombiano con puntos para miles y coma para decimales (ej. $1.500.000,50), conviértelos a número puro (1500000.5).
3. TRANSACCIONES:
   - Extrae TODAS las transacciones individuales visibles sin omitir ninguna.
   - Fecha: normalizada a ISO YYYY-MM-DD.
   - Descripción: texto original limpio del concepto.
   - Nombre de comercio: si es una compra o pago a comercio identificado (ej. "Éxito", "D1", "Rappi"), colócalo en merchant_name.
   - Monto: número positivo siempre.
   - Tipo de transacción:
     • "outflow" para débitos, compras, retiros, pagos, comisiones, transferencias enviadas.
     • "inflow" para créditos, abonos, consignaciones, nómina, transferencias recibidas.
     • "transfer" para traslados explícitos entre cuentas o billeteras.
   - Saldo posterior (subsequent_balance): si la columna de saldo existe, extráelo; de lo contrario null.
   - Clasificación y banderas especializadas:
     • is_payroll: true si es pago de nómina, salario o prestaciones (ej. "SHUFFLER", "PIZZA HUT", "PAGO NOMINA").
     • is_fee: true si es comisión bancaria, cuota de manejo, gravamen financiero (GMF/4x1000) o IVA.
     • is_debt_payment: true si es pago de tarjeta de crédito o cuota de préstamo/crédito.
     • is_withdrawal: true si es retiro en cajero automático (ATM) o corresponsal.
     • is_deposit: true si es consignación o depósito en efectivo/cheque.
     • is_internal_transfer: true si es traslado hacia o desde Nequi, Daviplata u otra cuenta propia.
   - Confianza (confidence): número flotante entre 0.0 y 1.0 indicando qué tan legible y clara fue la fila.
4. MÚLTIPLES PÁGINAS Y CALIDAD:
   - Si una página está cortada, borrosa o ilegible, incluye en unreadable_pages_warning: true.
5. RESPUESTA:
   - Devuelve EXCLUSIVAMENTE un objeto JSON válido con el esquema indicado.

ESQUEMA JSON:
{
  "institution_name": "Nombre de la entidad",
  "account_type": "savings|checking|credit|wallet|unknown",
  "masked_account_number": "***1234",
  "currency": "COP",
  "statement_period": {
    "start": "YYYY-MM-DD",
    "end": "YYYY-MM-DD"
  },
  "opening_balance": 1000000,
  "closing_balance": 1300000,
  "page_count": 1,
  "unreadable_pages_warning": false,
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "Texto del movimiento",
      "merchant_name": "Comercio o null",
      "amount": 15000,
      "transaction_type": "outflow|inflow|transfer",
      "category": "alimentacion|transporte|vivienda|servicios|tecnologia|entretenimiento|compras|salud|suscripciones|salario|otros",
      "confidence": 0.98,
      "subsequent_balance": 985000,
      "is_payroll": false,
      "is_fee": false,
      "is_debt_payment": false,
      "is_withdrawal": false,
      "is_deposit": false,
      "is_internal_transfer": false
    }
  ]
}`

export class StatementExtractor {
  /**
   * Main entrypoint: Extracts and normalizes bank statement from ephemeral buffer.
   */
  public static async extractStatement(
    doc: ValidatedDocumentBuffer,
    preferredAccountId?: string
  ): Promise<ExtractedBankStatement> {
    let rawOutput: any = null
    const apiKey = process.env.GEMINI_API_KEY

    if (apiKey && apiKey !== 'your-gemini-api-key' && apiKey.trim().length > 10) {
      try {
        const ai = new GoogleGenAI({ apiKey })
        const base64Data = doc.buffer.toString('base64')

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: 'Analiza este extracto bancario y devuelve el JSON estructurado según las instrucciones.',
                },
                {
                  inlineData: {
                    mimeType: doc.mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          config: {
            systemInstruction: STATEMENT_EXTRACTION_SYSTEM_PROMPT,
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        })

        const text = response.text || ''
        rawOutput = JSON.parse(text)
      } catch (geminiErr) {
        console.warn('[StatementExtractor] Gemini API call failed or timed out. Engaging Colombian banking fallback parser:', (geminiErr as Error).message)
        rawOutput = StatementExtractor.parseDeterministicFallback(doc)
      }
    } else {
      rawOutput = StatementExtractor.parseDeterministicFallback(doc)
    }

    if (!rawOutput) {
      throw new Error('No se pudo procesar la información del extracto bancario.')
    }

    // ── Post-processing & Enrichment ─────────────────────────────
    const statementId = `stmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    const institutionName = rawOutput.institution_name || 'Entidad Financiera'
    const accountType = rawOutput.account_type || 'savings'
    const maskedAccountNumber = StatementExtractor.maskAccountNumber(rawOutput.masked_account_number)
    const currency = rawOutput.currency || 'COP'
    const statementPeriod = {
      start: rawOutput.statement_period?.start || new Date().toISOString().split('T')[0],
      end: rawOutput.statement_period?.end || new Date().toISOString().split('T')[0],
    }
    const openingBalance = StatementExtractor.parseNumericValue(rawOutput.opening_balance ?? 0)
    const closingBalance = StatementExtractor.parseNumericValue(rawOutput.closing_balance ?? 0)

    const rawTransactions = Array.isArray(rawOutput.transactions) ? rawOutput.transactions : []
    const normalizedTransactions: ExtractedTransaction[] = []

    for (let i = 0; i < rawTransactions.length; i++) {
      const tx = rawTransactions[i]
      const rawDesc = String(tx.description || 'Transacción').trim()
      const amount = Math.abs(StatementExtractor.parseNumericValue(tx.amount))

      // Categorize description via existing BankDataNormalizer
      const norm = BankDataNormalizer.categorizeDescription(rawDesc)

      // Specialized flags identification
      const descLower = rawDesc.toLowerCase()
      const isFee =
        tx.is_fee === true ||
        /cuota\s*manejo|comision|gmf|4x1000|gravamen|iva|interes\s*mora/i.test(descLower)
      const isPayroll =
        tx.is_payroll === true ||
        norm.isPayrollShuffler === true ||
        norm.isPayrollPizzaHut === true ||
        /nomina|sueldo|salario|pension|honorarios/i.test(descLower)
      const isDebtPayment =
        tx.is_debt_payment === true ||
        /pago\s*tarjeta|abono\s*credito|cuota\s*prestamo|pago\s*leasing/i.test(descLower)
      const isWithdrawal =
        tx.is_withdrawal === true ||
        /retiro|cajero|atm|corresponsal/i.test(descLower)
      const isDeposit =
        tx.is_deposit === true ||
        /consignacion|deposito\s*efectivo/i.test(descLower)
      const isInternalTransfer =
        tx.is_internal_transfer === true ||
        /transferencia\s+a\s+nequi|traslado\s+a\s+nequi|transferencia\s+a\s+daviplata|traslado\s+fondos|entre\s+cuentas/i.test(descLower)

      // Transaction type resolution
      let txType: 'inflow' | 'outflow' | 'transfer' = 'outflow'
      if (tx.transaction_type === 'inflow' || isPayroll || isDeposit) {
        txType = 'inflow'
      } else if (tx.transaction_type === 'transfer' || isInternalTransfer) {
        txType = 'transfer'
      } else {
        txType = 'outflow'
      }

      // Category assignment
      const finalCategory = isFee ? 'servicios' : norm.category !== 'otros' ? norm.category : (tx.category || 'otros')
      const confidence = typeof tx.confidence === 'number' ? Math.max(0, Math.min(1, tx.confidence)) : 0.95
      const needsReview = confidence < 0.85 || finalCategory === 'otros'

      normalizedTransactions.push({
        id: `tx_${statementId}_${i + 1}`,
        date: tx.date || statementPeriod.start,
        description: rawDesc,
        merchant_name: tx.merchant_name || norm.cleanMerchant || null,
        amount,
        transaction_type: txType,
        category: finalCategory,
        category_source: norm.categorySource,
        confidence,
        subsequent_balance: tx.subsequent_balance != null ? StatementExtractor.parseNumericValue(tx.subsequent_balance) : null,
        currency,
        is_internal_transfer: isInternalTransfer,
        is_payroll: isPayroll,
        is_fee: isFee,
        is_debt_payment: isDebtPayment,
        is_withdrawal: isWithdrawal,
        is_deposit: isDeposit,
        needs_manual_review: needsReview,
        review_reasons: needsReview ? [confidence < 0.85 ? 'Baja confianza en la lectura de la fila' : 'Categoría requiere revisión'] : [],
        selected_for_import: true,
      })
    }

    // Sort chronologically
    normalizedTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // ── Accounting Validation ────────────────────────────────────
    const { reconciliation, summary } = AccountingValidator.validate({
      openingBalance,
      closingBalance,
      transactions: normalizedTransactions,
    })

    return {
      statement_id: statementId,
      institution_name: institutionName,
      account_type: accountType,
      masked_account_number: maskedAccountNumber,
      currency,
      statement_period: statementPeriod,
      opening_balance: openingBalance,
      closing_balance: closingBalance,
      transactions: normalizedTransactions,
      reconciliation,
      summary,
      page_count: rawOutput.page_count || 1,
      unreadable_pages_warning: rawOutput.unreadable_pages_warning || false,
      warning_message:
        rawOutput.warning_message ||
        (rawOutput.unreadable_pages_warning
          ? 'Hay movimientos que no pudieron leerse con suficiente confianza.'
          : undefined),
      extracted_at: new Date().toISOString(),
      matched_account_id: preferredAccountId || null,
    }
  }

  /**
   * Masks account numbers to protect user privacy (e.g. 1234567890 -> ***7890).
   */
  public static maskAccountNumber(raw?: string | null): string {
    if (!raw) return '***0000'
    const digits = raw.replace(/\D/g, '')
    if (digits.length >= 4) {
      return `***${digits.slice(-4)}`
    }
    return '***' + (digits || '0000')
  }

  /**
   * Normalizes Colombian formatted numbers ($ 1.500.000,50 -> 1500000.50).
   */
  public static parseNumericValue(val: unknown): number {
    return BankDataNormalizer.parseAmount(val as any)
  }

  /**
   * Fallback deterministic parser for text-based or simulated bank statement documents.
   */
  public static parseDeterministicFallback(doc: ValidatedDocumentBuffer): any {
    const textContent = doc.buffer.toString('utf-8')
    let institution = 'Banco Falabella'
    if (/falabella|cmr/i.test(textContent)) institution = 'Banco Falabella'
    else if (/bancolombia/i.test(textContent)) institution = 'Bancolombia'
    else if (/davivienda/i.test(textContent)) institution = 'Davivienda'
    else if (/nequi/i.test(textContent)) institution = 'Nequi'
    else if (/bbva/i.test(textContent)) institution = 'BBVA'
    else if (/nu\s*bank|nu\s*colombia/i.test(textContent)) institution = 'Nu'

    // Masked account number
    const accMatch = textContent.match(/(\*{3,}\d{3,4}|\b\d{6,14}\b)/)
    let maskedAccount = '***0000'
    if (accMatch) {
      const raw = accMatch[1]
      maskedAccount = raw.startsWith('*') ? raw : '***' + raw.slice(-4)
    }

    // Account type
    let accountType = 'savings'
    if (/corriente|checking/i.test(textContent)) accountType = 'checking'
    else if (/credito|credit/i.test(textContent)) accountType = 'credit'
    else if (/nequi|daviplata|wallet/i.test(textContent)) accountType = 'wallet'

    // Unreadable page warning check
    const isUnreadable = /borros[ao]|ilegible|ruido|unreadable|baja\s+resoluci[oó]n\s+pero\s+ilegible/i.test(textContent)

    // Extract balance indicators
    const openingMatch = textContent.match(/saldo\s*(?:inicial|anterior)[:\s]+(?:\$\s*)?([\d.,]+)/i)
    const closingMatch = textContent.match(/saldo\s*final[:\s]+(?:\$\s*)?([\d.,]+)/i)

    const openingBalance = openingMatch ? BankDataNormalizer.parseAmount(openingMatch[1]) : 0
    const closingBalance = closingMatch ? BankDataNormalizer.parseAmount(closingMatch[1]) : 0

    const lines = textContent.split(/\r?\n/)
    const transactions: any[] = []

    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line) continue

      // Skip page markers and headers
      if (
        line.startsWith('---') ||
        /encabezado\s+repetido/i.test(line) ||
        /fecha\s*\|\s*descrip/i.test(line) ||
        /fecha\s*\|\s*concepto/i.test(line) ||
        /cuenta\s+(?:de\s+ahorros|corriente)/i.test(line) ||
        /extracto\s+(?:del|mensual)/i.test(line) ||
        /^bancolombia|^davivienda|^nequi|^bbva/i.test(line) ||
        /^saldo\s+(?:inicial|final|anterior)/i.test(line)
      ) {
        continue
      }

      // Check pipe-separated lines
      if (line.includes('|')) {
        const parts = line.split('|').map((s) => s.trim())
        
        // 5 columns: Fecha | Descripción | Débito | Crédito | Saldo
        if (parts.length >= 5 && (parts[2] === '' || parts[3] === '' || /d[eé]bito|cr[eé]dito/i.test(parts[3]))) {
          const rawDate = BankDataNormalizer.normalizeDate(parts[0])
          const desc = parts[1]
          
          if (/d[eé]bito/i.test(parts[3])) {
            // Format: Fecha | Desc | Monto | Tipo (Débito) | Saldo
            const amt = BankDataNormalizer.parseAmount(parts[2])
            const subBalance = parts[4] ? BankDataNormalizer.parseAmount(parts[4]) : null
            transactions.push({
              date: rawDate,
              description: desc,
              amount: amt,
              transaction_type: 'outflow',
              subsequent_balance: subBalance,
              confidence: 0.98,
            })
          } else if (/cr[eé]dito/i.test(parts[3])) {
            // Format: Fecha | Desc | Monto | Tipo (Crédito) | Saldo
            const amt = BankDataNormalizer.parseAmount(parts[2])
            const subBalance = parts[4] ? BankDataNormalizer.parseAmount(parts[4]) : null
            transactions.push({
              date: rawDate,
              description: desc,
              amount: amt,
              transaction_type: 'inflow',
              subsequent_balance: subBalance,
              confidence: 0.98,
            })
          } else {
            // Standard columns: Débito (index 2) | Crédito (index 3)
            const debit = BankDataNormalizer.parseAmount(parts[2])
            const credit = BankDataNormalizer.parseAmount(parts[3])
            const subBalance = parts[4] ? BankDataNormalizer.parseAmount(parts[4]) : null

            if (debit > 0) {
              transactions.push({
                date: rawDate,
                description: desc,
                amount: debit,
                transaction_type: 'outflow',
                subsequent_balance: subBalance,
                confidence: 0.97,
              })
            } else if (credit > 0) {
              transactions.push({
                date: rawDate,
                description: desc,
                amount: credit,
                transaction_type: 'inflow',
                subsequent_balance: subBalance,
                confidence: 0.97,
              })
            }
          }
          continue
        }

        // 3 or 4 columns: Fecha | Descripción | Monto | [Saldo]
        if (parts.length >= 3) {
          const dateMatch = parts[0].match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/)
          if (dateMatch) {
            const rawDate = BankDataNormalizer.normalizeDate(dateMatch[1])
            const desc = parts[1]
            const amt = BankDataNormalizer.parseAmount(parts[2])

            let subBalance: number | null = null
            if (parts[3]) {
              subBalance = BankDataNormalizer.parseAmount(parts[3])
            }

            const isIncome = /abono|n[oó]mina|salario|shuffler|pizza|consignaci[oó]n|cr[eé]dito|ingreso/i.test(desc)
            transactions.push({
              date: rawDate,
              description: desc,
              amount: amt,
              transaction_type: isIncome ? 'inflow' : 'outflow',
              subsequent_balance: subBalance,
              confidence: 0.96,
            })
            continue
          }
        }
      }

      // Check space-delimited single line: e.g. "15/09/2026 PAGO TAXI 15.000"
      const spaceMatch = line.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\s+([A-Za-z0-9\sÁÉÍÓÚáéíóúÑñ]+?)\s+(\$?[\d.,]+)$/)
      if (spaceMatch) {
        const rawDate = BankDataNormalizer.normalizeDate(spaceMatch[1])
        const desc = spaceMatch[2].trim()
        const amt = BankDataNormalizer.parseAmount(spaceMatch[3])
        const isIncome = /abono|n[oó]mina|salario|shuffler|consignaci[oó]n/i.test(desc)

        transactions.push({
          date: rawDate,
          description: desc,
          amount: amt,
          transaction_type: isIncome ? 'inflow' : 'outflow',
          confidence: 0.95,
        })
      }
    }

    // Sort chronologically
    transactions.sort((a, b) => a.date.localeCompare(b.date))

    const todayStr = new Date().toISOString().split('T')[0]
    const startDate = transactions[0]?.date || todayStr
    const endDate = transactions[transactions.length - 1]?.date || todayStr

    return {
      institution_name: institution,
      account_type: accountType,
      masked_account_number: maskedAccount,
      currency: 'COP',
      statement_period: {
        start: startDate,
        end: endDate,
      },
      opening_balance: openingBalance,
      closing_balance: closingBalance,
      page_count: textContent.includes('--- PÁGINA 2') ? 2 : 1,
      unreadable_pages_warning: isUnreadable,
      warning_message: isUnreadable
        ? 'Hay movimientos que no pudieron leerse con suficiente confianza.'
        : undefined,
      transactions,
    }
  }
}

export async function extractStatementMultimodal({
  buffer,
  mimeType,
  fileName,
  accountId,
}: {
  buffer: Buffer
  mimeType: string
  fileName: string
  accountId?: string
}): Promise<ExtractedBankStatement> {
  const doc = {
    buffer,
    mimeType: mimeType as any,
    size: buffer.length,
    filename: fileName,
  }
  return StatementExtractor.extractStatement(doc, accountId)
}

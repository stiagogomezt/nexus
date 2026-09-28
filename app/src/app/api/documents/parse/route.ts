/**
 * NEXUS Finance — Document Intelligence Parse API Route
 * ======================================================
 * Endpoint: POST /api/documents/parse
 *
 * Pipeline Stage: Multimodal Extraction + Validation + Duplicate Detection
 * (Read-Only Preview - Zero Database Writes)
 *
 * Security & Privacy:
 * - Session derived authentication (Bearer token)
 * - In-memory ephemeral file processing (never written permanently to disk)
 * - Memory buffers wiped with zero-fill upon completion or error
 * - Cross-user data isolation
 */

import { NextResponse } from 'next/server'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { getBankTransactions } from '@/lib/dal/banking'
import { getIncomes } from '@/lib/dal/incomes'
import { EphemeralDocumentManager, type ValidatedDocumentBuffer } from '@/lib/documents/document-manager'
import { StatementExtractor } from '@/lib/documents/statement-extractor'
import { DuplicateDetector } from '@/lib/documents/duplicate-detector'
import { AccountingValidator } from '@/lib/documents/accounting-validator'

// ─────────────────────────────────────────────
// RATE LIMITER
// ─────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const MAX_REQUESTS_PER_WINDOW = 20

function checkRateLimit(key: string): { allowed: boolean; remaining: number; retryAfter?: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(key)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 }
  }
  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }
  entry.count++
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - entry.count }
}

export async function POST(req: Request) {
  let validatedDoc: ValidatedDocumentBuffer | null = null

  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
    const rateCheck = checkRateLimit(`doc_parse_${ip}`)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Límite de solicitudes alcanzado. Por favor espera un momento.' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter || 60) } }
      )
    }

    // 1. Authentication
    let authenticatedUserId = ''
    if (isSupabaseConfigured()) {
      const authHeader = req.headers.get('authorization')
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null
      if (!token) {
        return NextResponse.json(
          { success: false, error: 'No autorizado: Se requiere token de sesión Bearer válido.' },
          { status: 401 }
        )
      }

      const supabase = createClient()
      if (!supabase) {
        return NextResponse.json(
          { success: false, error: 'Error del sistema: Cliente de autenticación no inicializado.' },
          { status: 500 }
        )
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      if (authError || !user) {
        return NextResponse.json(
          { success: false, error: 'Sesión inválida o expirada.' },
          { status: 401 }
        )
      }
      authenticatedUserId = user.id
    } else {
      // Local dev / test fallback
      const url = new URL(req.url)
      const headerUser = req.headers.get('x-user-id') || url.searchParams.get('userId')
      if (!headerUser) {
        return NextResponse.json(
          { success: false, error: 'No autorizado: Se requiere una sesión de usuario válida.' },
          { status: 401 }
        )
      }
      authenticatedUserId = headerUser.trim()
    }

    // 2. Parse Multipart Form Data
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const accountId = (formData.get('accountId') as string) || undefined

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No se proporcionó ningún archivo para procesar.' },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 3. Validate Upload (File type and size bounds)
    validatedDoc = EphemeralDocumentManager.validateUpload(buffer, file.type, file.name)

    // 4. Extract Structured Statement via Gemini / Multimodal Extractor
    const extractedStatement = await StatementExtractor.extractStatement(validatedDoc, accountId)

    // 5. Load user's existing ledger to detect duplicates & reconcile payroll
    const existingTransactions = await getBankTransactions(authenticatedUserId, accountId)
    const existingIncomes = await getIncomes(authenticatedUserId)

    const analyzedTransactions = DuplicateDetector.analyzeDuplicates(
      extractedStatement.transactions,
      existingTransactions,
      existingIncomes,
      accountId
    )

    // 6. Recompute accounting validation with finalized transaction flags
    const { reconciliation, summary } = AccountingValidator.validate({
      openingBalance: extractedStatement.opening_balance,
      closingBalance: extractedStatement.closing_balance,
      transactions: analyzedTransactions,
    })

    const finalizedStatement = {
      ...extractedStatement,
      transactions: analyzedTransactions,
      reconciliation,
      summary,
    }

    return NextResponse.json({
      success: true,
      statement: finalizedStatement,
    })
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Error al procesar el extracto bancario'
    console.error('[DocumentParse Error]:', errorMsg)
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    )
  } finally {
    // 7. Ephemeral cleanup: wipe and dereference in-memory buffers
    EphemeralDocumentManager.release(validatedDoc)
  }
}

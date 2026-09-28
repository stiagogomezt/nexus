/**
 * NEXUS Finance — Natural Language Entry API Handler
 * =====================================================
 * Endpoint: POST /api/ai/entry
 *
 * Pipeline Stage: INTERPRETAR + VALIDAR (Read-Only / Preview)
 *
 * Security:
 * - Session derived authentication (Bearer token verified via Supabase)
 * - Strict user isolation (userId is NEVER blindly accepted from body)
 * - Rate limited
 * - Gemini parses intent, but writes ZERO rows to the database.
 * - Enforces business rules and returns structured PendingIntent for user confirmation.
 */

import { NextResponse } from 'next/server'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { getAccounts } from '@/lib/dal/accounts'
import { buildIntentFromText } from '@/lib/ai-entry/intent-builder'
import { validateIntent } from '@/lib/ai-entry/intent-validator'

// ─────────────────────────────────────────────
// RATE LIMITER (In-Memory Sliding Window)
// ─────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30

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
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
    const body = await req.json()
    const { text, referenceDate, userId } = body

    const rateKey = `ai_entry_${ip}_${userId || 'anon'}`
    const rateCheck = checkRateLimit(rateKey)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Límite de solicitudes alcanzado. Por favor espera un momento.',
        },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter || 60) } }
      )
    }

    // Authentication & Identity Verification
    let authenticatedUserId = ''

    if (isSupabaseConfigured()) {
      const authHeader = req.headers.get('authorization')
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

      if (!token) {
        return NextResponse.json(
          {
            success: false,
            error: 'No autorizado: Se requiere token de sesión Bearer válido.',
          },
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
          {
            success: false,
            error: 'Sesión inválida o expirada. Por favor vuelve a iniciar sesión.',
          },
          { status: 401 }
        )
      }

      if (userId && userId !== user.id) {
        return NextResponse.json(
          {
            success: false,
            error: 'Violación de seguridad: El identificador solicitado no coincide con la identidad autenticada.',
          },
          { status: 403 }
        )
      }

      authenticatedUserId = user.id
    } else {
      // Local development fallback
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        return NextResponse.json(
          {
            success: false,
            error: 'No autorizado: Se requiere una sesión de usuario válida.',
          },
          { status: 401 }
        )
      }
      authenticatedUserId = userId.trim()
    }

    // Input Validation
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: 'El texto del movimiento no puede estar vacío.',
        },
        { status: 400 }
      )
    }

    if (text.length > 2000) {
      return NextResponse.json(
        {
          success: false,
          error: 'Texto demasiado extenso (máximo 2.000 caracteres).',
        },
        { status: 400 }
      )
    }

    // Load user accounts for account resolution
    const accounts = await getAccounts(authenticatedUserId)

    // Build PendingIntent (uses Gemini or fallback, pure interpretation)
    const intent = await buildIntentFromText(text.trim(), accounts, referenceDate)

    // Validate Intent against business rules
    const accountIds = accounts.map((a) => a.id)
    const validation = validateIntent(intent.operations, accountIds)

    return NextResponse.json({
      success: true,
      intent,
      validation,
    })
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Error interno al interpretar movimiento'
    console.error('[NEXUS AI Entry Error]:', errorMsg)

    return NextResponse.json(
      {
        success: false,
        error: 'Ocurrió un problema al interpretar el movimiento. Intenta de nuevo en unos momentos.',
      },
      { status: 500 }
    )
  }
}

/**
 * NEXUS Finance — Natural Language Entry Confirmation API Handler
 * =====================================================
 * Endpoint: POST /api/ai/entry/confirm
 *
 * Pipeline Stage: CONFIRMAR + GUARDAR (Strict Controlled Write)
 *
 * Security Guarantees:
 * - Session derived authentication (Bearer token verified via Supabase)
 * - Cross-user write prevention: authenticated userId is injected directly into DAL calls
 * - Re-validation of all operations, amounts, categories, and account ownership before write
 * - Writes strictly through safe WriteExecutor with provenance source='ai_quick_entry'
 * - Gemini NEVER writes directly and is not in the execution path of this route
 */

import { NextResponse } from 'next/server'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { getAccounts } from '@/lib/dal/accounts'
import { validateIntent } from '@/lib/ai-entry/intent-validator'
import { executeWrite } from '@/lib/ai-entry/write-executor'
import type { EntryLineItem } from '@/types/ai-entry'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { operations, userId, intent_id } = body

    // 1. Authentication & Identity Verification
    let authenticatedUserId = ''

    if (isSupabaseConfigured()) {
      const authHeader = req.headers.get('authorization')
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

      if (!token) {
        return NextResponse.json(
          {
            success: false,
            error: 'No autorizado: Se requiere token de sesión Bearer válido para guardar operaciones.',
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

      // Cross-user write prevention
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

    // 2. Validate payload
    if (!Array.isArray(operations) || operations.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se enviaron operaciones para confirmar.',
        },
        { status: 400 }
      )
    }

    // 3. Load user accounts and validate ownership
    const accounts = await getAccounts(authenticatedUserId)
    const userAccountIds = accounts.map((a) => a.id)

    const validation = validateIntent(operations as EntryLineItem[], userAccountIds)
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: `Error de validación: ${validation.errors.join(' | ')}`,
          errors: validation.errors,
        },
        { status: 400 }
      )
    }

    // 4. Execute safe write through DAL
    const writeResult = await executeWrite(authenticatedUserId, operations as EntryLineItem[])

    if (!writeResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Error al registrar movimientos: ${writeResult.errors.join(' | ')}`,
          results: writeResult.results,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      intent_id,
      results: writeResult.results,
      count: writeResult.results.length,
    })
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Error interno al confirmar movimientos'
    console.error('[NEXUS AI Entry Confirm Error]:', errorMsg)

    return NextResponse.json(
      {
        success: false,
        error: 'Ocurrió un problema al confirmar los movimientos.',
      },
      { status: 500 }
    )
  }
}

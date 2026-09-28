/**
 * NEXUS Finance — AI Copilot API Route Handler
 *
 * Endpoint: POST /api/ai/chat
 *
 * Security & Tool Use Pipeline:
 * 1. Validates user session / userId (Strict isolation).
 * 2. Prepares messages history and appends latest user query.
 * 3. Sends prompt + function declarations to GeminiProvider.
 * 4. Intercepts any tool calls and executes them strictly via executeAITool() against DAL.
 * 5. Passes structured deterministic JSON back to Gemini as functionResponse.
 * 6. Returns finalized, grounded response with verified calculation sources.
 */

import { NextResponse } from 'next/server'
import { GeminiProvider } from '@/lib/ai/providers/gemini-provider'
import { executeAITool } from '@/lib/ai-tools'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import type { AIMessage } from '@/types/providers'

// ─────────────────────────────────────────────
// RATE LIMITER (In-Memory Sliding Window)
// ─────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 25

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
    // 1. IP & Rate Limit Enforcement
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
    const body = await req.json()
    const { message, history = [], userId } = body

    const rateKey = `${ip}_${userId || 'anon'}`
    const rateCheck = checkRateLimit(rateKey)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Has alcanzado el límite de consultas por minuto. Por favor espera unos momentos antes de reintentar.',
        },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter || 60) } }
      )
    }

    // 2. Authentication & Identity Verification (Zero blind trust in body.userId)
    let authenticatedUserId = ''

    if (isSupabaseConfigured()) {
      const authHeader = req.headers.get('authorization')
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

      if (!token) {
        return NextResponse.json(
          {
            success: false,
            error: 'No autorizado: Se requiere token de sesión Bearer válido para consultar NEXUS AI.',
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

      // Strict User Isolation: Reject client userId impersonation attempts
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
      // Local development / testing mode fallback
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        return NextResponse.json(
          {
            success: false,
            error: 'No autorizado: Se requiere una sesión de usuario válida para consultar NEXUS AI.',
          },
          { status: 401 }
        )
      }
      // Sanitize local user id
      authenticatedUserId = userId.trim()
    }

    // 3. Input Validation & Bounds Checking
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: 'Mensaje inválido: El contenido de la consulta no puede estar vacío.',
        },
        { status: 400 }
      )
    }

    if (message.length > 4000) {
      return NextResponse.json(
        {
          success: false,
          error: 'Mensaje demasiado extenso (máximo 4.000 caracteres por consulta).',
        },
        { status: 400 }
      )
    }

    // 4. Sanitize and bound history to avoid token window exhaustion
    const sanitizedHistory: AIMessage[] = Array.isArray(history)
      ? history.slice(-20).map((h: any) => ({
          role: h.role === 'assistant' ? 'assistant' : 'user',
          content: typeof h.content === 'string' ? h.content.slice(0, 4000) : '',
        }))
      : []

    // 5. Prepare conversation turns
    const conversationMessages: AIMessage[] = [
      ...sanitizedHistory,
      { role: 'user', content: message.trim() },
    ]

    const provider = new GeminiProvider()
    const toolsExecuted: { name: string; args: Record<string, unknown>; success: boolean }[] = []

    // 3. First model pass (may request tool calls)
    const initialResponse = await provider.generateResponse(conversationMessages)

    // 4. Handle Tool Calls if emitted
    if (initialResponse.toolCalls && initialResponse.toolCalls.length > 0) {
      // Append assistant's function call intent
      conversationMessages.push(initialResponse.message)

      for (const call of initialResponse.toolCalls) {
        // Execute strictly through our controlled dispatcher
        const executionResult = await executeAITool(call.name, call.arguments, userId)

        toolsExecuted.push({
          name: call.name,
          args: call.arguments,
          success: executionResult.success,
        })

        // Feed tool result back to conversation
        conversationMessages.push({
          role: 'tool',
          name: call.name,
          content: JSON.stringify(
            executionResult.success ? executionResult.data : { error: executionResult.error }
          ),
        })
      }

      // 5. Second model pass to synthesize final human response grounded in tool data
      const finalResponse = await provider.generateResponse(conversationMessages)

      return NextResponse.json({
        success: true,
        response: finalResponse.message.content,
        toolsExecuted,
        provider: provider.providerName,
      })
    }

    // If no tool was needed, return direct conversational answer
    return NextResponse.json({
      success: true,
      response: initialResponse.message.content,
      toolsExecuted: [],
      provider: provider.providerName,
    })
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Error interno en el Copiloto de IA'
    console.error('[NEXUS AI API Route Error]:', errorMsg)

    return NextResponse.json(
      {
        success: false,
        error: 'Ocurrió un problema al procesar tu consulta con NEXUS AI. Intenta de nuevo en unos momentos.',
      },
      { status: 500 }
    )
  }
}

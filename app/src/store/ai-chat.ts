'use client'

import { create } from 'zustand'
import { getAuthToken } from '@/lib/supabase/auth'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  toolsExecuted?: string[]
}

interface AIChatState {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  isDrawerOpen: boolean

  // Actions
  sendMessage: (text: string, userId: string) => Promise<void>
  clearHistory: () => void
  toggleDrawer: (open?: boolean) => void
  setError: (err: string | null) => void
}

const INITIAL_WELCOME_MESSAGE: ChatMessage = {
  id: 'msg-welcome',
  role: 'assistant',
  content: `Hola, soy **NEXUS AI**, tu copiloto financiero inteligente.

Tengo acceso directo al **Financial Engine** y a tus datos contables registrados en NEXUS. Pregúntame sobre:
- 💰 **Ingresos:** *"¿Cuánto gané este mes?"* o *"¿Cuáles son mis fuentes de ingreso?"*
- 📉 **Gastos:** *"¿Cuánto gasté este mes?"* o *"¿Cuál es mi mayor categoría de gasto?"*
- 🎯 **Presupuestos y Metas:** *"¿Cómo van mis presupuestos?"* o *"¿Cuánto me falta para mis metas?"*
- 🏛️ **Patrimonio y Deudas:** *"¿Cuál es mi patrimonio neto?"* o *"¿Cuánto debo en total?"*

Toda cifra numérica proviene exclusivamente de cálculos matemáticos verificados, sin estimaciones inventadas.`,
  timestamp: new Date().toISOString(),
}

export const useAIChatStore = create<AIChatState>((set, get) => ({
  messages: [INITIAL_WELCOME_MESSAGE],
  isLoading: false,
  error: null,
  isDrawerOpen: false,

  toggleDrawer: (open) => {
    set((s) => ({
      isDrawerOpen: open !== undefined ? open : !s.isDrawerOpen,
    }))
  },

  clearHistory: () => {
    set({
      messages: [INITIAL_WELCOME_MESSAGE],
      error: null,
    })
  },

  setError: (error) => set({ error }),

  sendMessage: async (text: string, userId: string) => {
    if (!text.trim() || get().isLoading) return

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    }

    set((s) => ({
      messages: [...s.messages, userMessage],
      isLoading: true,
      error: null,
    }))

    try {
      // Build history excluding welcome prompt to save context tokens
      const history = get()
        .messages.filter((m) => m.id !== 'msg-welcome')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))

      const token = await getAuthToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: text.trim(),
          history,
          userId,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al comunicarse con el copiloto.')
      }

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
        toolsExecuted: (data.toolsExecuted || []).map((t: { name: string }) => t.name),
      }

      set((s) => ({
        messages: [...s.messages, assistantMessage],
        isLoading: false,
      }))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al conectar con NEXUS AI'
      set({
        error: msg,
        isLoading: false,
      })
    }
  },
}))

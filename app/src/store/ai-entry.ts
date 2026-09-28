'use client'

/**
 * NEXUS Finance — AI Entry Zustand Store
 * =====================================================
 * Manages the client-side lifecycle of the Natural Language Entry flow:
 * 1. Input text
 * 2. Interpretation & Preview (PendingIntent)
 * 3. In-flight editing (amount, description, category, date, account)
 * 4. Confirmation & Execution through DAL
 * 5. Automatic recalculation of Financial Engine & Digital Twin
 */

import { create } from 'zustand'
import type {
  PendingIntent,
  EntryLineItem,
  ConfirmEntryResult,
  ValidationResult,
} from '@/types/ai-entry'
import { useFinancialStore } from './financial'

interface AIEntryState {
  inputText: string
  isInterpreting: boolean
  isConfirming: boolean
  pendingIntent: PendingIntent | null
  validation: ValidationResult | null
  error: string | null
  lastSuccess: {
    count: number
    results: ConfirmEntryResult[]
  } | null

  // Actions
  setInputText: (text: string) => void
  interpret: (text: string, token?: string, userId?: string, referenceDate?: string) => Promise<boolean>
  editOperation: (index: number, updated: Partial<EntryLineItem>) => void
  removeOperation: (index: number) => void
  confirm: (token?: string, userId?: string) => Promise<boolean>
  cancel: () => void
  clearSuccess: () => void
}

export const useAIEntryStore = create<AIEntryState>((set, get) => ({
  inputText: '',
  isInterpreting: false,
  isConfirming: false,
  pendingIntent: null,
  validation: null,
  error: null,
  lastSuccess: null,

  setInputText: (text: string) => set({ inputText: text, error: null }),

  interpret: async (text: string, token?: string, userId?: string, referenceDate?: string) => {
    if (!text || text.trim() === '') return false

    set({ isInterpreting: true, error: null, lastSuccess: null })

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch('/api/ai/entry', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text: text.trim(),
          userId,
          referenceDate,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        set({
          isInterpreting: false,
          error: data.error || 'No se pudo interpretar el movimiento.',
        })
        return false
      }

      set({
        isInterpreting: false,
        pendingIntent: data.intent,
        validation: data.validation,
        error: null,
      })
      return true
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al conectar con NEXUS AI'
      set({ isInterpreting: false, error: msg })
      return false
    }
  },

  editOperation: (index: number, updated: Partial<EntryLineItem>) => {
    const { pendingIntent } = get()
    if (!pendingIntent) return

    const newOps = [...pendingIntent.operations]
    if (!newOps[index]) return

    newOps[index] = {
      ...newOps[index],
      ...updated,
    } as EntryLineItem

    // Recompute totals
    let totalIncome = 0
    let totalExpense = 0
    for (const op of newOps) {
      if (op.type === 'INCOME') totalIncome += op.amount
      if (op.type === 'EXPENSE') totalExpense += op.amount
    }

    set({
      pendingIntent: {
        ...pendingIntent,
        operations: newOps,
        total_income: totalIncome,
        total_expense: totalExpense,
        net_change: totalIncome - totalExpense,
      },
    })
  },

  removeOperation: (index: number) => {
    const { pendingIntent } = get()
    if (!pendingIntent) return

    const newOps = pendingIntent.operations.filter((_, i) => i !== index)

    if (newOps.length === 0) {
      set({ pendingIntent: null, validation: null })
      return
    }

    let totalIncome = 0
    let totalExpense = 0
    for (const op of newOps) {
      if (op.type === 'INCOME') totalIncome += op.amount
      if (op.type === 'EXPENSE') totalExpense += op.amount
    }

    set({
      pendingIntent: {
        ...pendingIntent,
        operations: newOps,
        total_income: totalIncome,
        total_expense: totalExpense,
        net_change: totalIncome - totalExpense,
      },
    })
  },

  confirm: async (token?: string, userId?: string) => {
    const { pendingIntent } = get()
    if (!pendingIntent || pendingIntent.operations.length === 0) return false

    set({ isConfirming: true, error: null })

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch('/api/ai/entry/confirm', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          intent_id: pendingIntent.intent_id,
          operations: pendingIntent.operations,
          userId,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        set({
          isConfirming: false,
          error: data.error || 'No se pudieron guardar las operaciones.',
        })
        return false
      }

      // Success! Reset pending intent and refresh all financial engine state
      set({
        isConfirming: false,
        pendingIntent: null,
        validation: null,
        inputText: '',
        error: null,
        lastSuccess: {
          count: data.count || data.results?.length || 0,
          results: data.results || [],
        },
      })

      // Recalculate Financial Engine, Digital Twin, and reload all data via DAL
      const currentUserId = userId || useFinancialStore.getState().user?.id
      if (currentUserId) {
        await useFinancialStore.getState().fetchUserData(currentUserId)
      }

      return true
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al confirmar las operaciones'
      set({ isConfirming: false, error: msg })
      return false
    }
  },

  cancel: () => {
    set({
      pendingIntent: null,
      validation: null,
      error: null,
    })
  },

  clearSuccess: () => set({ lastSuccess: null }),
}))

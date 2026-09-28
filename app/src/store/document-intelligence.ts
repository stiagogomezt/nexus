'use client'

/**
 * NEXUS Finance — Document Intelligence Zustand Store
 * =====================================================
 * Manages the state and user review lifecycle for Bank Statement document imports.
 */

import { create } from 'zustand'
import type {
  ExtractedBankStatement,
  ExtractedTransaction,
} from '@/types/document-intelligence'
import { AccountingValidator } from '@/lib/documents/accounting-validator'
import { useFinancialStore } from './financial'

export type DocumentUploadState =
  | 'idle'
  | 'parsing'
  | 'previewing'
  | 'confirming'
  | 'success'
  | 'error'

interface DocumentIntelligenceState {
  uploadState: DocumentUploadState
  statement: ExtractedBankStatement | null
  selectedAccountId: string
  error: string | null
  lastResult: {
    importedCount: number
    duplicatesSkipped: number
  } | null

  // Actions
  setSelectedAccountId: (accountId: string) => void
  parseDocument: (
    file: File,
    accountId?: string,
    token?: string,
    userId?: string
  ) => Promise<boolean>
  editTransaction: (index: number, updates: Partial<ExtractedTransaction>) => void
  toggleTransactionSelection: (index: number) => void
  confirmImport: (token?: string, userId?: string) => Promise<boolean>
  reset: () => void
  clearError: () => void
}

export const useDocumentIntelligenceStore = create<DocumentIntelligenceState>((set, get) => ({
  uploadState: 'idle',
  statement: null,
  selectedAccountId: '',
  error: null,
  lastResult: null,

  setSelectedAccountId: (accountId: string) => set({ selectedAccountId: accountId }),

  parseDocument: async (file: File, accountId?: string, token?: string, userId?: string) => {
    set({ uploadState: 'parsing', error: null, statement: null, lastResult: null })

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (accountId) formData.append('accountId', accountId)
      if (userId) formData.append('userId', userId)

      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      if (userId) headers['x-user-id'] = userId

      const res = await fetch('/api/documents/parse', {
        method: 'POST',
        headers,
        body: formData,
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        set({
          uploadState: 'error',
          error: data.error || 'No se pudo interpretar el extracto bancario.',
        })
        return false
      }

      set({
        uploadState: 'previewing',
        statement: data.statement,
        selectedAccountId: accountId || data.statement.matched_account_id || '',
        error: null,
      })
      return true
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al conectar con el servicio de análisis de documentos'
      set({ uploadState: 'error', error: msg })
      return false
    }
  },

  editTransaction: (index: number, updates: Partial<ExtractedTransaction>) => {
    const { statement } = get()
    if (!statement) return

    const newTxList = [...statement.transactions]
    if (!newTxList[index]) return

    newTxList[index] = {
      ...newTxList[index],
      ...updates,
      // If user edits category manually, mark category_source as 'manual'
      category_source: updates.category ? 'manual' : newTxList[index].category_source,
    }

    // Recompute accounting reconciliation
    const { reconciliation, summary } = AccountingValidator.validate({
      openingBalance: statement.opening_balance,
      closingBalance: statement.closing_balance,
      transactions: newTxList,
    })

    set({
      statement: {
        ...statement,
        transactions: newTxList,
        reconciliation,
        summary,
      },
    })
  },

  toggleTransactionSelection: (index: number) => {
    const { statement } = get()
    if (!statement) return

    const newTxList = [...statement.transactions]
    if (!newTxList[index]) return

    const currentSelected = newTxList[index].selected_for_import !== false
    newTxList[index] = {
      ...newTxList[index],
      selected_for_import: !currentSelected,
    }

    const { reconciliation, summary } = AccountingValidator.validate({
      openingBalance: statement.opening_balance,
      closingBalance: statement.closing_balance,
      transactions: newTxList,
    })

    set({
      statement: {
        ...statement,
        transactions: newTxList,
        reconciliation,
        summary,
      },
    })
  },

  confirmImport: async (token?: string, userId?: string) => {
    const { statement, selectedAccountId } = get()
    if (!statement) return false

    set({ uploadState: 'confirming', error: null })

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const currentUserId = userId || useFinancialStore.getState().user?.id

      const res = await fetch('/api/documents/confirm', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          statement_id: statement.statement_id,
          account_id: selectedAccountId || statement.matched_account_id,
          transactions: statement.transactions,
          userId: currentUserId,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        set({
          uploadState: 'error',
          error: data.error || 'Error al guardar las transacciones del extracto.',
        })
        return false
      }

      set({
        uploadState: 'success',
        statement: null,
        lastResult: {
          importedCount: data.imported_count || 0,
          duplicatesSkipped: data.duplicates_skipped || 0,
        },
        error: null,
      })

      // Recalculate Financial Engine, cash flow, and Digital Twin
      if (currentUserId) {
        await useFinancialStore.getState().fetchUserData(currentUserId)
      }

      return true
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al confirmar importación'
      set({ uploadState: 'error', error: msg })
      return false
    }
  },

  reset: () =>
    set({
      uploadState: 'idle',
      statement: null,
      error: null,
      lastResult: null,
    }),

  clearError: () => set({ error: null }),
}))

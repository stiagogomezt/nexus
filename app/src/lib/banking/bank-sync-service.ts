/**
 * NEXUS Finance — Bank Sync Engine Service
 * Paso 19: Orquestador central de sincronización bancaria, gestión de estados y auditoría.
 *
 * Estados:
 * IDLE | SYNCING | SUCCESS | PARTIAL | FAILED | REAUTH_REQUIRED
 *
 * Flujo:
 * Provider.getAccounts & getTransactions
 *  ↓
 * BankDataNormalizer
 *  ↓
 * DeduplicationEngine (internal transfers & payroll reconciliation)
 *  ↓
 * Sync Result Metrics (added, updated, skipped, errors)
 */

import type { BankConnection, BankAccount, BankTransaction, BankSyncStatus } from '@/types/banking'
import type { BankProvider } from '@/types/providers'
import { BankDataNormalizer } from './bank-data-normalizer'
import { DeduplicationEngine } from './deduplication-engine'

export interface SyncJobMetrics {
  connectionId: string
  status: BankSyncStatus
  records_added: number
  records_updated: number
  records_skipped: number
  errors: string[]
  started_at: string
  completed_at: string
}

export class BankSyncService {
  /**
   * Ejecuta la sincronización completa de una conexión bancaria
   */
  public static async syncConnection(
    connection: BankConnection,
    provider: BankProvider,
    existingAccounts: BankAccount[],
    existingTransactions: BankTransaction[],
    existingIncomes: Array<{ id: string; source: string; amount: number; date?: string }> = []
  ): Promise<{
    updatedConnection: BankConnection
    accounts: BankAccount[]
    transactions: BankTransaction[]
    metrics: SyncJobMetrics
  }> {
    const startedAt = new Date().toISOString()
    const metrics: SyncJobMetrics = {
      connectionId: connection.id,
      status: 'syncing',
      records_added: 0,
      records_updated: 0,
      records_skipped: 0,
      errors: [],
      started_at: startedAt,
      completed_at: '',
    }

    try {
      // 1. Obtener cuentas del proveedor
      const remoteAccounts = await provider.getAccounts(connection.id)
      const syncedAccounts: BankAccount[] = []

      for (const ra of remoteAccounts) {
        const existing = existingAccounts.find(
          (a) => a.connection_id === connection.id && (a.id === ra.id || a.masked_account_number === ra.account_number_mask)
        )

        const now = new Date().toISOString()
        const accountType =
          ra.account_type === 'checking'
            ? 'checking'
            : ra.account_type === 'credit_card'
            ? 'credit_card'
            : 'savings'

        if (existing) {
          syncedAccounts.push({
            ...existing,
            account_name: ra.institution_name + ' ' + (accountType === 'savings' ? 'Ahorros' : 'Corriente'),
            current_balance: ra.balance,
            available_balance: ra.balance,
            last_synced_at: now,
            updated_at: now,
          })
          metrics.records_updated++
        } else {
          syncedAccounts.push({
            id: ra.id || `acc_${connection.institution_id}_${Date.now()}`,
            user_id: connection.user_id,
            connection_id: connection.id,
            institution_id: connection.institution_id,
            institution_name: connection.institution_name,
            account_name: `${connection.institution_name} ${ra.account_number_mask}`,
            account_type: accountType,
            currency: ra.currency || 'COP',
            masked_account_number: ra.account_number_mask,
            current_balance: ra.balance,
            available_balance: ra.balance,
            is_active: true,
            last_synced_at: now,
            created_at: now,
            updated_at: now,
          })
          metrics.records_added++
        }
      }

      // 2. Obtener y normalizar transacciones para cada cuenta
      const allNewTransactions: BankTransaction[] = []

      for (const acc of syncedAccounts) {
        try {
          const rawTxList = await provider.getTransactions(acc.id)
          for (const raw of rawTxList) {
            const canonical = BankDataNormalizer.normalizeRawTransaction({
              externalId: raw.id,
              date: raw.date,
              description: raw.description,
              amount: raw.amount,
              currency: acc.currency,
              accountId: acc.id,
              userId: connection.user_id,
              source: 'open_finance',
            })
            allNewTransactions.push(canonical)
          }
        } catch (txErr) {
          const errMsg = `Error sincronizando transacciones de cuenta ${acc.id}: ${(txErr as Error).message}`
          metrics.errors.push(errMsg)
        }
      }

      // 3. Deduplicación contra transacciones existentes
      const { newTransactions, skippedCount } = DeduplicationEngine.filterDuplicates(
        allNewTransactions,
        existingTransactions
      )
      metrics.records_skipped += skippedCount

      // 4. Detección de transferencias internas entre cuentas
      const consolidatedTxList = [...existingTransactions, ...newTransactions]
      const withTransfersMarked = DeduplicationEngine.detectInternalTransfers(consolidatedTxList)

      // 5. Conciliación con nóminas existentes (Shuffler / Pizza Hut)
      const reconciledWithIncomes = DeduplicationEngine.reconcileWithIncomes(
        withTransfersMarked.updatedTransactions,
        existingIncomes as any
      )

      metrics.records_added += newTransactions.length
      metrics.status = metrics.errors.length > 0 ? 'partial' : 'success'
      metrics.completed_at = new Date().toISOString()

      const updatedConnection: BankConnection = {
        ...connection,
        last_synced_at: metrics.completed_at,
        sync_status: metrics.status,
        sync_error: metrics.errors.length > 0 ? metrics.errors.join('; ') : null,
        updated_at: metrics.completed_at,
      }

      return {
        updatedConnection,
        accounts: syncedAccounts,
        transactions: reconciledWithIncomes.updatedTransactions,
        metrics,
      }
    } catch (err) {
      metrics.status = 'failed'
      metrics.errors.push((err as Error).message)
      metrics.completed_at = new Date().toISOString()

      const updatedConnection: BankConnection = {
        ...connection,
        sync_status: 'failed',
        sync_error: (err as Error).message,
        updated_at: metrics.completed_at,
      }

      return {
        updatedConnection,
        accounts: existingAccounts,
        transactions: existingTransactions,
        metrics,
      }
    }
  }
}

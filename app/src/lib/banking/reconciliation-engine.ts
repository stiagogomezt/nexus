/**
 * NEXUS Finance — Bank Reconciliation Engine
 * Paso 9: Comparación determinista entre saldo calculado por transacciones
 * vs. saldo bancario real reportado por la entidad financiera.
 *
 * Fórmula de Conciliación:
 * Saldo Esperado = Saldo Inicial + Σ(Ingresos) - Σ(Egresos) +/- Σ(Transferencias)
 * Discrepancia = Saldo Bancario Real - Saldo Esperado
 *
 * Principio: NUNCA alterar datos automáticamente sin autorización del usuario.
 */

import type { BankAccount, BankTransaction, BankReconciliationReport } from '@/types/banking'

export interface ReconciliationOptions {
  initialBalance?: number
  toleranceThreshold?: number // Default 0.01 for currency rounding
}

export class BankReconciliationEngine {
  /**
   * Genera el reporte de conciliación para una cuenta bancaria específica
   */
  public static reconcileAccount(
    account: BankAccount,
    transactions: BankTransaction[],
    options: ReconciliationOptions = {}
  ): BankReconciliationReport {
    const initialBalance = options.initialBalance ?? 0
    const tolerance = options.toleranceThreshold ?? 0.01

    // Filtrar transacciones pertenecientes a la cuenta
    const accountTx = transactions.filter((t) => t.account_id === account.id)

    let totalIncome = 0
    let totalExpense = 0
    let totalTransferIn = 0
    let totalTransferOut = 0
    let totalAdjustments = 0
    let unreconciledCount = 0

    for (const tx of accountTx) {
      if (!tx.is_reconciled) {
        unreconciledCount++
      }

      switch (tx.transaction_type) {
        case 'income':
          totalIncome += tx.amount
          break
        case 'expense':
          totalExpense += tx.amount
          break
        case 'transfer':
          // Si el monto fue positivo en el registro o si está marcado como crédito/débito
          // En BankTransaction amount es siempre positivo; para transferencias,
          // revisamos si fue entrada o salida por convención de linked o descripción
          if (tx.amount > 0) {
            // Evaluamos según descripción o notas si es transfer out / in
            const isOut =
              tx.description.toLowerCase().includes('hacia') ||
              tx.description.toLowerCase().includes('enviad') ||
              tx.description.toLowerCase().includes('transferencia a ') ||
              tx.description.toLowerCase().includes('salida')
            if (isOut) {
              totalTransferOut += tx.amount
            } else {
              totalTransferIn += tx.amount
            }
          }
          break
        case 'adjustment':
          totalAdjustments += tx.amount
          break
      }
    }

    const calculatedBalance =
      initialBalance +
      totalIncome -
      totalExpense +
      totalTransferIn -
      totalTransferOut +
      totalAdjustments

    const reportedBalance = account.current_balance
    const discrepancy = reportedBalance - calculatedBalance
    const isBalanced = Math.abs(discrepancy) <= tolerance

    return {
      account_id: account.id,
      account_name: account.account_name,
      institution_name: account.institution_name,
      reported_bank_balance: reportedBalance,
      calculated_ledger_balance: Math.round(calculatedBalance * 100) / 100,
      discrepancy: Math.round(discrepancy * 100) / 100,
      status: isBalanced ? 'balanced' : 'discrepant',
      unreconciled_transactions_count: unreconciledCount,
      last_reconciled_at: new Date().toISOString(),
    }
  }

  /**
   * Reconcilia todas las cuentas bancarias registradas
   */
  public static reconcileAllAccounts(
    accounts: BankAccount[],
    transactions: BankTransaction[],
    initialBalances: Record<string, number> = {}
  ): BankReconciliationReport[] {
    return accounts.map((acc) =>
      this.reconcileAccount(acc, transactions, {
        initialBalance: initialBalances[acc.id] ?? 0,
      })
    )
  }
}

/**
 * NEXUS Finance — Document Intelligence Accounting Validator
 * ==========================================================
 * Strict mathematical verification of extracted bank statements.
 *
 * Formula:
 * saldo_calculado = saldo_inicial + Σ(inflows) - Σ(outflows) + Σ(ajustes)
 *
 * Discrepancia:
 * diferencia = saldo_reportado - saldo_calculado
 *
 * Si |diferencia| <= tolerance (e.g. 1 COP por redondeo):
 *   status = 'balanced' (✅ CONCILIADO)
 * Si |diferencia| > tolerance:
 *   status = 'discrepant' (⚠️ DISCREPANCIA)
 *
 * CRITICAL RULE:
 * NUNCA alterar artificialmente ningún movimiento ni inventar ajustes
 * para forzar que los saldos cuadren. La discrepancia debe reportarse
 * fielmente al usuario.
 */

import type { ExtractedTransaction, StatementReconciliation, StatementSummary } from '@/types/document-intelligence'

export interface ValidateStatementOptions {
  openingBalance: number
  closingBalance: number
  transactions: ExtractedTransaction[]
  tolerance?: number // default 1 COP
}

export class AccountingValidator {
  public static validate(options: ValidateStatementOptions): {
    reconciliation: StatementReconciliation
    summary: StatementSummary
  } {
    const { openingBalance, closingBalance, transactions, tolerance = 1.0 } = options

    let inflowsTotal = 0
    let outflowsTotal = 0
    let adjustmentsTotal = 0
    let duplicateCount = 0
    let manualReviewCount = 0

    for (const tx of transactions) {
      if (tx.is_duplicate) {
        duplicateCount++
      }
      if (tx.needs_manual_review || tx.confidence < 0.85) {
        manualReviewCount++
      }

      // Internal transfers: If within same statement or neutral,
      // note: in a single account statement, an internal transfer OUT is an outflow,
      // and an internal transfer IN is an inflow for this specific account balance!
      if (tx.transaction_type === 'inflow') {
        inflowsTotal += tx.amount
      } else if (tx.transaction_type === 'outflow') {
        outflowsTotal += tx.amount
      } else if (tx.transaction_type === 'transfer') {
        // Evaluate direction from description or signs if available
        const isTransferOut =
          tx.description.toLowerCase().includes('hacia') ||
          tx.description.toLowerCase().includes('enviad') ||
          tx.description.toLowerCase().includes('traslado a') ||
          tx.description.toLowerCase().includes('transferencia a')
        if (isTransferOut) {
          outflowsTotal += tx.amount
        } else {
          inflowsTotal += tx.amount
        }
      }
    }

    const calculatedBalance = openingBalance + inflowsTotal - outflowsTotal + adjustmentsTotal
    const discrepancy = closingBalance - calculatedBalance
    const isBalanced = Math.abs(discrepancy) <= tolerance

    const reconciliation: StatementReconciliation = {
      opening_balance: Math.round(openingBalance * 100) / 100,
      closing_balance: Math.round(closingBalance * 100) / 100,
      inflows_total: Math.round(inflowsTotal * 100) / 100,
      outflows_total: Math.round(outflowsTotal * 100) / 100,
      adjustments_total: Math.round(adjustmentsTotal * 100) / 100,
      calculated_balance: Math.round(calculatedBalance * 100) / 100,
      reported_balance: Math.round(closingBalance * 100) / 100,
      discrepancy: Math.round(discrepancy * 100) / 100,
      status: isBalanced ? 'balanced' : 'discrepant',
    }

    const summary: StatementSummary = {
      total_found: transactions.length,
      new_count: transactions.length - duplicateCount,
      duplicate_count: duplicateCount,
      manual_review_count: manualReviewCount,
      inflows_sum: Math.round(inflowsTotal * 100) / 100,
      outflows_sum: Math.round(outflowsTotal * 100) / 100,
    }

    return { reconciliation, summary }
  }
}

export function validateReconciliation({
  opening_balance,
  closing_balance,
  transactions,
  tolerance = 1.0,
}: {
  opening_balance: number
  closing_balance: number
  transactions: ExtractedTransaction[]
  tolerance?: number
}): StatementReconciliation {
  const result = AccountingValidator.validate({
    openingBalance: opening_balance,
    closingBalance: closing_balance,
    transactions,
    tolerance,
  })
  return result.reconciliation
}

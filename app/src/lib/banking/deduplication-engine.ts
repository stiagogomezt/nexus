/**
 * NEXUS Finance — Banking Deduplication & Internal Transfer Engine
 * Prevents double counting of funds moved between user accounts and reconciles
 * payroll transactions with established income streams (Shuffler / Pizza Hut).
 */

import type { BankTransaction } from '@/types/banking'
import type { Income } from '@/types'

export interface DeduplicationResult {
  deduplicatedTransactions: BankTransaction[]
  internalTransfersFound: number
  payrollReconciledCount: number
}

export class DeduplicationEngine {
  /**
   * Detects internal transfers between user accounts.
   * Example: Account A has debit -$300.000 and Account B has credit +$300.000 on same date (+/- 1 day).
   * Result: Both marked as is_internal_transfer = true and linked to each other.
   * CRITICAL: These movements will NOT count as new Income or new Expense in Cash Flow!
   */
  public static detectInternalTransfers(transactions: BankTransaction[]): {
    updatedTransactions: BankTransaction[]
    transfersCount: number
  } {
    const list = transactions.map((t) => ({ ...t }))
    let transfersCount = 0

    // Match debits and credits across different accounts
    for (let i = 0; i < list.length; i++) {
      const txA = list[i]
      if (txA.is_internal_transfer && txA.linked_transaction_id) continue

      for (let j = i + 1; j < list.length; j++) {
        const txB = list[j]
        if (txB.is_internal_transfer && txB.linked_transaction_id) continue
        if (txA.account_id === txB.account_id) continue // Must be between different accounts

        // Same amount
        if (Math.abs(txA.amount - txB.amount) > 0.01) continue

        // Complementary types (expense vs income or transfer vs transfer)
        const isComplementary =
          (txA.transaction_type === 'expense' && txB.transaction_type === 'income') ||
          (txA.transaction_type === 'income' && txB.transaction_type === 'expense') ||
          (txA.transaction_type === 'transfer' && txB.transaction_type === 'transfer') ||
          (txA.transaction_type === 'transfer' && (txB.transaction_type === 'income' || txB.transaction_type === 'expense')) ||
          (txB.transaction_type === 'transfer' && (txA.transaction_type === 'income' || txA.transaction_type === 'expense'))

        if (!isComplementary) continue

        // Dates within +/- 2 days (ACH / transfers can take up to 24-48h over weekends)
        const dateA = new Date(txA.date).getTime()
        const dateB = new Date(txB.date).getTime()
        const diffDays = Math.abs(dateA - dateB) / (1000 * 60 * 60 * 24)

        if (diffDays <= 2) {
          txA.is_internal_transfer = true
          txB.is_internal_transfer = true
          txA.transaction_type = 'transfer'
          txB.transaction_type = 'transfer'
          txA.linked_transaction_id = txB.id
          txB.linked_transaction_id = txA.id
          transfersCount++
          break
        }
      }
    }

    return { updatedTransactions: list, transfersCount }
  }

  /**
   * Reconciles incoming bank deposits with confirmed labor incomes (Shuffler / Pizza Hut)
   * to avoid double-counting payroll receipts in total cash flow.
   */
  public static reconcileWithIncomes(
    bankTransactions: BankTransaction[],
    existingIncomes: Income[]
  ): {
    updatedTransactions: BankTransaction[]
    reconciledCount: number
  } {
    const list = bankTransactions.map((t) => ({ ...t }))
    let reconciledCount = 0

    for (const tx of list) {
      if (tx.transaction_type !== 'income' || tx.linked_income_id) continue

      const txDate = new Date(tx.date)
      const txMonth = txDate.getMonth() + 1
      const txYear = txDate.getFullYear()

      // Find an existing income record in the same month/year with matching source or amount
      const matchedIncome = existingIncomes.find((inc) => {
        const incDate = new Date(inc.date)
        const samePeriod = incDate.getMonth() + 1 === txMonth && incDate.getFullYear() === txYear

        if (!samePeriod) return false

        // Exact amount match or description match
        const amountMatch = Math.abs(inc.amount - tx.amount) < 1.0
        const isShufflerMatch =
          inc.source.toLowerCase().includes('shuffler') &&
          tx.description.toLowerCase().includes('shuffler')
        const isPizzaHutMatch =
          inc.source.toLowerCase().includes('pizza') &&
          tx.description.toLowerCase().includes('pizza')

        return amountMatch || isShufflerMatch || isPizzaHutMatch
      })

      if (matchedIncome) {
        tx.linked_income_id = matchedIncome.id
        tx.is_reconciled = true
        reconciledCount++
      }
    }

    return { updatedTransactions: list, reconciledCount }
  }

  /**
   * Deduplicates candidate incoming transactions against an existing ledger by externalId.
   */
  public static filterDuplicates(
    incoming: BankTransaction[],
    existing: BankTransaction[]
  ): {
    unique: BankTransaction[]
    skippedDuplicates: number
    newTransactions: BankTransaction[]
    skippedCount: number
  } {
    const existingExtIds = new Set(
      existing.map((e) => e.external_transaction_id).filter(Boolean)
    )
    const existingFingerprints = new Set(
      existing.map((e) => `${e.account_id}|${e.date}|${Math.round(e.amount * 100)}|${e.description.toLowerCase().trim()}`)
    )

    const unique: BankTransaction[] = []
    let skippedDuplicates = 0

    for (const tx of incoming) {
      const fp = `${tx.account_id}|${tx.date}|${Math.round(tx.amount * 100)}|${tx.description.toLowerCase().trim()}`
      if (
        (tx.external_transaction_id && existingExtIds.has(tx.external_transaction_id)) ||
        existingFingerprints.has(fp)
      ) {
        skippedDuplicates++
        continue
      }
      unique.push(tx)
    }

    return {
      unique,
      skippedDuplicates,
      newTransactions: unique,
      skippedCount: skippedDuplicates,
    }
  }
}

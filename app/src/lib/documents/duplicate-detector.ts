/**
 * NEXUS Finance — Document Intelligence Duplicate & Transfer Detector
 * ===================================================================
 * Flags potential duplicates against existing bank ledger using transaction fingerprints.
 * Also identifies internal transfers and labor payroll incomes (Shuffler / Pizza Hut).
 */

import type { ExtractedTransaction } from '@/types/document-intelligence'
import type { BankTransaction } from '@/types/banking'
import type { Income } from '@/types'

export class DuplicateDetector {
  /**
   * Generates a stable deterministic fingerprint for bank transaction deduplication.
   */
  public static computeFingerprint(
    accountId: string,
    date: string,
    amount: number,
    description: string
  ): string {
    const cleanDesc = description.toLowerCase().replace(/\s+/g, ' ').trim()
    const amountCents = Math.round(amount * 100)
    return `${accountId || 'unknown'}|${date}|${amountCents}|${cleanDesc}`
  }

  /**
   * Analyzes extracted statement transactions against existing database transactions and incomes.
   */
  public static analyzeDuplicates(
    extracted: ExtractedTransaction[],
    existingTransactions: BankTransaction[],
    existingIncomes: Income[] = [],
    accountId?: string
  ): ExtractedTransaction[] {
    const existingFingerprints = new Set<string>()
    const existingDescriptionsByDateAndAmount = new Map<string, string>()

    for (const tx of existingTransactions) {
      const accId = tx.account_id || (tx as any).bank_account_id || accountId || 'unknown'
      const txDate = tx.date || (tx as any).transaction_date || ''
      const txAmt = typeof tx.amount === 'number' ? tx.amount : 0
      const txDesc = tx.description || ''

      const fp = DuplicateDetector.computeFingerprint(accId, txDate, txAmt, txDesc)
      existingFingerprints.add(fp)

      // Also index by date + amount for fuzzy / descriptor variation
      const key = `${txDate}_${Math.round(txAmt * 100)}`
      existingDescriptionsByDateAndAmount.set(key, txDesc)
    }

    return extracted.map((tx) => {
      const fp = DuplicateDetector.computeFingerprint(accountId || '', tx.date, tx.amount, tx.description)
      const dateAmountKey = `${tx.date}_${Math.round(tx.amount * 100)}`

      let isDuplicate = false
      let duplicateReason: string | undefined = undefined

      if (existingFingerprints.has(fp)) {
        isDuplicate = true
        duplicateReason = 'Movimiento idéntico ya registrado en la cuenta (fecha, monto y descripción).'
      } else if (existingDescriptionsByDateAndAmount.has(dateAmountKey)) {
        // Same date and exact amount already exists
        const priorDesc = existingDescriptionsByDateAndAmount.get(dateAmountKey)
        isDuplicate = true
        duplicateReason = `Posible duplicado: ya existe un movimiento por el mismo valor ($${tx.amount.toLocaleString('es-CO')}) el ${tx.date} ("${priorDesc}").`
      }

      // Check if internal transfer
      const descLower = tx.description.toLowerCase()
      let isInternalTransfer =
        tx.is_internal_transfer ||
        tx.transaction_type === 'transfer' ||
        /transferencia\s+a|traslado\s+a|transferencia\s+desde|traslado\s+desde|transferencia\s+interna/i.test(descLower)

      // Check if it's a known payroll that matches an existing registered income
      let isPayroll = tx.is_payroll
      let linkedIncomeId = tx.linked_income_id

      if (descLower.includes('shuffler') || descLower.includes('pizza hut')) {
        isPayroll = true
        const matchedIncome = existingIncomes.find((inc) => {
          const incDate = inc.date || (inc as any).income_date || ''
          const sameMonth = incDate.substring(0, 7) === tx.date.substring(0, 7)
          return sameMonth && Math.abs(inc.amount - tx.amount) < 1
        })
        if (matchedIncome) {
          tx.review_reasons = tx.review_reasons || []
          tx.review_reasons.push(
            `Coincide con ingreso registrado de ${matchedIncome.source} ($${matchedIncome.amount.toLocaleString('es-CO')}).`
          )
          linkedIncomeId = matchedIncome.id
        }
      }

      return {
        ...tx,
        fingerprint: fp,
        is_duplicate: isDuplicate,
        duplicate_reason: duplicateReason,
        is_internal_transfer: isInternalTransfer,
        is_payroll: isPayroll,
        linked_income_id: linkedIncomeId,
        selected_for_import: !isDuplicate, // Do not import duplicates by default
      }
    })
  }
}

export function generateTransactionFingerprint(
  accountId: string,
  date: string,
  amount: number,
  description: string
): string {
  return DuplicateDetector.computeFingerprint(accountId, date, amount, description)
}

export function detectDuplicatesAndPayroll({
  extractedTransactions,
  accountId,
  existingBankTransactions = [],
  existingIncomes = [],
}: {
  extractedTransactions: ExtractedTransaction[]
  accountId?: string
  existingBankTransactions?: BankTransaction[]
  existingIncomes?: Income[]
}) {
  const transactions = DuplicateDetector.analyzeDuplicates(
    extractedTransactions,
    existingBankTransactions,
    existingIncomes,
    accountId
  )

  const duplicatesCount = transactions.filter((t) => t.is_duplicate).length
  const newCount = transactions.length - duplicatesCount

  return {
    transactions,
    duplicatesCount,
    newCount,
  }
}

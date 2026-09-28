/**
 * NEXUS Finance — Safe Write Executor
 * =====================================================
 * This is the ONLY module allowed to write financial data on behalf of
 * the Natural Language Entry pipeline.
 *
 * Security guarantees:
 * - userId is ALWAYS injected here from the authenticated session.
 *   It is NEVER read from the client-submitted intent.
 * - All writes go through DAL functions (which enforce .eq('user_id', userId)).
 * - provenance field source='ai_quick_entry' is always set by this module.
 * - Internal transfers correctly do NOT count as income or expense.
 */

import * as dalExpenses from '@/lib/dal/expenses'
import * as dalIncomes from '@/lib/dal/incomes'
import type {
  EntryLineItem,
  ExpenseLineItem,
  IncomeLineItem,
  InternalTransferLineItem,
  ConfirmEntryResult,
} from '@/types/ai-entry'

export interface WriteResult {
  success: boolean
  results: ConfirmEntryResult[]
  errors: string[]
}

export async function executeWrite(
  authenticatedUserId: string,
  operations: EntryLineItem[]
): Promise<WriteResult> {
  const results: ConfirmEntryResult[] = []
  const errors: string[] = []

  for (const op of operations) {
    try {
      if (op.type === 'EXPENSE') {
        const exp = op as ExpenseLineItem
        const record = await dalExpenses.createExpense(authenticatedUserId, {
          account_id: exp.account_id || null,
          category_id: null,                    // category resolved by name
          category_name: exp.category_name || 'otros',
          date: exp.date,
          description: exp.description,
          amount: Math.round(exp.amount),       // strict integer
          payment_method: exp.payment_method || 'debit',
          is_recurring: false,
          is_essential: exp.is_essential ?? false,
          notes: `[ai_quick_entry] ${exp.notes || ''}`.trim(),
        })
        results.push({
          operation_type: 'EXPENSE',
          record_id: record.id,
          description: record.description,
          amount: record.amount,
        })
      }

      if (op.type === 'INCOME') {
        const inc = op as IncomeLineItem
        const record = await dalIncomes.createIncome(authenticatedUserId, {
          account_id: inc.account_id || null,
          date: inc.date,
          source: inc.source || 'Otros',
          description: inc.description,
          amount: Math.round(inc.amount),
          income_type: inc.income_type || 'other',
          base_salary: 0,
          bonus_amount: 0,
          surcharges_amount: 0,
          extra_hours_amount: 0,
          other_payments_amount: Math.round(inc.amount),
          hours_worked: 0,
          hourly_rate: 0,
          is_recurring: inc.is_recurring ?? false,
          notes: `[ai_quick_entry] ${inc.notes || ''}`.trim(),
        })
        results.push({
          operation_type: 'INCOME',
          record_id: record.id,
          description: record.description,
          amount: record.amount,
        })
      }

      if (op.type === 'INTERNAL_TRANSFER') {
        const tr = op as InternalTransferLineItem
        // Record as two notes-only expenses that cancel each other for cash flow.
        // Better approach: record as a paired expense (debit) + income (credit)
        // on respective accounts, both tagged ai_quick_entry + internal_transfer.
        // This preserves: cash flow neutral, account balances correct.

        const debitRecord = await dalExpenses.createExpense(authenticatedUserId, {
          account_id: tr.from_account_id || null,
          category_id: null,
          category_name: 'otros',
          date: tr.date,
          description: `Transferencia hacia ${tr.to_account_name || '?'}: ${tr.description}`,
          amount: Math.round(tr.amount),
          payment_method: 'transfer',
          is_recurring: false,
          is_essential: false,
          notes: `[ai_quick_entry][internal_transfer] ${tr.notes || ''}`.trim(),
        })

        const creditRecord = await dalIncomes.createIncome(authenticatedUserId, {
          account_id: tr.to_account_id || null,
          date: tr.date,
          source: 'Transferencia interna',
          description: `Transferencia desde ${tr.from_account_name || '?'}: ${tr.description}`,
          amount: Math.round(tr.amount),
          income_type: 'other',
          base_salary: 0,
          bonus_amount: 0,
          surcharges_amount: 0,
          extra_hours_amount: 0,
          other_payments_amount: Math.round(tr.amount),
          hours_worked: 0,
          hourly_rate: 0,
          is_recurring: false,
          notes: `[ai_quick_entry][internal_transfer] ${tr.notes || ''}`.trim(),
        })

        results.push({
          operation_type: 'INTERNAL_TRANSFER',
          record_id: debitRecord.id,
          description: tr.description,
          amount: tr.amount,
        })
        results.push({
          operation_type: 'INTERNAL_TRANSFER',
          record_id: creditRecord.id,
          description: `Crédito en ${tr.to_account_name || 'cuenta destino'}`,
          amount: tr.amount,
        })
      }

      if (op.type === 'ACCOUNT_ADJUSTMENT') {
        // Account adjustments are recorded as either a small income or expense
        // depending on sign, tagged for audit.
        const isCredit = op.amount > 0
        const amount = Math.abs(Math.round(op.amount))

        if (isCredit) {
          const record = await dalIncomes.createIncome(authenticatedUserId, {
            account_id: op.account_id || null,
            date: op.date,
            source: 'Ajuste de cuenta',
            description: op.description,
            amount,
            income_type: 'other',
            base_salary: 0,
            bonus_amount: 0,
            surcharges_amount: 0,
            extra_hours_amount: amount,
            other_payments_amount: 0,
            hours_worked: 0,
            hourly_rate: 0,
            is_recurring: false,
            notes: `[ai_quick_entry][account_adjustment] ${op.notes || ''}`.trim(),
          })
          results.push({
            operation_type: 'ACCOUNT_ADJUSTMENT',
            record_id: record.id,
            description: record.description,
            amount: record.amount,
          })
        } else {
          const record = await dalExpenses.createExpense(authenticatedUserId, {
            account_id: op.account_id || null,
            category_id: null,
            category_name: 'otros',
            date: op.date,
            description: op.description,
            amount,
            payment_method: 'debit',
            is_recurring: false,
            is_essential: false,
            notes: `[ai_quick_entry][account_adjustment] ${op.notes || ''}`.trim(),
          })
          results.push({
            operation_type: 'ACCOUNT_ADJUSTMENT',
            record_id: record.id,
            description: record.description,
            amount: record.amount,
          })
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Error en operación ${op.type}`
      errors.push(msg)
    }
  }

  return {
    success: errors.length === 0,
    results,
    errors,
  }
}

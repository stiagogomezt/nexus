import { createClient } from '@/lib/supabase/client'
import { createTableStorage } from './storage-fallback'
import type { Debt, DebtPayment } from '@/types'

const debtsStorage = createTableStorage<Debt>('debts')


export async function getDebts(userId: string): Promise<Debt[]> {
  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('debts')
      .select('*')
      .eq('user_id', userId)
      .order('current_balance', { ascending: false })

    if (error) {
      console.error('Error fetching debts from Supabase:', error)
      throw new Error(error.message)
    }

    return (data || []).map((row) => ({
      ...row,
      initial_balance: Number(row.initial_balance),
      current_balance: Number(row.current_balance),
      interest_rate_ea: Number(row.interest_rate_ea),
      minimum_payment: Number(row.minimum_payment),
      term_months: Number(row.term_months || 0),
    }))
  }

  return debtsStorage.getAll(userId)
}

export async function createDebt(
  userId: string,
  data: Omit<Debt, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<Debt> {
  const supabase = createClient()
  if (supabase) {
    const payload = {
      user_id: userId,
      entity: data.entity,
      name: data.name,
      debt_type: data.debt_type || 'credit_card',
      initial_balance: data.initial_balance,
      current_balance: data.current_balance,
      interest_rate_ea: data.interest_rate_ea || 0,
      minimum_payment: data.minimum_payment || 0,
      payment_day: data.payment_day || 15,
      term_months: data.term_months || 0,
      notes: data.notes || null,
    }

    const { data: inserted, error } = await supabase
      .from('debts')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('Error creating debt in Supabase:', error)
      throw new Error(error.message)
    }

    return {
      ...inserted,
      initial_balance: Number(inserted.initial_balance),
      current_balance: Number(inserted.current_balance),
      interest_rate_ea: Number(inserted.interest_rate_ea),
      minimum_payment: Number(inserted.minimum_payment),
      term_months: Number(inserted.term_months || 0),
    }
  }

  const now = new Date().toISOString()
  const newDebt: Debt = {
    id: `debt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user_id: userId,
    created_at: now,
    updated_at: now,
    ...data,
  }

  return debtsStorage.insert(userId, newDebt)
}

export async function updateDebt(
  userId: string,
  id: string,
  updates: Partial<Debt>
): Promise<Debt> {
  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('debts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating debt in Supabase:', error)
      throw new Error(error.message)
    }

    return {
      ...data,
      initial_balance: Number(data.initial_balance),
      current_balance: Number(data.current_balance),
      interest_rate_ea: Number(data.interest_rate_ea),
      minimum_payment: Number(data.minimum_payment),
      term_months: Number(data.term_months || 0),
    }
  }

  const updated = debtsStorage.update(userId, id, { ...updates, updated_at: new Date().toISOString() })
  if (!updated) throw new Error('Deuda no encontrada')
  return updated
}

export async function deleteDebt(userId: string, id: string): Promise<void> {
  const supabase = createClient()
  if (supabase) {
    const { error } = await supabase
      .from('debts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting debt in Supabase:', error)
      throw new Error(error.message)
    }
    return
  }

  debtsStorage.delete(userId, id)
}

export async function payDebt(
  userId: string,
  debtId: string,
  amount: number
): Promise<Debt> {
  const supabase = createClient()
  if (supabase) {
    // 1. Get current debt
    const { data: debt, error: fetchErr } = await supabase
      .from('debts')
      .select('*')
      .eq('id', debtId)
      .eq('user_id', userId)
      .single()

    if (fetchErr || !debt) throw new Error('Deuda no encontrada')

    const currentBalance = Number(debt.current_balance)
    const rateEA = Number(debt.interest_rate_ea)
    const monthlyRate = rateEA > 0 ? Math.pow(1 + rateEA / 100, 1 / 12) - 1 : 0
    const interest = currentBalance * monthlyRate
    const principal = Math.max(0, amount - interest)
    const newBalance = Math.max(0, currentBalance - principal)

    // 2. Record payment in debt_payments
    await supabase.from('debt_payments').insert({
      debt_id: debtId,
      user_id: userId,
      amount,
      principal_amount: principal,
      interest_amount: interest,
      payment_date: new Date().toISOString().split('T')[0],
      notes: 'Pago registrado desde panel',
    })

    // 3. Update debt balance
    const { data: updated, error: updErr } = await supabase
      .from('debts')
      .update({
        current_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', debtId)
      .select()
      .single()

    if (updErr) throw new Error(updErr.message)

    return {
      ...updated,
      initial_balance: Number(updated.initial_balance),
      current_balance: Number(updated.current_balance),
      interest_rate_ea: Number(updated.interest_rate_ea),
      minimum_payment: Number(updated.minimum_payment),
      term_months: Number(updated.term_months || 0),
    }
  }

  // Local fallback
  const allDebts = debtsStorage.getAll(userId)
  const target = allDebts.find((d) => d.id === debtId)
  if (!target) throw new Error('Deuda no encontrada')

  const monthlyRate = target.interest_rate_ea > 0 ? Math.pow(1 + target.interest_rate_ea / 100, 1 / 12) - 1 : 0
  const interest = target.current_balance * monthlyRate
  const principal = Math.max(0, amount - interest)
  const newBalance = Math.max(0, target.current_balance - principal)

  const updated = debtsStorage.update(userId, debtId, {
    current_balance: newBalance,
    updated_at: new Date().toISOString(),
  })

  return updated!
}

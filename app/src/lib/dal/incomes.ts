import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { createTableStorage } from './storage-fallback'
import { getIncomeSourceKey } from '@/lib/utils'
import type { Income } from '@/types'

const incomesStorage = createTableStorage<Income>('incomes')


export async function getIncomes(userId: string): Promise<Income[]> {
  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('incomes')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })

    if (error) {
      console.error('Error fetching incomes from Supabase:', error)
      throw new Error(error.message)
    }

    return (data || []).map((row) => ({
      ...row,
      amount: Number(row.amount),
      base_salary: Number(row.base_salary || 0),
      bonus_amount: Number(row.bonus_amount || 0),
      surcharges_amount: Number(row.surcharges_amount || 0),
      extra_hours_amount: Number(row.extra_hours_amount || 0),
      other_payments_amount: Number(row.other_payments_amount || 0),
      hours_worked: Number(row.hours_worked || 0),
      hourly_rate: Number(row.hourly_rate || 0),
      income_source_key: getIncomeSourceKey(row.source),
    }))
  }

  return incomesStorage.getAll(userId)
}

export async function createIncome(
  userId: string,
  data: Omit<Income, 'id' | 'user_id' | 'created_at' | 'income_source_key'>
): Promise<Income> {
  const supabase = createClient()
  const sourceKey = getIncomeSourceKey(data.source)

  if (supabase) {
    const payload = {
      user_id: userId,
      account_id: data.account_id || null,
      date: data.date,
      source: data.source,
      description: data.description,
      amount: data.amount,
      income_type: data.income_type,
      base_salary: data.base_salary || 0,
      bonus_amount: data.bonus_amount || 0,
      surcharges_amount: data.surcharges_amount || 0,
      extra_hours_amount: data.extra_hours_amount || 0,
      other_payments_amount: data.other_payments_amount || 0,
      hours_worked: data.hours_worked || 0,
      hourly_rate: data.hourly_rate || 0,
      is_recurring: data.is_recurring ?? false,
      notes: data.notes || null,
    }

    const { data: inserted, error } = await supabase
      .from('incomes')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('Error creating income in Supabase:', error)
      throw new Error(error.message)
    }

    return {
      ...inserted,
      amount: Number(inserted.amount),
      base_salary: Number(inserted.base_salary || 0),
      bonus_amount: Number(inserted.bonus_amount || 0),
      surcharges_amount: Number(inserted.surcharges_amount || 0),
      extra_hours_amount: Number(inserted.extra_hours_amount || 0),
      other_payments_amount: Number(inserted.other_payments_amount || 0),
      hours_worked: Number(inserted.hours_worked || 0),
      hourly_rate: Number(inserted.hourly_rate || 0),
      income_source_key: sourceKey,
    }
  }

  const newIncome: Income = {
    id: `inc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user_id: userId,
    income_source_key: sourceKey,
    created_at: new Date().toISOString(),
    ...data,
  }

  return incomesStorage.insert(userId, newIncome)
}

export async function updateIncome(
  userId: string,
  id: string,
  updates: Partial<Income>
): Promise<Income> {
  const supabase = createClient()
  if (supabase) {
    const { income_source_key, ...safeUpdates } = updates
    const { data, error } = await supabase
      .from('incomes')
      .update(safeUpdates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating income in Supabase:', error)
      throw new Error(error.message)
    }

    return {
      ...data,
      amount: Number(data.amount),
      income_source_key: getIncomeSourceKey(data.source),
    }
  }

  const updated = incomesStorage.update(userId, id, updates)
  if (!updated) throw new Error('Ingreso no encontrado')
  return updated
}

export async function deleteIncome(userId: string, id: string): Promise<void> {
  const supabase = createClient()
  if (supabase) {
    const { error } = await supabase
      .from('incomes')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting income in Supabase:', error)
      throw new Error(error.message)
    }
    return
  }

  incomesStorage.delete(userId, id)
}

import { createClient } from '@/lib/supabase/client'
import { createTableStorage } from './storage-fallback'
import type { Expense } from '@/types'

const expensesStorage = createTableStorage<Expense>('expenses', {
  'usr-kevin-001': [
    {
      id: 'exp-seed-1',
      user_id: 'usr-kevin-001',
      account_id: null,
      category_id: null,
      category_name: 'vivienda',
      date: new Date().toISOString().split('T')[0],
      description: 'Arriendo',
      amount: 900000,
      payment_method: 'transfer',
      is_recurring: true,
      is_essential: true,
      notes: null,
      created_at: new Date().toISOString(),
    },
    {
      id: 'exp-seed-2',
      user_id: 'usr-kevin-001',
      account_id: null,
      category_id: null,
      category_name: 'alimentacion',
      date: new Date().toISOString().split('T')[0],
      description: 'Mercado quincenal',
      amount: 280000,
      payment_method: 'debit',
      is_recurring: false,
      is_essential: true,
      notes: null,
      created_at: new Date().toISOString(),
    },
    {
      id: 'exp-seed-3',
      user_id: 'usr-kevin-001',
      account_id: null,
      category_id: null,
      category_name: 'transporte',
      date: new Date().toISOString().split('T')[0],
      description: 'Recarga Transmilenio',
      amount: 120000,
      payment_method: 'debit',
      is_recurring: true,
      is_essential: true,
      notes: null,
      created_at: new Date().toISOString(),
    },
  ],
})

export async function getExpenses(userId: string): Promise<Expense[]> {
  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })

    if (error) {
      console.error('Error fetching expenses from Supabase:', error)
      throw new Error(error.message)
    }

    return (data || []).map((row) => ({
      ...row,
      amount: Number(row.amount),
    }))
  }

  return expensesStorage.getAll(userId)
}

export async function createExpense(
  userId: string,
  data: Omit<Expense, 'id' | 'user_id' | 'created_at'>
): Promise<Expense> {
  const supabase = createClient()
  if (supabase) {
    const payload = {
      user_id: userId,
      account_id: data.account_id || null,
      category_id: data.category_id || null,
      category_name: data.category_name,
      date: data.date,
      description: data.description,
      amount: data.amount,
      payment_method: data.payment_method || 'debit',
      is_recurring: data.is_recurring ?? false,
      is_essential: data.is_essential ?? false,
      notes: data.notes || null,
    }

    const { data: inserted, error } = await supabase
      .from('expenses')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('Error creating expense in Supabase:', error)
      throw new Error(error.message)
    }

    return {
      ...inserted,
      amount: Number(inserted.amount),
    }
  }

  const newExpense: Expense = {
    id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user_id: userId,
    created_at: new Date().toISOString(),
    ...data,
  }

  return expensesStorage.insert(userId, newExpense)
}

export async function updateExpense(
  userId: string,
  id: string,
  updates: Partial<Expense>
): Promise<Expense> {
  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating expense in Supabase:', error)
      throw new Error(error.message)
    }

    return {
      ...data,
      amount: Number(data.amount),
    }
  }

  const updated = expensesStorage.update(userId, id, updates)
  if (!updated) throw new Error('Gasto no encontrado')
  return updated
}

export async function deleteExpense(userId: string, id: string): Promise<void> {
  const supabase = createClient()
  if (supabase) {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting expense in Supabase:', error)
      throw new Error(error.message)
    }
    return
  }

  expensesStorage.delete(userId, id)
}

import { createClient } from '@/lib/supabase/client'
import { createTableStorage } from './storage-fallback'
import type { Budget } from '@/types'

const currentMonth = new Date().getMonth() + 1
const currentYear = new Date().getFullYear()

const budgetsStorage = createTableStorage<Budget>('budgets')


export async function getBudgets(
  userId: string,
  month?: number,
  year?: number
): Promise<Budget[]> {
  const supabase = createClient()
  if (supabase) {
    let query = supabase.from('budgets').select('*').eq('user_id', userId)

    if (month !== undefined) {
      query = query.eq('month', month)
    }
    if (year !== undefined) {
      query = query.eq('year', year)
    }

    const { data, error } = await query.order('category_name', { ascending: true })

    if (error) {
      console.error('Error fetching budgets from Supabase:', error)
      throw new Error(error.message)
    }

    return (data || []).map((row) => ({
      ...row,
      budgeted_amount: Number(row.budgeted_amount),
    }))
  }

  const all = budgetsStorage.getAll(userId)
  return all.filter((b) => {
    const matchMonth = month === undefined || b.month === month
    const matchYear = year === undefined || b.year === year
    return matchMonth && matchYear
  })
}

export async function createBudget(
  userId: string,
  data: Omit<Budget, 'id' | 'user_id' | 'created_at'>
): Promise<Budget> {
  const supabase = createClient()
  if (supabase) {
    const payload = {
      user_id: userId,
      category_name: data.category_name.toLowerCase().trim(),
      month: data.month,
      year: data.year,
      budgeted_amount: data.budgeted_amount,
    }

    const { data: inserted, error } = await supabase
      .from('budgets')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('Error creating budget in Supabase:', error)
      throw new Error(error.message)
    }

    return {
      ...inserted,
      budgeted_amount: Number(inserted.budgeted_amount),
    }
  }

  const newBudget: Budget = {
    id: `bdg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user_id: userId,
    created_at: new Date().toISOString(),
    ...data,
  }

  return budgetsStorage.insert(userId, newBudget)
}

export async function updateBudget(
  userId: string,
  id: string,
  updates: Partial<Budget>
): Promise<Budget> {
  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('budgets')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating budget in Supabase:', error)
      throw new Error(error.message)
    }

    return {
      ...data,
      budgeted_amount: Number(data.budgeted_amount),
    }
  }

  const updated = budgetsStorage.update(userId, id, updates)
  if (!updated) throw new Error('Presupuesto no encontrado')
  return updated
}

export async function deleteBudget(userId: string, id: string): Promise<void> {
  const supabase = createClient()
  if (supabase) {
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting budget in Supabase:', error)
      throw new Error(error.message)
    }
    return
  }

  budgetsStorage.delete(userId, id)
}

export async function upsertBudget(
  userId: string,
  category_name: string,
  month: number,
  year: number,
  budgeted_amount: number
): Promise<Budget> {
  const supabase = createClient()
  const cleanCat = category_name.toLowerCase().trim()

  if (supabase) {
    const { data, error } = await supabase
      .from('budgets')
      .upsert(
        {
          user_id: userId,
          category_name: cleanCat,
          month,
          year,
          budgeted_amount,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,category_name,month,year' }
      )
      .select()
      .single()

    if (error) throw new Error(error.message)
    return {
      ...data,
      budgeted_amount: Number(data.budgeted_amount),
    }
  }

  // Local fallback
  const existing = budgetsStorage
    .getAll(userId)
    .find((b) => b.category_name === cleanCat && b.month === month && b.year === year)

  if (existing) {
    return budgetsStorage.update(userId, existing.id, { budgeted_amount })!
  }

  return budgetsStorage.insert(userId, {
    id: `bdg-${Date.now()}`,
    user_id: userId,
    category_name: cleanCat,
    month,
    year,
    budgeted_amount,
    created_at: new Date().toISOString(),
  })
}

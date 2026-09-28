import { createClient } from '@/lib/supabase/client'
import { createTableStorage } from './storage-fallback'
import type { Goal, GoalContribution } from '@/types'

const goalsStorage = createTableStorage<Goal>('goals', {
  'usr-kevin-001': [
    {
      id: 'g-seed-1',
      user_id: 'usr-kevin-001',
      name: 'Fondo de Emergencia',
      description: '6 meses de gastos esenciales',
      target_amount: 8000000,
      current_amount: 3200000,
      target_date: '2026-12-31',
      monthly_contribution: 400000,
      priority: 'alta',
      category: 'emergencia',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'g-seed-2',
      user_id: 'usr-kevin-001',
      name: 'Inversión inicial ETF',
      description: 'Trii o Tyba — primer portafolio',
      target_amount: 3000000,
      current_amount: 800000,
      target_date: '2026-09-30',
      monthly_contribution: 200000,
      priority: 'alta',
      category: 'inversion',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
})

export async function getGoals(userId: string): Promise<Goal[]> {
  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching goals from Supabase:', error)
      throw new Error(error.message)
    }

    return (data || []).map((row) => ({
      ...row,
      target_amount: Number(row.target_amount),
      current_amount: Number(row.current_amount),
      monthly_contribution: Number(row.monthly_contribution || 0),
    }))
  }

  return goalsStorage.getAll(userId)
}

export async function createGoal(
  userId: string,
  data: Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<Goal> {
  const supabase = createClient()
  if (supabase) {
    const payload = {
      user_id: userId,
      name: data.name,
      description: data.description || null,
      target_amount: data.target_amount,
      current_amount: data.current_amount || 0,
      target_date: data.target_date || null,
      monthly_contribution: data.monthly_contribution || 0,
      priority: data.priority || 'media',
      category: data.category || 'ahorro',
      status: data.status || 'active',
    }

    const { data: inserted, error } = await supabase
      .from('goals')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('Error creating goal in Supabase:', error)
      throw new Error(error.message)
    }

    return {
      ...inserted,
      target_amount: Number(inserted.target_amount),
      current_amount: Number(inserted.current_amount),
      monthly_contribution: Number(inserted.monthly_contribution || 0),
    }
  }

  const now = new Date().toISOString()
  const newGoal: Goal = {
    id: `goal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user_id: userId,
    created_at: now,
    updated_at: now,
    ...data,
  }

  return goalsStorage.insert(userId, newGoal)
}

export async function updateGoal(
  userId: string,
  id: string,
  updates: Partial<Goal>
): Promise<Goal> {
  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('goals')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating goal in Supabase:', error)
      throw new Error(error.message)
    }

    return {
      ...data,
      target_amount: Number(data.target_amount),
      current_amount: Number(data.current_amount),
      monthly_contribution: Number(data.monthly_contribution || 0),
    }
  }

  const updated = goalsStorage.update(userId, id, { ...updates, updated_at: new Date().toISOString() })
  if (!updated) throw new Error('Meta no encontrada')
  return updated
}

export async function deleteGoal(userId: string, id: string): Promise<void> {
  const supabase = createClient()
  if (supabase) {
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting goal in Supabase:', error)
      throw new Error(error.message)
    }
    return
  }

  goalsStorage.delete(userId, id)
}

export async function addGoalContribution(
  userId: string,
  goalId: string,
  amount: number,
  notes?: string
): Promise<GoalContribution> {
  const supabase = createClient()
  if (supabase) {
    // 1. Insert contribution record
    const { data: contrib, error: contribError } = await supabase
      .from('goal_contributions')
      .insert({
        goal_id: goalId,
        user_id: userId,
        amount,
        contribution_date: new Date().toISOString().split('T')[0],
        notes: notes || null,
      })
      .select()
      .single()

    if (contribError) throw new Error(contribError.message)

    // 2. Fetch current goal and increment
    const { data: goal } = await supabase
      .from('goals')
      .select('current_amount, target_amount')
      .eq('id', goalId)
      .eq('user_id', userId)
      .single()

    if (goal) {
      const nextAmount = Number(goal.current_amount) + amount
      const isCompleted = nextAmount >= Number(goal.target_amount)
      await supabase
        .from('goals')
        .update({
          current_amount: nextAmount,
          status: isCompleted ? 'completed' : 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', goalId)
    }

    return {
      ...contrib,
      amount: Number(contrib.amount),
    }
  }

  // Local fallback
  const allGoals = goalsStorage.getAll(userId)
  const targetGoal = allGoals.find((g) => g.id === goalId)
  if (targetGoal) {
    const nextAmount = targetGoal.current_amount + amount
    goalsStorage.update(userId, goalId, {
      current_amount: nextAmount,
      status: nextAmount >= targetGoal.target_amount ? 'completed' : targetGoal.status,
    })
  }

  return {
    id: `gc-${Date.now()}`,
    goal_id: goalId,
    user_id: userId,
    amount,
    contribution_date: new Date().toISOString().split('T')[0],
    notes: notes || null,
    created_at: new Date().toISOString(),
  }
}

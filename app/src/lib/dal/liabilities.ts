import { createClient } from '@/lib/supabase/client'
import { createTableStorage } from './storage-fallback'
import type { Liability } from '@/types'

const liabilitiesStorage = createTableStorage<Liability>('liabilities')

export async function getLiabilities(userId: string): Promise<Liability[]> {
  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('liabilities')
      .select('*')
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching liabilities from Supabase:', error)
      return []
    }

    return (data || []).map((row) => ({
      ...row,
      current_balance: Number(row.current_balance),
    }))
  }

  return liabilitiesStorage.getAll(userId)
}

export async function createLiability(
  userId: string,
  data: Omit<Liability, 'id' | 'user_id' | 'created_at'>
): Promise<Liability> {
  const supabase = createClient()
  if (supabase) {
    const { data: inserted, error } = await supabase
      .from('liabilities')
      .insert({
        user_id: userId,
        debt_id: data.debt_id || null,
        name: data.name,
        category: data.category,
        current_balance: data.current_balance,
        notes: data.notes || null,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return {
      ...inserted,
      current_balance: Number(inserted.current_balance),
    }
  }

  const newLiab: Liability = {
    id: `lia-${Date.now()}`,
    user_id: userId,
    created_at: new Date().toISOString(),
    ...data,
  }

  return liabilitiesStorage.insert(userId, newLiab)
}

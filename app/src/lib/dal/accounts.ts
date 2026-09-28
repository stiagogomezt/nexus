import { createClient } from '@/lib/supabase/client'
import { createTableStorage } from './storage-fallback'
import type { Account } from '@/types'

const accountsStorage = createTableStorage<Account>('accounts')


export async function getAccounts(userId: string): Promise<Account[]> {
  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching accounts from Supabase:', error)
      return []
    }

    return (data || []).map((row) => ({
      ...row,
      current_balance: Number(row.current_balance),
    }))
  }

  return accountsStorage.getAll(userId)
}

export async function createAccount(
  userId: string,
  data: Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<Account> {
  const supabase = createClient()
  if (supabase) {
    const { data: inserted, error } = await supabase
      .from('accounts')
      .insert({
        user_id: userId,
        name: data.name,
        account_type: data.account_type || 'bank',
        current_balance: data.current_balance || 0,
        currency: data.currency || 'COP',
        is_active: data.is_active ?? true,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return {
      ...inserted,
      current_balance: Number(inserted.current_balance),
    }
  }

  const now = new Date().toISOString()
  const newAccount: Account = {
    id: `acc-${Date.now()}`,
    user_id: userId,
    created_at: now,
    updated_at: now,
    ...data,
  }

  return accountsStorage.insert(userId, newAccount)
}

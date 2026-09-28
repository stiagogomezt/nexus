import { createClient } from '@/lib/supabase/client'
import { createTableStorage } from './storage-fallback'
import type { FinancialSnapshot } from '@/types'

const snapshotsStorage = createTableStorage<FinancialSnapshot>('financial_snapshots')


export async function getFinancialSnapshots(userId: string): Promise<FinancialSnapshot[]> {
  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('financial_snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('snapshot_date', { ascending: false })

    if (error) {
      console.error('Error fetching financial snapshots from Supabase:', error)
      throw new Error(error.message)
    }

    return (data || []).map((row) => ({
      ...row,
      total_assets: Number(row.total_assets),
      total_liabilities: Number(row.total_liabilities),
      net_worth: Number(row.net_worth),
      monthly_income: Number(row.monthly_income),
      monthly_expenses: Number(row.monthly_expenses),
      free_cash_flow: Number(row.free_cash_flow),
      savings_rate_pct: Number(row.savings_rate_pct),
      liquid_assets: Number(row.liquid_assets || 0),
      crypto_assets: Number(row.crypto_assets || 0),
      bank_assets: Number(row.bank_assets || 0),
      investments_value: Number(row.investments_value || 0),
      total_debt: Number(row.total_debt || 0),
      snapshot_frequency: row.snapshot_frequency || 'monthly',
    }))
  }

  return snapshotsStorage.getAll(userId).sort((a, b) => b.snapshot_date.localeCompare(a.snapshot_date))
}

export async function saveFinancialSnapshot(
  userId: string,
  data: Omit<FinancialSnapshot, 'id' | 'user_id' | 'created_at'>
): Promise<FinancialSnapshot> {
  const supabase = createClient()
  if (supabase) {
    const payload = {
      user_id: userId,
      snapshot_date: data.snapshot_date || new Date().toISOString().split('T')[0],
      snapshot_frequency: data.snapshot_frequency || 'monthly',
      total_assets: data.total_assets,
      total_liabilities: data.total_liabilities,
      net_worth: data.net_worth,
      monthly_income: data.monthly_income,
      monthly_expenses: data.monthly_expenses,
      free_cash_flow: data.free_cash_flow,
      savings_rate_pct: data.savings_rate_pct,
      liquid_assets: data.liquid_assets || 0,
      crypto_assets: data.crypto_assets || 0,
      bank_assets: data.bank_assets || 0,
      investments_value: data.investments_value || 0,
      total_debt: data.total_debt || 0,
      state_payload: data.state_payload || {},
    }

    const { data: inserted, error } = await supabase
      .from('financial_snapshots')
      .upsert(payload, { onConflict: 'user_id,snapshot_date' })
      .select()
      .single()

    if (error) {
      console.error('Error saving financial snapshot in Supabase:', error)
      throw new Error(error.message)
    }

    return {
      ...inserted,
      total_assets: Number(inserted.total_assets),
      total_liabilities: Number(inserted.total_liabilities),
      net_worth: Number(inserted.net_worth),
      monthly_income: Number(inserted.monthly_income),
      monthly_expenses: Number(inserted.monthly_expenses),
      free_cash_flow: Number(inserted.free_cash_flow),
      savings_rate_pct: Number(inserted.savings_rate_pct),
      liquid_assets: Number(inserted.liquid_assets || 0),
      crypto_assets: Number(inserted.crypto_assets || 0),
      bank_assets: Number(inserted.bank_assets || 0),
      investments_value: Number(inserted.investments_value || 0),
      total_debt: Number(inserted.total_debt || 0),
      snapshot_frequency: inserted.snapshot_frequency || 'monthly',
    }
  }

  const existing = snapshotsStorage.getAll(userId).find((s) => s.snapshot_date === data.snapshot_date)
  if (existing) {
    const updated = snapshotsStorage.update(userId, existing.id, {
      ...data,
      snapshot_frequency: data.snapshot_frequency || existing.snapshot_frequency || 'monthly',
    })
    if (updated) return updated
  }

  const newSnapshot: FinancialSnapshot = {
    id: `snp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    user_id: userId,
    snapshot_date: data.snapshot_date || new Date().toISOString().split('T')[0],
    snapshot_frequency: data.snapshot_frequency || 'monthly',
    total_assets: data.total_assets,
    total_liabilities: data.total_liabilities,
    net_worth: data.net_worth,
    monthly_income: data.monthly_income,
    monthly_expenses: data.monthly_expenses,
    free_cash_flow: data.free_cash_flow,
    savings_rate_pct: data.savings_rate_pct,
    liquid_assets: data.liquid_assets || 0,
    crypto_assets: data.crypto_assets || 0,
    bank_assets: data.bank_assets || 0,
    investments_value: data.investments_value || 0,
    total_debt: data.total_debt || 0,
    state_payload: data.state_payload,
    created_at: new Date().toISOString(),
  }

  return snapshotsStorage.insert(userId, newSnapshot)
}

export async function deleteFinancialSnapshot(userId: string, id: string): Promise<boolean> {
  const supabase = createClient()
  if (supabase) {
    const { error } = await supabase
      .from('financial_snapshots')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting financial snapshot in Supabase:', error)
      throw new Error(error.message)
    }

    return true
  }

  return snapshotsStorage.delete(userId, id)
}

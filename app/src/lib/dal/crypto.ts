/**
 * NEXUS Finance — Data Access Layer: Crypto Holdings
 * Manages manual and linked crypto holdings with Supabase PostgreSQL and local storage fallback.
 */

import { createClient } from '@/lib/supabase/client'
import { createTableStorage } from './storage-fallback'
import type { CryptoHolding } from '@/types/crypto'

const cryptoStorage = createTableStorage<CryptoHolding>('crypto_holdings', {
  'usr-kevin-001': [
    {
      id: 'hld-seed-btc-1',
      user_id: 'usr-kevin-001',
      asset: 'Bitcoin',
      symbol: 'BTC',
      quantity: 0.045,
      purchase_price_usd: 58200.0,
      purchase_price_cop: 241530000.0,
      purchase_date: '2026-06-15',
      platform: 'Ledger Cold',
      wallet_id: null,
      notes: 'HODL largo plazo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'hld-seed-sol-1',
      user_id: 'usr-kevin-001',
      asset: 'Solana',
      symbol: 'SOL',
      quantity: 8.5,
      purchase_price_usd: 125.0,
      purchase_price_cop: 518750.0,
      purchase_date: '2026-07-20',
      platform: 'Phantom Wallet',
      wallet_id: null,
      notes: 'Ecosistema Solana DeFi',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
})

export async function getCryptoHoldings(userId: string): Promise<CryptoHolding[]> {
  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('crypto_holdings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[DAL] Error fetching crypto holdings from Supabase:', error)
      throw new Error(error.message)
    }

    return (data || []).map((row) => ({
      ...row,
      quantity: Number(row.quantity),
      purchase_price_usd: Number(row.purchase_price_usd),
      purchase_price_cop: Number(row.purchase_price_cop),
    }))
  }

  return cryptoStorage.getAll(userId)
}

export async function createCryptoHolding(
  userId: string,
  data: Omit<CryptoHolding, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<CryptoHolding> {
  const supabase = createClient()

  if (supabase) {
    const payload = {
      user_id: userId,
      asset: data.asset,
      symbol: data.symbol.toUpperCase().trim(),
      quantity: data.quantity,
      purchase_price_usd: data.purchase_price_usd || 0,
      purchase_price_cop: data.purchase_price_cop || 0,
      purchase_date: data.purchase_date,
      platform: data.platform || 'Manual',
      wallet_id: data.wallet_id || null,
      notes: data.notes || null,
    }

    const { data: inserted, error } = await supabase
      .from('crypto_holdings')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('[DAL] Error inserting crypto holding in Supabase:', error)
      throw new Error(error.message)
    }

    return {
      ...inserted,
      quantity: Number(inserted.quantity),
      purchase_price_usd: Number(inserted.purchase_price_usd),
      purchase_price_cop: Number(inserted.purchase_price_cop),
    }
  }

  const newHolding: CryptoHolding = {
    id: `hld-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user_id: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...data,
    symbol: data.symbol.toUpperCase().trim(),
  }

  return cryptoStorage.insert(userId, newHolding)
}

export async function updateCryptoHolding(
  userId: string,
  id: string,
  updates: Partial<CryptoHolding>
): Promise<CryptoHolding> {
  const supabase = createClient()

  if (supabase) {
    const { data, error } = await supabase
      .from('crypto_holdings')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('[DAL] Error updating crypto holding in Supabase:', error)
      throw new Error(error.message)
    }

    return {
      ...data,
      quantity: Number(data.quantity),
      purchase_price_usd: Number(data.purchase_price_usd),
      purchase_price_cop: Number(data.purchase_price_cop),
    }
  }

  const updated = cryptoStorage.update(userId, id, updates)
  if (!updated) throw new Error('Posición crypto no encontrada')
  return updated
}

export async function deleteCryptoHolding(userId: string, id: string): Promise<void> {
  const supabase = createClient()

  if (supabase) {
    const { error } = await supabase
      .from('crypto_holdings')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('[DAL] Error deleting crypto holding in Supabase:', error)
      throw new Error(error.message)
    }
    return
  }

  cryptoStorage.delete(userId, id)
}

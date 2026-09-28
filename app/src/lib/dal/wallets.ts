/**
 * NEXUS Finance — Data Access Layer: On-Chain Public Wallets
 * Strictly READ-ONLY. Manages public addresses only.
 * Never stores or requests seed phrases or private keys.
 */

import { createClient } from '@/lib/supabase/client'
import { createTableStorage } from './storage-fallback'
import { walletService } from '@/lib/wallets/wallet-service'
import type { WalletAccount } from '@/types/crypto'

const walletsStorage = createTableStorage<WalletAccount>('wallets', {
  'usr-kevin-001': [
    {
      id: 'wlt-seed-evm-1',
      user_id: 'usr-kevin-001',
      name: 'Ledger Cold EVM',
      address: '0x71C81873E47b39E5D9051871C88172943A9F3a9F',
      blockchain: 'evm',
      network_name: 'Ethereum Mainnet',
      label: 'Cold Storage',
      is_active: true,
      last_synced_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'wlt-seed-sol-1',
      user_id: 'usr-kevin-001',
      name: 'Phantom Solana Hot',
      address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      blockchain: 'solana',
      network_name: 'Solana Mainnet',
      label: 'DeFi / Staking',
      is_active: true,
      last_synced_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
})

export async function getWallets(userId: string): Promise<WalletAccount[]> {
  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[DAL] Error fetching wallets from Supabase:', error)
      throw new Error(error.message)
    }

    return data || []
  }

  return walletsStorage.getAll(userId)
}

export async function createWallet(
  userId: string,
  data: Omit<WalletAccount, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<WalletAccount> {
  const cleanAddress = data.address.trim()

  // Strict public address syntax verification
  const isValid = walletService.validateAddress(cleanAddress, data.blockchain)
  if (!isValid) {
    throw new Error(`Dirección pública inválida para la blockchain ${data.blockchain.toUpperCase()}`)
  }

  const supabase = createClient()

  if (supabase) {
    const payload = {
      user_id: userId,
      name: data.name.trim(),
      address: cleanAddress,
      blockchain: data.blockchain,
      network_name: data.network_name || 'Mainnet',
      label: data.label || 'Personal',
      is_active: data.is_active ?? true,
      last_synced_at: new Date().toISOString(),
    }

    const { data: inserted, error } = await supabase
      .from('wallets')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('[DAL] Error inserting wallet in Supabase:', error)
      throw new Error(error.message)
    }

    return inserted
  }

  const newWallet: WalletAccount = {
    id: `wlt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user_id: userId,
    name: data.name.trim(),
    address: cleanAddress,
    blockchain: data.blockchain,
    network_name: data.network_name || 'Mainnet',
    label: data.label || 'Personal',
    is_active: data.is_active ?? true,
    last_synced_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  return walletsStorage.insert(userId, newWallet)
}

export async function updateWallet(
  userId: string,
  id: string,
  updates: Partial<WalletAccount>
): Promise<WalletAccount> {
  if (updates.address && updates.blockchain) {
    const isValid = walletService.validateAddress(updates.address, updates.blockchain)
    if (!isValid) {
      throw new Error(`Dirección pública inválida para ${updates.blockchain}`)
    }
  }

  const supabase = createClient()

  if (supabase) {
    const { data, error } = await supabase
      .from('wallets')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('[DAL] Error updating wallet in Supabase:', error)
      throw new Error(error.message)
    }

    return data
  }

  const updated = walletsStorage.update(userId, id, updates)
  if (!updated) throw new Error('Billetera no encontrada')
  return updated
}

export async function deleteWallet(userId: string, id: string): Promise<void> {
  const supabase = createClient()

  if (supabase) {
    const { error } = await supabase
      .from('wallets')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('[DAL] Error deleting wallet in Supabase:', error)
      throw new Error(error.message)
    }
    return
  }

  walletsStorage.delete(userId, id)
}

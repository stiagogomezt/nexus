import { createClient } from '@/lib/supabase/client'
import { createTableStorage } from './storage-fallback'
import type { Asset } from '@/types'

const assetsStorage = createTableStorage<Asset>('assets', {
  'usr-kevin-001': [
    {
      id: 'ast-seed-1',
      user_id: 'usr-kevin-001',
      name: 'Cuenta Nequi',
      category: 'cash',
      current_value: 650000,
      notes: null,
      created_at: new Date().toISOString(),
    },
    {
      id: 'ast-seed-2',
      user_id: 'usr-kevin-001',
      name: 'Cuenta Bancolombia',
      category: 'bank_accounts',
      current_value: 1200000,
      notes: null,
      created_at: new Date().toISOString(),
    },
  ],
})

export async function getAssets(userId: string): Promise<Asset[]> {
  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', userId)
      .order('current_value', { ascending: false })

    if (error) {
      console.error('Error fetching assets from Supabase:', error)
      throw new Error(error.message)
    }

    return (data || []).map((row) => ({
      ...row,
      current_value: Number(row.current_value),
    }))
  }

  return assetsStorage.getAll(userId)
}

export async function createAsset(
  userId: string,
  data: Omit<Asset, 'id' | 'user_id' | 'created_at'>
): Promise<Asset> {
  const supabase = createClient()
  if (supabase) {
    const payload = {
      user_id: userId,
      name: data.name,
      category: data.category || 'cash',
      current_value: data.current_value,
      notes: data.notes || null,
    }

    const { data: inserted, error } = await supabase
      .from('assets')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('Error creating asset in Supabase:', error)
      throw new Error(error.message)
    }

    return {
      ...inserted,
      current_value: Number(inserted.current_value),
    }
  }

  const newAsset: Asset = {
    id: `ast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user_id: userId,
    created_at: new Date().toISOString(),
    ...data,
  }

  return assetsStorage.insert(userId, newAsset)
}

export async function updateAsset(
  userId: string,
  id: string,
  updates: Partial<Asset>
): Promise<Asset> {
  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('assets')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating asset in Supabase:', error)
      throw new Error(error.message)
    }

    return {
      ...data,
      current_value: Number(data.current_value),
    }
  }

  const updated = assetsStorage.update(userId, id, updates)
  if (!updated) throw new Error('Activo no encontrado')
  return updated
}

export async function deleteAsset(userId: string, id: string): Promise<void> {
  const supabase = createClient()
  if (supabase) {
    const { error } = await supabase
      .from('assets')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting asset in Supabase:', error)
      throw new Error(error.message)
    }
    return
  }

  assetsStorage.delete(userId, id)
}

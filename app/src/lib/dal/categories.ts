import { createClient } from '@/lib/supabase/client'
import type { Category } from '@/types'

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', user_id: null, name: 'vivienda', icon: 'home', color: '#3b82f6', is_custom: false },
  { id: 'cat-2', user_id: null, name: 'alimentacion', icon: 'utensils', color: '#10b981', is_custom: false },
  { id: 'cat-3', user_id: null, name: 'transporte', icon: 'car', color: '#f59e0b', is_custom: false },
  { id: 'cat-4', user_id: null, name: 'educacion', icon: 'graduation-cap', color: '#8b5cf6', is_custom: false },
  { id: 'cat-5', user_id: null, name: 'servicios', icon: 'zap', color: '#06b6d4', is_custom: false },
  { id: 'cat-6', user_id: null, name: 'tecnologia', icon: 'laptop', color: '#6366f1', is_custom: false },
  { id: 'cat-7', user_id: null, name: 'entretenimiento', icon: 'film', color: '#ec4899', is_custom: false },
  { id: 'cat-8', user_id: null, name: 'compras', icon: 'shopping-bag', color: '#f43f5e', is_custom: false },
  { id: 'cat-9', user_id: null, name: 'salud', icon: 'heart-pulse', color: '#14b8a6', is_custom: false },
  { id: 'cat-10', user_id: null, name: 'suscripciones', icon: 'repeat', color: '#a855f7', is_custom: false },
  { id: 'cat-11', user_id: null, name: 'otros', icon: 'more-horizontal', color: '#64748b', is_custom: false },
]

export async function getCategories(userId: string): Promise<Category[]> {
  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching categories from Supabase:', error)
      return DEFAULT_CATEGORIES
    }

    return (data || []).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      icon: row.icon || 'tag',
      color: row.color || '#6366f1',
      is_custom: Boolean(row.is_custom),
    }))
  }

  return DEFAULT_CATEGORIES
}

export async function createCategory(
  userId: string,
  category: { name: string; icon?: string; color?: string }
): Promise<Category> {
  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('categories')
      .insert({
        user_id: userId,
        name: category.name.toLowerCase().trim(),
        icon: category.icon || 'tag',
        color: category.color || '#6366f1',
        is_custom: true,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  }

  return {
    id: `cat-${Date.now()}`,
    user_id: userId,
    name: category.name.toLowerCase().trim(),
    icon: category.icon || 'tag',
    color: category.color || '#6366f1',
    is_custom: true,
  }
}

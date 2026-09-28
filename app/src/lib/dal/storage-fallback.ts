/**
 * Data Access Layer — Offline/Local Isolated Persistence
 * Implements strict per-user table isolation matching the Supabase PostgreSQL schema.
 * Used when NEXT_PUBLIC_SUPABASE_URL is not yet configured, ensuring zero crashes
 * and full testability of CRUD, reload persistence, and user isolation.
 */

export interface StorageTable<T> {
  getAll: (userId: string) => T[]
  insert: (userId: string, item: T) => T
  update: (userId: string, id: string, updates: Partial<T>) => T | null
  delete: (userId: string, id: string) => boolean
}

export function createTableStorage<T extends { id: string; user_id: string }>(
  tableName: string,
  initialSeedByUserId?: Record<string, T[]>
): StorageTable<T> {
  const getKey = (userId: string) => `nexus_db_${tableName}_usr_${userId}`
  const memoryStore: Record<string, T[]> = {}

  const getList = (userId: string): T[] => {
    if (typeof window === 'undefined') {
      if (!memoryStore[userId]) {
        memoryStore[userId] = initialSeedByUserId?.[userId] ? [...initialSeedByUserId[userId]] : []
      }
      return memoryStore[userId]
    }
    try {
      const raw = localStorage.getItem(getKey(userId))
      if (!raw) {
        if (initialSeedByUserId && initialSeedByUserId[userId]) {
          const seeded = initialSeedByUserId[userId]
          localStorage.setItem(getKey(userId), JSON.stringify(seeded))
          return seeded
        }
        return []
      }
      return JSON.parse(raw)
    } catch {
      return []
    }
  }

  const saveList = (userId: string, items: T[]) => {
    if (typeof window === 'undefined') {
      memoryStore[userId] = items
      return
    }
    try {
      localStorage.setItem(getKey(userId), JSON.stringify(items))
    } catch (e) {
      console.error(`Error saving table ${tableName}`, e)
    }
  }

  return {
    getAll: (userId: string): T[] => {
      return getList(userId)
    },
    insert: (userId: string, item: T): T => {
      const items = getList(userId)
      const newItem = { ...item, user_id: userId }
      const updated = [newItem, ...items]
      saveList(userId, updated)
      return newItem
    },
    update: (userId: string, id: string, updates: Partial<T>): T | null => {
      const items = getList(userId)
      let found: T | null = null
      const updated = items.map((i) => {
        if (i.id === id) {
          found = { ...i, ...updates, user_id: userId }
          return found
        }
        return i
      })
      if (found) {
        saveList(userId, updated)
      }
      return found
    },
    delete: (userId: string, id: string): boolean => {
      const items = getList(userId)
      const filtered = items.filter((i) => i.id !== id)
      const changed = filtered.length !== items.length
      if (changed) {
        saveList(userId, filtered)
      }
      return changed
    },
  }
}

import { createClient, isSupabaseConfigured } from './client'
import type { UserProfile } from '@/types'

export interface AuthUser {
  id: string
  email: string
  full_name: string
  created_at: string
}

const LOCAL_SESSION_KEY = 'nexus_auth_session'
const LOCAL_USERS_KEY = 'nexus_registered_users'

interface StoredUser {
  id: string
  email: string
  passwordHash: string
  full_name: string
  created_at: string
}

// Simple deterministic hash for local offline development
function hashPass(pass: string): string {
  let hash = 0
  for (let i = 0; i < pass.length; i++) {
    hash = (hash << 5) - hash + pass.charCodeAt(i)
    hash |= 0
  }
  return 'h_' + Math.abs(hash).toString(16)
}

function getStoredUsers(): StoredUser[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY)
    if (!raw) {
      // Seed default demo user for frictionless immediate testing
      const defaultUser: StoredUser = {
        id: 'usr-kevin-001',
        email: 'kevin@nexusfinance.com',
        passwordHash: hashPass('nexus123'),
        full_name: 'Kevin (NEXUS)',
        created_at: new Date().toISOString(),
      }
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify([defaultUser]))
      return [defaultUser]
    }
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export async function getAuthToken(): Promise<string | null> {
  const supabase = createClient()
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  }
  return null
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = createClient()
  if (supabase) {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error || !session?.user) return null
    return {
      id: session.user.id,
      email: session.user.email || '',
      full_name: (session.user.user_metadata?.full_name as string) || session.user.email?.split('@')[0] || 'Usuario',
      created_at: session.user.created_at,
    }
  }

  // Local fallback
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export async function signIn(email: string, pass: string): Promise<{ user?: AuthUser; error?: string }> {
  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    })
    if (error) return { error: error.message }
    if (!data.user) return { error: 'No se pudo iniciar sesión' }

    return {
      user: {
        id: data.user.id,
        email: data.user.email || '',
        full_name: (data.user.user_metadata?.full_name as string) || data.user.email?.split('@')[0] || 'Usuario',
        created_at: data.user.created_at,
      },
    }
  }

  // Local mode
  const users = getStoredUsers()
  const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim())
  if (!found) {
    return { error: 'Usuario no encontrado. Regístrate primero.' }
  }
  if (found.passwordHash !== hashPass(pass)) {
    return { error: 'Contraseña incorrecta.' }
  }

  const sessionUser: AuthUser = {
    id: found.id,
    email: found.email,
    full_name: found.full_name,
    created_at: found.created_at,
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(sessionUser))
  }

  return { user: sessionUser }
}

export async function signUp(email: string, pass: string, fullName: string): Promise<{ user?: AuthUser; error?: string }> {
  if (pass.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres' }
  }

  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: { full_name: fullName },
      },
    })
    if (error) return { error: error.message }
    if (!data.user) return { error: 'Error al crear cuenta' }

    return {
      user: {
        id: data.user.id,
        email: data.user.email || '',
        full_name: fullName,
        created_at: data.user.created_at,
      },
    }
  }

  // Local mode
  const users = getStoredUsers()
  const exists = users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim())
  if (exists) {
    return { error: 'Este correo electrónico ya está registrado.' }
  }

  const newUser: StoredUser = {
    id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    email: email.trim(),
    passwordHash: hashPass(pass),
    full_name: fullName.trim() || email.split('@')[0],
    created_at: new Date().toISOString(),
  }

  users.push(newUser)
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users))
    const sessionUser: AuthUser = {
      id: newUser.id,
      email: newUser.email,
      full_name: newUser.full_name,
      created_at: newUser.created_at,
    }
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(sessionUser))
    return { user: sessionUser }
  }

  return { error: 'Entorno no disponible' }
}

export async function signOut(): Promise<void> {
  const supabase = createClient()
  if (supabase) {
    await supabase.auth.signOut()
  }
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LOCAL_SESSION_KEY)
  }
}

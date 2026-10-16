'use client'

import { useEffect } from 'react'
import { useFinancialStore } from '@/store/financial'
import { getCurrentUser } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/client'
import { AuthModal } from '@/components/auth/AuthModal'

interface DataLoaderProps {
  children: React.ReactNode
}

/**
 * DataLoader — Orquestador estricto de autenticación y carga de datos.
 *
 * Implementa 3 estados canónicos:
 * 1. AUTH_LOADING: Muestra skeleton / spinner. CERO datos financieros.
 * 2. UNAUTHENTICATED: Muestra pantalla de bienvenida / login. CERO datos financieros.
 * 3. AUTHENTICATED: Carga exclusivamente los datos de auth.uid() en Supabase.
 */
export function DataLoader({ children }: DataLoaderProps) {
  const {
    user,
    setUser,
    authState,
    setAuthState,
    fetchUserData,
    clearUserData,
    isDemoMode,
  } = useFinancialStore()

  useEffect(() => {
    let isMounted = true

    async function initSession() {
      // Si el usuario ya activó explícitamente el modo demostración, no reiniciar
      if (isDemoMode) {
        setAuthState('AUTHENTICATED')
        return
      }

      // Purge legacy mock residues from localStorage (e.g. from prior sandbox tests)
      if (typeof window !== 'undefined') {
        const legacyMockKeys = [
          'nexus_db_bank_accounts_usr_usr-local-guest',
          'nexus_db_bank_transactions_usr_usr-local-guest',
          'nexus_db_bank_connections_usr_usr-local-guest',
          'nexus_db_incomes_usr_usr-local-guest',
          'nexus_db_expenses_usr_usr-local-guest',
        ]
        legacyMockKeys.forEach((k) => localStorage.removeItem(k))

        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i)
          if (!key) continue
          if (key.includes('usr-local-guest') || key.includes('usr-kevin-001')) {
            localStorage.removeItem(key)
            continue
          }
          if (key.startsWith('nexus_db_bank_accounts_usr_')) {
            const raw = localStorage.getItem(key)
            if (raw && (raw.includes('3200000') || raw.includes('5421'))) {
              localStorage.removeItem(key)
            }
          }
          if (key.startsWith('nexus_db_bank_transactions_usr_')) {
            const raw = localStorage.getItem(key)
            if (raw && (raw.includes('2100000') || raw.includes('214500') || raw.includes('300000'))) {
              localStorage.removeItem(key)
            }
          }
        }
      }

      setAuthState('AUTH_LOADING')

      try {
        const currentUser = await getCurrentUser()

        if (!isMounted) return

        if (currentUser) {
          setUser(currentUser)
          setAuthState('AUTHENTICATED')
          await fetchUserData(currentUser.id)
        } else {
          clearUserData()
          setAuthState('UNAUTHENTICATED')
        }
      } catch (err) {
        console.error('Error inicializando sesión en DataLoader:', err)
        if (isMounted) {
          clearUserData()
          setAuthState('UNAUTHENTICATED')
        }
      }
    }

    initSession()

    // Suscripción reactiva a eventos de Supabase Auth
    const supabase = createClient()
    let authListener: { subscription: { unsubscribe: () => void } } | null = null

    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted) return

        if (session?.user) {
          const authUser = {
            id: session.user.id,
            email: session.user.email || '',
            full_name:
              (session.user.user_metadata?.full_name as string) ||
              session.user.email?.split('@')[0] ||
              'Usuario',
            created_at: session.user.created_at,
          }
          setUser(authUser)
          setAuthState('AUTHENTICATED')
          await fetchUserData(session.user.id)
        } else if (!isDemoMode) {
          clearUserData()
          setAuthState('UNAUTHENTICATED')
        }
      })
      authListener = data
    }

    return () => {
      isMounted = false
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe()
      }
    }
  }, [setUser, fetchUserData, clearUserData, setAuthState, isDemoMode])

  // ESTADO 1: AUTH_LOADING — Skeleton sin datos
  if (authState === 'AUTH_LOADING') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm w-full">
          <div className="w-12 h-12 border-3 border-blue-500/20 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <div className="space-y-1.5">
            <p className="text-sm font-bold text-slate-800 tracking-tight">
              Verificando sesión segura...
            </p>
            <p className="text-xs text-slate-400">
              Conectando con Supabase Cloud y cifrado de extremo a extremo
            </p>
          </div>
          {/* Skeleton placeholder */}
          <div className="pt-4 space-y-2 opacity-40">
            <div className="h-4 bg-slate-200 rounded-full w-3/4 mx-auto animate-pulse" />
            <div className="h-3 bg-slate-200 rounded-full w-1/2 mx-auto animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  // ESTADO 2: UNAUTHENTICATED — Pantalla de login / bienvenida (CERO datos financieros)
  if (authState === 'UNAUTHENTICATED' || !user) {
    return <AuthModal isOpen={true} isLanding={true} />
  }

  // ESTADO 3: AUTHENTICATED — Renderiza aplicación real del usuario
  return <>{children}</>
}

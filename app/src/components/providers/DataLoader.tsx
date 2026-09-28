'use client'

import { useEffect, useState } from 'react'
import { useFinancialStore } from '@/store/financial'
import { getCurrentUser } from '@/lib/supabase/auth'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { AuthModal } from '@/components/auth/AuthModal'

interface DataLoaderProps {
  children: React.ReactNode
}

/**
 * DataLoader — Connects the application to the Data Access Layer (Supabase/PostgreSQL).
 * 1. Checks current authenticated user.
 * 2. Fetches persistent user records through DAL.
 * 3. Injects records into Zustand store, which automatically runs the Financial Engine.
 * 4. Displays AuthModal if unauthenticated.
 */
export function DataLoader({ children }: DataLoaderProps) {
  const { user, setUser, fetchUserData, setLoading } = useFinancialStore()
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function initAuth() {
      setLoading(true)
      try {
        const currentUser = await getCurrentUser()
        if (isMounted) {
          if (currentUser) {
            setUser(currentUser)
            await fetchUserData(currentUser.id)
          } else if (isSupabaseConfigured()) {
            setUser(null)
          } else {
            // Offline/Local development without Supabase: clean empty user
            const guestUser = {
              id: 'usr-local-guest',
              email: 'usuario@nexus.local',
              full_name: 'Usuario NEXUS',
              created_at: new Date().toISOString(),
            }
            setUser(guestUser)
            await fetchUserData(guestUser.id)
          }
        }
      } catch (err) {
        console.error('Error initializing user session:', err)
      } finally {
        if (isMounted) {
          setLoading(false)
          setAuthChecked(true)
        }
      }
    }

    initAuth()

    return () => {
      isMounted = false
    }
  }, [setUser, fetchUserData, setLoading])

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-medium tracking-wide">
            Cargando NEXUS Finance...
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      {user ? children : <AuthModal isOpen={true} />}
    </>
  )
}


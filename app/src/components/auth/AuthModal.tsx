'use client'

import { useState } from 'react'
import { signIn, signUp } from '@/lib/supabase/auth'
import { useFinancialStore } from '@/store/financial'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { Zap, ShieldCheck, Mail, Lock, User, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react'

interface AuthModalProps {
  isOpen: boolean
  onClose?: () => void
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const { setUser, fetchUserData } = useFinancialStore()
  const hasSupabase = isSupabaseConfigured()

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)
    setLoading(true)

    try {
      if (isRegister) {
        const res = await signUp(email, password, fullName)
        if (res.error) {
          setError(res.error)
          setLoading(false)
          return
        }
        if (res.user) {
          setUser(res.user)
          await fetchUserData(res.user.id)
          setSuccessMsg('¡Cuenta creada exitosamente!')
          if (onClose) onClose()
        }
      } else {
        const res = await signIn(email, password)
        if (res.error) {
          setError(res.error)
          setLoading(false)
          return
        }
        if (res.user) {
          setUser(res.user)
          await fetchUserData(res.user.id)
          if (onClose) onClose()
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleQuickDemo(demoEmail: string, demoName: string) {
    setEmail(demoEmail)
    setPassword('nexus123')
    setLoading(true)
    setError(null)
    try {
      let res = await signIn(demoEmail, 'nexus123')
      if (res.error) {
        // Auto register demo user if not existing
        res = await signUp(demoEmail, 'nexus123', demoName)
      }
      if (res.user) {
        setUser(res.user)
        await fetchUserData(res.user.id)
        if (onClose) onClose()
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al conectar'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Subtle glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/30 mb-3 shadow-lg shadow-indigo-500/20">
            <Zap className="w-6 h-6 text-indigo-400" />
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            NEXUS <span className="text-indigo-400">FINANCE</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isRegister
              ? 'Crea tu cuenta para comenzar a gestionar tu patrimonio'
              : 'Inicia sesión para sincronizar tus finanzas personales'}
          </p>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] text-slate-300 mt-2.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                hasSupabase ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            {hasSupabase ? 'Supabase PostgreSQL Conectado' : 'Modo Persistente Aislado'}
          </div>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3 mb-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isRegister && (
            <div>
              <label className="label-field text-slate-300">Nombre completo</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Kevin Morales"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-field pl-9 text-xs"
                />
              </div>
            </div>
          )}

          <div>
            <label className="label-field text-slate-300">Correo Electrónico</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="kevin@nexusfinance.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field pl-9 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="label-field text-slate-300">Contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pl-9 text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{isRegister ? 'Registrarme' : 'Entrar a NEXUS'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Switch Login / Register */}
        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister)
              setError(null)
            }}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            {isRegister
              ? '¿Ya tienes cuenta? Inicia sesión aquí'
              : '¿No tienes cuenta aún? Regístrate aquí'}
          </button>
        </div>

        {/* Quick Demo Access (for easy testing of user isolation) */}
        <div className="mt-6 pt-5 border-t border-white/[0.08]">
          <p className="text-[11px] font-semibold text-slate-400 text-center mb-2.5 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Accesos rápidos de prueba (Aislamiento de usuarios):</span>
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickDemo('kevin@nexusfinance.com', 'Kevin (Shuffler)')}
              className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] text-left transition-all group"
            >
              <p className="text-indigo-300 font-bold text-[11px] group-hover:text-indigo-200">Usuario 1 · Kevin</p>
              <p className="text-[10px] text-slate-500">kevin@nexusfinance.com</p>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('maria@nexusfinance.com', 'María (Inversionista)')}
              className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] text-left transition-all group"
            >
              <p className="text-emerald-300 font-bold text-[11px] group-hover:text-emerald-200">Usuario 2 · María</p>
              <p className="text-[10px] text-slate-500">maria@nexusfinance.com</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

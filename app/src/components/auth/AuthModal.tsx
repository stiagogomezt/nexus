'use client'

import { useState } from 'react'
import { signIn, signUp } from '@/lib/supabase/auth'
import { useFinancialStore } from '@/store/financial'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { Zap, Mail, Lock, User, ArrowRight, CheckCircle2, ShieldCheck, PlayCircle, X } from 'lucide-react'

interface AuthModalProps {
  isOpen: boolean
  onClose?: () => void
  isLanding?: boolean
}

export function AuthModal({ isOpen, onClose, isLanding = false }: AuthModalProps) {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const { setUser, fetchUserData, enterDemoMode } = useFinancialStore()
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
      const msg = err instanceof Error ? err.message : 'Error inesperado al conectar'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  function handleExplicitDemo() {
    enterDemoMode()
    if (onClose) onClose()
  }

  const containerClasses = isLanding
    ? 'min-h-screen w-full flex items-center justify-center p-4 bg-slate-50'
    : 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md'

  return (
    <div className={containerClasses}>
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
        {/* Close button if modal */}
        {!isLanding && onClose && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Subtle brand glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-100 rounded-full blur-3xl pointer-events-none opacity-60" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-100 rounded-full blur-3xl pointer-events-none opacity-60" />

        {/* Header */}
        <div className="text-center mb-6 relative">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 mb-3 shadow-lg shadow-blue-600/25">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            NEXUS <span className="text-blue-600">FINANCE</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isRegister
              ? 'Crea tu cuenta para comenzar a gestionar tu patrimonio personal'
              : 'Inicia sesión para sincronizar tus finanzas personales reales'}
          </p>

          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-medium mt-2.5 ${
              hasSupabase
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-amber-50 border-amber-200 text-amber-700'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${hasSupabase ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}
            />
            {hasSupabase ? 'Supabase Cloud · Datos Reales' : 'Modo Local Aislado'}
          </div>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isRegister && (
            <div>
              <label className="label-field">Nombre completo</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Tu nombre completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-field pl-9 text-xs"
                />
              </div>
            </div>
          )}

          <div>
            <label className="label-field">Correo Electrónico</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="tu-correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field pl-9 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="label-field">Contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
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
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{isRegister ? 'Registrarme en NEXUS' : 'Entrar a NEXUS Finance'}</span>
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
            className="text-xs text-blue-600 hover:text-blue-700 transition-colors font-medium"
          >
            {isRegister
              ? '¿Ya tienes cuenta? Inicia sesión aquí'
              : '¿No tienes cuenta aún? Regístrate aquí'}
          </button>
        </div>

        {/* Explicit Demo Mode Option */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-center space-y-2">
            <p className="text-[11px] text-amber-800 leading-tight">
              ¿Deseas probar la plataforma sin registrar tus datos reales?
            </p>
            <button
              type="button"
              onClick={handleExplicitDemo}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-700 hover:bg-amber-100/50 text-xs font-semibold shadow-xs transition-all"
            >
              <PlayCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Entrar en modo demostración</span>
            </button>
            <p className="text-[10px] text-amber-600/80">
              * Los datos mostrados en demo son ficticios y nunca se mezclan con producción.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

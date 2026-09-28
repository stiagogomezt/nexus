'use client'

import { useState } from 'react'
import { Menu, LogOut, User, Database } from 'lucide-react'
import { useFinancialStore } from '@/store/financial'
import { signOut } from '@/lib/supabase/auth'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { AuthModal } from '@/components/auth/AuthModal'
import type { NavTab } from './Sidebar'

const PAGE_TITLES: Record<NavTab, { title: string; subtitle: string }> = {
  dashboard:    { title: 'Dashboard',       subtitle: 'Centro de control financiero' },
  ingresos:     { title: 'Ingresos',        subtitle: 'Shuffler · Pizza Hut · Otros' },
  gastos:       { title: 'Gastos',          subtitle: 'Control de egresos por categoría' },
  presupuesto:  { title: 'Presupuesto',     subtitle: 'Límites mensuales por categoría' },
  bancos:       { title: 'Banking & Open Finance', subtitle: 'Conexiones seguras · FAPI 2.0 · Extractos bancarios' },
  metas:        { title: 'Metas',           subtitle: 'Objetivos financieros y proyecciones' },
  deudas:       { title: 'Deudas',          subtitle: 'Amortización y estrategias de pago' },
  patrimonio:   { title: 'Patrimonio Neto', subtitle: 'Activos − Pasivos = Net Worth' },
  inversiones:  { title: 'Inversiones',     subtitle: 'Seguimiento de portafolio patrimonial' },
  crypto:       { title: 'Crypto Intelligence', subtitle: 'Mercado en vivo, valuación y asignación de activos' },
  wallets:      { title: 'Wallet Intelligence', subtitle: 'Billeteras públicas on-chain · Modo estrictamente Read-Only' },
  apuestas:     { title: 'Betting Tracker', subtitle: 'Módulo independiente · No es inversión' },
  'digital-twin': { title: 'Financial Digital Twin', subtitle: 'Estado financiero unificado, histórico y trayectoria multidimensional' },
  alertas:      { title: 'Centro de Alertas & Inteligencia', subtitle: 'Eventos financieros relevantes, explicaciones y alertas prioritarias' },
  ai:           { title: 'NEXUS AI Copilot', subtitle: 'Copiloto financiero respaldado en Financial Engine' },
  laboratorio:  { title: 'Laboratorio',     subtitle: 'Simulador de escenarios financieros' },
  configuracion:{ title: 'Configuración',   subtitle: 'Perfil, moneda y conexiones' },
}


interface HeaderProps {
  activeTab: NavTab
  onMenuOpen: () => void
}

export function Header({ activeTab, onMenuOpen }: HeaderProps) {
  const { title, subtitle } = PAGE_TITLES[activeTab]
  const { user, clearUserData } = useFinancialStore()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const hasSupabase = isSupabaseConfigured()

  const now = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  async function handleLogout() {
    await signOut()
    clearUserData()
    setShowAuthModal(true)
  }

  return (
    <>
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 lg:px-8 py-3.5 bg-[#07080f]/80 backdrop-blur-md border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            onClick={onMenuOpen}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-base font-bold text-white leading-tight">{title}</h1>
            <p className="text-[11px] text-slate-500 hidden sm:block">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-500 hidden md:block capitalize">{now}</span>

          {/* Database status indicator */}
          <div
            title={
              hasSupabase
                ? 'Conectado a Supabase Cloud con Row Level Security (RLS) activo.'
                : 'Modo Demo / Local: Los datos están aislados en el almacenamiento local de este navegador y no se sincronizan a la nube.'
            }
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors cursor-help ${
              hasSupabase
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/25 text-amber-300'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                hasSupabase ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="hidden sm:inline">
              {hasSupabase ? 'Supabase Cloud (En Vivo)' : 'Modo Demo / Local'}
            </span>
          </div>

          {/* User profile & auth actions */}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-200 leading-tight">
                  {user.full_name || user.email}
                </span>
                <span className="text-[10px] text-slate-500 truncate max-w-[140px]">
                  {user.email}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Cerrar sesión / Cambiar usuario"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-rose-500/15 text-slate-400 hover:text-rose-300 border border-white/[0.07] hover:border-rose-500/30 transition-all text-xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Salir</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all"
            >
              <User className="w-3.5 h-3.5" />
              <span>Iniciar Sesión</span>
            </button>
          )}
        </div>
      </header>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  )
}

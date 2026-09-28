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
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 lg:px-8 py-3.5 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            onClick={onMenuOpen}
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">{title}</h1>
            <p className="text-[11px] text-slate-500 hidden sm:block">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-400 hidden md:block capitalize">{now}</span>

          {/* Database status indicator */}
          <div
            title={
              hasSupabase
                ? 'Conectado a Supabase Cloud con Row Level Security (RLS) activo.'
                : 'Modo Demo / Local: Los datos están aislados en el almacenamiento local de este navegador y no se sincronizan a la nube.'
            }
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors cursor-help ${
              hasSupabase
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-amber-50 border-amber-200 text-amber-700'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                hasSupabase ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
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
                <span className="text-xs font-bold text-slate-800 leading-tight">
                  {user.full_name || user.email}
                </span>
                <span className="text-[10px] text-slate-400 truncate max-w-[140px]">
                  {user.email}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Cerrar sesión / Cambiar usuario"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-200 transition-all text-xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Salir</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-600/20 transition-all"
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

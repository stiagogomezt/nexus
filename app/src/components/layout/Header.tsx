'use client'

import { useState } from 'react'
import { Menu, LogOut, User, Database, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
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
  tennis:       { title: 'NEXUS Tennis Lab', subtitle: 'Terminal Cuantitativo de Tenis Profesional (ATP / WTA)' },
  'digital-twin': { title: 'Financial Digital Twin', subtitle: 'Estado financiero unificado, histórico y trayectoria multidimensional' },
  alertas:      { title: 'Centro de Alertas & Inteligencia', subtitle: 'Eventos financieros relevantes, explicaciones y alertas prioritarias' },
  ai:           { title: 'NEXUS AI Copilot', subtitle: 'Copiloto financiero respaldado en Financial Engine' },
  laboratorio:  { title: 'Laboratorio',     subtitle: 'Simulador de escenarios financieros' },
  configuracion:{ title: 'Configuración',   subtitle: 'Perfil, moneda y conexiones' },
}

interface HeaderProps {
  activeTab: NavTab
  onMenuOpen: () => void
  isSidebarCollapsed?: boolean
  onToggleSidebarCollapse?: () => void
}

export function Header({
  activeTab,
  onMenuOpen,
  isSidebarCollapsed = false,
  onToggleSidebarCollapse,
}: HeaderProps) {
  const { title, subtitle } = PAGE_TITLES[activeTab] || { title: 'NEXUS', subtitle: 'Finanzas Personales' }
  const { user, clearUserData, isDemoMode, exitDemoMode } = useFinancialStore()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const hasSupabase = isSupabaseConfigured()

  const now = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  async function handleLogout() {
    if (isDemoMode) {
      exitDemoMode()
      return
    }
    await signOut()
    clearUserData()
  }

  return (
    <>
      <header
        className="sticky top-0 z-20 flex items-center justify-between px-5 lg:px-8 py-3.5 transition-all"
        style={{
          background: 'hsla(0, 0%, 100%, 0.88)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid hsl(220, 15%, 90%)',
          boxShadow: '0 1px 2px hsla(220, 40%, 12%, 0.03)',
        }}
      >
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            onClick={onMenuOpen}
            aria-label="Abrir menú"
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop sidebar toggle button */}
          {onToggleSidebarCollapse && (
            <button
              onClick={onToggleSidebarCollapse}
              aria-label={isSidebarCollapsed ? "Expandir menú lateral" : "Contraer menú lateral"}
              className="hidden lg:flex p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/70 border border-slate-200/80 transition-all cursor-pointer"
              title={isSidebarCollapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-indigo-600" />
              ) : (
                <PanelLeftClose className="w-4 h-4 text-slate-500" />
              )}
            </button>
          )}

          <div>
            <h1
              className="text-base sm:text-lg leading-tight tracking-tight"
              style={{
                fontWeight: 700,
                color: 'hsl(222, 47%, 11%)',
                letterSpacing: '-0.02em',
              }}
            >
              {title}
            </h1>
            <p
              className="hidden sm:block mt-0.5"
              style={{
                fontSize: '0.75rem',
                color: 'hsl(215, 15%, 58%)',
                fontWeight: 400,
              }}
            >
              {subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Date pill */}
          <span
            className="hidden md:block capitalize px-2.5 py-1 rounded-lg"
            style={{
              fontSize: '0.6875rem',
              fontWeight: 500,
              color: 'hsl(215, 15%, 54%)',
              background: 'hsl(220, 20%, 96%)',
            }}
          >
            {now}
          </span>

          {/* Mode status indicator */}
          <div
            title={
              isDemoMode
                ? 'Modo Demostración activo: los datos son ficticios y no representan operaciones reales ni se sincronizan a la nube.'
                : hasSupabase
                ? 'Conectado a Supabase Cloud con datos reales y Row Level Security (RLS) activo.'
                : 'Modo Local Aislado: Datos reales guardados exclusivamente en el navegador.'
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-help transition-all"
            style={{
              background: isDemoMode
                ? 'hsl(38, 90%, 95%)'
                : hasSupabase
                ? 'hsl(152, 60%, 95%)'
                : 'hsl(215, 25%, 95%)',
              border: isDemoMode
                ? '1px solid hsl(38, 70%, 82%)'
                : hasSupabase
                ? '1px solid hsl(152, 50%, 82%)'
                : '1px solid hsl(215, 20%, 86%)',
              color: isDemoMode
                ? 'hsl(28, 70%, 36%)'
                : hasSupabase
                ? 'hsl(152, 60%, 30%)'
                : 'hsl(215, 20%, 40%)',
              fontSize: '0.6875rem',
            }}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${hasSupabase && !isDemoMode ? 'animate-pulse' : ''}`}
              style={{
                background: isDemoMode
                  ? 'hsl(38, 90%, 50%)'
                  : hasSupabase
                  ? 'hsl(152, 60%, 42%)'
                  : 'hsl(215, 20%, 50%)',
              }}
            />
            <span className="hidden sm:inline">
              {isDemoMode
                ? 'MODO DEMOSTRACIÓN · DATOS FICTICIOS'
                : hasSupabase
                ? 'DATOS REALES · Supabase Cloud'
                : 'DATOS REALES · Almacenamiento Local'}
            </span>
          </div>

          {/* User profile & auth actions */}
          {user ? (
            <div className="flex items-center gap-2.5 pl-1">
              <div className="hidden sm:flex flex-col text-right">
                <span
                  className="text-xs font-bold leading-tight"
                  style={{ color: 'hsl(222, 47%, 11%)' }}
                >
                  {user.full_name || user.email}
                </span>
                <span
                  className="truncate max-w-[140px]"
                  style={{ fontSize: '0.6875rem', color: 'hsl(215, 15%, 58%)' }}
                >
                  {user.email}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Cerrar sesión / Cambiar usuario"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all text-xs font-medium"
                style={{
                  background: 'hsl(220, 20%, 97%)',
                  borderColor: 'hsl(220, 15%, 90%)',
                  color: 'hsl(215, 16%, 40%)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'hsl(0, 72%, 97%)'
                  e.currentTarget.style.borderColor = 'hsl(0, 72%, 85%)'
                  e.currentTarget.style.color = 'hsl(0, 72%, 48%)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'hsl(220, 20%, 97%)'
                  e.currentTarget.style.borderColor = 'hsl(220, 15%, 90%)'
                  e.currentTarget.style.color = 'hsl(215, 16%, 40%)'
                }}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Salir</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white font-semibold text-xs transition-all active:scale-95"
              style={{
                background: 'linear-gradient(135deg, hsl(234, 85%, 55%) 0%, hsl(234, 85%, 48%) 100%)',
                boxShadow: '0 2px 8px hsla(234, 85%, 40%, 0.28)',
              }}
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

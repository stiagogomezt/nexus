'use client'

import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet2,
  Target,
  CreditCard,
  Landmark,
  TrendingUp,
  Dices,
  FlaskConical,
  Settings,
  Zap,
  Sparkles,
  Coins,
  Wallet,
  Building2,
  Cpu,
  Bell,
  Trophy,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { useFinancialStore } from '@/store/financial'

export type NavTab =
  | 'dashboard'
  | 'ingresos'
  | 'gastos'
  | 'presupuesto'
  | 'bancos'
  | 'metas'
  | 'deudas'
  | 'patrimonio'
  | 'inversiones'
  | 'crypto'
  | 'wallets'
  | 'apuestas'
  | 'tennis'
  | 'ai'
  | 'digital-twin'
  | 'alertas'
  | 'laboratorio'
  | 'configuracion'

const NAV_ITEMS: {
  id: NavTab
  label: string
  icon: React.ElementType
  group: string
  activeColor?: string
}[] = [
  { id: 'dashboard',    label: 'Dashboard',       icon: LayoutDashboard, group: 'main' },
  { id: 'ingresos',     label: 'Ingresos',         icon: ArrowDownLeft,   group: 'core', activeColor: 'text-emerald-600' },
  { id: 'gastos',       label: 'Gastos',           icon: ArrowUpRight,    group: 'core', activeColor: 'text-red-500' },
  { id: 'presupuesto',  label: 'Presupuesto',      icon: Wallet2,         group: 'core' },
  { id: 'bancos',       label: 'Bancos',           icon: Building2,       group: 'core', activeColor: 'text-indigo-600' },
  { id: 'metas',        label: 'Metas',            icon: Target,          group: 'patrimony', activeColor: 'text-teal-600' },
  { id: 'deudas',       label: 'Deudas',           icon: CreditCard,      group: 'patrimony', activeColor: 'text-amber-600' },
  { id: 'patrimonio',   label: 'Patrimonio',       icon: Landmark,        group: 'patrimony', activeColor: 'text-cyan-600' },
  { id: 'inversiones',  label: 'Inversiones',      icon: TrendingUp,      group: 'wealth', activeColor: 'text-indigo-600' },
  { id: 'crypto',       label: 'Crypto',           icon: Coins,           group: 'wealth', activeColor: 'text-violet-600' },
  { id: 'wallets',      label: 'Wallets',          icon: Wallet,          group: 'wealth', activeColor: 'text-violet-600' },
  { id: 'apuestas',     label: 'Apuestas',         icon: Dices,           group: 'wealth', activeColor: 'text-pink-600' },
  { id: 'tennis',       label: 'Tennis Lab',       icon: Trophy,          group: 'wealth', activeColor: 'text-emerald-600' },
  { id: 'digital-twin', label: 'Financial State',  icon: Cpu,             group: 'tools', activeColor: 'text-cyan-600' },
  { id: 'alertas',      label: 'Alertas',          icon: Bell,            group: 'tools', activeColor: 'text-amber-600' },
  { id: 'ai',           label: 'NEXUS AI',         icon: Sparkles,        group: 'tools', activeColor: 'text-indigo-600' },
  { id: 'laboratorio',  label: 'Laboratorio',      icon: FlaskConical,    group: 'tools' },
  { id: 'configuracion',label: 'Configuración',    icon: Settings,        group: 'tools' },
]

const GROUPS = [
  { id: 'main',      label: null },
  { id: 'core',      label: 'Flujo de Caja' },
  { id: 'patrimony', label: 'Patrimonio' },
  { id: 'wealth',    label: 'Riqueza' },
  { id: 'tools',     label: 'Herramientas' },
]

interface SidebarProps {
  activeTab: NavTab
  setActiveTab: (tab: NavTab) => void
  isOpen: boolean
  onClose: () => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export function Sidebar({
  activeTab,
  setActiveTab,
  isOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const { alerts } = useFinancialStore()
  const unreadAlertsCount = alerts.filter((a) => a.status === 'UNREAD').length

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 lg:hidden"
          style={{
            background: 'hsla(222, 47%, 11%, 0.4)',
            backdropFilter: 'blur(6px)',
          }}
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full z-40 flex flex-col',
          'transition-all duration-300 ease-in-out',
          isCollapsed ? 'lg:w-[76px]' : 'lg:w-72',
          isOpen ? 'w-72 translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        style={{
          background: 'hsl(0, 0%, 100%)',
          borderRight: '1px solid hsl(220, 15%, 90%)',
        }}
      >
        {/* Logo & Collapse Toggle */}
        <div
          className={cn(
            'flex items-center py-4.5 border-b border-slate-100 transition-all',
            isCollapsed ? 'justify-center px-3' : 'justify-between px-5'
          )}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 cursor-pointer"
              onClick={isCollapsed ? onToggleCollapse : undefined}
              title={isCollapsed ? "Expandir barra lateral" : "NEXUS FINANCE"}
              style={{
                background: 'linear-gradient(135deg, hsl(234, 85%, 55%) 0%, hsl(265, 70%, 55%) 100%)',
                boxShadow: '0 4px 12px hsla(234, 85%, 40%, 0.30)',
              }}
            >
              <Zap className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="whitespace-nowrap overflow-hidden">
                <div className="flex items-baseline gap-1.5">
                  <span
                    className="text-sm tracking-tight font-bold text-slate-900"
                  >
                    NEXUS
                  </span>
                  <span
                    className="text-sm tracking-tight font-bold text-indigo-600"
                  >
                    FINANCE
                  </span>
                </div>
                <p
                  className="mt-0.5 text-[10px] font-medium tracking-wider uppercase text-slate-400"
                >
                  Sistema Operativo
                </p>
              </div>
            )}
          </div>

          {!isCollapsed && onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Contraer barra lateral"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* When collapsed on desktop, show a subtle expand button */}
        {isCollapsed && onToggleCollapse && (
          <div className="hidden lg:flex justify-center py-2 border-b border-slate-100">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
              title="Expandir barra lateral para ver más opciones"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Nav */}
        <nav className={cn('flex-1 overflow-y-auto py-4 space-y-4', isCollapsed ? 'px-2' : 'px-3')}>
          {GROUPS.map((group) => {
            const items = NAV_ITEMS.filter((i) => i.group === group.id)
            if (!items.length) return null
            return (
              <div key={group.id}>
                {group.label && (
                  isCollapsed ? (
                    <div className="my-2 border-t border-slate-100 mx-2" />
                  ) : (
                    <p
                      className="px-3.5 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
                    >
                      {group.label}
                    </p>
                  )
                )}
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const isActive = activeTab === item.id
                    const Icon = item.icon
                    const isAlertItem = item.id === 'alertas'
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveTab(item.id)
                          // Auto-collapse on desktop if currently expanded to give maximum room to the page
                          if (!isCollapsed && onToggleCollapse) {
                            onToggleCollapse()
                          }
                        }}
                        title={isCollapsed ? item.label : undefined}
                        className={cn(
                          'sidebar-nav-item w-full relative transition-all',
                          isCollapsed ? 'justify-center px-0 py-2.5 rounded-xl' : '',
                          isActive && 'active'
                        )}
                      >
                        <div className="relative flex items-center justify-center">
                          <Icon
                            className={cn(
                              'nav-icon w-[18px] h-[18px] flex-shrink-0 transition-colors',
                              isActive
                                ? (item.activeColor ?? 'text-indigo-600')
                                : ''
                            )}
                            style={!isActive ? { color: 'hsl(215, 15%, 58%)' } : undefined}
                          />
                          {isCollapsed && isAlertItem && unreadAlertsCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
                          )}
                        </div>

                        {!isCollapsed && <span>{item.label}</span>}

                        {!isCollapsed && isAlertItem && unreadAlertsCount > 0 && (
                          <span
                            className="ml-auto font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200"
                          >
                            {unreadAlertsCount}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div
          className={cn(
            'py-3 border-t border-slate-100 transition-all',
            isCollapsed ? 'px-2 text-center' : 'px-5'
          )}
        >
          <div className={cn('flex items-center gap-2 text-[11px] text-slate-400', isCollapsed && 'justify-center')}>
            <span
              className="w-2 h-2 rounded-full animate-pulse bg-emerald-500 shrink-0"
            />
            {!isCollapsed && <span className="font-medium whitespace-nowrap">NEXUS v1.0 · Active</span>}
          </div>
        </div>
      </aside>
    </>
  )
}

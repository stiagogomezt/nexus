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
  Bot,
  Sparkles,
  Coins,
  Wallet,
  Building2,
  Cpu,
  Bell,
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
  { id: 'gastos',       label: 'Gastos',           icon: ArrowUpRight,    group: 'core', activeColor: 'text-red-600' },
  { id: 'presupuesto',  label: 'Presupuesto',      icon: Wallet2,         group: 'core' },
  { id: 'bancos',       label: 'Bancos',           icon: Building2,       group: 'core', activeColor: 'text-blue-600' },
  { id: 'metas',        label: 'Metas',            icon: Target,          group: 'patrimony', activeColor: 'text-teal-600' },
  { id: 'deudas',       label: 'Deudas',           icon: CreditCard,      group: 'patrimony', activeColor: 'text-amber-600' },
  { id: 'patrimonio',   label: 'Patrimonio',       icon: Landmark,        group: 'patrimony', activeColor: 'text-cyan-600' },
  { id: 'inversiones',  label: 'Inversiones',      icon: TrendingUp,      group: 'wealth', activeColor: 'text-blue-600' },
  { id: 'crypto',       label: 'Crypto',           icon: Coins,           group: 'wealth', activeColor: 'text-violet-600' },
  { id: 'wallets',      label: 'Wallets',          icon: Wallet,          group: 'wealth', activeColor: 'text-violet-600' },
  { id: 'apuestas',     label: 'Apuestas',         icon: Dices,           group: 'wealth', activeColor: 'text-pink-600' },
  { id: 'digital-twin', label: 'Financial State',  icon: Cpu,             group: 'tools', activeColor: 'text-cyan-600' },
  { id: 'alertas',      label: 'Alertas',          icon: Bell,            group: 'tools', activeColor: 'text-amber-600' },
  { id: 'ai',           label: 'NEXUS AI',         icon: Sparkles,        group: 'tools', activeColor: 'text-blue-600' },
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
}

export function Sidebar({ activeTab, setActiveTab, isOpen, onClose }: SidebarProps) {
  const { alerts } = useFinancialStore()
  const unreadAlertsCount = alerts.filter((a) => a.status === 'UNREAD').length

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-72 z-40 flex flex-col',
          'bg-white border-r border-slate-200',
          'transition-transform duration-300',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/25">
            <Zap className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-black text-slate-900 tracking-tight">NEXUS</span>
              <span className="text-sm font-black text-blue-600 tracking-tight">FINANCE</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">
              Sistema Operativo Financiero
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {GROUPS.map((group) => {
            const items = NAV_ITEMS.filter((i) => i.group === group.id)
            if (!items.length) return null
            return (
              <div key={group.id}>
                {group.label && (
                  <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {group.label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const isActive = activeTab === item.id
                    const Icon = item.icon
                    const isAlertItem = item.id === 'alertas'
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={cn(
                          'sidebar-nav-item w-full',
                          isActive && 'active'
                        )}
                      >
                        <Icon
                          className={cn(
                            'nav-icon w-4 h-4 flex-shrink-0 transition-colors',
                            isActive
                              ? (item.activeColor ?? 'text-blue-600')
                              : 'text-slate-400'
                          )}
                        />
                        <span>{item.label}</span>
                        {isAlertItem && unreadAlertsCount > 0 && (
                          <span className="ml-auto text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
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
        <div className="px-4 py-3 border-t border-slate-100">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>NEXUS v1.0 · Phase 1</span>
          </div>
        </div>
      </aside>
    </>
  )
}

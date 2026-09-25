import React from 'react';
import { 
  LayoutDashboard, 
  ArrowDownLeft, 
  ArrowUpRight, 
  PieChart, 
  Target, 
  CreditCard, 
  PiggyBank, 
  TrendingUp, 
  Dices, 
  Landmark, 
  FlaskConical, 
  Settings, 
  LogOut,
  Sparkles,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type NavTab = 
  | 'dashboard'
  | 'ingresos'
  | 'gastos'
  | 'presupuesto'
  | 'metas'
  | 'deudas'
  | 'ahorro'
  | 'inversiones'
  | 'apuestas'
  | 'patrimonio'
  | 'laboratorio'
  | 'configuracion';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen, onClose }) => {
  const { user, signOut, isSupabaseConnected } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'ingresos', label: 'Ingresos', icon: ArrowDownLeft, badge: 'Shuffler / Pizza Hut' },
    { id: 'gastos', label: 'Gastos', icon: ArrowUpRight, badge: null },
    { id: 'metas', label: 'Metas', icon: Target, badge: null },
    { id: 'deudas', label: 'Deudas', icon: CreditCard, badge: null },
    { id: 'patrimonio', label: 'Patrimonio', icon: Landmark, badge: 'Neto' },
    { id: 'presupuesto', label: 'Presupuesto', icon: PieChart, badge: null },
    { id: 'ahorro', label: 'Ahorro', icon: PiggyBank, badge: 'Emergencia' },
    { id: 'inversiones', label: 'Inversiones', icon: TrendingUp, badge: null },
    { id: 'apuestas', label: 'Apuestas', icon: Dices, badge: 'Betting' },
    { id: 'laboratorio', label: 'Laboratorio', icon: FlaskConical, badge: 'Fase 2' },
    { id: 'configuracion', label: 'Configuración', icon: Settings, badge: null },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#0d131f] border-r border-white/[0.08] flex flex-col
        transition-transform duration-300 ease-in-out lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand Header */}
        <div className="p-6 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-glow-sm shadow-emerald-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-white">NEXUS</span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  FINANCE
                </span>
              </div>
              <p className="text-xs text-slate-400">Master Wealth Hub</p>
            </div>
          </div>
        </div>

        {/* User Profile Mini Bar */}
        <div className="px-5 py-3.5 mx-3 mt-3 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-xs font-bold text-white uppercase">
              {user?.full_name ? user.full_name.charAt(0) : 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-medium text-slate-200 truncate">{user?.full_name || 'Usuario'}</p>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseConnected ? 'bg-emerald-400' : 'bg-cyan-400 animate-pulse'}`} />
                <span className="text-[10px] text-slate-400">
                  {isSupabaseConnected ? 'Supabase Sync' : 'Modo Local'}
                </span>
              </div>
            </div>
          </div>
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as NavTab);
                  if (window.innerWidth < 1024) onClose();
                }}
                className={`
                  w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium
                  transition-all duration-200 group
                  ${isActive 
                    ? 'bg-gradient-to-r from-emerald-500/15 to-cyan-500/10 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-950' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'}
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  <span>{item.label}</span>
                </div>
                
                <div className="flex items-center gap-1.5">
                  {item.badge && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                      isActive 
                        ? 'bg-emerald-500/20 text-emerald-300' 
                        : 'bg-white/[0.05] text-slate-400 group-hover:text-slate-300'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer info & Logout */}
        <div className="p-4 border-t border-white/[0.08] space-y-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-slate-900 border border-indigo-500/20">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-indigo-300 font-semibold">Perfil Activo</span>
              <span className="text-[10px] text-indigo-400 font-mono">v1.0 Fase 1</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Fuentes: <strong className="text-slate-200">Shuffler</strong> &amp; <strong className="text-slate-200">Pizza Hut</strong>
            </p>
          </div>

          <button
            onClick={() => signOut()}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
};

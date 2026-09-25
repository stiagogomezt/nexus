import React from 'react';
import { Menu, PlusCircle, Calendar, RefreshCw } from 'lucide-react';
import { NavTab } from './Sidebar';
import { useFinancial } from '../../context/FinancialContext';

interface HeaderProps {
  activeTab: NavTab;
  onOpenMobileMenu: () => void;
  onOpenQuickAdd: () => void;
}

const TAB_TITLES: Record<NavTab, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Panel Financiero Maestro',
    subtitle: 'Visión consolidada de ingresos, gastos, flujo libre, metas y patrimonio'
  },
  ingresos: {
    title: 'Módulo de Ingresos',
    subtitle: 'Registro de salario, turnos Shuffler, Pizza Hut, recargos y horas extras'
  },
  gastos: {
    title: 'Control de Gastos',
    subtitle: 'Categorización de salidas, métodos de pago y gastos esenciales'
  },
  metas: {
    title: 'Metas Financieras',
    subtitle: 'Objetivos de ahorro, porcentaje de avance y aportes programados'
  },
  deudas: {
    title: 'Gestión de Deudas',
    subtitle: 'Monitoreo de pasivos, tasas efectivas anuales y amortización'
  },
  patrimonio: {
    title: 'Patrimonio Neto',
    subtitle: 'Balance general de activos vs pasivos y evolución acumulada'
  },
  presupuesto: {
    title: 'Presupuestos Mensuales',
    subtitle: 'Límites de gasto por categoría con alertas preventivas'
  },
  ahorro: {
    title: 'Ahorro y Fondo de Emergencia',
    subtitle: 'Cobertura de gastos esenciales y reservas líquidas'
  },
  inversiones: {
    title: 'Seguimiento de Inversiones',
    subtitle: 'Portafolio de acciones, ETFs, CDTs y fondos'
  },
  apuestas: {
    title: 'Betting Tracker',
    subtitle: 'Registro estricto e independiente de apuestas deportivas'
  },
  laboratorio: {
    title: 'Laboratorio de Proyecciones',
    subtitle: 'Simulador financiero y escenarios hipotéticos a futuro'
  },
  configuracion: {
    title: 'Configuración del Sistema',
    subtitle: 'Preferencias de cuenta, cuentas bancarias y sincronización Supabase'
  }
};

export const Header: React.FC<HeaderProps> = ({ activeTab, onOpenMobileMenu, onOpenQuickAdd }) => {
  const { currency, setCurrency, resetToDefaults } = useFinancial();
  const info = TAB_TITLES[activeTab] || { title: 'NEXUS Finance', subtitle: '' };

  const todayFormatted = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date());

  return (
    <header className="sticky top-0 z-30 bg-[#080c14]/90 backdrop-blur-md border-b border-white/[0.08] px-4 lg:px-8 py-4">
      <div className="flex items-center justify-between gap-4">
        {/* Mobile trigger & Title */}
        <div className="flex items-center gap-4">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-lg bg-white/[0.05] text-slate-300 hover:text-white"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight">
              {info.title}
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">
              {info.subtitle}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Current Date Badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-slate-400 capitalize">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span>{todayFormatted}</span>
          </div>

          {/* Currency Toggle */}
          <div className="flex items-center bg-white/[0.04] p-1 rounded-lg border border-white/[0.06]">
            <button
              onClick={() => setCurrency('COP')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                currency === 'COP'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              COP
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                currency === 'USD'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              USD
            </button>
          </div>

          {/* Quick Action Button */}
          <button
            onClick={onOpenQuickAdd}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs shadow-glow-sm hover:brightness-110 active:scale-95 transition-all"
          >
            <PlusCircle className="w-4 h-4 text-slate-950" />
            <span className="hidden sm:inline">Nuevo Registro</span>
          </button>

          {/* Reset Demo Data Button (Discreet) */}
          <button
            onClick={() => {
              if (window.confirm('¿Restablecer datos financieros a los valores por defecto del perfil?')) {
                resetToDefaults();
              }
            }}
            title="Restablecer datos de prueba"
            className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

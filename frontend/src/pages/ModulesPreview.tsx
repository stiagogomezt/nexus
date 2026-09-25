import React from 'react';
import { useFinancial } from '../context/FinancialContext';
import { formatCurrency } from '../lib/formatters';
import { InvestmentItem } from '../types';
import { 
  FlaskConical, 
  Database
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// 1. PRESUPUESTO
export const BudgetsView: React.FC = () => {
  const { currency } = useFinancial();

  const budgetCategories = [
    { name: 'Alimentación', budget: 600000, spent: 480000 },
    { name: 'Vivienda', budget: 1200000, spent: 1100000 },
    { name: 'Servicios', budget: 250000, spent: 210000 },
    { name: 'Transporte', budget: 250000, spent: 180000 },
    { name: 'Entretenimiento', budget: 200000, spent: 140000 },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Presupuestos Mensuales</h2>
        <p className="text-xs text-slate-400">Control preventivo de gastos por categoría y límites de alerta</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {budgetCategories.map((b, i) => {
          const pct = (b.spent / b.budget) * 100;
          const remaining = b.budget - b.spent;
          const isNearLimit = pct >= 80;

          return (
            <div key={i} className="glass-card p-5 rounded-2xl border border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white text-sm">{b.name}</span>
                <span className={`font-extrabold ${isNearLimit ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {pct.toFixed(0)}% utilizado
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div 
                  className={`h-full ${isNearLimit ? 'bg-amber-500' : 'bg-emerald-500'} rounded-full`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
                <span>Gastado: <strong>{formatCurrency(b.spent, currency)}</strong></span>
                <span>Disponible: <strong className="text-emerald-400">{formatCurrency(remaining, currency)}</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 2. AHORRO Y FONDO DE EMERGENCIA
export const SavingsView: React.FC = () => {
  const { expenses, currency } = useFinancial();

  const essentialMonthly = expenses
    .filter((e) => e.is_essential)
    .reduce((acc: number, curr) => acc + curr.amount, 0);

  const emergencyTargets = [
    { label: '3 Meses (Mínimo)', target: essentialMonthly * 3 },
    { label: '6 Meses (Recomendado)', target: essentialMonthly * 6 },
    { label: '9 Meses (Robusto)', target: essentialMonthly * 9 },
    { label: '12 Meses (Máxima Paz)', target: essentialMonthly * 12 },
  ];

  const currentEmergencyFund = 4500000;

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Fondo de Emergencia y Ahorro Líquido</h2>
        <p className="text-xs text-slate-400">Protección financiera ante imprevistos calculada sobre tus gastos esenciales reales</p>
      </div>

      <div className="glass-panel p-6 rounded-3xl bg-gradient-to-r from-emerald-950/30 to-teal-950/20 border border-emerald-500/20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div>
            <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Gastos Esenciales Mensuales</span>
            <h3 className="text-2xl font-black text-white mt-1 numeric-tabular">{formatCurrency(essentialMonthly, currency)}</h3>
          </div>
          <div>
            <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Fondo Actual Disponible</span>
            <h3 className="text-2xl font-black text-emerald-400 mt-1 numeric-tabular">{formatCurrency(currentEmergencyFund, currency)}</h3>
          </div>
          <div>
            <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Cobertura Actual</span>
            <h3 className="text-2xl font-black text-white mt-1 numeric-tabular">
              {(currentEmergencyFund / (essentialMonthly || 1)).toFixed(1)} Meses
            </h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {emergencyTargets.map((et, idx) => {
          const coveredPct = Math.min(100, (currentEmergencyFund / (et.target || 1)) * 100);
          return (
            <div key={idx} className="glass-card p-5 rounded-2xl border border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">{et.label}</span>
                <span className="font-extrabold text-emerald-400">{coveredPct.toFixed(0)}%</span>
              </div>
              <p className="text-xs text-slate-400">Objetivo: {formatCurrency(et.target, currency)}</p>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${coveredPct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 3. INVERSIONES (Seguimiento, no ejecución)
export const InvestmentsView: React.FC = () => {
  const { investments, currency } = useFinancial();

  const totalCost = investments.reduce((acc: number, curr: InvestmentItem) => acc + (curr.purchase_price * curr.quantity), 0);
  const totalValue = investments.reduce((acc: number, curr: InvestmentItem) => acc + (curr.current_price * curr.quantity), 0);
  const totalReturn = totalValue - totalCost;
  const returnPct = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Seguimiento de Inversiones</h2>
          <p className="text-xs text-slate-400">Monitoreo de portafolio patrimonial. La aplicación sólo registra y analiza, no ejecuta compras ni ventas.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-indigo-500">
          <p className="text-xs text-slate-400 uppercase font-semibold">Capital Invertido</p>
          <h3 className="text-2xl font-extrabold text-white mt-1 numeric-tabular">{formatCurrency(totalCost, currency)}</h3>
        </div>
        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-emerald-500">
          <p className="text-xs text-slate-400 uppercase font-semibold">Valor Actual del Portafolio</p>
          <h3 className="text-2xl font-extrabold text-emerald-400 mt-1 numeric-tabular">{formatCurrency(totalValue, currency)}</h3>
        </div>
        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-cyan-500">
          <p className="text-xs text-slate-400 uppercase font-semibold">Ganancia No Realizada</p>
          <h3 className="text-2xl font-extrabold text-cyan-300 mt-1 numeric-tabular">
            +{formatCurrency(totalReturn, currency)} ({returnPct.toFixed(1)}%)
          </h3>
        </div>
      </div>

      <div className="glass-panel rounded-3xl overflow-hidden border border-white/[0.08]">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/[0.03] text-slate-400 uppercase font-semibold">
            <tr>
              <th className="p-4">Activo</th>
              <th className="p-4">Tipo</th>
              <th className="p-4">Plataforma</th>
              <th className="p-4 text-right">Cantidad</th>
              <th className="p-4 text-right">Precio Compra</th>
              <th className="p-4 text-right">Precio Actual</th>
              <th className="p-4 text-right">Valor Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {investments.map((inv: InvestmentItem) => (
              <tr key={inv.id} className="hover:bg-white/[0.02]">
                <td className="p-4 font-bold text-white">{inv.asset_name}</td>
                <td className="p-4 uppercase text-[10px] text-indigo-400">{inv.asset_type}</td>
                <td className="p-4 text-slate-300">{inv.platform}</td>
                <td className="p-4 text-right font-semibold">{inv.quantity}</td>
                <td className="p-4 text-right text-slate-400">{formatCurrency(inv.purchase_price, currency)}</td>
                <td className="p-4 text-right font-semibold text-slate-200">{formatCurrency(inv.current_price, currency)}</td>
                <td className="p-4 text-right font-extrabold text-emerald-400">
                  {formatCurrency(inv.quantity * inv.current_price, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 4. BETTING TRACKER (Separado de gastos e inversiones)
export const BettingView: React.FC = () => {
  const { bettingStat, currency } = useFinancial();

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Betting Tracker Independiente</h2>
        <p className="text-xs text-slate-400">
          Módulo estrictamente separado de gastos normales e inversiones. Mide entradas y salidas reales de apuestas.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-pink-500">
          <p className="text-xs text-slate-400 uppercase font-semibold">Total Apostado</p>
          <h3 className="text-2xl font-extrabold text-white mt-1 numeric-tabular">{formatCurrency(bettingStat.total_staked, currency)}</h3>
        </div>
        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-purple-500">
          <p className="text-xs text-slate-400 uppercase font-semibold">Total Retirado</p>
          <h3 className="text-2xl font-extrabold text-purple-400 mt-1 numeric-tabular">{formatCurrency(bettingStat.total_returned, currency)}</h3>
        </div>
        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-emerald-500">
          <p className="text-xs text-slate-400 uppercase font-semibold">Resultado Neto</p>
          <h3 className="text-2xl font-extrabold text-emerald-400 mt-1 numeric-tabular">
            +{formatCurrency(bettingStat.net_profit, currency)}
          </h3>
        </div>
        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-amber-500">
          <p className="text-xs text-slate-400 uppercase font-semibold">Apuestas Pendientes</p>
          <h3 className="text-2xl font-extrabold text-amber-400 mt-1 numeric-tabular">{bettingStat.pending_bets}</h3>
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-pink-950/20 border border-pink-500/20 text-xs text-slate-300">
        <p className="font-semibold text-pink-300 mb-1">Nota de Política Financiera NEXUS:</p>
        Las apuestas NO se clasifican bajo ningún concepto como inversiones. Mantienen un registro aislado para asegurar transparencia en el flujo de caja personal.
      </div>
    </div>
  );
};

// 5. LABORATORIO FINANCIERO (Fase 2 Preview)
export const LabView: React.FC = () => {
  return (
    <div className="space-y-6 pb-12">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Laboratorio Financiero &amp; Simulador</h2>
        <p className="text-xs text-slate-400">Proyecciones de escenarios hipotéticos: ahorro mensual, interés compuesto e inflación</p>
      </div>

      <div className="glass-panel p-8 rounded-3xl text-center space-y-4 max-w-2xl mx-auto border border-white/[0.08]">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto">
          <FlaskConical className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-white">Módulo Programado para Fase 2</h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          En la siguiente fase conectaremos el simulador con variables interactivas: tasa hipotética de rentabilidad, horizonte temporal (2026-2040), y el simulador de amortización avalancha/bola de nieve para tus deudas.
        </p>
      </div>
    </div>
  );
};

// 6. CONFIGURACIÓN Y SUPABASE SYNC
export const SettingsView: React.FC = () => {
  const { isSupabaseConnected } = useAuth();

  return (
    <div className="space-y-6 pb-12 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Configuración del Sistema</h2>
        <p className="text-xs text-slate-400">Ajustes de perfil, moneda y conexión a base de datos Supabase</p>
      </div>

      <div className="glass-panel p-6 rounded-3xl space-y-4 border border-white/[0.08]">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" />
          Estado de Base de Datos y Backend
        </h3>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Modo de Operación:</span>
            <span className={`font-bold px-2 py-0.5 rounded-full ${isSupabaseConnected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-cyan-500/20 text-cyan-300'}`}>
              {isSupabaseConnected ? 'Supabase Cloud (PostgreSQL)' : 'Modo Local Activo (Offline Persistence)'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Backend API:</span>
            <span className="font-semibold text-slate-200">FastAPI (Python 3.13)</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Seguridad:</span>
            <span className="font-semibold text-emerald-400">Row Level Security (RLS) Diseñado</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-white/[0.06] text-xs text-slate-300 space-y-2">
          <p className="font-bold text-white">¿Cómo conectar tu proyecto de Supabase en producción?</p>
          <p className="text-slate-400 text-[11px]">
            Crea un archivo <code className="text-emerald-400">.env</code> en la carpeta <code className="text-emerald-400">frontend</code> con tus variables:
          </p>
          <pre className="p-3 rounded-xl bg-black/40 text-[11px] text-slate-300 font-mono overflow-x-auto">
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co&#10;VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
          </pre>
        </div>
      </div>
    </div>
  );
};

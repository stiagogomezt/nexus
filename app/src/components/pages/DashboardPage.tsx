'use client'

import { useFinancialStore } from '@/store/financial'
import { formatCurrency, formatPercent, formatDate } from '@/lib/utils'
import { MetricCard } from '@/components/ui/MetricCard'
import { calcGoalProgress } from '@/lib/financial-engine'
import { NexusTodaySection } from '@/components/copilot/NexusTodaySection'
import type { NavTab } from '@/components/layout/Sidebar'
import {
  ArrowDownLeft, ArrowUpRight, CreditCard, Landmark,
  PiggyBank, TrendingUp, Dices, Target, Plus, ShieldCheck,
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, PieChart, Pie, Cell,
} from 'recharts'

const CATEGORY_COLORS: Record<string, string> = {
  vivienda:       '#3b82f6',
  alimentacion:   '#10b981',
  transporte:     '#f59e0b',
  servicios:      '#06b6d4',
  tecnologia:     '#6366f1',
  entretenimiento:'#ec4899',
  suscripciones:  '#a855f7',
  otros:          '#64748b',
}

const CASHFLOW_HISTORY = [
  { month: 'Jun', ingresos: 2_600_000, gastos: 2_100_000 },
  { month: 'Jul', ingresos: 2_850_000, gastos: 2_050_000 },
  { month: 'Ago', ingresos: 2_950_000, gastos: 2_150_000 },
]

export function DashboardPage({ onNavigate }: { onNavigate: (tab: NavTab) => void }) {
  const { metrics, currency, goals, expenses } = useFinancialStore()

  // Expense pie chart data
  const categoryTotals = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category_name] = (acc[e.category_name] || 0) + e.amount
    return acc
  }, {})
  const pieData = Object.entries(categoryTotals).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: CATEGORY_COLORS[name] ?? '#94a3b8',
  }))

  // Cash flow chart — append current month
  const chartData = [
    ...CASHFLOW_HISTORY,
    {
      month: 'Sep',
      ingresos: metrics.total_income_month,
      gastos: metrics.total_expenses_month,
    },
  ]

  const activeGoals = goals.filter((g) => g.status === 'active')

  return (
    <div className="space-y-6 pb-12">

      {/* ── FINANCIAL PULSE BANNER ─────────────────────────── */}
      <div className="glass-panel p-5 lg:p-6 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-[#0d0f1a] to-indigo-950/30 border-emerald-500/20 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                Pulso Financiero · NEXUS
              </span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tight tabular-nums">
              Flujo Libre: {formatCurrency(metrics.free_cash_flow, currency)}
            </h2>
            <p className="text-xs text-slate-400">
              {formatCurrency(metrics.total_income_month, currency)} recibidos
              — {formatCurrency(metrics.total_expenses_month, currency)} en gastos
              — Tasa de ahorro: <strong className="text-emerald-400">{formatPercent(metrics.savings_rate)}</strong>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onNavigate('ingresos')}
              className="px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Ingreso
            </button>
            <button
              onClick={() => onNavigate('gastos')}
              className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Gasto
            </button>
            <button
              onClick={() => onNavigate('patrimonio')}
              className="px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-slate-200 border border-white/[0.10] text-xs font-bold transition-all"
            >
              Ver Patrimonio →
            </button>
          </div>
        </div>
      </div>

      {/* ── PROACTIVE FINANCIAL COPILOT (NEXUS TODAY) ─────── */}
      <NexusTodaySection onNavigate={onNavigate} />

      {/* ── PRIMARY METRICS ────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Income with source breakdown */}
        <div className="glass-card p-5 rounded-2xl hover:border-emerald-500/30 transition-all cursor-pointer" onClick={() => onNavigate('ingresos')}>
          <div className="flex items-start justify-between">
            <div>
              <p className="metric-label mb-1">Ingresos del Mes</p>
              <p className="metric-value text-emerald-400 tabular-nums">
                {formatCurrency(metrics.total_income_month, currency)}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/[0.05] space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1.5 text-indigo-300 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                Shuffler
              </span>
              <span className="font-semibold text-slate-200 tabular-nums">
                {formatCurrency(metrics.income_by_source.shuffler, currency)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1.5 text-amber-300 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Pizza Hut
              </span>
              <span className="font-semibold text-slate-200 tabular-nums">
                {formatCurrency(metrics.income_by_source.pizza_hut, currency)}
              </span>
            </div>
            {metrics.income_by_source.others > 0 && (
              <div className="flex justify-between text-xs text-slate-400">
                <span>Otros</span>
                <span className="tabular-nums">{formatCurrency(metrics.income_by_source.others, currency)}</span>
              </div>
            )}
          </div>
        </div>

        <MetricCard
          title="Gastos del Mes"
          value={formatCurrency(metrics.total_expenses_month, currency)}
          subtitle={`${expenses.length} transacciones registradas`}
          icon={ArrowUpRight}
          iconClass="bg-rose-500/10 text-rose-400 border-rose-500/20"
          badge={{ text: `${((metrics.total_expenses_month / (metrics.total_income_month || 1)) * 100).toFixed(0)}% del ingreso`, variant: 'negative' }}
          onClick={() => onNavigate('gastos')}
        />

        <MetricCard
          title="Deuda Total"
          value={formatCurrency(metrics.total_debt, currency)}
          subtitle="Pasivos financieros activos"
          icon={CreditCard}
          iconClass="bg-amber-500/10 text-amber-400 border-amber-500/20"
          badge={{ text: 'En gestión', variant: 'warning' }}
          onClick={() => onNavigate('deudas')}
        />

        <MetricCard
          title="Patrimonio Neto"
          value={formatCurrency(metrics.net_worth, currency)}
          subtitle="Activos − Pasivos"
          icon={Landmark}
          iconClass="bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
          badge={{ text: metrics.net_worth >= 0 ? 'Positivo' : 'Déficit', variant: metrics.net_worth >= 0 ? 'positive' : 'negative' }}
          onClick={() => onNavigate('patrimonio')}
        />
      </div>

      {/* ── SECONDARY METRICS ──────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Ahorro Disponible"
          value={formatCurrency(metrics.total_assets, currency)}
          subtitle="Cuentas y efectivo"
          icon={PiggyBank}
          iconClass="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          badge={{ text: 'Líquido', variant: 'positive' }}
          onClick={() => onNavigate('patrimonio')}
        />
        <MetricCard
          title="Capital Invertido"
          value={formatCurrency(metrics.total_invested, currency)}
          subtitle="ETFs, Acciones y CDTs"
          icon={TrendingUp}
          iconClass="bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
          badge={{ text: 'Activo', variant: 'indigo' }}
          onClick={() => onNavigate('inversiones')}
        />
        <MetricCard
          title="Apuestas del Mes"
          value={formatCurrency(metrics.betting_staked_month, currency)}
          subtitle={`Neto: ${formatCurrency(metrics.betting_net_month, currency)}`}
          icon={Dices}
          iconClass="bg-pink-500/10 text-pink-400 border-pink-500/20"
          badge={{ text: 'Módulo independiente', variant: 'warning' }}
          onClick={() => onNavigate('apuestas')}
        />
        <MetricCard
          title="Progreso de Metas"
          value={formatPercent(metrics.average_goals_progress)}
          subtitle={`${metrics.active_goals_count} metas activas`}
          icon={Target}
          iconClass="bg-teal-500/10 text-teal-400 border-teal-500/20"
          badge={{ text: 'En curso', variant: 'positive' }}
          onClick={() => onNavigate('metas')}
        />
      </div>

      {/* ── CHARTS ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Flow Chart */}
        <div className="glass-panel p-6 rounded-3xl lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Ingresos vs Gastos</h3>
              <p className="text-xs text-slate-500">Evolución mes a mes del flujo neto</p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Ingresos
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Gastos
              </span>
            </div>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false}
                  tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`} />
                <Tooltip
                  formatter={(v: unknown) => [formatCurrency(Number(v), currency), '']}
                  contentStyle={{ background: '#0d0f1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 12 }}
                />
                <Area type="monotone" dataKey="ingresos" stroke="#10b981" strokeWidth={2} fill="url(#gInc)" />
                <Area type="monotone" dataKey="gastos" stroke="#f43f5e" strokeWidth={2} fill="url(#gExp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Pie */}
        <div className="glass-panel p-6 rounded-3xl space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white">Distribución de Gastos</h3>
            <p className="text-xs text-slate-500">Por categoría en el mes</p>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip
                  formatter={(v: unknown) => [formatCurrency(Number(v), currency), '']}
                  contentStyle={{ background: '#0d0f1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            {pieData.slice(0, 6).map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                <span className="text-slate-400 truncate">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── GOALS + PROFILE ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Goals */}
        <div className="glass-panel p-6 rounded-3xl lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Metas Financieras</h3>
              <p className="text-xs text-slate-500">Progreso y ritmo de avance mensual</p>
            </div>
            <button onClick={() => onNavigate('metas')} className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">
              Ver todas →
            </button>
          </div>
          <div className="space-y-3">
            {activeGoals.map((goal) => {
              const { progress_percent, remaining, on_track } = calcGoalProgress(goal)
              return (
                <div key={goal.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white text-sm">{goal.name}</span>
                    <div className="flex items-center gap-2">
                      {on_track
                        ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">En ritmo</span>
                        : <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">Atrasado</span>
                      }
                      <span className="font-extrabold text-emerald-400 tabular-nums">{formatPercent(progress_percent)}</span>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill bg-gradient-to-r from-emerald-500 to-cyan-400"
                      style={{ width: `${progress_percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Acumulado: <strong className="text-slate-200 tabular-nums">{formatCurrency(goal.current_amount, currency)}</strong></span>
                    <span>Restante: <strong className="text-slate-200 tabular-nums">{formatCurrency(remaining, currency)}</strong></span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Profile summary */}
        <div className="glass-panel p-6 rounded-3xl space-y-4">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4" />
            <span>Perfil de Ingresos</span>
          </div>
          <h4 className="text-sm font-bold text-white">Estructura Activa</h4>
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/25">
              <span className="font-bold text-indigo-300 block mb-1">Trabajo Principal · Shuffler</span>
              <p className="text-slate-400 text-[11px]">Salario base, recargos nocturnos, bonos de precisión y horas extras</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/25">
              <span className="font-bold text-amber-300 block mb-1">Side Job · Pizza Hut</span>
              <p className="text-slate-400 text-[11px]">Pago por horas, recargos dominicales y turnos complementarios</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-white/[0.05] text-[11px] text-slate-500">
              💡 Sin freelance asumido. Proyecciones sobre flujo real.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

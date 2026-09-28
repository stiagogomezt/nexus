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
  alimentacion:   '#16a34a',
  transporte:     '#f59e0b',
  servicios:      '#0891b2',
  tecnologia:     '#2563eb',
  entretenimiento:'#ec4899',
  suscripciones:  '#7c3aed',
  otros:          '#94a3b8',
}

export function DashboardPage({ onNavigate }: { onNavigate: (tab: NavTab) => void }) {
  const {
    metrics,
    currency,
    goals,
    expenses,
    incomes,
    accounts,
    debts,
    wallets,
    bankConnections,
    snapshots,
  } = useFinancialStore()

  const isNewUser =
    incomes.length === 0 &&
    expenses.length === 0 &&
    accounts.length === 0 &&
    debts.length === 0 &&
    wallets.length === 0 &&
    bankConnections.length === 0

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

  // Cash flow chart — strictly grounded from snapshots and active month
  const chartData = [
    ...snapshots.slice(-3).reverse().map((s) => ({
      month: new Date(s.snapshot_date).toLocaleDateString('es-CO', { month: 'short' }),
      ingresos: s.monthly_income,
      gastos: s.monthly_expenses,
    })),
    ...(metrics.total_income_month > 0 || metrics.total_expenses_month > 0
      ? [
          {
            month: new Date().toLocaleDateString('es-CO', { month: 'short' }),
            ingresos: metrics.total_income_month,
            gastos: metrics.total_expenses_month,
          },
        ]
      : []),
  ]

  const activeGoals = goals.filter((g) => g.status === 'active')


  return (
    <div className="space-y-6 pb-12">

      {/* ── ONBOARDING / EMPTY STATE BANNER (NUEVO USUARIO) ─── */}
      {isNewUser ? (
        <div className="bg-gradient-to-r from-blue-50 via-white to-emerald-50 border border-blue-100 p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-100 px-2.5 py-1 rounded-full border border-blue-200">
                Bienvenido a NEXUS Finance
              </span>
              <h2 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">
                Aún no tienes datos financieros.
              </h2>
              <p className="text-xs text-slate-500 max-w-xl">
                NEXUS Finance opera con tus datos reales. Conecta una cuenta o registra tu primer ingreso para activar tu flujo de caja, métricas de patrimonio y Gemelo Digital.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => onNavigate('ingresos')}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
              >
                <Plus className="w-3.5 h-3.5" /> Registrar Primer Ingreso
              </button>
              <button
                onClick={() => onNavigate('bancos')}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20"
              >
                <Landmark className="w-3.5 h-3.5" /> Conectar Cuenta
              </button>
              <button
                onClick={() => onNavigate('wallets')}
                className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-violet-600/20"
              >
                <CreditCard className="w-3.5 h-3.5" /> Añade tu primera billetera
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ── FINANCIAL PULSE BANNER ─────────────────────────── */
        <div className="bg-gradient-to-r from-emerald-50 via-white to-blue-50 border border-emerald-100 p-5 lg:p-6 rounded-3xl shadow-sm relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                  Pulso Financiero · NEXUS
                </span>
              </div>
              <h2 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight tabular-nums">
                Flujo Libre: {formatCurrency(metrics.free_cash_flow, currency)}
              </h2>
              <p className="text-xs text-slate-500">
                {formatCurrency(metrics.total_income_month, currency)} recibidos
                — {formatCurrency(metrics.total_expenses_month, currency)} en gastos
                — Tasa de ahorro: <strong className="text-emerald-600">{formatPercent(metrics.savings_rate)}</strong>
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => onNavigate('ingresos')}
                className="px-3 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Ingreso
              </button>
              <button
                onClick={() => onNavigate('gastos')}
                className="px-3 py-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 border border-red-200 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Gasto
              </button>
              <button
                onClick={() => onNavigate('patrimonio')}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold transition-all"
              >
                Ver Patrimonio →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PROACTIVE FINANCIAL COPILOT (NEXUS TODAY) ─────── */}
      <NexusTodaySection onNavigate={onNavigate} />

      {/* ── PRIMARY METRICS ────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Income with source breakdown */}
        <div className="glass-card p-5 rounded-2xl hover:border-emerald-300 transition-all cursor-pointer" onClick={() => onNavigate('ingresos')}>
          <div className="flex items-start justify-between">
            <div>
              <p className="metric-label mb-1">Ingresos del Mes</p>
              <p className="metric-value text-emerald-600 tabular-nums">
                {formatCurrency(metrics.total_income_month, currency)}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          {metrics.total_income_month === 0 ? (
            <p className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
              Sin ingresos registrados este mes
            </p>
          ) : (
            <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
              {metrics.income_by_source.shuffler > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-blue-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    Shuffler
                  </span>
                  <span className="font-semibold text-slate-700 tabular-nums">
                    {formatCurrency(metrics.income_by_source.shuffler, currency)}
                  </span>
                </div>
              )}
              {metrics.income_by_source.pizza_hut > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-amber-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Pizza Hut
                  </span>
                  <span className="font-semibold text-slate-700 tabular-nums">
                    {formatCurrency(metrics.income_by_source.pizza_hut, currency)}
                  </span>
                </div>
              )}
              {metrics.income_by_source.others > 0 && (
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Otros</span>
                  <span className="tabular-nums">{formatCurrency(metrics.income_by_source.others, currency)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <MetricCard
          title="Gastos del Mes"
          value={formatCurrency(metrics.total_expenses_month, currency)}
          subtitle={`${expenses.length} transacciones registradas`}
          icon={ArrowUpRight}
          iconClass="bg-red-50 text-red-600 border-red-200"
          badge={{ text: `${((metrics.total_expenses_month / (metrics.total_income_month || 1)) * 100).toFixed(0)}% del ingreso`, variant: 'negative' }}
          onClick={() => onNavigate('gastos')}
        />

        <MetricCard
          title="Deuda Total"
          value={formatCurrency(metrics.total_debt, currency)}
          subtitle="Pasivos financieros activos"
          icon={CreditCard}
          iconClass="bg-amber-50 text-amber-600 border-amber-200"
          badge={{ text: 'En gestión', variant: 'warning' }}
          onClick={() => onNavigate('deudas')}
        />

        <MetricCard
          title="Patrimonio Neto"
          value={formatCurrency(metrics.net_worth, currency)}
          subtitle="Activos − Pasivos"
          icon={Landmark}
          iconClass="bg-cyan-50 text-cyan-600 border-cyan-200"
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
          iconClass="bg-emerald-50 text-emerald-600 border-emerald-200"
          badge={{ text: 'Líquido', variant: 'positive' }}
          onClick={() => onNavigate('patrimonio')}
        />
        <MetricCard
          title="Capital Invertido"
          value={formatCurrency(metrics.total_invested, currency)}
          subtitle="ETFs, Acciones y CDTs"
          icon={TrendingUp}
          iconClass="bg-blue-50 text-blue-600 border-blue-200"
          badge={{ text: 'Activo', variant: 'indigo' }}
          onClick={() => onNavigate('inversiones')}
        />
        <MetricCard
          title="Apuestas del Mes"
          value={formatCurrency(metrics.betting_staked_month, currency)}
          subtitle={`Neto: ${formatCurrency(metrics.betting_net_month, currency)}`}
          icon={Dices}
          iconClass="bg-pink-50 text-pink-600 border-pink-200"
          badge={{ text: 'Módulo independiente', variant: 'warning' }}
          onClick={() => onNavigate('apuestas')}
        />
        <MetricCard
          title="Progreso de Metas"
          value={formatPercent(metrics.average_goals_progress)}
          subtitle={`${metrics.active_goals_count} metas activas`}
          icon={Target}
          iconClass="bg-teal-50 text-teal-600 border-teal-200"
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
              <h3 className="text-sm font-bold text-slate-900">Ingresos vs Gastos</h3>
              <p className="text-xs text-slate-500">Evolución mes a mes del flujo neto</p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5 text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Ingresos
              </span>
              <span className="flex items-center gap-1.5 text-red-600">
                <span className="w-2 h-2 rounded-full bg-red-500" /> Gastos
              </span>
            </div>
          </div>
          {chartData.length === 0 ? (
            <div className="empty-state h-56">
              <TrendingUp className="w-8 h-8 text-slate-300 mb-1" />
              <p className="text-xs font-semibold text-slate-600">Aún no hay histórico de flujo de caja</p>
              <p className="text-[11px] text-slate-400 max-w-sm">
                Registra tus ingresos y gastos de cada mes para construir tu gráfica de evolución financiera y proyecciones.
              </p>
            </div>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.20} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#dc2626" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                    tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`} />
                  <Tooltip
                    formatter={(v: unknown) => [formatCurrency(Number(v), currency), '']}
                    contentStyle={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 12, color: '#0F172A', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  />
                  <Area type="monotone" dataKey="ingresos" stroke="#16a34a" strokeWidth={2} fill="url(#gInc)" />
                  <Area type="monotone" dataKey="gastos" stroke="#dc2626" strokeWidth={2} fill="url(#gExp)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Expense Pie */}
        <div className="glass-panel p-6 rounded-3xl space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Distribución de Gastos</h3>
            <p className="text-xs text-slate-500">Por categoría en el mes</p>
          </div>
          {pieData.length === 0 ? (
            <div className="empty-state h-44">
              <CreditCard className="w-7 h-7 text-slate-300 mb-1" />
              <p className="text-xs font-semibold text-slate-600">Sin gastos este mes</p>
              <p className="text-[11px] text-slate-400">
                Tus categorías se graficarán automáticamente al registrar tu primer gasto.
              </p>
            </div>
          ) : (
            <>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                      {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip
                      formatter={(v: unknown) => [formatCurrency(Number(v), currency), '']}
                      contentStyle={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 12, color: '#0F172A', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                {pieData.slice(0, 6).map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                    <span className="text-slate-600 truncate">{item.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── GOALS + PROFILE ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Goals */}
        <div className="glass-panel p-6 rounded-3xl lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Metas Financieras</h3>
              <p className="text-xs text-slate-500">Progreso y ritmo de avance mensual</p>
            </div>
            <button onClick={() => onNavigate('metas')} className="text-xs text-blue-600 hover:text-blue-700 font-semibold">
              Ver todas →
            </button>
          </div>
          <div className="space-y-3">
            {activeGoals.length === 0 ? (
              <div className="empty-state p-6">
                <Target className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                <p className="text-xs font-semibold text-slate-600">No tienes metas financieras activas</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Crea metas de ahorro, inversión o pago de deudas para medir tu ritmo de avance mes a mes.
                </p>
                <button
                  onClick={() => onNavigate('metas')}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold transition-all border border-teal-200"
                >
                  <Plus className="w-3.5 h-3.5" /> Crear Primera Meta
                </button>
              </div>
            ) : (
              activeGoals.map((goal) => {
                const { progress_percent, remaining, on_track } = calcGoalProgress(goal)
                return (
                  <div key={goal.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 text-sm">{goal.name}</span>
                      <div className="flex items-center gap-2">
                        {on_track
                          ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">En ritmo</span>
                          : <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Atrasado</span>
                        }
                        <span className="font-extrabold text-emerald-600 tabular-nums">{formatPercent(progress_percent)}</span>
                      </div>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill bg-gradient-to-r from-emerald-500 to-cyan-500"
                        style={{ width: `${progress_percent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Acumulado: <strong className="text-slate-700 tabular-nums">{formatCurrency(goal.current_amount, currency)}</strong></span>
                      <span>Restante: <strong className="text-slate-700 tabular-nums">{formatCurrency(remaining, currency)}</strong></span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Profile summary */}
        <div className="glass-panel p-6 rounded-3xl space-y-4">
          <div className="flex items-center gap-2 text-blue-600 text-xs font-bold uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4" />
            <span>Perfil de Ingresos</span>
          </div>
          <h4 className="text-sm font-bold text-slate-900">Estructura Activa</h4>
          <div className="space-y-3 text-xs">
            {incomes.length === 0 ? (
              <div className="empty-state p-4">
                <p className="text-xs font-semibold text-slate-600">Sin fuentes de ingreso registradas</p>
                <p className="text-[11px] text-slate-400">
                  Agrega tus fuentes (salario, honorarios, negocios) para activar el análisis dinámico de flujo.
                </p>
                <button
                  onClick={() => onNavigate('ingresos')}
                  className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all border border-blue-200"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar Ingreso
                </button>
              </div>
            ) : (
              <>
                {incomes.map((inc) => (
                  <div key={inc.id} className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-blue-700">{inc.source}</span>
                      <span className="font-extrabold text-emerald-600 text-xs tabular-nums">
                        {formatCurrency(inc.amount, currency)}
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px]">
                      {inc.description || 'Ingreso registrado'} {inc.is_recurring ? '· Fijo / Recurrente' : '· Variable'}
                    </p>
                  </div>
                ))}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
                  💡 Proyecciones y ratios calculados sobre tu flujo real confirmado.
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

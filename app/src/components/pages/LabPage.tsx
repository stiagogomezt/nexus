'use client'

import { useState, useMemo, useEffect } from 'react'
import { useFinancialStore } from '@/store/financial'
import { formatCurrency } from '@/lib/utils'
import { simulateAdvancedScenario } from '@/lib/financial-engine'
import type { AdvancedScenarioParams } from '@/types'
import {
  FlaskConical,
  RotateCcw,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  ArrowUpRight,
  Wallet,
  Target,
  CreditCard,
  Info,
  Calendar,
  Layers,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts'

type PresetType = 'actual' | 'ahorro' | 'deuda' | 'ingresos' | 'personalizado'

const BASE_PARAMS: AdvancedScenarioParams = {
  name: 'Escenario Actual (Línea Base)',
  preset_type: 'actual',
  income_change_percent: 0,
  expense_change_percent: 0,
  extra_monthly_saving: 0,
  extra_debt_payment: 0,
  investment_return_percent: 8,
  inflation_percent: 6,
  months: 24,
  selected_goal_id: null,
  simulated_goal_contribution: 0,
  selected_debt_id: null,
  simulated_debt_payment: 0,
}

export function LabPage() {
  const {
    metrics,
    debts,
    goals,
    currency,
    activeScenarioPresetParams,
    clearScenarioPreset,
  } = useFinancialStore()

  const [params, setParams] = useState<AdvancedScenarioParams>(BASE_PARAMS)
  const [activeChartTab, setActiveChartTab] = useState<'net_worth' | 'debt' | 'savings'>('net_worth')

  // Check if bridged from Proactive Copilot / Scenario Bridge
  useEffect(() => {
    if (activeScenarioPresetParams) {
      const { preset, params: p } = activeScenarioPresetParams
      setParams((prev) => ({
        ...prev,
        name: `Escenario Proactivo: ${preset.toUpperCase()}`,
        preset_type: (preset === 'custom' ? 'personalizado' : preset) as PresetType,
        extra_monthly_saving: p.extraSaving ?? prev.extra_monthly_saving,
        income_change_percent: p.incomeChange ?? prev.income_change_percent,
        expense_change_percent: p.expenseChange ?? prev.expense_change_percent,
        extra_debt_payment: p.extraDebtPayment ?? prev.extra_debt_payment,
        months: p.horizon ?? prev.months,
        selected_goal_id: p.targetGoalId ?? prev.selected_goal_id,
        selected_debt_id: p.targetDebtId ?? prev.selected_debt_id,
      }))
      clearScenarioPreset()
    }
  }, [activeScenarioPresetParams, clearScenarioPreset])

  // Execute simulation reactively with pure deterministic engine (zero DB mutation)
  const result = useMemo(() => {
    return simulateAdvancedScenario(
      {
        monthly_income: metrics.total_income_month,
        monthly_expenses: metrics.total_expenses_month,
        current_net_worth: metrics.net_worth,
        debts,
        goals,
      },
      params
    )
  }, [metrics, debts, goals, params])

  // Presets handlers
  function applyPreset(type: PresetType) {
    if (type === 'actual') {
      setParams({
        ...BASE_PARAMS,
        selected_goal_id: goals[0]?.id || null,
      })
    } else if (type === 'ahorro') {
      setParams((prev) => ({
        ...prev,
        name: 'Escenario Ahorro (+ $300.000/mes)',
        preset_type: 'ahorro',
        extra_monthly_saving: 300_000,
        extra_debt_payment: 0,
        income_change_percent: 0,
        expense_change_percent: 0,
      }))
    } else if (type === 'deuda') {
      setParams((prev) => ({
        ...prev,
        name: 'Escenario Deuda (+ $400.000/mes)',
        preset_type: 'deuda',
        extra_monthly_saving: 0,
        extra_debt_payment: 400_000,
        income_change_percent: 0,
        expense_change_percent: 0,
      }))
    } else if (type === 'ingresos') {
      setParams((prev) => ({
        ...prev,
        name: 'Escenario Ingresos (+20% Pizza Hut / Shuffler)',
        preset_type: 'ingresos',
        income_change_percent: 20,
        expense_change_percent: 0,
        extra_monthly_saving: 200_000,
        extra_debt_payment: 0,
      }))
    } else {
      setParams((prev) => ({
        ...prev,
        preset_type: 'personalizado',
      }))
    }
  }

  function updateParam<K extends keyof AdvancedScenarioParams>(key: K, value: AdvancedScenarioParams[K]) {
    setParams((prev) => ({
      ...prev,
      preset_type: 'personalizado',
      [key]: value,
    }))
  }

  // Sample data points for smooth responsive charts
  const chartData = useMemo(() => {
    if (!result?.data_points) return []
    // If more than 36 months, take every 2nd or 3rd month to keep chart crisp
    const step = result.data_points.length > 36 ? 3 : result.data_points.length > 18 ? 2 : 1
    return result.data_points.filter((_, i) => i === 0 || (i + 1) % step === 0 || i === result.data_points.length - 1)
  }, [result])

  const totalDebtBalance = debts.reduce((sum, d) => sum + d.current_balance, 0)
  const isDebtFreeEarlier = (result.debt_payoff_months ?? 999) < (result.baseline_debt_payoff_months ?? 999)
  const monthsSavedDebt =
    result.baseline_debt_payoff_months && result.debt_payoff_months
      ? Math.max(0, result.baseline_debt_payoff_months - result.debt_payoff_months)
      : 0

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/5">
            <FlaskConical className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">Laboratorio Financiero</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                FASE K · Determinista
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Simulador prospectivo de escenarios · Proyecciones patrimoniales y amortizaciones deterministas
            </p>
          </div>
        </div>

        {/* Global Reset Action */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => applyPreset('actual')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] transition-all"
            title="Restablecer todos los supuestos al estado real de la cuenta"
          >
            <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
            Restaurar escenario actual
          </button>
        </div>
      </div>

      {/* Preset Selector Bar */}
      <div className="glass-panel p-3.5 rounded-2xl flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-400 px-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Escenarios Preset:
        </span>
        <button
          onClick={() => applyPreset('actual')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            params.preset_type === 'actual'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 border border-indigo-400/30'
              : 'bg-white/[0.03] text-slate-300 hover:bg-white/[0.07] border border-white/[0.06]'
          }`}
        >
          🔵 Escenario Actual
        </button>
        <button
          onClick={() => applyPreset('ahorro')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            params.preset_type === 'ahorro'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20 border border-emerald-400/30'
              : 'bg-white/[0.03] text-slate-300 hover:bg-white/[0.07] border border-white/[0.06]'
          }`}
        >
          🟢 Escenario Ahorro (+ $300k/mes)
        </button>
        <button
          onClick={() => applyPreset('deuda')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            params.preset_type === 'deuda'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20 border border-rose-400/30'
              : 'bg-white/[0.03] text-slate-300 hover:bg-white/[0.07] border border-white/[0.06]'
          }`}
        >
          🔴 Escenario Deuda (+ $400k/mes)
        </button>
        <button
          onClick={() => applyPreset('ingresos')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            params.preset_type === 'ingresos'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/20 border border-cyan-400/30'
              : 'bg-white/[0.03] text-slate-300 hover:bg-white/[0.07] border border-white/[0.06]'
          }`}
        >
          ⚡ Escenario Ingresos (+20% Pizza Hut / Shuffler)
        </button>
        <button
          onClick={() => applyPreset('personalizado')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            params.preset_type === 'personalizado'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20 border border-purple-400/30'
              : 'bg-white/[0.03] text-slate-300 hover:bg-white/[0.07] border border-white/[0.06]'
          }`}
        >
          ⚙️ Personalizado
        </button>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Configurator Panels (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Card 1: Core Macro & Flow Parameters */}
          <div className="glass-panel p-5 rounded-3xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                Supuestos y Palancas de Flujo
              </h3>
              <span className="text-[11px] text-slate-400">Horizonte: {params.months} meses</span>
            </div>

            {/* Income variation */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="text-slate-300 font-medium">Variación de Ingresos Laborales</label>
                <span className="font-bold text-indigo-400 tabular-nums">
                  {params.income_change_percent > 0 ? '+' : ''}
                  {params.income_change_percent}%
                </span>
              </div>
              <input
                type="range"
                min="-20"
                max="60"
                step="5"
                value={params.income_change_percent}
                onChange={(e) => updateParam('income_change_percent', Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>-20% (Caída)</span>
                <span>0% (Base)</span>
                <span>+60% (Ascenso/Horas Extra)</span>
              </div>
            </div>

            {/* Expense variation */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="text-slate-300 font-medium">Variación de Gastos Operativos</label>
                <span className={`font-bold tabular-nums ${params.expense_change_percent <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {params.expense_change_percent > 0 ? '+' : ''}
                  {params.expense_change_percent}%
                </span>
              </div>
              <input
                type="range"
                min="-30"
                max="40"
                step="5"
                value={params.expense_change_percent}
                onChange={(e) => updateParam('expense_change_percent', Number(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>-30% (Austeridad)</span>
                <span>0% (Base)</span>
                <span>+40% (Mayor Gasto)</span>
              </div>
            </div>

            {/* Extra savings input & quick buttons */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="text-slate-300 font-medium">Ahorro Mensual Adicional</label>
                <span className="font-bold text-emerald-400 tabular-nums">
                  {formatCurrency(params.extra_monthly_saving, currency)}/mes
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {[0, 150_000, 300_000, 500_000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => updateParam('extra_monthly_saving', amt)}
                    className={`py-1 rounded-lg text-[10px] font-semibold transition-all ${
                      params.extra_monthly_saving === amt
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] border border-white/[0.06]'
                    }`}
                  >
                    {amt === 0 ? '$0' : `+$${amt / 1000}k`}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="0"
                step="50000"
                className="input-field w-full text-xs"
                placeholder="0"
                value={params.extra_monthly_saving || ''}
                onChange={(e) => updateParam('extra_monthly_saving', Math.max(0, Number(e.target.value) || 0))}
              />
            </div>

            {/* Extra debt payment */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="text-slate-300 font-medium">Abono Extraordinario a Deudas</label>
                <span className="font-bold text-rose-400 tabular-nums">
                  {formatCurrency(params.extra_debt_payment, currency)}/mes
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {[0, 200_000, 400_000, 800_000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => updateParam('extra_debt_payment', amt)}
                    className={`py-1 rounded-lg text-[10px] font-semibold transition-all ${
                      params.extra_debt_payment === amt
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] border border-white/[0.06]'
                    }`}
                  >
                    {amt === 0 ? '$0' : `+$${amt / 1000}k`}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="0"
                step="50000"
                className="input-field w-full text-xs"
                placeholder="0"
                value={params.extra_debt_payment || ''}
                onChange={(e) => updateParam('extra_debt_payment', Math.max(0, Number(e.target.value) || 0))}
              />
            </div>

            {/* Horizon Selector (12, 24, 60 months) */}
            <div className="space-y-1.5 pt-2 border-t border-white/[0.05]">
              <label className="text-xs text-slate-300 font-medium">Horizonte Temporal</label>
              <div className="grid grid-cols-3 gap-2">
                {[12, 24, 60].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => updateParam('months', m)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      params.months === m
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                        : 'bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] border border-white/[0.06]'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    {m} Meses ({m / 12} {m === 12 ? 'año' : 'años'})
                  </button>
                ))}
              </div>
            </div>

            {/* Macro rates (Returns & Inflation) */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Retorno Anual (%)</span>
                  <span className="font-bold text-emerald-400 tabular-nums">{params.investment_return_percent}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="0.5"
                  value={params.investment_return_percent}
                  onChange={(e) => updateParam('investment_return_percent', Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Inflación Anual (%)</span>
                  <span className="font-bold text-amber-400 tabular-nums">{params.inflation_percent}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="0.5"
                  value={params.inflation_percent}
                  onChange={(e) => updateParam('inflation_percent', Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Goal Accelerator Simulator */}
          <div className="glass-panel p-5 rounded-3xl space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                Simulador de Metas Integradas
              </h3>
              <span className="text-[11px] text-emerald-400 font-semibold">Aceleración</span>
            </div>

            {goals && goals.length > 0 ? (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Seleccionar Meta:</label>
                  <select
                    className="input-field w-full text-xs"
                    value={params.selected_goal_id || goals[0]?.id || ''}
                    onChange={(e) => updateParam('selected_goal_id', e.target.value)}
                  >
                    {goals.map((g) => (
                      <option key={g.id} value={g.id} className="bg-slate-900 text-white">
                        {g.name} — {formatCurrency(g.current_amount, currency)} / {formatCurrency(g.target_amount, currency)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-300">Aporte mensual simulado:</span>
                    <span className="font-bold text-emerald-400 tabular-nums">
                      {formatCurrency(
                        params.simulated_goal_contribution ||
                          (goals.find((g) => g.id === (params.selected_goal_id || goals[0]?.id))?.monthly_contribution || 0) +
                            params.extra_monthly_saving,
                        currency
                      )}
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="50000"
                    className="input-field w-full text-xs"
                    placeholder="Monto de aporte simulado"
                    value={params.simulated_goal_contribution || ''}
                    onChange={(e) => updateParam('simulated_goal_contribution', Math.max(0, Number(e.target.value) || 0))}
                  />
                </div>

                {result.goal_simulation && (
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 font-medium">Meta: {result.goal_simulation.goal_name}</span>
                      {result.goal_simulation.months_saved > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                          ⚡ {result.goal_simulation.months_saved} meses antes
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span>Tiempo base: {result.goal_simulation.original_months ?? 'N/A'} meses</span>
                      <span className="text-emerald-300 font-bold">
                        En simulación: {result.goal_simulation.simulated_months ?? 'N/A'} meses
                      </span>
                    </div>
                    {result.goal_simulation.simulated_completion_date && (
                      <p className="text-[10px] text-slate-400">
                        Fecha proyectada de cumplimiento: <strong className="text-white">{result.goal_simulation.simulated_completion_date}</strong>
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No hay metas activas registradas en NEXUS.</p>
            )}
          </div>

          {/* Card 3: Debt Payoff Simulator */}
          <div className="glass-panel p-5 rounded-3xl space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-rose-400" />
                Impacto en Deudas y Libertad
              </h3>
              <span className="text-[11px] text-rose-400 font-semibold">Amortización</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Saldo Total Deuda Actual:</span>
                <span className="font-bold text-white tabular-nums">{formatCurrency(totalDebtBalance, currency)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Intereses Bancarios Ahorrados:</span>
                <span className="font-bold text-emerald-400 tabular-nums">
                  {formatCurrency(result.interest_saved, currency)}
                </span>
              </div>
              {isDebtFreeEarlier && monthsSavedDebt > 0 && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                  🎉 <strong>Libre de deudas {monthsSavedDebt} meses antes</strong> de lo previsto (en el mes {result.debt_payoff_months} en vez del mes {result.baseline_debt_payoff_months}).
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Results & Interactive Visualizations (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Key KPI Metric Cards (2x2 Grid) */}
          <div className="grid grid-cols-2 gap-4">
            {/* Card 1: Final Net Worth & Delta */}
            <div className="glass-card p-5 rounded-3xl border-l-4 border-l-emerald-500 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                  Patrimonio Proyectado
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/[0.05] text-slate-300">
                  Mes {params.months}
                </span>
              </div>
              <p className="text-2xl font-black text-white tabular-nums tracking-tight">
                {formatCurrency(result.final_net_worth, currency)}
              </p>
              <div className="flex items-center gap-1.5 text-xs font-bold">
                {result.net_worth_delta >= 0 ? (
                  <span className="text-emerald-400 flex items-center">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    +{formatCurrency(result.net_worth_delta, currency)} vs Base
                  </span>
                ) : (
                  <span className="text-rose-400 flex items-center">
                    <ArrowUpRight className="w-3.5 h-3.5 rotate-90" />
                    {formatCurrency(result.net_worth_delta, currency)} vs Base
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Línea Base: {formatCurrency(result.baseline_final_net_worth, currency)}
              </p>
            </div>

            {/* Card 2: Total Accumulated Savings */}
            <div className="glass-card p-5 rounded-3xl border-l-4 border-l-indigo-500 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                  Ahorro Acumulado
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/10 text-indigo-400">
                  En el Periodo
                </span>
              </div>
              <p className="text-2xl font-black text-indigo-300 tabular-nums tracking-tight">
                {formatCurrency(result.total_savings, currency)}
              </p>
              <div className="text-xs text-slate-400">
                Promedio mensual:{' '}
                <strong className="text-white">
                  {formatCurrency(result.total_savings / Math.max(1, params.months), currency)}/m
                </strong>
              </div>
              <p className="text-[11px] text-slate-500">
                Ahorro extra acumulado: {formatCurrency(params.extra_monthly_saving * params.months, currency)}
              </p>
            </div>

            {/* Card 3: Debt Remaining */}
            <div className="glass-card p-5 rounded-3xl border-l-4 border-l-rose-500 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-rose-400" />
                  Deuda Restante
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/10 text-rose-400">
                  Mes {params.months}
                </span>
              </div>
              <p className="text-2xl font-black text-rose-300 tabular-nums tracking-tight">
                {formatCurrency(result.total_debt_remaining, currency)}
              </p>
              <div className="text-xs text-slate-400">
                {result.total_debt_remaining === 0 ? (
                  <span className="text-emerald-400 font-bold">✅ 100% Libre de Deuda</span>
                ) : (
                  <span>Línea base: {formatCurrency(result.baseline_total_debt_remaining, currency)}</span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Reducción: {formatCurrency(totalDebtBalance - result.total_debt_remaining, currency)}
              </p>
            </div>

            {/* Card 4: Financial Freedom & Interest Saved */}
            <div className="glass-card p-5 rounded-3xl border-l-4 border-l-cyan-500 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Intereses Ahorrados
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-cyan-500/10 text-cyan-400">
                  Ganancia Neta
                </span>
              </div>
              <p className="text-2xl font-black text-cyan-300 tabular-nums tracking-tight">
                {formatCurrency(result.interest_saved, currency)}
              </p>
              <div className="text-xs text-slate-400">
                {monthsSavedDebt > 0 ? (
                  <span className="text-emerald-400 font-semibold">{monthsSavedDebt} meses antes de deuda cero</span>
                ) : (
                  <span>Pagos a tiempo</span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">Dinero retenido en tu bolsillo</p>
            </div>
          </div>

          {/* Interactive Comparison Chart Panel */}
          <div className="glass-panel p-6 rounded-3xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Comparativa Visual: Escenario vs Línea Base</h3>
              </div>

              {/* Chart Tabs */}
              <div className="flex items-center bg-white/[0.04] p-1 rounded-xl border border-white/[0.06]">
                <button
                  onClick={() => setActiveChartTab('net_worth')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    activeChartTab === 'net_worth'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Patrimonio
                </button>
                <button
                  onClick={() => setActiveChartTab('debt')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    activeChartTab === 'debt'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Deuda
                </button>
                <button
                  onClick={() => setActiveChartTab('savings')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    activeChartTab === 'savings'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Ahorro
                </button>
              </div>
            </div>

            {/* Recharts Area Container */}
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorNetWorthScenario" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorDebtScenario" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorSavingsScenario" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <XAxis dataKey="label" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#475569"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`}
                  />
                  <Tooltip
                    formatter={(v: unknown) => [formatCurrency(Number(v), currency), '']}
                    contentStyle={{
                      background: '#0d0f1a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12,
                      fontSize: 12,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />

                  {activeChartTab === 'net_worth' && (
                    <>
                      <Area
                        type="monotone"
                        dataKey="net_worth"
                        name="Escenario Simulado"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        fill="url(#colorNetWorthScenario)"
                      />
                      <Line
                        type="monotone"
                        dataKey="baseline_net_worth"
                        name="Línea Base Real"
                        stroke="#64748b"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={false}
                      />
                    </>
                  )}

                  {activeChartTab === 'debt' && (
                    <>
                      <Area
                        type="monotone"
                        dataKey="debt_balance"
                        name="Deuda (Escenario Simulado)"
                        stroke="#f43f5e"
                        strokeWidth={2.5}
                        fill="url(#colorDebtScenario)"
                      />
                      <Line
                        type="monotone"
                        dataKey="baseline_debt_balance"
                        name="Deuda (Línea Base)"
                        stroke="#94a3b8"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={false}
                      />
                    </>
                  )}

                  {activeChartTab === 'savings' && (
                    <>
                      <Area
                        type="monotone"
                        dataKey="savings_accumulated"
                        name="Ahorro Acumulado"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        fill="url(#colorSavingsScenario)"
                      />
                    </>
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Milestone Comparison Table */}
          <div className="glass-panel p-5 rounded-3xl space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Hitos Clave del Escenario</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-white/[0.06] text-slate-400">
                    <th className="pb-2 font-medium">Hito Temporal</th>
                    <th className="pb-2 font-medium">Línea Base</th>
                    <th className="pb-2 font-medium">Escenario Simulado</th>
                    <th className="pb-2 font-medium">Delta / Ganancia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {[6, 12, 24, params.months]
                    .filter((m, idx, arr) => m <= params.months && arr.indexOf(m) === idx)
                    .map((m) => {
                      const dp = result.data_points[Math.min(m, result.data_points.length) - 1]
                      if (!dp) return null
                      const delta = dp.net_worth - dp.baseline_net_worth
                      return (
                        <tr key={m} className="hover:bg-white/[0.02]">
                          <td className="py-2.5 font-bold text-white">Mes {m} ({dp.label})</td>
                          <td className="py-2.5 text-slate-400 tabular-nums">
                            {formatCurrency(dp.baseline_net_worth, currency)}
                          </td>
                          <td className="py-2.5 text-emerald-400 font-semibold tabular-nums">
                            {formatCurrency(dp.net_worth, currency)}
                          </td>
                          <td className="py-2.5 tabular-nums">
                            <span className={delta >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                              {delta >= 0 ? '+' : ''}{formatCurrency(delta, currency)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Mandatory Safety Disclaimer Banner */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-start gap-3 text-xs text-slate-400">
        <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-300">
            Escenario hipotético basado en supuestos deterministas. No modifica tus datos reales.
          </p>
          <p className="text-[11px] text-slate-500">
            Todas las proyecciones son simuladas en memoria mediante el Financial Engine determinista de NEXUS.
            Los cálculos integran tasas efectivas anuales ponderadas, crecimiento geométrico y supuestos de ahorro sin alterar en ningún momento tus cuentas bancarias, ingresos registrados ni balances reales en la base de datos PostgreSQL/Supabase.
          </p>
        </div>
      </div>
    </div>
  )
}

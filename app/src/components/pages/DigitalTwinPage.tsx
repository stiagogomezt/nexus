'use client'

import React, { useState } from 'react'
import { useFinancialStore } from '@/store/financial'
import { formatCurrency } from '@/lib/utils'
import {
  Cpu,
  ShieldCheck,
  Camera,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Coins,
  Building2,
  Wallet,
  Activity,
  Layers,
  ArrowRight,
  Info,
  Calendar,
  Sparkles,
  Percent,
  Check,
  Dices,
  Landmark,
  Target,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react'
import { FinancialChangeDetector } from '@/lib/digital-twin/change-detector'

export function DigitalTwinPage() {
  const { digitalTwin, snapshots, takeSnapshot, refreshDigitalTwin, currency } = useFinancialStore()
  const [isTakingSnapshot, setIsTakingSnapshot] = useState(false)
  const [snapshotSuccess, setSnapshotSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'state' | 'health' | 'bridge' | 'timeline'>('overview')
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null)

  const handleCreateSnapshot = async () => {
    setIsTakingSnapshot(true)
    setSnapshotSuccess(null)
    try {
      const snap = await takeSnapshot()
      setSnapshotSuccess(`Snapshot del ${snap.snapshot_date} registrado con éxito.`)
      setTimeout(() => setSnapshotSuccess(null), 4000)
    } catch (err) {
      console.error('Error creando snapshot:', err)
    } finally {
      setIsTakingSnapshot(false)
    }
  }

  const twin = digitalTwin
  const state = twin?.currentState

  if (!state) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Cpu className="w-12 h-12 text-cyan-600 animate-pulse mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Calculando Financial Digital Twin...</h2>
        <p className="text-gray-400 text-sm max-w-md">
          Sintetizando balance bancario, flujo laboral, pasivos, cartera crypto y metas financieras.
        </p>
        <button
          onClick={() => refreshDigitalTwin()}
          className="mt-6 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Reintentar Derivación
        </button>
      </div>
    )
  }

  const health = state.healthIndicators
  const anomalies = twin.anomalies || []
  const timeline = twin.projectedTrajectory || []

  const activeBaseline = selectedSnapshotId
    ? snapshots.find((s) => s.id === selectedSnapshotId) || snapshots[0]
    : snapshots[0] || null

  const changes = activeBaseline && state
    ? FinancialChangeDetector.compareStateWithSnapshot(state, activeBaseline)
    : null

  const renderDelta = (
    delta?: { absoluteDelta: number; percentageDelta: number; direction: 'increase' | 'decrease' | 'unchanged' },
    isDebtOrExpense: boolean = false
  ) => {
    if (!delta || delta.direction === 'unchanged') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-gray-400">
          <Minus className="w-3 h-3" /> Sin cambio
        </span>
      )
    }

    const isPositive = isDebtOrExpense
      ? delta.direction === 'decrease'
      : delta.direction === 'increase'

    const colorClass = isPositive
      ? 'bg-emerald-950/60 text-emerald-600 border border-emerald-800/40'
      : 'bg-rose-950/60 text-red-600 border border-rose-800/40'

    const sign = delta.absoluteDelta > 0 ? '+' : ''

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${colorClass}`}>
        {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
        {sign}{formatCurrency(delta.absoluteDelta, currency)} ({delta.percentageDelta > 0 ? '+' : ''}{delta.percentageDelta}%)
      </span>
    )
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'excellent':
      case 'OPTIMAL':
        return 'text-emerald-600 bg-emerald-950/40 border-emerald-800/40'
      case 'good':
      case 'STABLE':
        return 'text-cyan-600 bg-cyan-950/40 border-cyan-800/40'
      case 'fair':
      case 'ATTENTION':
        return 'text-amber-600 bg-amber-950/40 border-amber-800/40'
      default:
        return 'text-red-600 bg-rose-950/40 border-rose-800/40'
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-cyan-950/30 to-slate-900 border border-cyan-800/30 p-6 md:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-600 border border-cyan-500/20 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" /> FASE N: FINANCIAL DIGITAL TWIN
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                Derivación Determinista
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Gemelo Digital Financiero
            </h1>
            <p className="text-gray-400 text-sm mt-1 max-w-2xl">
              Representación unificada del estado patrimonial y de flujo de caja en tiempo real,
              alimentada por el Financial Engine y lista para alimentar NEXUS AI y el Scenario Lab.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={handleCreateSnapshot}
              disabled={isTakingSnapshot}
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-slate-900 font-medium rounded-xl text-sm transition-all shadow-lg shadow-cyan-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              {isTakingSnapshot ? 'Registrando...' : 'Capturar Snapshot de Hoy'}
            </button>
          </div>
        </div>

        {snapshotSuccess && (
          <div className="mt-4 p-3 bg-emerald-950/50 border border-emerald-800/50 rounded-xl text-emerald-600 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            {snapshotSuccess}
          </div>
        )}

        {/* Tab navigation */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800/60 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              activeTab === 'overview'
                ? 'bg-cyan-500/20 text-cyan-600 border border-cyan-500/30'
                : 'text-gray-400 hover:text-slate-900 hover:bg-slate-800/40'
            }`}
          >
            Estado Consolidado
          </button>
          <button
            onClick={() => setActiveTab('state')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              activeTab === 'state'
                ? 'bg-cyan-500/20 text-cyan-600 border border-cyan-500/30'
                : 'text-gray-400 hover:text-slate-900 hover:bg-slate-800/40'
            }`}
          >
            Financial State (Actual / Cambio / Histórico)
          </button>
          <button
            onClick={() => setActiveTab('health')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              activeTab === 'health'
                ? 'bg-cyan-500/20 text-cyan-600 border border-cyan-500/30'
                : 'text-gray-400 hover:text-slate-900 hover:bg-slate-800/40'
            }`}
          >
            Health Center ({twin.healthSummary.status})
          </button>
          <button
            onClick={() => setActiveTab('bridge')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              activeTab === 'bridge'
                ? 'bg-cyan-500/20 text-cyan-600 border border-cyan-500/30'
                : 'text-gray-400 hover:text-slate-900 hover:bg-slate-800/40'
            }`}
          >
            Net Worth Bridge
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              activeTab === 'timeline'
                ? 'bg-cyan-500/20 text-cyan-600 border border-cyan-500/30'
                : 'text-gray-400 hover:text-slate-900 hover:bg-slate-800/40'
            }`}
          >
            Línea de Tiempo (2026 - 2030)
          </button>
        </div>
      </div>

      {/* 2. Executive Health Summary Card */}
      <div className="bg-white border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider border ${statusColor(
                twin.healthSummary.status
              )}`}
            >
              {twin.healthSummary.status}
            </span>
            <span className="text-slate-900 font-medium text-sm">{twin.healthSummary.headline}</span>
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Corte: {new Date(state.asOfDate).toLocaleDateString('es-CO', { dateStyle: 'medium' })}
          </div>
        </div>

        {/* Strategic recommendations */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {twin.recommendations.map((rec, idx) => (
            <div
              key={idx}
              className="bg-slate-950/40 border border-slate-800/40 rounded-xl p-3 text-xs text-gray-300 flex items-start gap-2.5"
            >
              <Sparkles className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
              <span>{rec}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key 4 Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-50 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs text-gray-400 font-medium">Patrimonio Neto</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {formatCurrency(state.netWorth.netWorth, currency)}
              </div>
              <div className="mt-2 text-xs text-cyan-600 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Solvencia: {state.netWorth.solvencyRatio}x
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs text-gray-400 font-medium">Liquidez Inmediata</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {formatCurrency(state.liquidity.totalLiquid, currency)}
              </div>
              <div className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Colchón: {state.liquidity.runwayMonths} meses
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs text-gray-400 font-medium">Flujo Libre Operativo</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {formatCurrency(state.cashFlow.netOperatingCashFlow, currency)}
              </div>
              <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                <Percent className="w-3.5 h-3.5" />
                Ahorro: {state.cashFlow.savingsRate}%
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs text-gray-400 font-medium">Carga de Deuda</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {formatCurrency(state.debts.totalDebt, currency)}
              </div>
              <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5" />
                DTI: {state.debts.debtToIncomeRatio}% del ingreso
              </div>
            </div>
          </div>

          {/* Real Incomes (Shuffler vs Pizza Hut) & Betting Separation */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Incomes breakdown */}
            <div className="bg-slate-50 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" /> Fuentes de Ingreso Reales
                </h3>
                <span className="text-xs text-gray-400">Total: {formatCurrency(state.income.total, currency)}</span>
              </div>
              <div className="space-y-3">
                <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900">Shuffler Corp</div>
                    <div className="text-xs text-gray-400">Trabajo Principal</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-emerald-600">
                      {formatCurrency(state.income.shuffler, currency)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {state.income.total > 0
                        ? `${Math.round((state.income.shuffler / state.income.total) * 100)}% del total`
                        : '0%'}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900">Pizza Hut</div>
                    <div className="text-xs text-gray-400">Side Job / Trabajo Secundario</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-emerald-600">
                      {formatCurrency(state.income.pizzaHut, currency)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {state.income.total > 0
                        ? `${Math.round((state.income.pizzaHut / state.income.total) * 100)}% del total`
                        : '0%'}
                    </div>
                  </div>
                </div>

                {state.income.other > 0 && (
                  <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-slate-900">Otros Ingresos</div>
                      <div className="text-xs text-gray-400">Extraordinarios</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-600">
                        {formatCurrency(state.income.other, currency)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Betting Module (Strictly Isolated) */}
            <div className="bg-slate-50 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Dices className="w-4 h-4 text-purple-400" /> Módulo de Apuestas (Independiente)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950/60 text-purple-300 border border-purple-800/40">
                  NO ES INVERSIÓN
                </span>
              </div>

              <div className="bg-purple-950/20 border border-purple-900/30 rounded-xl p-3.5 mb-4 text-xs text-purple-200">
                <p>
                  <strong>Regla Estricta del Núcleo Financiero:</strong> Las apuestas son
                  clasificadas exclusivamente como egreso/actividad recreativa. No forman parte del
                  cálculo de rendimiento de activos ni del patrimonio neto.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-3">
                  <span className="text-[11px] text-gray-400">Dinero Apostado</span>
                  <div className="text-base font-bold text-slate-900 mt-1">
                    {formatCurrency(state.betting.totalStaked, currency)}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    {state.betting.cashFlowImpactPercent}% del ingreso mensual
                  </div>
                </div>

                <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-3">
                  <span className="text-[11px] text-gray-400">Resultado Neto (P&L)</span>
                  <div
                    className={`text-base font-bold mt-1 ${
                      state.betting.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {state.betting.netProfit >= 0 ? '+' : ''}
                    {formatCurrency(state.betting.netProfit, currency)}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    ROI: {state.betting.roiPercent}% | Aciertos: {state.betting.winRatePercent}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Anomalies alert block */}
          {anomalies.length > 0 && (
            <div className="bg-slate-50 border border-amber-900/40 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-amber-600 uppercase tracking-wider flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4" /> Señales y Anomalías Detectadas (Detect → Record → Show)
              </h3>
              <div className="space-y-3">
                {anomalies.map((anom) => (
                  <div
                    key={anom.id}
                    className="bg-slate-950/60 border border-amber-900/30 rounded-xl p-3.5 flex items-start justify-between gap-4"
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>{anom.title}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            anom.severity === 'critical'
                              ? 'bg-rose-950 text-red-600 border border-rose-800/40'
                              : 'bg-amber-950 text-amber-600 border border-amber-800/40'
                          }`}
                        >
                          {anom.severity}
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 mt-1">{anom.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Financial State (Actual, Cambio, Histórico) */}
      {activeTab === 'state' && (
        <div className="space-y-6">
          {/* Snapshot Comparison Selector */}
          <div className="bg-slate-50 border border-slate-800 rounded-2xl p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-cyan-600" />
                  Estado Financiero Unificado: Actual vs Histórico
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Matriz de 9 categorías clave con cuantificación determinista de deltas contra snapshots guardados.
                </p>
              </div>

              {/* Benchmark Selector Pills & Dropdown */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-400 mr-1">Comparar con:</span>
                {snapshots.slice(0, 3).map((snap, idx) => (
                  <button
                    key={snap.id}
                    onClick={() => setSelectedSnapshotId(snap.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      (selectedSnapshotId === snap.id || (!selectedSnapshotId && idx === 0))
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                        : 'bg-slate-800/80 text-gray-300 hover:bg-slate-700'
                    }`}
                  >
                    {idx === 0 ? 'Mes Anterior' : idx === 1 ? 'Hace 2 Meses' : 'Año Anterior'}
                    <span className="ml-1.5 opacity-75 font-normal">({snap.snapshot_date})</span>
                  </button>
                ))}

                {snapshots.length > 3 && (
                  <select
                    value={selectedSnapshotId || snapshots[0]?.id || ''}
                    onChange={(e) => setSelectedSnapshotId(e.target.value)}
                    className="bg-slate-800 text-gray-200 text-xs rounded-lg px-2.5 py-1.5 border border-slate-700 focus:outline-none focus:border-cyan-500"
                  >
                    {snapshots.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.snapshot_date} (${formatCurrency(s.net_worth, currency)})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Quantitative Dynamics Banner */}
            {changes && changes.keyFindings && changes.keyFindings.length > 0 && (
              <div className="mt-4 p-4 rounded-xl bg-slate-950/60 border border-cyan-900/30 text-xs text-cyan-200 space-y-1.5">
                <div className="font-bold text-cyan-600 flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3.5 h-3.5" /> Dinámica Cuantitativa Detectada:
                </div>
                {changes.keyFindings.map((finding, fIdx) => (
                  <div key={fIdx} className="flex items-start gap-2">
                    <span className="text-cyan-500 font-bold">•</span>
                    <span>{finding}</span>
                  </div>
                ))}
              </div>
            )}

            {/* 9 Categories Table: Actual | Cambio | Histórico */}
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-gray-400 font-semibold uppercase">
                    <th className="py-3 px-4">Categoría Financiera</th>
                    <th className="py-3 px-4">Actual (Hoy)</th>
                    <th className="py-3 px-4">Cambio Cuantitativo</th>
                    <th className="py-3 px-4">
                      Histórico ({activeBaseline ? activeBaseline.snapshot_date : 'Línea Base'})
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {/* 1. Patrimonio */}
                  <tr className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-cyan-950/60 text-cyan-600 border border-cyan-800/40">
                          <Landmark className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">Patrimonio Neto</div>
                          <div className="text-[11px] text-gray-400">Activos totales menos pasivos</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-cyan-600 text-sm">
                      {formatCurrency(state.netWorth.netWorth, currency)}
                    </td>
                    <td className="py-3.5 px-4">
                      {renderDelta(changes?.netWorth)}
                    </td>
                    <td className="py-3.5 px-4 text-gray-300 font-medium">
                      {activeBaseline ? formatCurrency(activeBaseline.net_worth, currency) : '-'}
                    </td>
                  </tr>

                  {/* 2. Liquidez */}
                  <tr className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-emerald-950/60 text-emerald-600 border border-emerald-800/40">
                          <Wallet className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">Liquidez Inmediata</div>
                          <div className="text-[11px] text-gray-400">Efectivo + cuentas bancarias</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                      {formatCurrency(state.liquidity.totalLiquid, currency)}
                    </td>
                    <td className="py-3.5 px-4">
                      {renderDelta(changes?.liquidity)}
                    </td>
                    <td className="py-3.5 px-4 text-gray-300 font-medium">
                      {activeBaseline ? formatCurrency(activeBaseline.liquid_assets || 0, currency) : '-'}
                    </td>
                  </tr>

                  {/* 3. Cash Flow */}
                  <tr className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-blue-950/60 text-blue-600 border border-blue-800/40">
                          <Activity className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">Flujo de Caja (Cash Flow)</div>
                          <div className="text-[11px] text-gray-400">Flujo libre operativo mensual</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                      {formatCurrency(state.cashFlow.netOperatingCashFlow, currency)}
                    </td>
                    <td className="py-3.5 px-4">
                      {renderDelta(changes?.cashFlow)}
                    </td>
                    <td className="py-3.5 px-4 text-gray-300 font-medium">
                      {activeBaseline ? formatCurrency(activeBaseline.free_cash_flow, currency) : '-'}
                    </td>
                  </tr>

                  {/* 4. Deuda */}
                  <tr className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-rose-950/60 text-red-600 border border-rose-800/40">
                          <TrendingDown className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">Carga de Deuda</div>
                          <div className="text-[11px] text-gray-400">Obligaciones y tarjetas activas</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-red-600 text-sm">
                      {formatCurrency(state.debts.totalDebt, currency)}
                    </td>
                    <td className="py-3.5 px-4">
                      {renderDelta(changes?.debt, true)}
                    </td>
                    <td className="py-3.5 px-4 text-gray-300 font-medium">
                      {activeBaseline ? formatCurrency(activeBaseline.total_debt || 0, currency) : '-'}
                    </td>
                  </tr>

                  {/* 5. Ahorro */}
                  <tr className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-emerald-950/60 text-emerald-600 border border-emerald-800/40">
                          <Percent className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">Tasa de Ahorro</div>
                          <div className="text-[11px] text-gray-400">Margen de ahorro sobre ingresos</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-600 text-sm">
                      {state.cashFlow.savingsRate}%
                    </td>
                    <td className="py-3.5 px-4">
                      {changes?.savingsRate ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                            changes.savingsRate.deltaPoints >= 0
                              ? 'bg-emerald-950/60 text-emerald-600 border-emerald-800/40'
                              : 'bg-rose-950/60 text-red-600 border-rose-800/40'
                          }`}
                        >
                          {changes.savingsRate.deltaPoints >= 0 ? '+' : ''}
                          {changes.savingsRate.deltaPoints} pts
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-gray-300 font-medium">
                      {activeBaseline ? `${activeBaseline.savings_rate_pct}%` : '-'}
                    </td>
                  </tr>

                  {/* 6. Metas */}
                  <tr className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-teal-950/60 text-teal-600 border border-teal-800/40">
                          <Target className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">Progreso de Metas</div>
                          <div className="text-[11px] text-gray-400">{state.goals.activeCount} metas activas</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-teal-600 text-sm">
                      {state.goals.overallProgressPercent}%
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-teal-950/60 text-teal-600 border border-teal-800/40">
                        {state.goals.onTrackCount}/{state.goals.activeCount} en cronograma
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-300 font-medium">
                      {state.goals.totalTargetAmount > 0
                        ? `Meta: ${formatCurrency(state.goals.totalTargetAmount, currency)}`
                        : '-'}
                    </td>
                  </tr>

                  {/* 7. Crypto */}
                  <tr className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-yellow-950/60 text-yellow-400 border border-yellow-800/40">
                          <Coins className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">Cartera Crypto</div>
                          <div className="text-[11px] text-gray-400">{state.crypto.holdingsCount} activos / {state.crypto.walletsCount} wallets</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                      {formatCurrency(state.crypto.totalCryptoCop, currency)}
                    </td>
                    <td className="py-3.5 px-4">
                      {renderDelta(changes?.crypto)}
                    </td>
                    <td className="py-3.5 px-4 text-gray-300 font-medium">
                      {activeBaseline ? formatCurrency(activeBaseline.crypto_assets || 0, currency) : '-'}
                    </td>
                  </tr>

                  {/* 8. Inversiones */}
                  <tr className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-indigo-950/60 text-blue-600 border border-indigo-800/40">
                          <TrendingUp className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">Inversiones Tradicionales</div>
                          <div className="text-[11px] text-gray-400">Fondos y cuentas de corretaje</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                      {formatCurrency(state.investments.currentValue, currency)}
                    </td>
                    <td className="py-3.5 px-4">
                      {renderDelta(changes?.investments)}
                    </td>
                    <td className="py-3.5 px-4 text-gray-300 font-medium">
                      {activeBaseline ? formatCurrency(activeBaseline.investments_value || 0, currency) : '-'}
                    </td>
                  </tr>

                  {/* 9. Bancos */}
                  <tr className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-cyan-950/60 text-cyan-600 border border-cyan-800/40">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">Cuentas Bancarias</div>
                          <div className="text-[11px] text-gray-400">{state.banking.connectedAccountsCount} cuentas Open Finance</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                      {formatCurrency(state.banking.totalBalanceCop, currency)}
                    </td>
                    <td className="py-3.5 px-4">
                      {renderDelta(changes?.banking)}
                    </td>
                    <td className="py-3.5 px-4 text-gray-300 font-medium">
                      {activeBaseline ? formatCurrency(activeBaseline.bank_assets || 0, currency) : '-'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Health Center */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(health).map(([key, ind]) => (
              <div
                key={key}
                className="bg-slate-50 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400 font-medium">{ind.label}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${statusColor(
                        ind.status
                      )}`}
                    >
                      {ind.status}
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {ind.unit === 'months'
                      ? `${ind.value} meses`
                      : ind.unit === 'percent'
                      ? `${ind.value}%`
                      : `${ind.value}x`}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] text-gray-500">
                  Referencia: {ind.benchmark}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Net Worth Bridge */}
      {activeTab === 'bridge' && (
        <div className="bg-slate-50 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-600" />
              Net Worth Bridge (Cálculo Contable sin Duplicación)
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Consolida saldos bancarios activos (Open Finance), efectivo manual, cartera crypto y
              billeteras on-chain, deduplicando automáticamente cualquier activo registrado dos veces.
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-sm">
              <span className="text-gray-300 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-600" /> (+) Cuentas Bancarias Conectadas
              </span>
              <span className="font-bold text-slate-900">
                {formatCurrency(state.assets.breakdown.bankAccounts, currency)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-sm">
              <span className="text-gray-300 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-600" /> (+) Efectivo Manual / Nequi no Open Finance
              </span>
              <span className="font-bold text-slate-900">
                {formatCurrency(state.assets.breakdown.cash, currency)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-sm">
              <span className="text-gray-300 flex items-center gap-2">
                <Coins className="w-4 h-4 text-yellow-400" /> (+) Cartera Cripto & Billeteras On-Chain
              </span>
              <span className="font-bold text-slate-900">
                {formatCurrency(state.assets.breakdown.crypto, currency)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-sm">
              <span className="text-gray-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" /> (+) Inversiones Tradicionales
              </span>
              <span className="font-bold text-slate-900">
                {formatCurrency(state.assets.breakdown.investments, currency)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-sm">
              <span className="text-gray-300 flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" /> (+) Otros Activos
              </span>
              <span className="font-bold text-slate-900">
                {formatCurrency(state.assets.breakdown.otherAssets, currency)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-rose-950/20 border border-rose-900/30 text-sm">
              <span className="text-red-600 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-600" /> (-) Pasivos y Deudas Totales
              </span>
              <span className="font-bold text-red-600">
                -{formatCurrency(state.liabilities.totalLiabilities, currency)}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 to-slate-900 border border-cyan-800/40 text-base font-bold">
              <span className="text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-600" /> (=) Patrimonio Neto Consolidado
              </span>
              <span className="text-xl font-black text-cyan-600">
                {formatCurrency(state.netWorth.netWorth, currency)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Timeline */}
      {activeTab === 'timeline' && (
        <div className="bg-slate-50 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-600" />
              Línea de Tiempo Multianual (2026 - 2030)
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Bifurcación estricta entre registros <strong className="text-cyan-600">REALES</strong> (historial
              de snapshots y estado actual) y proyecciones <strong className="text-blue-600">PROYECTADAS</strong> calculadas
              por el Scenario Engine.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-gray-400 font-semibold uppercase">
                  <th className="py-3 px-4">Periodo</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Patrimonio Neto</th>
                  <th className="py-3 px-4">Deuda Restante</th>
                  <th className="py-3 px-4">Ahorro Acumulado</th>
                  <th className="py-3 px-4">Progreso Metas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {timeline.map((point, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-900">{point.label}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          point.type === 'real'
                            ? 'bg-emerald-950/60 text-emerald-600 border border-emerald-800/40'
                            : 'bg-blue-950/60 text-blue-600 border border-blue-800/40'
                        }`}
                      >
                        {point.type === 'real' ? 'Real' : 'Proyectado'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-cyan-600">
                      {formatCurrency(point.netWorth, currency)}
                    </td>
                    <td className="py-3 px-4 text-red-600">
                      {formatCurrency(point.totalDebt, currency)}
                    </td>
                    <td className="py-3 px-4 text-emerald-600">
                      {formatCurrency(point.savings, currency)}
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      {point.goalsProgress > 0 ? `${point.goalsProgress}%` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}


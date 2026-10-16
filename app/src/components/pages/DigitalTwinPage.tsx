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
        <p className="text-slate-500 text-sm max-w-md">
          Sintetizando balance bancario, flujo laboral, pasivos, cartera crypto y metas financieras.
        </p>
        <button
          onClick={() => refreshDigitalTwin()}
          className="mt-6 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
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
        <span
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold"
          style={{
            background: 'hsl(220, 20%, 96%)',
            color: 'hsl(215, 15%, 50%)',
            border: '1px solid hsl(220, 15%, 88%)',
          }}
        >
          <Minus className="w-3 h-3" /> Sin cambio
        </span>
      )
    }

    const isPositive = isDebtOrExpense
      ? delta.direction === 'decrease'
      : delta.direction === 'increase'

    const sign = delta.absoluteDelta > 0 ? '+' : ''

    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold"
        style={
          isPositive
            ? {
                background: 'hsl(152, 60%, 96%)',
                color: 'hsl(152, 55%, 35%)',
                border: '1px solid hsl(152, 50%, 85%)',
              }
            : {
                background: 'hsl(0, 60%, 97%)',
                color: 'hsl(0, 65%, 45%)',
                border: '1px solid hsl(0, 50%, 87%)',
              }
        }
      >
        {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
        {sign}{formatCurrency(delta.absoluteDelta, currency)} ({delta.percentageDelta > 0 ? '+' : ''}{delta.percentageDelta}%)
      </span>
    )
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'excellent':
      case 'OPTIMAL':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200'
      case 'good':
      case 'STABLE':
        return 'text-cyan-700 bg-cyan-50 border-cyan-200'
      case 'fair':
      case 'ATTENTION':
        return 'text-amber-700 bg-amber-50 border-amber-200'
      default:
        return 'text-rose-700 bg-rose-50 border-rose-200'
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner */}
      <div
        className="relative overflow-hidden rounded-2xl border p-6 md:p-8 shadow-sm"
        style={{
          background: 'linear-gradient(135deg, hsl(190, 85%, 97%) 0%, hsl(0, 0%, 100%) 55%, hsl(234, 100%, 97%) 100%)',
          borderColor: 'hsl(190, 60%, 86%)',
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-700 border border-cyan-500/20 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" /> FASE N: FINANCIAL DIGITAL TWIN
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                Derivación Determinista
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Gemelo Digital Financiero
            </h1>
            <p className="text-slate-500 text-sm mt-1 max-w-2xl">
              Representación unificada del estado patrimonial y de flujo de caja en tiempo real,
              alimentada por el Financial Engine y lista para alimentar NEXUS AI y el Scenario Lab.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={handleCreateSnapshot}
              disabled={isTakingSnapshot}
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium rounded-xl text-sm transition-all shadow-md shadow-cyan-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              {isTakingSnapshot ? 'Registrando...' : 'Capturar Snapshot de Hoy'}
            </button>
          </div>
        </div>

        {snapshotSuccess && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            {snapshotSuccess}
          </div>
        )}

        {/* Tab navigation */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-200 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              activeTab === 'overview'
                ? 'bg-cyan-50 text-cyan-700 border border-cyan-200 font-semibold shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/70'
            }`}
          >
            Estado Consolidado
          </button>
          <button
            onClick={() => setActiveTab('state')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              activeTab === 'state'
                ? 'bg-cyan-50 text-cyan-700 border border-cyan-200 font-semibold shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/70'
            }`}
          >
            Financial State (Actual / Cambio / Histórico)
          </button>
          <button
            onClick={() => setActiveTab('health')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              activeTab === 'health'
                ? 'bg-cyan-50 text-cyan-700 border border-cyan-200 font-semibold shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/70'
            }`}
          >
            Health Center ({twin.healthSummary.status})
          </button>
          <button
            onClick={() => setActiveTab('bridge')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              activeTab === 'bridge'
                ? 'bg-cyan-50 text-cyan-700 border border-cyan-200 font-semibold shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/70'
            }`}
          >
            Net Worth Bridge
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              activeTab === 'timeline'
                ? 'bg-cyan-50 text-cyan-700 border border-cyan-200 font-semibold shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/70'
            }`}
          >
            Línea de Tiempo (2026 - 2030)
          </button>
        </div>
      </div>

      {/* 2. Executive Health Summary Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
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
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Corte: {new Date(state.asOfDate).toLocaleDateString('es-CO', { dateStyle: 'medium' })}
          </div>
        </div>

        {/* Strategic recommendations */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {twin.recommendations.map((rec, idx) => (
            <div
              key={idx}
              className="bg-slate-50/80 border border-slate-200/60 rounded-xl p-3 text-xs text-slate-700 flex items-start gap-2.5"
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
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
              <span className="text-xs text-slate-500 font-medium">Patrimonio Neto</span>
              <div className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
                {formatCurrency(state.netWorth.netWorth, currency)}
              </div>
              <div className="mt-2 text-xs text-cyan-700 flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                Solvencia: {state.netWorth.solvencyRatio}x
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
              <span className="text-xs text-slate-500 font-medium">Liquidez Inmediata</span>
              <div className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
                {formatCurrency(state.liquidity.totalLiquid, currency)}
              </div>
              <div className="mt-2 text-xs text-emerald-700 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Colchón: {state.liquidity.runwayMonths} meses
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
              <span className="text-xs text-slate-500 font-medium">Flujo Libre Operativo</span>
              <div className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
                {formatCurrency(state.cashFlow.netOperatingCashFlow, currency)}
              </div>
              <div className="mt-2 text-xs text-blue-700 flex items-center gap-1 font-medium">
                <Percent className="w-3.5 h-3.5" />
                Ahorro: {state.cashFlow.savingsRate}%
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
              <span className="text-xs text-slate-500 font-medium">Carga de Deuda</span>
              <div className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
                {formatCurrency(state.debts.totalDebt, currency)}
              </div>
              <div className="mt-2 text-xs text-amber-700 flex items-center gap-1 font-medium">
                <Activity className="w-3.5 h-3.5" />
                DTI: {state.debts.debtToIncomeRatio}% del ingreso
              </div>
            </div>
          </div>

          {/* Real Incomes (Shuffler vs Pizza Hut) & Betting Separation */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Incomes breakdown */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" /> Fuentes de Ingreso Reales
                </h3>
                <span className="text-xs text-slate-500">Total: {formatCurrency(state.income.total, currency)}</span>
              </div>
              <div className="space-y-3">
                <div className="bg-slate-50/80 border border-slate-200/60 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900">Shuffler Corp</div>
                    <div className="text-xs text-slate-500">Trabajo Principal</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-emerald-600">
                      {formatCurrency(state.income.shuffler, currency)}
                    </div>
                    <div className="text-xs text-slate-400">
                      {state.income.total > 0
                        ? `${Math.round((state.income.shuffler / state.income.total) * 100)}% del total`
                        : '0%'}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50/80 border border-slate-200/60 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900">Pizza Hut</div>
                    <div className="text-xs text-slate-500">Side Job / Trabajo Secundario</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-emerald-600">
                      {formatCurrency(state.income.pizzaHut, currency)}
                    </div>
                    <div className="text-xs text-slate-400">
                      {state.income.total > 0
                        ? `${Math.round((state.income.pizzaHut / state.income.total) * 100)}% del total`
                        : '0%'}
                    </div>
                  </div>
                </div>

                {state.income.other > 0 && (
                  <div className="bg-slate-50/80 border border-slate-200/60 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-slate-900">Otros Ingresos</div>
                      <div className="text-xs text-slate-500">Extraordinarios</div>
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
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Dices className="w-4 h-4 text-purple-600" /> Módulo de Apuestas (Independiente)
                </h3>
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-bold"
                  style={{
                    background: 'hsl(285, 80%, 96%)',
                    color: 'hsl(285, 60%, 40%)',
                    border: '1px solid hsl(285, 60%, 88%)',
                  }}
                >
                  NO ES INVERSIÓN
                </span>
              </div>

              <div
                className="rounded-xl p-3.5 mb-4 text-xs"
                style={{
                  background: 'hsl(285, 70%, 97%)',
                  border: '1px solid hsl(285, 50%, 88%)',
                  color: 'hsl(285, 50%, 30%)',
                }}
              >
                <p>
                  <strong>Regla Estricta del Núcleo Financiero:</strong> Las apuestas son
                  clasificadas exclusivamente como egreso/actividad recreativa. No forman parte del
                  cálculo de rendimiento de activos ni del patrimonio neto.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50/80 border border-slate-200/60 rounded-xl p-3">
                  <span className="text-[11px] text-slate-500">Dinero Apostado</span>
                  <div className="text-base font-bold text-slate-900 mt-1">
                    {formatCurrency(state.betting.totalStaked, currency)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {state.betting.cashFlowImpactPercent}% del ingreso mensual
                  </div>
                </div>

                <div className="bg-slate-50/80 border border-slate-200/60 rounded-xl p-3">
                  <span className="text-[11px] text-slate-500">Resultado Neto (P&L)</span>
                  <div
                    className={`text-base font-bold mt-1 ${
                      state.betting.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {state.betting.netProfit >= 0 ? '+' : ''}
                    {formatCurrency(state.betting.netProfit, currency)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    ROI: {state.betting.roiPercent}% | Aciertos: {state.betting.winRatePercent}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Anomalies alert block */}
          {anomalies.length > 0 && (
            <div className="bg-white border border-amber-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-amber-700 uppercase tracking-wider flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4" /> Señales y Anomalías Detectadas (Detect → Record → Show)
              </h3>
              <div className="space-y-3">
                {anomalies.map((anom) => (
                  <div
                    key={anom.id}
                    className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5 flex items-start justify-between gap-4"
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>{anom.title}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            anom.severity === 'critical'
                              ? 'bg-rose-100 text-rose-700 border border-rose-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {anom.severity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{anom.description}</p>
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
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-cyan-600" />
                  Estado Financiero Unificado: Actual vs Histórico
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Matriz de 9 categorías clave con cuantificación determinista de deltas contra snapshots guardados.
                </p>
              </div>

              {/* Benchmark Selector Pills & Dropdown */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500 mr-1">Comparar con:</span>
                {snapshots.slice(0, 3).map((snap, idx) => (
                  <button
                    key={snap.id}
                    onClick={() => setSelectedSnapshotId(snap.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedSnapshotId === snap.id || (!selectedSnapshotId && idx === 0)
                        ? 'bg-cyan-600 text-white font-bold shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/60'
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
                    className="bg-white text-slate-700 text-xs rounded-lg px-2.5 py-1.5 border border-slate-200 focus:outline-none focus:border-cyan-500 shadow-xs"
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
              <div
                className="mt-4 p-4 rounded-xl text-xs space-y-1.5"
                style={{
                  background: 'hsl(190, 80%, 96%)',
                  border: '1px solid hsl(190, 60%, 86%)',
                  color: 'hsl(190, 80%, 25%)',
                }}
              >
                <div className="font-bold text-cyan-800 flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-600" /> Dinámica Cuantitativa Detectada:
                </div>
                {changes.keyFindings.map((finding, fIdx) => (
                  <div key={fIdx} className="flex items-start gap-2">
                    <span className="text-cyan-600 font-bold">•</span>
                    <span>{finding}</span>
                  </div>
                ))}
              </div>
            )}

            {/* 9 Categories Table: Actual | Cambio | Histórico */}
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                    <th className="py-3 px-4">Categoría Financiera</th>
                    <th className="py-3 px-4">Actual (Hoy)</th>
                    <th className="py-3 px-4">Cambio Cuantitativo</th>
                    <th className="py-3 px-4">
                      Histórico ({activeBaseline ? activeBaseline.snapshot_date : 'Línea Base'})
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* 1. Patrimonio */}
                  <tr className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="p-1.5 rounded-lg"
                          style={{
                            background: 'hsl(190, 75%, 95%)',
                            color: 'hsl(190, 80%, 35%)',
                            border: '1px solid hsl(190, 60%, 85%)',
                          }}
                        >
                          <Landmark className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">Patrimonio Neto</div>
                          <div className="text-[11px] text-slate-400">Activos totales menos pasivos</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-cyan-700 text-sm">
                      {formatCurrency(state.netWorth.netWorth, currency)}
                    </td>
                    <td className="py-3.5 px-4">
                      {renderDelta(changes?.netWorth)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {activeBaseline ? formatCurrency(activeBaseline.net_worth, currency) : '-'}
                    </td>
                  </tr>

                  {/* 2. Liquidez */}
                  <tr className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="p-1.5 rounded-lg"
                          style={{
                            background: 'hsl(152, 60%, 95%)',
                            color: 'hsl(152, 60%, 32%)',
                            border: '1px solid hsl(152, 50%, 84%)',
                          }}
                        >
                          <Wallet className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">Liquidez Inmediata</div>
                          <div className="text-[11px] text-slate-400">Efectivo + cuentas bancarias</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                      {formatCurrency(state.liquidity.totalLiquid, currency)}
                    </td>
                    <td className="py-3.5 px-4">
                      {renderDelta(changes?.liquidity)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {activeBaseline ? formatCurrency(activeBaseline.liquid_assets || 0, currency) : '-'}
                    </td>
                  </tr>

                  {/* 3. Cash Flow */}
                  <tr className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="p-1.5 rounded-lg"
                          style={{
                            background: 'hsl(217, 85%, 96%)',
                            color: 'hsl(217, 80%, 40%)',
                            border: '1px solid hsl(217, 65%, 86%)',
                          }}
                        >
                          <Activity className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">Flujo de Caja (Cash Flow)</div>
                          <div className="text-[11px] text-slate-400">Flujo libre operativo mensual</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                      {formatCurrency(state.cashFlow.netOperatingCashFlow, currency)}
                    </td>
                    <td className="py-3.5 px-4">
                      {renderDelta(changes?.cashFlow)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {activeBaseline ? formatCurrency(activeBaseline.free_cash_flow, currency) : '-'}
                    </td>
                  </tr>

                  {/* 4. Deuda */}
                  <tr className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="p-1.5 rounded-lg"
                          style={{
                            background: 'hsl(0, 65%, 96%)',
                            color: 'hsl(0, 65%, 45%)',
                            border: '1px solid hsl(0, 50%, 87%)',
                          }}
                        >
                          <TrendingDown className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">Carga de Deuda</div>
                          <div className="text-[11px] text-slate-400">Obligaciones y tarjetas activas</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-red-600 text-sm">
                      {formatCurrency(state.debts.totalDebt, currency)}
                    </td>
                    <td className="py-3.5 px-4">
                      {renderDelta(changes?.debt, true)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {activeBaseline ? formatCurrency(activeBaseline.total_debt || 0, currency) : '-'}
                    </td>
                  </tr>

                  {/* 5. Ahorro */}
                  <tr className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="p-1.5 rounded-lg"
                          style={{
                            background: 'hsl(152, 60%, 95%)',
                            color: 'hsl(152, 60%, 32%)',
                            border: '1px solid hsl(152, 50%, 84%)',
                          }}
                        >
                          <Percent className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">Tasa de Ahorro</div>
                          <div className="text-[11px] text-slate-400">Margen de ahorro sobre ingresos</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-600 text-sm">
                      {state.cashFlow.savingsRate}%
                    </td>
                    <td className="py-3.5 px-4">
                      {changes?.savingsRate ? (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold"
                          style={
                            changes.savingsRate.deltaPoints >= 0
                              ? {
                                  background: 'hsl(152, 60%, 96%)',
                                  color: 'hsl(152, 55%, 35%)',
                                  border: '1px solid hsl(152, 50%, 85%)',
                                }
                              : {
                                  background: 'hsl(0, 60%, 97%)',
                                  color: 'hsl(0, 65%, 45%)',
                                  border: '1px solid hsl(0, 50%, 87%)',
                                }
                          }
                        >
                          {changes.savingsRate.deltaPoints >= 0 ? '+' : ''}
                          {changes.savingsRate.deltaPoints} pts
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {activeBaseline ? `${activeBaseline.savings_rate_pct}%` : '-'}
                    </td>
                  </tr>

                  {/* 6. Metas */}
                  <tr className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="p-1.5 rounded-lg"
                          style={{
                            background: 'hsl(172, 65%, 95%)',
                            color: 'hsl(172, 65%, 32%)',
                            border: '1px solid hsl(172, 50%, 84%)',
                          }}
                        >
                          <Target className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">Progreso de Metas</div>
                          <div className="text-[11px] text-slate-400">{state.goals.activeCount} metas activas</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-teal-600 text-sm">
                      {state.goals.overallProgressPercent}%
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold"
                        style={{
                          background: 'hsl(172, 60%, 95%)',
                          color: 'hsl(172, 65%, 32%)',
                          border: '1px solid hsl(172, 50%, 84%)',
                        }}
                      >
                        {state.goals.onTrackCount}/{state.goals.activeCount} en cronograma
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {state.goals.totalTargetAmount > 0
                        ? `Meta: ${formatCurrency(state.goals.totalTargetAmount, currency)}`
                        : '-'}
                    </td>
                  </tr>

                  {/* 7. Crypto */}
                  <tr className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="p-1.5 rounded-lg"
                          style={{
                            background: 'hsl(38, 90%, 95%)',
                            color: 'hsl(38, 85%, 35%)',
                            border: '1px solid hsl(38, 70%, 84%)',
                          }}
                        >
                          <Coins className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">Cartera Crypto</div>
                          <div className="text-[11px] text-slate-400">{state.crypto.holdingsCount} activos / {state.crypto.walletsCount} wallets</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                      {formatCurrency(state.crypto.totalCryptoCop, currency)}
                    </td>
                    <td className="py-3.5 px-4">
                      {renderDelta(changes?.crypto)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {activeBaseline ? formatCurrency(activeBaseline.crypto_assets || 0, currency) : '-'}
                    </td>
                  </tr>

                  {/* 8. Inversiones */}
                  <tr className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="p-1.5 rounded-lg"
                          style={{
                            background: 'hsl(234, 85%, 96%)',
                            color: 'hsl(234, 75%, 45%)',
                            border: '1px solid hsl(234, 60%, 86%)',
                          }}
                        >
                          <TrendingUp className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">Inversiones Tradicionales</div>
                          <div className="text-[11px] text-slate-400">Fondos y cuentas de corretaje</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                      {formatCurrency(state.investments.currentValue, currency)}
                    </td>
                    <td className="py-3.5 px-4">
                      {renderDelta(changes?.investments)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {activeBaseline ? formatCurrency(activeBaseline.investments_value || 0, currency) : '-'}
                    </td>
                  </tr>

                  {/* 9. Bancos */}
                  <tr className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="p-1.5 rounded-lg"
                          style={{
                            background: 'hsl(190, 75%, 95%)',
                            color: 'hsl(190, 80%, 35%)',
                            border: '1px solid hsl(190, 60%, 85%)',
                          }}
                        >
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">Cuentas Bancarias</div>
                          <div className="text-[11px] text-slate-400">{state.banking.connectedAccountsCount} cuentas Open Finance</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                      {formatCurrency(state.banking.totalBalanceCop, currency)}
                    </td>
                    <td className="py-3.5 px-4">
                      {renderDelta(changes?.banking)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
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
                className="bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-500 font-medium">{ind.label}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${statusColor(
                        ind.status
                      )}`}
                    >
                      {ind.status}
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 tracking-tight">
                    {ind.unit === 'months'
                      ? `${ind.value} meses`
                      : ind.unit === 'percent'
                      ? `${ind.value}%`
                      : `${ind.value}x`}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                  Referencia: {ind.benchmark}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Net Worth Bridge */}
      {activeTab === 'bridge' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-6 shadow-sm">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-600" />
              Net Worth Bridge (Cálculo Contable sin Duplicación)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Consolida saldos bancarios activos (Open Finance), efectivo manual, cartera crypto y
              billeteras on-chain, deduplicando automáticamente cualquier activo registrado dos veces.
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/60 text-sm">
              <span className="text-slate-700 font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-600" /> (+) Cuentas Bancarias Conectadas
              </span>
              <span className="font-bold text-slate-900">
                {formatCurrency(state.assets.breakdown.bankAccounts, currency)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/60 text-sm">
              <span className="text-slate-700 font-medium flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-600" /> (+) Efectivo Manual / Nequi no Open Finance
              </span>
              <span className="font-bold text-slate-900">
                {formatCurrency(state.assets.breakdown.cash, currency)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/60 text-sm">
              <span className="text-slate-700 font-medium flex items-center gap-2">
                <Coins className="w-4 h-4 text-yellow-600" /> (+) Cartera Cripto & Billeteras On-Chain
              </span>
              <span className="font-bold text-slate-900">
                {formatCurrency(state.assets.breakdown.crypto, currency)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/60 text-sm">
              <span className="text-slate-700 font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" /> (+) Inversiones Tradicionales
              </span>
              <span className="font-bold text-slate-900">
                {formatCurrency(state.assets.breakdown.investments, currency)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/60 text-sm">
              <span className="text-slate-700 font-medium flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-600" /> (+) Otros Activos
              </span>
              <span className="font-bold text-slate-900">
                {formatCurrency(state.assets.breakdown.otherAssets, currency)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-rose-50/60 border border-rose-200/70 text-sm">
              <span className="text-rose-700 font-medium flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-rose-600" /> (-) Pasivos y Deudas Totales
              </span>
              <span className="font-bold text-rose-700">
                -{formatCurrency(state.liabilities.totalLiabilities, currency)}
              </span>
            </div>

            <div
              className="flex items-center justify-between p-4 rounded-xl border text-base font-bold shadow-sm"
              style={{
                background: 'linear-gradient(135deg, hsl(190, 85%, 96%) 0%, hsl(234, 100%, 97%) 100%)',
                borderColor: 'hsl(190, 60%, 84%)',
              }}
            >
              <span className="text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-600" /> (=) Patrimonio Neto Consolidado
              </span>
              <span className="text-xl font-black text-cyan-800">
                {formatCurrency(state.netWorth.netWorth, currency)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Timeline */}
      {activeTab === 'timeline' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-6 shadow-sm">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-600" />
              Línea de Tiempo Multianual (2026 - 2030)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Bifurcación estricta entre registros <strong className="text-cyan-700">REALES</strong> (historial
              de snapshots y estado actual) y proyecciones <strong className="text-blue-700">PROYECTADAS</strong> calculadas
              por el Scenario Engine.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                  <th className="py-3 px-4">Periodo</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Patrimonio Neto</th>
                  <th className="py-3 px-4">Deuda Restante</th>
                  <th className="py-3 px-4">Ahorro Acumulado</th>
                  <th className="py-3 px-4">Progreso Metas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {timeline.map((point, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-900">{point.label}</td>
                    <td className="py-3 px-4">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                        style={
                          point.type === 'real'
                            ? {
                                background: 'hsl(152, 60%, 96%)',
                                color: 'hsl(152, 55%, 35%)',
                                border: '1px solid hsl(152, 50%, 85%)',
                              }
                            : {
                                background: 'hsl(217, 85%, 96%)',
                                color: 'hsl(217, 80%, 40%)',
                                border: '1px solid hsl(217, 65%, 86%)',
                              }
                        }
                      >
                        {point.type === 'real' ? 'Real' : 'Proyectado'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-cyan-700">
                      {formatCurrency(point.netWorth, currency)}
                    </td>
                    <td className="py-3 px-4 text-red-600 font-medium">
                      {formatCurrency(point.totalDebt, currency)}
                    </td>
                    <td className="py-3 px-4 text-emerald-600 font-medium">
                      {formatCurrency(point.savings, currency)}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
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

'use client'

import { useState } from 'react'
import { useFinancialStore } from '@/store/financial'
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  CheckCheck,
  XCircle,
  Sparkles,
  Calendar,
  Layers,
  History,
  SlidersHorizontal,
  Flame,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  TrendingUp,
  ShieldAlert,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  AlertSeverity,
  AlertStatus,
  EventCategory,
  FinancialAlert,
  IntelligenceInsight,
  FinancialEvent,
} from '@/types/intelligence'
import { AlertCenter } from '@/lib/intelligence/alert-center'
import { IntelligenceEngine } from '@/lib/intelligence/intelligence-engine'

type ActiveViewTab = 'alerts' | 'insights' | 'priorities' | 'history' | 'brief' | 'preferences'

export function AlertsPage() {
  const {
    alerts,
    events,
    insights,
    alertPreferences,
    dailyBrief,
    weeklyReview,
    digitalTwin,
    markAlertAsRead,
    dismissAlert,
    runIntelligenceEngine,
    updateAlertPreferences,
    refreshDailyBrief,
    refreshWeeklyReview,
  } = useFinancialStore()

  const [activeTab, setActiveTab] = useState<ActiveViewTab>('alerts')
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'ALL'>('ALL')
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'ALL'>('ALL')
  const [historyCategory, setHistoryCategory] = useState<EventCategory | 'ALL'>('ALL')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const activeCounts = AlertCenter.getActiveCounts(alerts)
  const filteredAlerts = AlertCenter.filter(alerts, {
    severity: severityFilter,
    status: statusFilter,
  })

  const state = digitalTwin?.currentState
  const prioritizedIssues = state ? IntelligenceEngine.prioritizeIssues(events, state) : []

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await runIntelligenceEngine()
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleMarkAllRead = async () => {
    const unread = alerts.filter((a) => a.status === 'UNREAD')
    for (const a of unread) {
      await markAlertAsRead(a.id)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                NEXUS Alert Center
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  FASE O · Event Intelligence
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Detección determinista de eventos, alertas no alarmistas y síntesis explicativa basada en datos reales.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl transition-all disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin text-amber-400')} />
            Escanear Eventos
          </button>
          {activeCounts.totalUnread > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl transition-all"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Marcar Todas Leídas
            </button>
          )}
        </div>
      </div>

      {/* ── METRIC TILES SUMMARY ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#121422] border border-white/[0.06] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-400">Alertas No Leídas</div>
            <div className="text-2xl font-bold text-white mt-1">{activeCounts.totalUnread}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">requieren revisión</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Bell className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#121422] border border-white/[0.06] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-400">Atención Crítica</div>
            <div className="text-2xl font-bold text-rose-400 mt-1">{activeCounts.critical}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">impacto directo</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#121422] border border-white/[0.06] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-400">Advertencias</div>
            <div className="text-2xl font-bold text-amber-300 mt-1">{activeCounts.warning}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">umbrales y variaciones</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-300">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#121422] border border-white/[0.06] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-400">Eventos Monitoreados</div>
            <div className="text-2xl font-bold text-teal-400 mt-1">{events.length}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">auditoría continua</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <History className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── TAB NAVIGATION ── */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] overflow-x-auto pb-1 text-sm">
        <button
          onClick={() => setActiveTab('alerts')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 font-medium border-b-2 transition-all whitespace-nowrap',
            activeTab === 'alerts'
              ? 'border-amber-400 text-amber-300 bg-amber-500/[0.04]'
              : 'border-transparent text-slate-400 hover:text-white'
          )}
        >
          <Bell className="w-4 h-4" />
          Alert Center
          {activeCounts.totalUnread > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300">
              {activeCounts.totalUnread}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('insights')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 font-medium border-b-2 transition-all whitespace-nowrap',
            activeTab === 'insights'
              ? 'border-indigo-400 text-indigo-300 bg-indigo-500/[0.04]'
              : 'border-transparent text-slate-400 hover:text-white'
          )}
        >
          <Sparkles className="w-4 h-4" />
          Insights Grounded ({insights.length})
        </button>

        <button
          onClick={() => setActiveTab('priorities')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 font-medium border-b-2 transition-all whitespace-nowrap',
            activeTab === 'priorities'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-500/[0.04]'
              : 'border-transparent text-slate-400 hover:text-white'
          )}
        >
          <Layers className="w-4 h-4" />
          Prioridades por Área ({prioritizedIssues.length})
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 font-medium border-b-2 transition-all whitespace-nowrap',
            activeTab === 'history'
              ? 'border-violet-400 text-violet-300 bg-violet-500/[0.04]'
              : 'border-transparent text-slate-400 hover:text-white'
          )}
        >
          <History className="w-4 h-4" />
          Event History ({events.length})
        </button>

        <button
          onClick={() => setActiveTab('brief')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 font-medium border-b-2 transition-all whitespace-nowrap',
            activeTab === 'brief'
              ? 'border-teal-400 text-teal-300 bg-teal-500/[0.04]'
              : 'border-transparent text-slate-400 hover:text-white'
          )}
        >
          <Calendar className="w-4 h-4" />
          Daily Brief & Review
        </button>

        <button
          onClick={() => setActiveTab('preferences')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 font-medium border-b-2 transition-all whitespace-nowrap',
            activeTab === 'preferences'
              ? 'border-slate-300 text-white bg-white/[0.04]'
              : 'border-transparent text-slate-400 hover:text-white'
          )}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Configuración Umbrales
        </button>
      </div>

      {/* ── TAB 1: ALERTS LIST ── */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#121422] p-3 rounded-2xl border border-white/[0.06]">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Severidad:</span>
              {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg transition-all font-medium',
                    severityFilter === sev
                      ? 'bg-white/[0.12] text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  )}
                >
                  {sev === 'ALL' ? 'Todas' : sev}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Estado:</span>
              {(['ALL', 'UNREAD', 'READ', 'DISMISSED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg transition-all font-medium',
                    statusFilter === st
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'text-slate-400 hover:text-slate-200'
                  )}
                >
                  {st === 'ALL' ? 'Todos' : st === 'UNREAD' ? 'No Leídas' : st === 'READ' ? 'Leídas' : 'Descartadas'}
                </button>
              ))}
            </div>
          </div>

          {/* Alerts Feed */}
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-16 bg-[#121422]/60 rounded-3xl border border-white/[0.06]">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white">Todo en Orden</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                No hay alertas que coincidan con los filtros seleccionados. Los eventos monitoreados operan dentro de los umbrales esperados.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onMarkRead={() => markAlertAsRead(alert.id)}
                  onDismiss={() => dismissAlert(alert.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: INSIGHTS GROUNDED (DATO + CAMBIO + INTERPRETACIÓN) ── */}
      {activeTab === 'insights' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-indigo-500/[0.06] border border-indigo-500/20 text-xs text-indigo-300 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white">Arquitectura Grounded:</span> Cada insight desglosa estrictamente el <strong className="text-indigo-200">DATO</strong> (hecho verificable), el <strong className="text-indigo-200">CAMBIO</strong> (delta cuantitativo) y la <strong className="text-indigo-200">INTERPRETACIÓN</strong> (explicación causal sin especulaciones subjetivas).
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((ins) => (
              <div
                key={ins.id}
                className="bg-[#121422] border border-white/[0.08] hover:border-indigo-500/30 rounded-2xl p-5 space-y-3 transition-all"
              >
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                  <span className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    Área: {ins.area}
                  </span>
                  <span className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full font-mono',
                    ins.impact === 'positive' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' :
                    ins.impact === 'negative' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                    'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                  )}>
                    Impacto {ins.impact}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-bold text-slate-300 block mb-0.5">📊 DATO FACTUAL:</span>
                    <p className="text-slate-400 leading-relaxed bg-white/[0.02] p-2 rounded-xl border border-white/[0.04]">
                      {ins.fact}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-amber-300 block mb-0.5">📈 CAMBIO OBSERVADO:</span>
                    <p className="text-slate-400 leading-relaxed bg-white/[0.02] p-2 rounded-xl border border-white/[0.04]">
                      {ins.change}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-indigo-300 block mb-0.5">💡 INTERPRETACIÓN:</span>
                    <p className="text-slate-300 leading-relaxed bg-indigo-500/[0.03] p-2 rounded-xl border border-indigo-500/10">
                      {ins.interpretation}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: PRIORIDADES POR ÁREA (NO SINGLE SCORE) ── */}
      {activeTab === 'priorities' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-cyan-500/[0.06] border border-cyan-500/20 text-xs text-cyan-300 flex items-start gap-3">
            <Layers className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white">Priorización Multidimensional:</span> Clasificación objetiva por áreas financieras independientes (Liquidez, Deuda, Presupuesto, Metas, Patrimonio, Cripto, Apuestas) evitando scores simplistas opacos.
            </div>
          </div>

          <div className="bg-[#121422] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.02] border-b border-white/[0.06] text-slate-400 font-mono">
                  <tr>
                    <th className="py-3 px-4">ÁREA</th>
                    <th className="py-3 px-4">EVENTO</th>
                    <th className="py-3 px-4">MAGNITUD</th>
                    <th className="py-3 px-4">SEVERIDAD</th>
                    <th className="py-3 px-4">FECHA</th>
                    <th className="py-3 px-4">ESTADO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {prioritizedIssues.map((issue) => (
                    <tr key={issue.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-medium text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-400" />
                        {issue.areaLabel}
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-mono">
                        {issue.event}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-amber-300">
                        {issue.magnitude}
                      </td>
                      <td className="py-3 px-4">
                        <SeverityBadge severity={issue.severity} />
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono">
                        {issue.date}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 font-mono">
                          {issue.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {prioritizedIssues.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 font-mono">
                        No se detectaron asuntos prioritarios en este momento.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: EVENT HISTORY ── */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-[#121422] p-3 rounded-2xl border border-white/[0.06]">
            <span className="text-xs text-slate-400 font-medium">Filtrar Categoría de Evento:</span>
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              {(['ALL', 'income', 'expense', 'debt', 'goal', 'liquidity', 'crypto', 'budget', 'betting'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setHistoryCategory(cat)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all',
                    historyCategory === cat
                      ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            {events
              .filter((e) => historyCategory === 'ALL' || e.category === historyCategory)
              .map((evt) => (
                <div
                  key={evt.id}
                  className="bg-[#121422] border border-white/[0.06] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={evt.severity} />
                      <span className="font-semibold text-white">{evt.title}</span>
                      <span className="text-[10px] font-mono text-slate-500 px-1.5 py-0.5 bg-white/[0.02] rounded">
                        {evt.category}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed">{evt.description}</p>
                  </div>
                  <div className="text-right shrink-0 font-mono text-slate-400 text-[11px]">
                    <div>{new Date(evt.timestamp).toLocaleDateString('es-CO')}</div>
                    <div className="text-amber-400/80 font-medium">
                      {evt.delta ? `${evt.delta.percentageDelta > 0 ? '+' : ''}${evt.delta.percentageDelta}%` : `$${evt.current_value.toLocaleString('es-CO')}`}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── TAB 5: DAILY BRIEF & WEEKLY REVIEW ── */}
      {activeTab === 'brief' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Brief */}
          <div className="bg-[#121422] border border-white/[0.08] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">NEXUS Daily Brief</h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {dailyBrief?.date || new Date().toISOString().split('T')[0]}
                  </span>
                </div>
              </div>
              <button
                onClick={refreshDailyBrief}
                className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 font-mono"
              >
                <RefreshCw className="w-3 h-3" /> Actualizar
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-teal-500/[0.04] border border-teal-500/20 text-xs text-teal-300">
              <span className="font-semibold text-white block mb-1">Titular del Día:</span>
              {dailyBrief?.headline || 'Estado financiero operativo normal.'}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <span className="text-slate-400 block text-[11px]">Patrimonio Actual:</span>
                <span className="text-sm font-bold text-white">
                  ${(dailyBrief?.financialStateSummary?.netWorth || state?.netWorth.netWorth || 0).toLocaleString('es-CO')}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <span className="text-slate-400 block text-[11px]">Liquidez Inmediata:</span>
                <span className="text-sm font-bold text-teal-400">
                  ${(dailyBrief?.financialStateSummary?.liquidAssets || state?.liquidity.totalLiquid || 0).toLocaleString('es-CO')}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <span className="font-semibold text-slate-300 block">Metas & Deuda:</span>
              <p className="text-slate-400 bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.04]">
                {dailyBrief?.goalsSummary}
              </p>
              <p className="text-slate-400 bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.04]">
                {dailyBrief?.debtSummary}
              </p>
            </div>
          </div>

          {/* Weekly Financial Review */}
          <div className="bg-[#121422] border border-white/[0.08] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Weekly Financial Review</h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {weeklyReview?.weekLabel || 'Semana Actual vs Anterior'}
                  </span>
                </div>
              </div>
              <button
                onClick={refreshWeeklyReview}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono"
              >
                <RefreshCw className="w-3 h-3" /> Actualizar
              </button>
            </div>

            <p className="text-xs text-slate-300 bg-indigo-500/[0.04] p-3.5 rounded-xl border border-indigo-500/20 leading-relaxed">
              {weeklyReview?.executiveSummary}
            </p>

            <div className="space-y-2 text-xs">
              <span className="font-semibold text-slate-300 block">Deltas Semanales Clave:</span>
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] flex justify-between items-center">
                  <span className="text-slate-400">Patrimonio:</span>
                  <span className={cn(
                    'font-bold',
                    (weeklyReview?.netWorthDelta?.deltaPct || 0) >= 0 ? 'text-teal-400' : 'text-rose-400'
                  )}>
                    {(weeklyReview?.netWorthDelta?.deltaPct || 0) > 0 ? '+' : ''}{weeklyReview?.netWorthDelta?.deltaPct || 0}%
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] flex justify-between items-center">
                  <span className="text-slate-400">Deuda:</span>
                  <span className={cn(
                    'font-bold',
                    (weeklyReview?.debtDelta?.deltaPct || 0) <= 0 ? 'text-teal-400' : 'text-rose-400'
                  )}>
                    {(weeklyReview?.debtDelta?.deltaPct || 0) > 0 ? '+' : ''}{weeklyReview?.debtDelta?.deltaPct || 0}%
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <span className="font-semibold text-slate-300 block">Hitos Observados:</span>
              {(weeklyReview?.highlights || []).map((h, i) => (
                <div key={i} className="text-slate-400 text-xs flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  {h}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 6: CONFIGURACIÓN DE UMBRALES ── */}
      {activeTab === 'preferences' && (
        <div className="max-w-2xl bg-[#121422] border border-white/[0.08] rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-amber-400" />
              Configuración de Umbrales de Inteligencia
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Personaliza los umbrales cuantitativos que activan alertas y eventos para tu cuenta.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div>
                <span className="font-medium text-white block">Umbral de Aumento de Gastos</span>
                <span className="text-slate-500">Porcentaje de incremento mensual que genera advertencia</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-amber-400 font-bold">
                  {alertPreferences?.thresholds?.expenseIncreasePct ?? 20}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div>
                <span className="font-medium text-white block">Alerta Crítica de Liquidez</span>
                <span className="text-slate-500">Meses mínimos de cobertura de fondo de emergencia</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-rose-400 font-bold">
                  &lt; {alertPreferences?.thresholds?.liquidityCriticalMonths ?? 1.5} meses
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div>
                <span className="font-medium text-white block">Alerta Preventiva de Presupuesto</span>
                <span className="text-slate-500">Porcentaje de consumo de categoría que emite aviso</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-teal-400 font-bold">
                  {alertPreferences?.thresholds?.budgetWarningPct ?? 80}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div>
                <span className="font-medium text-white block">Exposición Límite en Apuestas</span>
                <span className="text-slate-500">Porcentaje máximo de ingresos mensuales antes de alerta</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-pink-400 font-bold">
                  {alertPreferences?.thresholds?.bettingExposurePct ?? 10}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AlertCard({
  alert,
  onMarkRead,
  onDismiss,
}: {
  alert: FinancialAlert
  onMarkRead: () => void
  onDismiss: () => void
}) {
  const isUnread = alert.status === 'UNREAD'

  return (
    <div
      className={cn(
        'p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4',
        isUnread
          ? 'bg-[#151829] border-white/[0.12] shadow-sm'
          : 'bg-[#121422]/60 border-white/[0.04] opacity-75'
      )}
    >
      <div className="flex items-start gap-3.5">
        <div className="mt-0.5">
          <SeverityIcon severity={alert.severity} />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white">{alert.title}</span>
            <SeverityBadge severity={alert.severity} />
            {isUnread && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </div>
          <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">{alert.description}</p>
          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500 pt-1">
            <span>Fecha: {alert.date}</span>
            <span>•</span>
            <span>Métrica: {alert.metric}</span>
            {alert.delta !== 0 && (
              <>
                <span>•</span>
                <span className="text-amber-400">Delta: ${Math.abs(alert.delta).toLocaleString('es-CO')}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
        {isUnread && (
          <button
            onClick={onMarkRead}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl transition-all flex items-center gap-1.5"
            title="Marcar como leída"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
            Leída
          </button>
        )}
        {alert.status !== 'DISMISSED' && (
          <button
            onClick={onDismiss}
            className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 bg-white/[0.02] hover:bg-rose-500/10 border border-white/[0.04] hover:border-rose-500/20 rounded-xl transition-all flex items-center gap-1.5"
            title="Descartar alerta"
          >
            <XCircle className="w-3.5 h-3.5" />
            Descartar
          </button>
        )}
      </div>
    </div>
  )
}

function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  if (severity === 'CRITICAL') {
    return (
      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
        CRÍTICA
      </span>
    )
  }
  if (severity === 'WARNING') {
    return (
      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
        ADVERTENCIA
      </span>
    )
  }
  return (
    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
      INFORMACIÓN
    </span>
  )
}

function SeverityIcon({ severity }: { severity: AlertSeverity }) {
  if (severity === 'CRITICAL') {
    return (
      <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
        <ShieldAlert className="w-4 h-4" />
      </div>
    )
  }
  if (severity === 'WARNING') {
    return (
      <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-300">
        <AlertTriangle className="w-4 h-4" />
      </div>
    )
  }
  return (
    <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
      <Info className="w-4 h-4" />
    </div>
  )
}

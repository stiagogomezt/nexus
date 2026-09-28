'use client'

import React, { useEffect } from 'react'
import { useFinancialStore } from '@/store/financial'
import { formatCurrency, formatPercent } from '@/lib/utils'
import type { NavTab } from '@/components/layout/Sidebar'
import type { ScenarioBridgeAction, ProactiveInsight } from '@/types/copilot'
import type { FinancialAlert } from '@/types/intelligence'
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowRight,
  FlaskConical,
  MessageSquare,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react'

interface NexusTodaySectionProps {
  onNavigate: (tab: NavTab) => void
}

export function NexusTodaySection({ onNavigate }: NexusTodaySectionProps) {
  const {
    nexusToday,
    runProactiveCopilot,
    loadScenarioPresetToLab,
    currency,
  } = useFinancialStore()

  useEffect(() => {
    if (!nexusToday) {
      runProactiveCopilot().catch((err) => {
        console.warn('[NexusTodaySection] Proactive copilot fetch warning:', err)
      })
    }
  }, [nexusToday, runProactiveCopilot])

  const state = nexusToday?.estado
  const changes = nexusToday?.cambios || []
  const alerts = nexusToday?.alertas_destacadas || []
  const primaryGoal = nexusToday?.metas_resumen?.meta_principal
  const whatToCheck: ProactiveInsight[] = nexusToday?.que_deberias_revisar || []

  function handleCheckAction(insight: ProactiveInsight) {
    if (insight.explanation.scenario_bridge) {
      loadScenarioPresetToLab(insight.explanation.scenario_bridge)
      onNavigate('laboratorio')
    } else {
      const areaMap: Record<string, NavTab> = {
        gastos: 'gastos',
        debt: 'deudas',
        deuda: 'deudas',
        goals: 'metas',
        meta: 'metas',
        liquidity: 'patrimonio',
        liquidez: 'patrimonio',
        crypto: 'crypto',
        banking: 'bancos',
        banco: 'bancos',
        betting: 'apuestas',
        apuestas: 'apuestas',
        budget: 'presupuesto',
        presupuesto: 'presupuesto',
      }
      const targetTab = areaMap[insight.domain] || (insight.check_route as NavTab) || 'dashboard'
      onNavigate(targetTab)
    }
  }

  function handleQuickSimulate(bridge?: ScenarioBridgeAction) {
    if (bridge) {
      loadScenarioPresetToLab(bridge)
    }
    onNavigate('laboratorio')
  }

  return (
    <div className="glass-panel p-6 rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-[#0c0e18]/90 via-[#101426]/80 to-[#121124]/90 relative overflow-hidden shadow-2xl">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-blue-600 shadow-inner">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                PROACTIVE COPILOT
              </span>
              <span className="text-xs text-slate-500">· Observa, explica, simula</span>
            </div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              NEXUS TODAY
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onNavigate('ai')}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-blue-600 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Preguntar a NEXUS
          </button>
          <button
            onClick={() => onNavigate('laboratorio')}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            Laboratorio
          </button>
        </div>
      </div>

      {/* Main Grid: ESTADO, CAMBIOS, ALERTAS, METAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 py-5 border-b border-slate-200 relative z-10">
        {/* 1. ESTADO */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            ESTADO ACTUAL
          </span>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between items-baseline">
              <span className="text-slate-400">Patrimonio:</span>
              <span className="font-bold text-slate-900 tabular-nums">
                {formatCurrency(state?.patrimonio ?? 0, currency)}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-400">Liquidez:</span>
              <span className="font-semibold text-cyan-300 tabular-nums">
                {formatCurrency(state?.liquidez ?? 0, currency)}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-400">Flujo:</span>
              <span className={`font-semibold tabular-nums ${(state?.flujo_libre ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatCurrency(state?.flujo_libre ?? 0, currency)}
              </span>
            </div>
          </div>
        </div>

        {/* 2. CAMBIOS */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            CAMBIOS RELEVANTES
          </span>
          <div className="space-y-1.5 text-xs">
            {changes.length > 0 ? (
              changes.slice(0, 2).map((ch, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="text-slate-400 capitalize truncate max-w-[100px]">{ch.area}:</span>
                  <span className={`font-bold flex items-center gap-1 tabular-nums ${ch.direction === 'increase' ? (ch.area === 'expenses' || ch.area === 'gastos' ? 'text-red-600' : 'text-emerald-600') : 'text-slate-600'}`}>
                    {ch.delta_pct > 0 ? '+' : ''}{ch.delta_pct}%
                  </span>
                </div>
              ))
            ) : (
              <span className="text-slate-500 text-xs">Sin variaciones</span>
            )}
            <div className="text-[11px] text-slate-500 pt-0.5 truncate">
              {changes[0]?.description || 'Variaciones en rangos normales'}
            </div>
          </div>
        </div>

        {/* 3. ALERTAS ACTIVAS */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              ALERTAS
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold tabular-nums ${alerts.length > 0 ? 'bg-amber-500/20 text-amber-600 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-600'}`}>
              {alerts.length} activa{alerts.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-1 text-xs">
            {alerts.length > 0 ? (
              alerts.slice(0, 2).map((a: FinancialAlert) => (
                <div key={a.id} className="text-[11px] text-slate-600 flex items-start gap-1.5 truncate">
                  <AlertTriangle className="w-3 h-3 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span className="truncate">{a.title}</span>
                </div>
              ))
            ) : (
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Sin alertas críticas</span>
              </div>
            )}
          </div>
        </div>

        {/* 4. METAS */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            METAS
          </span>
          {primaryGoal ? (
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-900 truncate max-w-[120px]">
                  {primaryGoal.name}
                </span>
                <span className="font-bold text-emerald-600 tabular-nums">
                  {formatPercent(primaryGoal.progress_pct)}
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-400 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(primaryGoal.progress_pct, 100)}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-400 flex justify-between">
                <span>Estado:</span>
                <span className={primaryGoal.is_on_track ? 'text-emerald-600' : 'text-amber-600'}>
                  {primaryGoal.is_on_track ? 'En ritmo ✅' : 'Desviada ⚠️'}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 pt-1">Sin meta activa configurada.</div>
          )}
        </div>
      </div>

      {/* Qué deberías revisar & Acciones Proactivas */}
      <div className="pt-4 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              ¿Qué deberías revisar hoy?
            </span>
            <span className="text-[11px] text-slate-400">
              Sugerencias basadas en tus datos reales
            </span>
          </div>

          <span className="text-[11px] text-slate-500 italic">
            El sistema explica y simula · La decisión final es tuya
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {whatToCheck.length > 0 ? (
            whatToCheck.slice(0, 3).map((item: ProactiveInsight, idx: number) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-indigo-500/30 transition-all flex flex-col justify-between gap-3 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400">
                      {item.domain}
                    </span>
                    {item.explanation.scenario_bridge && (
                      <span className="text-[9px] bg-cyan-500/10 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/20">
                        Simulable
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    {item.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04]">
                  <button
                    onClick={() => handleCheckAction(item)}
                    className="text-xs text-blue-600 hover:text-blue-600 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                  >
                    {item.explanation.scenario_bridge ? 'Simular en Lab' : item.action_label}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  {item.explanation.scenario_bridge && (
                    <button
                      onClick={() => handleQuickSimulate(item.explanation.scenario_bridge)}
                      className="ml-auto text-[10px] text-cyan-300 hover:text-cyan-200 bg-cyan-500/10 hover:bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-500/25 flex items-center gap-1"
                    >
                      <FlaskConical className="w-3 h-3" />
                      Simular
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 col-span-3 text-xs text-slate-400 flex items-center justify-between">
              <span>Todo marcha de acuerdo con tu plan. No hay desvíos relevantes hoy.</span>
              <button
                onClick={() => onNavigate('laboratorio')}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
              >
                Explorar escenarios en el Laboratorio <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


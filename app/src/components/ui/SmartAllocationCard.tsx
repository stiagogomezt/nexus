'use client'

import { useFinancialStore } from '@/store/financial'
import { formatCurrency } from '@/lib/utils'
import { CheckCircle2, AlertCircle, PieChart, Info } from 'lucide-react'

export function SmartAllocationCard() {
  const { currentAllocationState, currency } = useFinancialStore()

  if (!currentAllocationState) return null

  const s = currentAllocationState
  
  const compromisedTotal = s.fixedCommitmentsAssigned + s.variableNeedsAssigned + s.debtsAssigned

  return (
    <div className="glass-panel p-6 rounded-3xl space-y-5 animate-in fade-in slide-in-from-bottom-4 mb-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
          <PieChart className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Distribución Inteligente de Ingreso
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              AI Engine
            </span>
          </h3>
          <p className="text-xs text-slate-500">
            NEXUS ha calculado cómo asignar {formatCurrency(s.totalIncome, currency)} según tus prioridades.
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 px-1">
        <span className="text-xs font-semibold text-slate-600">Total Comprometido (Fijos, Alimentación, Deudas):</span>
        <span className="text-sm font-bold text-slate-900">{formatCurrency(compromisedTotal, currency)}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Compromisos Fijos */}
        <div className="p-4 rounded-2xl border border-blue-100 bg-blue-50/30 space-y-2">
          <div className="flex justify-between items-center text-sm font-bold text-slate-800">
            <span>Compromisos Fijos</span>
            <span className="text-blue-700">{formatCurrency(s.fixedCommitmentsAssigned, currency)}</span>
          </div>
          <p className="text-xs text-slate-600">Requerido total: {formatCurrency(s.fixedCommitmentsTotal, currency)}</p>
          {s.fixedCommitmentsMissing > 0 ? (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-600 font-medium">
              <AlertCircle className="w-3.5 h-3.5" /> Faltan {formatCurrency(s.fixedCommitmentsMissing, currency)}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Cubierto
            </div>
          )}
        </div>

        {/* Alimentación y Variables */}
        <div className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/30 space-y-2">
          <div className="flex justify-between items-center text-sm font-bold text-slate-800">
            <span>Alimentación y Vida</span>
            <span className="text-emerald-700">{formatCurrency(s.variableNeedsAssigned, currency)}</span>
          </div>
          <p className="text-xs text-slate-600">Presupuesto mensual: {formatCurrency(s.variableNeedsTotal, currency)}</p>
          {s.variableNeedsMissing > 0 ? (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-600 font-medium">
              <AlertCircle className="w-3.5 h-3.5" /> Faltan {formatCurrency(s.variableNeedsMissing, currency)}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Cubierto
            </div>
          )}
        </div>

        {/* Obligaciones (Deudas) */}
        <div className="p-4 rounded-2xl border border-rose-100 bg-rose-50/30 space-y-2">
          <div className="flex justify-between items-center text-sm font-bold text-slate-800">
            <span>Obligaciones / Deudas</span>
            <span className="text-rose-700">{formatCurrency(s.debtsAssigned, currency)}</span>
          </div>
          <p className="text-xs text-slate-600">Cuotas mínimas: {formatCurrency(s.debtsTotal, currency)}</p>
          {s.debtsMissing > 0 ? (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-600 font-medium">
              <AlertCircle className="w-3.5 h-3.5" /> Faltan {formatCurrency(s.debtsMissing, currency)}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Cubierto
            </div>
          )}
        </div>

        {/* Metas Financieras */}
        <div className="p-4 rounded-2xl border border-purple-100 bg-purple-50/30 space-y-2">
          <div className="flex justify-between items-center text-sm font-bold text-slate-800">
            <span>Metas Financieras</span>
            <span className="text-purple-700">{formatCurrency(s.goalsAssigned, currency)}</span>
          </div>
          <div className="space-y-1">
            {s.goalsAllocation.map(g => (
              <div key={g.goalId} className="flex justify-between text-[11px] text-slate-600">
                <span className="truncate max-w-[120px]">- {g.goalName}</span>
                <span>{formatCurrency(g.assignedAmount, currency)}</span>
              </div>
            ))}
          </div>
          {s.goalsMissing > 0 ? (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-600 font-medium mt-1">
              <AlertCircle className="w-3.5 h-3.5" /> Faltan {formatCurrency(s.goalsMissing, currency)} en total
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Todas en ritmo
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200 gap-4">
        <div>
          <span className="text-xs font-semibold text-slate-500">Flujo Libre Restante</span>
          <p className="text-xl font-black text-slate-900 tabular-nums">
            {formatCurrency(s.freeCashFlow, currency)}
          </p>
        </div>
        {s.totalMissingForMonth > 0 && (
          <div className="flex items-center gap-2 text-xs font-medium text-amber-700 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200">
            <Info className="w-4 h-4 shrink-0" />
            <span>
              Aún te faltan <strong>{formatCurrency(s.totalMissingForMonth, currency)}</strong> para cubrir todo el mes.
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

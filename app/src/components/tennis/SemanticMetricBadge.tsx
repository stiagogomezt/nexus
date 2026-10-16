'use client'

import { useState } from 'react'
import { Info, AlertCircle, HelpCircle } from 'lucide-react'

export interface SemanticMetricBadgeProps {
  label: string
  value: number | string | null | undefined
  unit?: string
  format?: 'percentage' | 'decimal3' | 'decimal2' | 'integer' | 'raw'
  type?: 'brier' | 'cpi' | 'log_loss' | 'ewma' | 'confidence_interval' | 'shap' | 'general'
  customTooltip?: string
  customSubtext?: string
}

export function SemanticMetricBadge({
  label,
  value,
  unit = '',
  format = 'raw',
  type = 'general',
  customTooltip,
  customSubtext,
}: SemanticMetricBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  // STRICT ZERO-IMPUTATION POLICY: Explicitly detect missing data
  const isMissing = value === null || value === undefined || (typeof value === 'number' && isNaN(value))

  // Metric Tooltips
  const defaultTooltips: Record<string, string> = {
    brier:
      'Brier Score: Mide la exactitud probabilística del modelo cuadrático (BS = Rel - Res + Unc). Valores más cercanos a 0 son mejores; < 0.20 es grado institucional.',
    cpi:
      'Court Pace Index (CPI): Medida empírica de velocidad de superficie calculada con Ace% y Hold% histórico, modulada por la densidad del aire barométrica.',
    log_loss:
      'Log-Loss (Entropía Cruzada): Penaliza fuertemente las predicciones con alta certeza incorrecta. Valores < 0.55 superan el consenso del mercado.',
    ewma:
      'Carga Física EWMA: Media móvil ponderada exponencialmente de la carga competitiva en 14 días. Modulador de contexto (sin inferencia médica).',
    confidence_interval:
      'Intervalo de Credibilidad Bayesiano al 95%: Rango probabilístico donde yace el resultado verdadero tras integrar varianza aleatoria y epistémica.',
    shap:
      'Tree-SHAP: Contribución aditiva marginal de cada variable a las log-odds del algoritmo. Describe atribución matemática, NO causalidad física.',
    general:
      'Métrica cuantitativa verificada por el motor de inferencia punto-en-el-tiempo.',
  }

  const tooltipText = customTooltip || defaultTooltips[type] || defaultTooltips.general

  // Format value
  let formattedValue = 'N/A'
  if (!isMissing) {
    if (typeof value === 'number') {
      if (format === 'percentage') {
        formattedValue = `${(value * 100).toFixed(1)}%`
      } else if (format === 'decimal3') {
        formattedValue = value.toFixed(3)
      } else if (format === 'decimal2') {
        formattedValue = value.toFixed(2)
      } else if (format === 'integer') {
        formattedValue = Math.round(value).toString()
      } else {
        formattedValue = value.toString()
      }
    } else {
      formattedValue = String(value)
    }
  }

  // Dynamic semantic badge and color
  let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200'
  let semanticSubtext = customSubtext

  if (isMissing) {
    badgeColor = 'bg-amber-50 text-amber-800 border-amber-200'
    semanticSubtext = 'Data Unavailable (Cero Imputación)'
  } else if (type === 'brier' && typeof value === 'number') {
    if (value < 0.18) {
      badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200'
      semanticSubtext = semanticSubtext || 'Calibración Óptima'
    } else if (value <= 0.22) {
      badgeColor = 'bg-blue-50 text-blue-800 border-blue-200'
      semanticSubtext = semanticSubtext || 'Calibración Aceptable'
    } else {
      badgeColor = 'bg-rose-50 text-rose-800 border-rose-200'
      semanticSubtext = semanticSubtext || 'Descalibrado / Drift'
    }
  } else if (type === 'cpi' && typeof value === 'number') {
    if (value >= 40) {
      badgeColor = 'bg-orange-50 text-orange-800 border-orange-200'
      semanticSubtext = semanticSubtext || 'Pista Rápida (Beneficia Saque)'
    } else if (value >= 32) {
      badgeColor = 'bg-blue-50 text-blue-800 border-blue-200'
      semanticSubtext = semanticSubtext || 'Pista Media'
    } else {
      badgeColor = 'bg-amber-50 text-amber-800 border-amber-200'
      semanticSubtext = semanticSubtext || 'Pista Lenta (Favorece Rallies)'
    }
  } else if (type === 'ewma' && typeof value === 'number') {
    if (value > 32) {
      badgeColor = 'bg-rose-50 text-rose-800 border-rose-200'
      semanticSubtext = semanticSubtext || 'Carga Alta (Fatiga Acumulada)'
    } else {
      badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200'
      semanticSubtext = semanticSubtext || 'Carga Óptima'
    }
  }

  return (
    <div className="relative inline-block text-left">
      <div className={`p-2.5 rounded-xl border transition-all ${badgeColor}`}>
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">
            {label}
          </span>
          <button
            type="button"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => setShowTooltip(!showTooltip)}
            className="text-slate-400 hover:text-slate-700 focus:outline-none"
            aria-label="Ver explicación de métrica"
          >
            <HelpCircle className="w-3 h-3" />
          </button>
        </div>

        <div className="mt-1 flex items-baseline gap-1">
          <span className={`text-base font-black font-mono tabular-nums ${isMissing ? 'text-amber-700 text-xs' : ''}`}>
            {formattedValue}
          </span>
          {!isMissing && unit && <span className="text-xs font-semibold opacity-70">{unit}</span>}
        </div>

        {semanticSubtext && (
          <div className="mt-1 text-[10px] font-medium opacity-90 flex items-center gap-1 line-clamp-1">
            {isMissing && <AlertCircle className="w-2.5 h-2.5 shrink-0" />}
            <span>{semanticSubtext}</span>
          </div>
        )}
      </div>

      {/* Tooltip Popup */}
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-0 mb-2 w-64 p-3 bg-slate-900 text-white text-[11px] rounded-xl shadow-2xl border border-slate-700 pointer-events-none animate-in fade-in zoom-in-95 duration-150 leading-relaxed">
          <div className="font-bold text-indigo-300 pb-1 border-b border-slate-800 flex items-center gap-1">
            <Info className="w-3 h-3 text-indigo-400" />
            <span>Explicación Cuantitativa</span>
          </div>
          <p className="mt-1.5 text-slate-300">{tooltipText}</p>
          <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  )
}

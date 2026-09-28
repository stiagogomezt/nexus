'use client'

import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string
  subtitle?: string
  icon: LucideIcon
  iconClass?: string
  trend?: { value: number; label: string }
  badge?: { text: string; variant: 'positive' | 'negative' | 'warning' | 'neutral' | 'indigo' }
  onClick?: () => void
  className?: string
}

const BADGE_STYLES = {
  positive: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  negative: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  warning:  'bg-amber-500/15 text-amber-300 border-amber-500/30',
  neutral:  'bg-slate-700/60 text-slate-300 border-slate-600/40',
  indigo:   'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClass,
  trend,
  badge,
  onClick,
  className,
}: MetricCardProps) {
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        'glass-card p-5 rounded-2xl text-left group w-full',
        onClick && 'cursor-pointer hover:border-indigo-500/30 active:scale-[0.99] transition-transform',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="metric-label mb-1 truncate">{title}</p>
          <p className="metric-value text-white tabular-nums">{value}</p>
          {subtitle && (
            <p className="text-[11px] text-slate-500 mt-1 truncate">{subtitle}</p>
          )}
        </div>
        <div
          className={cn(
            'p-2.5 rounded-xl border flex-shrink-0',
            iconClass ?? 'bg-slate-800/60 text-slate-400 border-slate-700/60'
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(badge || trend) && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.05]">
          {badge && (
            <span
              className={cn(
                'text-[11px] font-semibold px-2 py-0.5 rounded-full border',
                BADGE_STYLES[badge.variant]
              )}
            >
              {badge.text}
            </span>
          )}
          {trend && (
            <span
              className={cn(
                'text-[11px] font-semibold',
                trend.value >= 0 ? 'text-emerald-400' : 'text-rose-400'
              )}
            >
              {trend.value >= 0 ? '+' : ''}{trend.value.toFixed(1)}% {trend.label}
            </span>
          )}
        </div>
      )}
    </Wrapper>
  )
}

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
  positive: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  negative: 'bg-red-50 text-red-700 border-red-200',
  warning:  'bg-amber-50 text-amber-700 border-amber-200',
  neutral:  'bg-slate-100 text-slate-600 border-slate-200',
  indigo:   'bg-blue-50 text-blue-700 border-blue-200',
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
        onClick && 'cursor-pointer hover:border-blue-300 active:scale-[0.99] transition-all',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="metric-label mb-1 truncate">{title}</p>
          <p className="metric-value tabular-nums">{value}</p>
          {subtitle && (
            <p className="text-[11px] text-slate-500 mt-1 truncate">{subtitle}</p>
          )}
        </div>
        <div
          className={cn(
            'p-2.5 rounded-xl border flex-shrink-0',
            iconClass ?? 'bg-slate-100 text-slate-500 border-slate-200'
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(badge || trend) && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
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
                trend.value >= 0 ? 'text-emerald-600' : 'text-red-600'
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

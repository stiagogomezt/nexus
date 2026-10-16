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

const BADGE_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  positive: {
    bg: 'hsl(152, 60%, 95%)',
    color: 'hsl(152, 60%, 32%)',
    border: 'hsl(152, 50%, 82%)',
  },
  negative: {
    bg: 'hsl(0, 72%, 96%)',
    color: 'hsl(0, 72%, 48%)',
    border: 'hsl(0, 70%, 85%)',
  },
  warning: {
    bg: 'hsl(38, 90%, 95%)',
    color: 'hsl(28, 70%, 36%)',
    border: 'hsl(38, 70%, 82%)',
  },
  neutral: {
    bg: 'hsl(220, 20%, 96%)',
    color: 'hsl(215, 16%, 40%)',
    border: 'hsl(220, 15%, 88%)',
  },
  indigo: {
    bg: 'hsl(234, 100%, 97%)',
    color: 'hsl(234, 85%, 55%)',
    border: 'hsl(234, 60%, 88%)',
  },
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
  const badgeStyle = badge ? BADGE_STYLES[badge.variant] || BADGE_STYLES.neutral : null

  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        'glass-card p-6 rounded-2xl text-left group w-full transition-all',
        onClick && 'cursor-pointer hover:border-[hsl(234,85%,75%)] active:scale-[0.99]',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="metric-label mb-1.5 truncate">{title}</p>
          <p className="metric-value tabular-nums">{value}</p>
          {subtitle && (
            <p
              className="mt-1.5 truncate"
              style={{ fontSize: '0.75rem', color: 'hsl(215, 15%, 58%)' }}
            >
              {subtitle}
            </p>
          )}
        </div>
        <div
          className={cn(
            'p-3 rounded-xl border flex-shrink-0 transition-transform group-hover:scale-105',
            iconClass ?? 'bg-slate-50 text-slate-500 border-slate-200'
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(badge || trend) && (
        <div
          className="flex items-center gap-2.5 mt-4 pt-3.5"
          style={{ borderTop: '1px solid hsl(220, 15%, 93%)' }}
        >
          {badge && badgeStyle && (
            <span
              className="font-semibold px-2.5 py-0.5 rounded-full"
              style={{
                fontSize: '0.6875rem',
                backgroundColor: badgeStyle.bg,
                color: badgeStyle.color,
                border: `1px solid ${badgeStyle.border}`,
              }}
            >
              {badge.text}
            </span>
          )}
          {trend && (
            <span
              className="font-semibold"
              style={{
                fontSize: '0.6875rem',
                color: trend.value >= 0 ? 'hsl(152, 60%, 42%)' : 'hsl(0, 72%, 50%)',
              }}
            >
              {trend.value >= 0 ? '+' : ''}{trend.value.toFixed(1)}% {trend.label}
            </span>
          )}
        </div>
      )}
    </Wrapper>
  )
}

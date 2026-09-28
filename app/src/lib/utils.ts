import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Currency } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: Currency = 'COP'): string {
  const locales: Record<Currency, string> = {
    COP: 'es-CO',
    USD: 'en-US',
    EUR: 'de-DE',
  }
  return new Intl.NumberFormat(locales[currency], {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'COP' ? 0 : 2,
  }).format(amount)
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
  })
}

export function getMonthYear(date = new Date()): { month: number; year: number } {
  return { month: date.getMonth() + 1, year: date.getFullYear() }
}

export function monthRangeFromPeriod(period: 'current' | 'last' | '3m' | '6m' | 'year'): {
  from: Date
  to: Date
} {
  const now = new Date()
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0) // end of current month

  switch (period) {
    case 'current': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1)
      return { from, to }
    }
    case 'last': {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastTo = new Date(now.getFullYear(), now.getMonth(), 0)
      return { from, to: lastTo }
    }
    case '3m': {
      const from = new Date(now.getFullYear(), now.getMonth() - 2, 1)
      return { from, to }
    }
    case '6m': {
      const from = new Date(now.getFullYear(), now.getMonth() - 5, 1)
      return { from, to }
    }
    case 'year': {
      const from = new Date(now.getFullYear(), 0, 1)
      return { from, to }
    }
  }
}

export function getIncomeSourceKey(source: string): 'shuffler' | 'pizza_hut' | 'other' {
  const s = source.toLowerCase()
  if (s.includes('shuffler')) return 'shuffler'
  if (s.includes('pizza')) return 'pizza_hut'
  return 'other'
}

/**
 * NEXUS Finance — Data Export Engine
 * Generates secure, user-isolated JSON and CSV exports.
 */

import { loadAllUserData } from '@/lib/dal'
import { calcDashboardMetrics } from '@/lib/financial-engine'
import type { UserFinancialBundle } from '@/lib/dal'

export type ExportableModule =
  | 'incomes'
  | 'expenses'
  | 'budgets'
  | 'goals'
  | 'debts'
  | 'assets'
  | 'liabilities'
  | 'accounts'

/**
 * Escapes and formats a field for RFC 4180 CSV compliance.
 */
function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Converts an array of objects to a CSV string.
 */
export function convertToCSV<T extends Record<string, unknown>>(
  data: T[],
  headers: { key: keyof T; label: string }[]
): string {
  if (!data || data.length === 0) {
    return headers.map((h) => escapeCSV(h.label)).join(',') + '\n'
  }

  const headerLine = headers.map((h) => escapeCSV(h.label)).join(',')
  const rows = data.map((row) =>
    headers.map((h) => escapeCSV(row[h.key])).join(',')
  )

  return [headerLine, ...rows].join('\n')
}

/**
 * Triggers a browser file download safely.
 */
export function triggerDownload(filename: string, content: string, mimeType: string) {
  if (typeof window === 'undefined') return

  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Exports complete user financial snapshot as formatted JSON.
 */
export async function exportUserDataAsJSON(userId: string): Promise<string> {
  const bundle = await loadAllUserData(userId)

  const metrics = calcDashboardMetrics({
    incomes: bundle.incomes,
    expenses: bundle.expenses,
    goals: bundle.goals,
    debts: bundle.debts,
    assets: bundle.assets,
    liabilities: bundle.liabilities,
    investments: [],
    bets: [],
  })

  const exportPayload = {
    system: 'NEXUS Finance Operating System',
    export_version: '1.0',
    exported_at: new Date().toISOString(),
    user_id: userId,
    metrics_snapshot: metrics,
    data: {
      incomes: bundle.incomes,
      expenses: bundle.expenses,
      budgets: bundle.budgets,
      goals: bundle.goals,
      debts: bundle.debts,
      assets: bundle.assets,
      liabilities: bundle.liabilities,
      accounts: bundle.accounts,
      categories: bundle.categories,
    },
  }

  return JSON.stringify(exportPayload, null, 2)
}

/**
 * Exports a specific financial module as CSV.
 */
export async function exportModuleAsCSV(
  userId: string,
  module: ExportableModule
): Promise<string> {
  const bundle = await loadAllUserData(userId)

  switch (module) {
    case 'incomes':
      return convertToCSV(bundle.incomes as unknown as Record<string, unknown>[], [
        { key: 'date', label: 'Fecha' },
        { key: 'source', label: 'Fuente' },
        { key: 'description', label: 'Descripcion' },
        { key: 'income_type', label: 'Tipo' },
        { key: 'amount', label: 'Monto' },
        { key: 'base_salary', label: 'Salario Base' },
        { key: 'bonus_amount', label: 'Bonos' },
        { key: 'surcharges_amount', label: 'Recargos' },
        { key: 'extra_hours_amount', label: 'Horas Extras' },
        { key: 'is_recurring', label: 'Recurrente' },
        { key: 'notes', label: 'Notas' },
      ])

    case 'expenses':
      return convertToCSV(bundle.expenses as unknown as Record<string, unknown>[], [
        { key: 'date', label: 'Fecha' },
        { key: 'category_name', label: 'Categoria' },
        { key: 'description', label: 'Descripcion' },
        { key: 'amount', label: 'Monto' },
        { key: 'payment_method', label: 'Metodo Pago' },
        { key: 'is_essential', label: 'Esencial' },
        { key: 'is_recurring', label: 'Recurrente' },
        { key: 'notes', label: 'Notas' },
      ])

    case 'budgets':
      return convertToCSV(bundle.budgets as unknown as Record<string, unknown>[], [
        { key: 'category_name', label: 'Categoria' },
        { key: 'month', label: 'Mes' },
        { key: 'year', label: 'Ano' },
        { key: 'budgeted_amount', label: 'Monto Presupuestado' },
      ])

    case 'goals':
      return convertToCSV(bundle.goals as unknown as Record<string, unknown>[], [
        { key: 'name', label: 'Meta' },
        { key: 'category', label: 'Categoria' },
        { key: 'target_amount', label: 'Monto Objetivo' },
        { key: 'current_amount', label: 'Monto Actual' },
        { key: 'monthly_contribution', label: 'Aporte Mensual' },
        { key: 'priority', label: 'Prioridad' },
        { key: 'status', label: 'Estado' },
        { key: 'target_date', label: 'Fecha Objetivo' },
      ])

    case 'debts':
      return convertToCSV(bundle.debts as unknown as Record<string, unknown>[], [
        { key: 'name', label: 'Deuda' },
        { key: 'entity', label: 'Acreedor' },
        { key: 'debt_type', label: 'Tipo' },
        { key: 'initial_balance', label: 'Monto Inicial' },
        { key: 'current_balance', label: 'Saldo Pendiente' },
        { key: 'interest_rate_ea', label: 'Tasa Interes EA %' },
        { key: 'minimum_payment', label: 'Pago Minimo' },
        { key: 'payment_day', label: 'Dia Pago' },
      ])

    case 'assets':
      return convertToCSV(bundle.assets as unknown as Record<string, unknown>[], [
        { key: 'name', label: 'Activo' },
        { key: 'category', label: 'Categoria' },
        { key: 'current_value', label: 'Valor Actual' },
        { key: 'notes', label: 'Notas' },
      ])

    case 'liabilities':
      return convertToCSV(bundle.liabilities as unknown as Record<string, unknown>[], [
        { key: 'name', label: 'Pasivo' },
        { key: 'category', label: 'Categoria' },
        { key: 'current_balance', label: 'Saldo Pendiente' },
        { key: 'notes', label: 'Notas' },
      ])

    case 'accounts':
      return convertToCSV(bundle.accounts as unknown as Record<string, unknown>[], [
        { key: 'name', label: 'Cuenta' },
        { key: 'account_type', label: 'Tipo' },
        { key: 'current_balance', label: 'Saldo' },
        { key: 'currency', label: 'Moneda' },
        { key: 'is_active', label: 'Activa' },
      ])

    default:
      throw new Error(`Modulo desconocido para exportar: ${module}`)
  }
}

'use client'

import { useState, useMemo } from 'react'
import { useFinancialStore } from '@/store/financial'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { calcBudgetPerformance } from '@/lib/financial-engine'
import { MetricCard } from '@/components/ui/MetricCard'
import {
  Wallet2,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Filter,
  DollarSign,
  TrendingDown,
  Layers,
  X,
  Sparkles,
} from 'lucide-react'
import type { Budget } from '@/types'

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

const DEFAULT_CATEGORIES = [
  'vivienda',
  'alimentacion',
  'transporte',
  'servicios',
  'tecnologia',
  'entretenimiento',
  'salud',
  'educacion',
  'suscripciones',
  'otros',
]

export function BudgetsPage() {
  const {
    budgets,
    expenses,
    categories: storeCategories,
    currency,
    user,
    upsertBudget,
    removeBudget,
  } = useFinancialStore()

  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear())
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [formCategory, setFormCategory] = useState('alimentacion')
  const [formCustomCategory, setFormCustomCategory] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  // Merge categories from default list + stored custom categories
  const allCategoryNames = useMemo(() => {
    const list = new Set(DEFAULT_CATEGORIES)
    storeCategories.forEach((c) => list.add(c.name.toLowerCase().trim()))
    expenses.forEach((e) => list.add(e.category_name.toLowerCase().trim()))
    budgets.forEach((b) => list.add(b.category_name.toLowerCase().trim()))
    return Array.from(list).sort()
  }, [storeCategories, expenses, budgets])

  // Pure deterministic budget calculation via Financial Engine
  const summary = useMemo(() => {
    return calcBudgetPerformance(budgets, expenses, selectedMonth, selectedYear)
  }, [budgets, expenses, selectedMonth, selectedYear])

  // Filtered categories for table display
  const displayedCategories = useMemo(() => {
    if (selectedCategory === 'all') {
      return summary.categories
    }
    return summary.categories.filter(
      (c) => c.category_name.toLowerCase() === selectedCategory.toLowerCase()
    )
  }, [summary.categories, selectedCategory])

  // Open modal for new budget or quick category assignment
  const handleOpenNewModal = (defaultCat?: string) => {
    setEditingBudget(null)
    setFormCategory(defaultCat || allCategoryNames[0] || 'alimentacion')
    setFormCustomCategory('')
    setFormAmount('')
    setModalError(null)
    setShowModal(true)
  }

  // Open modal for editing existing budget
  const handleOpenEditModal = (budgetRow: Budget) => {
    setEditingBudget(budgetRow)
    setFormCategory(budgetRow.category_name)
    setFormCustomCategory('')
    setFormAmount(budgetRow.budgeted_amount.toString())
    setModalError(null)
    setShowModal(true)
  }

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalError(null)

    const finalCat =
      formCategory === 'custom'
        ? formCustomCategory.trim().toLowerCase()
        : formCategory.trim().toLowerCase()

    if (!finalCat) {
      setModalError('Debes especificar una categoría válida')
      return
    }

    const amountNum = parseFloat(formAmount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setModalError('Ingresa un monto presupuestado mayor a 0')
      return
    }

    setIsSubmitting(true)
    try {
      await upsertBudget(finalCat, selectedMonth, selectedYear, amountNum)
      setShowModal(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar el presupuesto'
      setModalError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteBudget = async (categoryName: string) => {
    const budgetToDelete = budgets.find(
      (b) =>
        b.category_name.toLowerCase() === categoryName.toLowerCase() &&
        b.month === selectedMonth &&
        b.year === selectedYear
    )
    if (!budgetToDelete) return

    if (!confirm(`¿Eliminar el presupuesto de ${categoryName.toUpperCase()} para este mes?`)) {
      return
    }

    try {
      await removeBudget(budgetToDelete.id)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar el presupuesto'
      alert(msg)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Wallet2 className="w-5 h-5 text-indigo-400" />
            Presupuestos
          </h2>
          <p className="text-xs text-slate-400">
            Control de límites de gasto vs. egresos reales · Datos persistidos en Supabase
          </p>
        </div>

        <button
          onClick={() => handleOpenNewModal()}
          className="btn-primary flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Asignar Presupuesto
        </button>
      </div>

      {/* Filter Bar: Month, Year, Category */}
      <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Selector */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <select
              className="select-field text-xs py-1.5 px-3 min-w-[130px]"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Year Selector */}
          <select
            className="select-field text-xs py-1.5 px-3 min-w-[90px]"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {[2024, 2025, 2026, 2027].map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              className="select-field text-xs py-1.5 px-3 min-w-[160px]"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">Todas las categorías</option>
              {allCategoryNames.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 font-medium">
          Periodo: <span className="text-white font-semibold">{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</span>
        </div>
      </div>

      {/* Metric Cards via Financial Engine calculations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Presupuestado"
          value={formatCurrency(summary.total_budgeted, currency)}
          subtitle={`${summary.categories.length} categorías activas`}
          icon={Wallet2}
          iconClass="bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
          badge={{ text: 'Límite Mensual', variant: 'neutral' }}
        />

        <MetricCard
          title="Gasto Real del Periodo"
          value={formatCurrency(summary.total_spent, currency)}
          subtitle={`Calculado de transacciones reales`}
          icon={TrendingDown}
          iconClass="bg-rose-500/10 text-rose-400 border-rose-500/20"
          badge={{
            text: `${summary.overall_percent_used.toFixed(0)}% ejecutado`,
            variant: summary.overall_percent_used > 100 ? 'warning' : 'neutral',
          }}
        />

        <MetricCard
          title="Disponible Global"
          value={formatCurrency(summary.total_available, currency)}
          subtitle={summary.total_available >= 0 ? 'Margen a favor' : 'Déficit presupuestario'}
          icon={DollarSign}
          iconClass={
            summary.total_available >= 0
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }
          badge={{
            text: summary.total_available >= 0 ? 'En Rango' : 'Excedido',
            variant: summary.total_available >= 0 ? 'positive' : 'warning',
          }}
        />

        <MetricCard
          title="Estado de Control"
          value={
            summary.over_budget_count === 0
              ? '100% en Meta'
              : `${summary.over_budget_count} Excedida(s)`
          }
          subtitle={
            summary.over_budget_count === 0
              ? 'Ninguna categoría fuera de límite'
              : 'Requiere ajuste de gastos'
          }
          icon={summary.over_budget_count === 0 ? CheckCircle2 : AlertTriangle}
          iconClass={
            summary.over_budget_count === 0
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }
          badge={{
            text: summary.over_budget_count === 0 ? 'Saludable' : 'Alerta',
            variant: summary.over_budget_count === 0 ? 'positive' : 'warning',
          }}
        />
      </div>

      {/* Main Budget Table */}
      <div className="glass-panel rounded-3xl overflow-hidden">
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">
              Límites y Ejecución por Categoría
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            {displayedCategories.length} de {summary.categories.length} categorías
          </span>
        </div>

        {displayedCategories.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Wallet2 className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm text-slate-300 font-medium">
              No hay presupuestos configurados para {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Define metas de gasto por categoría para monitorear tu consumo real y evitar sorpresas.
            </p>
            <button
              onClick={() => handleOpenNewModal()}
              className="btn-primary text-xs mx-auto inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Crear Primer Presupuesto
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Categoría</th>
                  <th>Presupuestado</th>
                  <th>Gasto Real</th>
                  <th>Disponible</th>
                  <th>Estado</th>
                  <th className="w-44">Progreso</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {displayedCategories.map((row) => {
                  const isOver = row.is_over_budget
                  const isNear = !isOver && row.percent_used >= 80
                  const pctCapped = Math.min(100, row.percent_used)

                  const existingBudgetObj = budgets.find(
                    (b) =>
                      b.category_name.toLowerCase() === row.category_name.toLowerCase() &&
                      b.month === selectedMonth &&
                      b.year === selectedYear
                  )

                  return (
                    <tr key={row.category_name}>
                      <td className="font-semibold text-white capitalize">
                        {row.category_name}
                      </td>
                      <td className="tabular-nums text-slate-300">
                        {formatCurrency(row.budgeted, currency)}
                      </td>
                      <td
                        className={`tabular-nums font-bold ${
                          isOver ? 'text-rose-400' : 'text-slate-200'
                        }`}
                      >
                        {formatCurrency(row.spent, currency)}
                      </td>
                      <td
                        className={`tabular-nums font-semibold ${
                          row.available >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {row.available >= 0
                          ? formatCurrency(row.available, currency)
                          : `-${formatCurrency(-row.available, currency)}`}
                      </td>
                      <td>
                        {isOver ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                            <AlertTriangle className="w-2.5 h-2.5" /> Excedido (+{(row.percent_used - 100).toFixed(0)}%)
                          </span>
                        ) : isNear ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <AlertTriangle className="w-2.5 h-2.5" /> Alerta (80%+)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-2.5 h-2.5" /> En Meta
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="progress-bar flex-1">
                            <div
                              className={`progress-fill ${
                                isOver
                                  ? 'bg-rose-500'
                                  : isNear
                                  ? 'bg-amber-400'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${pctCapped}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 tabular-nums w-9 text-right font-medium">
                            {row.percent_used.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="text-right">
                        <div className="inline-flex items-center gap-1">
                          {existingBudgetObj && (
                            <button
                              onClick={() => handleOpenEditModal(existingBudgetObj)}
                              title="Editar monto"
                              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteBudget(row.category_name)}
                            title="Eliminar presupuesto"
                            className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info notice about deterministic calculations */}
      <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/25 flex items-start gap-3 text-xs text-indigo-300">
        <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-white">Motor Determinista Financiero (Financial Engine Core)</p>
          <p className="text-slate-300 mt-0.5">
            Los gastos mostrados se calculan directamente sumando las transacciones de egreso reales filtradas por mes y año. Ningún cálculo es estimado ni inventado por modelos generativos.
          </p>
        </div>
      </div>

      {/* Modal: Create or Edit Budget */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel p-6 rounded-3xl w-full max-w-md border-indigo-500/30 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Wallet2 className="w-4 h-4 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  {editingBudget ? 'Editar Presupuesto' : 'Asignar Presupuesto'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div>
                <label className="label-field">Categoría</label>
                <select
                  disabled={!!editingBudget}
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="select-field w-full"
                >
                  {allCategoryNames.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                  <option value="custom">+ Otra Categoría Personalizada</option>
                </select>
              </div>

              {formCategory === 'custom' && (
                <div>
                  <label className="label-field">Nombre de la Categoría</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Gimnasio, Mascotas, etc."
                    value={formCustomCategory}
                    onChange={(e) => setFormCustomCategory(e.target.value)}
                    className="input-field w-full"
                  />
                </div>
              )}

              <div>
                <label className="label-field">Periodo de Aplicación</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-300">
                    Mes: <strong className="text-white">{MONTH_NAMES[selectedMonth - 1]}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-300">
                    Año: <strong className="text-white">{selectedYear}</strong>
                  </div>
                </div>
              </div>

              <div>
                <label className="label-field">Monto Límite Presupuestado ({currency})</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="Ej. 500000"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="input-field w-full tabular-nums"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary text-xs"
                >
                  {isSubmitting
                    ? 'Guardando...'
                    : editingBudget
                    ? 'Actualizar Presupuesto'
                    : 'Guardar Presupuesto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

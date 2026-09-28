'use client'

import { useState } from 'react'
import { useFinancialStore } from '@/store/financial'
import { formatCurrency, formatDate } from '@/lib/utils'
import { calcExpensesByCategory, calcBettingMetrics } from '@/lib/financial-engine'
import { MetricCard } from '@/components/ui/MetricCard'
import { Plus, Trash2, Search, ArrowUpRight, Dices, TrendingDown } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import type { Expense, BettingTransaction } from '@/types'

const CATEGORY_COLORS: Record<string, string> = {
  vivienda: '#3b82f6', alimentacion: '#10b981', transporte: '#f59e0b',
  servicios: '#06b6d4', tecnologia: '#6366f1', entretenimiento: '#ec4899',
  suscripciones: '#a855f7', salud: '#14b8a6', otros: '#64748b',
}

export function ExpensesPage() {
  const { expenses, removeExpense, addExpense, currency } = useFinancialStore()
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [showForm, setShowForm] = useState(false)

  const byCategory = calcExpensesByCategory(expenses)
  const total = expenses.reduce((s, e) => s + e.amount, 0)
  const categories = Object.keys(byCategory)

  const chartData = Object.entries(byCategory)
    .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value, color: CATEGORY_COLORS[name] ?? '#64748b' }))
    .sort((a, b) => b.value - a.value)

  const filtered = expenses.filter((e) => {
    const matchCat = filterCat === 'all' || e.category_name === filterCat
    const matchSearch = e.description.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Gastos</h2>
          <p className="text-xs text-slate-400">Control de egresos por categoría y método de pago</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-danger">
          <Plus className="w-4 h-4" /> Registrar Gasto
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Total Gastos del Mes"
          value={formatCurrency(total, currency)}
          subtitle={`${expenses.length} transacciones`}
          icon={ArrowUpRight}
          iconClass="bg-rose-500/10 text-rose-400 border-rose-500/20"
          badge={{ text: 'Este mes', variant: 'neutral' }}
        />
        <MetricCard
          title="Mayor Categoría"
          value={chartData[0]?.name ?? '—'}
          subtitle={chartData[0] ? formatCurrency(chartData[0].value, currency) : '—'}
          icon={TrendingDown}
          iconClass="bg-amber-500/10 text-amber-400 border-amber-500/20"
          badge={{ text: 'Prioridad', variant: 'warning' }}
        />
        <MetricCard
          title="Gasto Esencial"
          value={formatCurrency(expenses.filter(e => e.is_essential).reduce((s, e) => s + e.amount, 0), currency)}
          subtitle="Base para fondo de emergencia"
          icon={Dices}
          iconClass="bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
          badge={{ text: 'Esencial', variant: 'positive' }}
        />
      </div>

      {/* Bar chart */}
      <div className="glass-panel p-6 rounded-3xl space-y-3">
        <h3 className="text-sm font-bold text-white">Distribución por Categoría</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barSize={28}>
              <XAxis dataKey="name" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v: unknown) => [formatCurrency(Number(v), currency), '']}
                contentStyle={{ background: '#0d0f1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 12 }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {chartData.map((e, i) => <Cell key={i} fill={e.color} fillOpacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button onClick={() => setFilterCat('all')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${filterCat === 'all' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'}`}>Todos</button>
          {categories.map((cat) => (
            <button key={cat} onClick={() => setFilterCat(cat)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all capitalize ${filterCat === cat ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'}`}>
              {cat}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-52">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-9 py-1.5 text-xs" />
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Categoría</th>
                <th>Descripción</th>
                <th>Método</th>
                <th className="text-right">Monto</th>
                <th className="text-center">Acc.</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-slate-500">Sin resultados.</td></tr>
              ) : filtered.map((exp) => (
                <tr key={exp.id}>
                  <td className="text-slate-400 whitespace-nowrap">{formatDate(exp.date)}</td>
                  <td>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border border-white/[0.08] bg-white/[0.04] capitalize">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: CATEGORY_COLORS[exp.category_name] ?? '#64748b' }} />
                      {exp.category_name}
                    </span>
                  </td>
                  <td className="text-white font-medium">{exp.description}</td>
                  <td className="text-slate-400 capitalize">{exp.payment_method}</td>
                  <td className="text-right font-extrabold text-rose-400 tabular-nums whitespace-nowrap">
                    -{formatCurrency(exp.amount, currency)}
                  </td>
                  <td className="text-center">
                    <button onClick={() => { if (window.confirm('¿Eliminar este gasto?')) removeExpense(exp.id) }}
                      className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && <QuickExpenseModal onClose={() => setShowForm(false)} onAdd={addExpense} currency={currency} />}
    </div>
  )
}

function QuickExpenseModal({ onClose, onAdd, currency }: {
  onClose: () => void
  onAdd: (e: Expense) => void
  currency: string
}) {
  const [form, setForm] = useState({ description: '', amount: '', category_name: 'alimentacion', date: new Date().toISOString().split('T')[0], payment_method: 'debit', is_essential: false })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseFloat(form.amount)
    if (!amount) return
    onAdd({
      id: `local-${Date.now()}`,
      user_id: 'local',
      account_id: null,
      category_id: null,
      ...form,
      amount,
      payment_method: form.payment_method as Expense['payment_method'],
      is_recurring: false,
      notes: null,
      created_at: new Date().toISOString(),
    })
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-white">Registrar Gasto</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Categoría</label>
              <select className="select-field" value={form.category_name} onChange={(e) => setForm({ ...form, category_name: e.target.value })}>
                {Object.keys(CATEGORY_COLORS).map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="label-field">Fecha</label>
              <input type="date" className="input-field" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label-field">Descripción</label>
            <input type="text" className="input-field" placeholder="Ej: Mercado semanal" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Monto ({currency})</label>
              <input type="number" className="input-field" placeholder="0" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Método de pago</label>
              <select className="select-field" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
                <option value="debit">Débito</option>
                <option value="credit">Crédito</option>
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input type="checkbox" checked={form.is_essential} onChange={(e) => setForm({ ...form, is_essential: e.target.checked })} className="rounded" />
            Gasto esencial (para fondo de emergencia)
          </label>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
            <button type="submit" className="btn-danger flex-1">Guardar Gasto</button>
          </div>
        </form>
      </div>
    </div>
  )
}

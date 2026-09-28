'use client'

import { useState } from 'react'
import { useFinancialStore } from '@/store/financial'
import { formatCurrency, formatDate, getIncomeSourceKey } from '@/lib/utils'
import { calcIncomeBreakdown } from '@/lib/financial-engine'
import { Plus, Trash2, Search, Briefcase, Clock, TrendingUp } from 'lucide-react'
import type { Income } from '@/types'

export function IncomesPage() {
  const { incomes, removeIncome, addIncome, currency } = useFinancialStore()
  const [filterSource, setFilterSource] = useState<'all' | 'shuffler' | 'pizza_hut' | 'other'>('all')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)

  const breakdown = calcIncomeBreakdown(incomes)

  const filtered = incomes.filter((inc) => {
    const key = getIncomeSourceKey(inc.source)
    const matchSource = filterSource === 'all' || key === filterSource
    const matchSearch = inc.description.toLowerCase().includes(search.toLowerCase()) ||
      inc.source.toLowerCase().includes(search.toLowerCase())
    return matchSource && matchSearch
  })

  function handleDelete(inc: Income) {
    if (window.confirm(`¿Eliminar "${inc.description}"?`)) removeIncome(inc.id)
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Gestión de Ingresos</h2>
          <p className="text-xs text-slate-400">Control granular por fuente: turnos, recargos, bonos y horas</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-success">
          <Plus className="w-4 h-4" /> Registrar Ingreso
        </button>
      </div>

      {/* Source Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {breakdown.by_source.map((src) => (
          <div
            key={src.source}
            className={`glass-card p-5 rounded-2xl border-l-4 cursor-pointer transition-all ${
              src.source === 'shuffler' ? 'border-l-indigo-500 hover:border-indigo-400/50' :
              src.source === 'pizza_hut' ? 'border-l-amber-500 hover:border-amber-400/50' :
              'border-l-slate-600 hover:border-slate-500/50'
            }`}
            onClick={() => setFilterSource(src.source === filterSource ? 'all' : src.source)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                src.source === 'shuffler' ? 'text-indigo-400' :
                src.source === 'pizza_hut' ? 'text-amber-400' : 'text-slate-400'
              }`}>
                {src.source === 'shuffler' ? <Briefcase className="w-3.5 h-3.5" /> :
                 src.source === 'pizza_hut' ? <Clock className="w-3.5 h-3.5" /> :
                 <TrendingUp className="w-3.5 h-3.5" />}
                {src.label}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400 font-semibold">
                {src.percent.toFixed(0)}% del total
              </span>
            </div>
            <p className="text-2xl font-extrabold text-white tabular-nums">
              {formatCurrency(src.amount, currency)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">{src.transactions} transacciones</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
        <div className="flex items-center gap-1">
          {([
            { id: 'all',      label: 'Todos' },
            { id: 'shuffler', label: 'Shuffler' },
            { id: 'pizza_hut',label: 'Pizza Hut' },
            { id: 'other',    label: 'Otros' },
          ] as const).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterSource(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                filterSource === f.id
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-60">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 py-1.5 text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Fuente</th>
                <th>Descripción</th>
                <th>Desglose</th>
                <th className="text-right">Monto</th>
                <th className="text-center">Acc.</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    No hay ingresos registrados con este filtro.
                  </td>
                </tr>
              ) : filtered.map((inc) => {
                const key = getIncomeSourceKey(inc.source)
                return (
                  <tr key={inc.id}>
                    <td className="text-slate-400 whitespace-nowrap">{formatDate(inc.date)}</td>
                    <td>
                      <span className={key === 'shuffler' ? 'badge-shuffler' : key === 'pizza_hut' ? 'badge-pizza-hut' : 'badge-other'}>
                        {inc.source}
                      </span>
                    </td>
                    <td className="text-white font-medium">
                      {inc.description}
                      {inc.notes && <p className="text-slate-500 font-normal text-[11px] mt-0.5">{inc.notes}</p>}
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {inc.surcharges_amount > 0 && (
                          <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-indigo-300">
                            Recargos: {formatCurrency(inc.surcharges_amount, currency)}
                          </span>
                        )}
                        {inc.extra_hours_amount > 0 && (
                          <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-indigo-300">
                            H.Extra: {formatCurrency(inc.extra_hours_amount, currency)}
                          </span>
                        )}
                        {inc.bonus_amount > 0 && (
                          <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-emerald-300">
                            Bono: {formatCurrency(inc.bonus_amount, currency)}
                          </span>
                        )}
                        {inc.hours_worked > 0 && (
                          <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">
                            {inc.hours_worked}h @ {formatCurrency(inc.hourly_rate, currency)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-right font-extrabold text-emerald-400 tabular-nums text-sm whitespace-nowrap">
                      +{formatCurrency(inc.amount, currency)}
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => handleDelete(inc)}
                        className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Add Modal */}
      {showForm && <QuickIncomeModal onClose={() => setShowForm(false)} onAdd={addIncome} currency={currency} />}
    </div>
  )
}

function QuickIncomeModal({ onClose, onAdd, currency }: {
  onClose: () => void
  onAdd: (income: Income) => void
  currency: string
}) {
  const [form, setForm] = useState({
    source: 'Shuffler',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    surcharges: '',
    bonus: '',
    extra_hours: '',
    hours_worked: '',
    hourly_rate: '',
    notes: '',
  })

  const isShuffler = form.source === 'Shuffler'
  const isPizza = form.source === 'Pizza Hut'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseFloat(form.amount) || 0
    if (!amount) return
    const key = getIncomeSourceKey(form.source)
    const income: Income = {
      id: `local-${Date.now()}`,
      user_id: 'local',
      account_id: null,
      date: form.date,
      source: form.source,
      income_source_key: key,
      description: form.description || `${form.source} — ${form.date}`,
      amount,
      income_type: isPizza ? 'hourly_wage' : 'salary',
      base_salary: amount,
      bonus_amount: parseFloat(form.bonus) || 0,
      surcharges_amount: parseFloat(form.surcharges) || 0,
      extra_hours_amount: parseFloat(form.extra_hours) || 0,
      other_payments_amount: 0,
      hours_worked: parseFloat(form.hours_worked) || 0,
      hourly_rate: parseFloat(form.hourly_rate) || 0,
      is_recurring: false,
      notes: form.notes || null,
      created_at: new Date().toISOString(),
    }
    onAdd(income)
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-white">Registrar Ingreso</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Fuente</label>
              <select className="select-field" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                <option>Shuffler</option>
                <option>Pizza Hut</option>
                <option>Otro</option>
              </select>
            </div>
            <div>
              <label className="label-field">Fecha</label>
              <input type="date" className="input-field" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label-field">Descripción</label>
            <input type="text" className="input-field" placeholder="Ej: Quincena septiembre" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Monto Total ({currency})</label>
            <input type="number" className="input-field" placeholder="0" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          {isShuffler && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label-field">Recargos</label>
                <input type="number" className="input-field" placeholder="0" value={form.surcharges} onChange={(e) => setForm({ ...form, surcharges: e.target.value })} />
              </div>
              <div>
                <label className="label-field">Bono</label>
                <input type="number" className="input-field" placeholder="0" value={form.bonus} onChange={(e) => setForm({ ...form, bonus: e.target.value })} />
              </div>
              <div>
                <label className="label-field">H. Extras</label>
                <input type="number" className="input-field" placeholder="0" value={form.extra_hours} onChange={(e) => setForm({ ...form, extra_hours: e.target.value })} />
              </div>
            </div>
          )}
          {isPizza && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-field">Horas trabajadas</label>
                <input type="number" className="input-field" placeholder="0" value={form.hours_worked} onChange={(e) => setForm({ ...form, hours_worked: e.target.value })} />
              </div>
              <div>
                <label className="label-field">Valor/hora</label>
                <input type="number" className="input-field" placeholder="0" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })} />
              </div>
            </div>
          )}
          <div>
            <label className="label-field">Notas (opcional)</label>
            <input type="text" className="input-field" placeholder="Cualquier detalle adicional" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
            <button type="submit" className="btn-success flex-1">Guardar Ingreso</button>
          </div>
        </form>
      </div>
    </div>
  )
}

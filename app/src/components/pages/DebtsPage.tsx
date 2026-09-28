'use client'

import { useState } from 'react'
import { useFinancialStore } from '@/store/financial'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { calcAmortizationSchedule, calcDebtPayoffDate } from '@/lib/financial-engine'
import { Plus, CreditCard, TrendingDown, Calendar, Trash2 } from 'lucide-react'
import type { Debt } from '@/types'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'

export function DebtsPage() {
  const { debts, addDebt, updateDebt, removeDebt, currency } = useFinancialStore()
  const [showForm, setShowForm] = useState(false)
  const [selectedDebt, setSelectedDebt] = useState<string | null>(null)
  const [strategy, setStrategy] = useState<'avalanche' | 'snowball'>('avalanche')

  const totalDebt = debts.reduce((s, d) => s + d.current_balance, 0)
  const totalMinPayment = debts.reduce((s, d) => s + d.minimum_payment, 0)
  const weightedRate = debts.length > 0
    ? debts.reduce((s, d) => s + d.interest_rate_ea * (d.current_balance / (totalDebt || 1)), 0)
    : 0

  const sorted = [...debts].sort((a, b) =>
    strategy === 'avalanche' ? b.interest_rate_ea - a.interest_rate_ea : a.current_balance - b.current_balance
  )

  const chartData = debts.map((d) => ({
    name: d.name,
    balance: d.current_balance,
    color: '#f43f5e',
  }))

  function handlePayment(debt: Debt) {
    const str = window.prompt(`Monto pagado a "${debt.name}" (${currency}):`)
    if (!str) return
    const amount = parseFloat(str)
    if (isNaN(amount) || amount <= 0) return
    const monthlyRate = Math.pow(1 + debt.interest_rate_ea / 100, 1 / 12) - 1
    const interest = debt.current_balance * monthlyRate
    const principal = Math.max(0, amount - interest)
    const newBalance = Math.max(0, debt.current_balance - principal)
    updateDebt(debt.id, { current_balance: newBalance })
  }

  function handleDeleteDebt(debt: Debt) {
    if (window.confirm(`¿Eliminar la deuda "${debt.name}"?`)) {
      removeDebt(debt.id)
    }
  }

  const selected = selectedDebt ? debts.find((d) => d.id === selectedDebt) : null
  const amortization = selected ? calcAmortizationSchedule(selected) : []
  const payoffDate = selected ? calcDebtPayoffDate(selected) : null

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Gestión de Deudas</h2>
          <p className="text-xs text-slate-500">Amortización, estrategia de pago y simulación de payoff</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Agregar Deuda
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-rose-500">
          <p className="metric-label mb-1">Deuda Total</p>
          <p className="metric-value text-red-600 tabular-nums">{formatCurrency(totalDebt, currency)}</p>
          <p className="text-[11px] text-slate-500 mt-1">{debts.length} obligaciones activas</p>
        </div>
        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-amber-500">
          <p className="metric-label mb-1">Pago Mínimo/Mes</p>
          <p className="metric-value text-amber-600 tabular-nums">{formatCurrency(totalMinPayment, currency)}</p>
          <p className="text-[11px] text-slate-500 mt-1">Mínimo comprometido mensual</p>
        </div>
        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-slate-500">
          <p className="metric-label mb-1">Tasa Prom. Ponderada</p>
          <p className="metric-value text-slate-700 tabular-nums">{formatPercent(weightedRate, 2)} E.A.</p>
          <p className="text-[11px] text-slate-500 mt-1">Costo promedio del capital</p>
        </div>
      </div>

      {/* Bar chart */}
      {chartData.length > 0 && (
        <div className="glass-panel p-6 rounded-3xl">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Balance por Obligación</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={32}>
                <XAxis dataKey="name" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false}
                  tickFormatter={(v) => `$${(v / 1_000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: unknown) => [formatCurrency(Number(v), currency), 'Balance']}
                  contentStyle={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 12 }}
                />
                <Bar dataKey="balance" fill="#f43f5e" fillOpacity={0.8} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Strategy selector */}
      <div className="flex items-center gap-3 text-xs">
        <span className="text-slate-500 font-semibold">Estrategia:</span>
        <button onClick={() => setStrategy('avalanche')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all border ${strategy === 'avalanche' ? 'bg-rose-500/20 text-red-600 border-rose-500/40' : 'text-slate-500 border-slate-700 hover:text-slate-900'}`}>
          ❄️ Avalanche (mayor tasa primero)
        </button>
        <button onClick={() => setStrategy('snowball')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all border ${strategy === 'snowball' ? 'bg-blue-100 text-blue-700 border-indigo-500/40' : 'text-slate-500 border-slate-700 hover:text-slate-900'}`}>
          ⛄ Snowball (menor balance primero)
        </button>
      </div>

      {/* Debt Cards */}
      <div className="space-y-3">
        {sorted.length === 0 ? (
          <div className="glass-panel p-8 rounded-2xl text-center space-y-2 border-dashed border-slate-300">
            <p className="text-sm font-bold text-slate-700">No tienes deudas u obligaciones registradas</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Tus pasivos financieros están en cero. Si adquieres un crédito o tarjeta, regístralo aquí para simular estrategias de amortización Avalancha o Bola de Nieve.
            </p>
          </div>
        ) : (
          sorted.map((debt, i) => {
          const pct = debt.initial_balance > 0 ? ((1 - debt.current_balance / debt.initial_balance) * 100) : 0
          return (
            <div key={debt.id} className="glass-panel p-5 rounded-2xl space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {strategy !== 'avalanche' || i === 0 ? (
                    <span className="w-6 h-6 rounded-full bg-rose-500/20 text-red-600 text-xs font-extrabold flex items-center justify-center border border-rose-500/40">
                      {i + 1}
                    </span>
                  ) : null}
                  <div>
                    <p className="font-extrabold text-slate-900">{debt.name}</p>
                    <p className="text-[11px] text-slate-500">{debt.entity} · {debt.debt_type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-red-600 tabular-nums text-lg">
                    {formatCurrency(debt.current_balance, currency)}
                  </p>
                  <p className="text-[11px] text-slate-500">{formatPercent(debt.interest_rate_ea, 1)} E.A.</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Pagado</span>
                  <span className="tabular-nums">{formatPercent(Math.min(100, pct), 0)}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill bg-gradient-to-r from-rose-500 to-amber-400" style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                  <span>Mínimo: <strong className="text-slate-700">{formatCurrency(debt.minimum_payment, currency)}</strong></span>
                  {debt.payment_day && <span>Día de pago: <strong className="text-slate-700">{debt.payment_day}</strong></span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedDebt(selectedDebt === debt.id ? null : debt.id)}
                    className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-600 border border-slate-700 transition-all flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {selectedDebt === debt.id ? 'Ocultar' : 'Amortización'}
                  </button>
                  <button onClick={() => handlePayment(debt)}
                    className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-rose-500/15 hover:bg-rose-500/25 text-red-600 border border-rose-500/30 transition-all">
                    + Pagar
                  </button>
                  <button
                    onClick={() => handleDeleteDebt(debt)}
                    title="Eliminar obligación"
                    className="p-1.5 rounded-xl text-slate-500 hover:text-red-600 hover:bg-slate-100 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Amortization table */}
              {selectedDebt === debt.id && amortization.length > 0 && (
                <div className="mt-2 pt-3 border-t border-slate-200">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingDown className="w-4 h-4 text-red-600" />
                    <h4 className="text-xs font-bold text-slate-900">Tabla de Amortización</h4>
                    {payoffDate && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full ml-auto">
                        Payoff: {payoffDate.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="data-table text-[11px]">
                      <thead>
                        <tr>
                          <th>Mes</th>
                          <th>Cuota</th>
                          <th>Capital</th>
                          <th>Interés</th>
                          <th>Saldo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {amortization.slice(0, 24).map((row) => (
                          <tr key={row.month}>
                            <td className="text-slate-500">{row.month}</td>
                            <td className="tabular-nums">{formatCurrency(row.payment, currency)}</td>
                            <td className="text-emerald-600 tabular-nums">{formatCurrency(row.principal, currency)}</td>
                            <td className="text-red-600 tabular-nums">{formatCurrency(row.interest, currency)}</td>
                            <td className="font-semibold tabular-nums">{formatCurrency(row.balance, currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )
        }))}
      </div>

      {showForm && <DebtModal onClose={() => setShowForm(false)} onAdd={addDebt} currency={currency} />}
    </div>
  )
}

function DebtModal({ onClose, onAdd, currency }: { onClose: () => void; onAdd: (d: Debt) => void; currency: string }) {
  const [form, setForm] = useState({ entity: '', name: '', debt_type: 'credit_card' as Debt['debt_type'], current_balance: '', interest_rate_ea: '', minimum_payment: '', payment_day: '', term_months: '12', notes: '' })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const balance = parseFloat(form.current_balance) || 0
    onAdd({
      id: `local-${Date.now()}`,
      user_id: 'local',
      entity: form.entity,
      name: form.name,
      debt_type: form.debt_type,
      initial_balance: balance,
      current_balance: balance,
      interest_rate_ea: parseFloat(form.interest_rate_ea) || 0,
      minimum_payment: parseFloat(form.minimum_payment) || 0,
      payment_day: parseInt(form.payment_day) || null,
      term_months: parseInt(form.term_months) || 12,
      notes: form.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-slate-900">Agregar Deuda</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Entidad</label>
              <input className="input-field" placeholder="Nu, Bancolombia..." required value={form.entity} onChange={(e) => setForm({ ...form, entity: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Nombre</label>
              <input className="input-field" placeholder="Ej: Tarjeta Nu" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Tipo</label>
              <select className="select-field" value={form.debt_type} onChange={(e) => setForm({ ...form, debt_type: e.target.value as Debt['debt_type'] })}>
                <option value="credit_card">Tarjeta de crédito</option>
                <option value="loan">Préstamo</option>
                <option value="consumer">Crédito consumo</option>
                <option value="mortgage">Hipoteca</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div>
              <label className="label-field">Balance Actual ({currency})</label>
              <input type="number" className="input-field" placeholder="0" required value={form.current_balance} onChange={(e) => setForm({ ...form, current_balance: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label-field">Tasa E.A. (%)</label>
              <input type="number" className="input-field" placeholder="0" value={form.interest_rate_ea} onChange={(e) => setForm({ ...form, interest_rate_ea: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Pago mínimo</label>
              <input type="number" className="input-field" placeholder="0" value={form.minimum_payment} onChange={(e) => setForm({ ...form, minimum_payment: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Día de pago</label>
              <input type="number" className="input-field" placeholder="15" min="1" max="31" value={form.payment_day} onChange={(e) => setForm({ ...form, payment_day: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
            <button type="submit" className="btn-primary flex-1">Agregar Deuda</button>
          </div>
        </form>
      </div>
    </div>
  )
}


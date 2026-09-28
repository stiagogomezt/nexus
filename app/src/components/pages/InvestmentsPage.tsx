'use client'

import { useState } from 'react'
import { useFinancialStore } from '@/store/financial'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { Plus, TrendingUp, TrendingDown } from 'lucide-react'
import type { Investment } from '@/types'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'

const TYPE_COLORS: Record<string, string> = {
  stocks: '#6366f1', etf: '#10b981', mutual_funds: '#3b82f6',
  cdt: '#f59e0b', bonds: '#06b6d4', crypto: '#f7931a', other: '#64748b',
}

export function InvestmentsPage() {
  const { investments, setInvestments, currency } = useFinancialStore()
  const [showForm, setShowForm] = useState(false)

  const totalValue = investments.reduce((s, i) => s + i.current_price * i.quantity, 0)
  const totalCost = investments.reduce((s, i) => s + i.purchase_price * i.quantity, 0)
  const totalReturn = totalValue - totalCost
  const returnPct = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0

  const byType = investments.reduce<Record<string, number>>((acc, i) => {
    acc[i.asset_type] = (acc[i.asset_type] || 0) + i.current_price * i.quantity
    return acc
  }, {})

  const pieData = Object.entries(byType).map(([type, value]) => ({
    name: type, value, color: TYPE_COLORS[type] ?? '#94a3b8'
  }))

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Inversiones</h2>
          <p className="text-xs text-slate-500">Seguimiento de portafolio patrimonial · ETFs, Acciones, CDTs, Crypto</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Agregar Inversión
        </button>
      </div>

      {/* Summary */}
      <div className="glass-panel p-6 rounded-3xl bg-gradient-to-r from-indigo-950/30 via-[#0d0f1a] to-teal-950/20 border-indigo-500/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Portafolio Total</span>
            <p className="text-3xl font-extrabold text-slate-900 tabular-nums">{formatCurrency(totalValue, currency)}</p>
            <p className={`text-sm font-bold tabular-nums ${totalReturn >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {totalReturn >= 0 ? '+' : ''}{formatCurrency(totalReturn, currency)} ({formatPercent(returnPct)}) vs costo
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-slate-500">Capital invertido</p>
              <p className="font-bold text-slate-900 tabular-nums text-base mt-0.5">{formatCurrency(totalCost, currency)}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-slate-500">Ganancia/Pérdida</p>
              <p className={`font-bold tabular-nums text-base mt-0.5 ${totalReturn >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {totalReturn >= 0 ? '+' : ''}{formatCurrency(totalReturn, currency)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {pieData.length > 0 && (
          <div className="glass-panel p-6 rounded-3xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Por tipo de activo</h3>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: unknown) => [formatCurrency(Number(v), currency), '']} contentStyle={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5">
              {pieData.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-slate-500">
                    <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                    {item.name.toUpperCase()}
                  </span>
                  <span className="font-bold text-slate-900 tabular-nums">{formatCurrency(item.value, currency)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Holdings table */}
        <div className={`glass-panel p-6 rounded-3xl space-y-3 ${pieData.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <h3 className="text-sm font-bold text-slate-900">Holdings</h3>
          {investments.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">Sin inversiones. Agrega tu primer activo.</p>
          ) : (
            <div className="space-y-2">
              {investments.map((inv) => {
                const currentVal = inv.current_price * inv.quantity
                const costVal = inv.purchase_price * inv.quantity
                const ret = currentVal - costVal
                const retPct = costVal > 0 ? (ret / costVal) * 100 : 0
                return (
                  <div key={inv.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-500/20 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl" style={{ background: `${TYPE_COLORS[inv.asset_type] ?? '#64748b'}20` }}>
                        <TrendingUp className="w-4 h-4" style={{ color: TYPE_COLORS[inv.asset_type] ?? '#94a3b8' }} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{inv.asset_name}</p>
                        <p className="text-[11px] text-slate-500">
                          {inv.quantity} uds · Costo: {formatCurrency(inv.purchase_price, currency)} ·  {inv.platform ?? '—'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-slate-900 tabular-nums">{formatCurrency(currentVal, currency)}</p>
                      <p className={`text-xs font-bold tabular-nums flex items-center justify-end gap-0.5 ${ret >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {ret >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {ret >= 0 ? '+' : ''}{formatPercent(retPct)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <InvestmentModal
          onClose={() => setShowForm(false)}
          onAdd={(inv) => setInvestments([...investments, inv])}
          currency={currency}
        />
      )}
    </div>
  )
}

function InvestmentModal({ onClose, onAdd, currency }: { onClose: () => void; onAdd: (i: Investment) => void; currency: string }) {
  const [form, setForm] = useState({ asset_name: '', asset_type: 'etf' as Investment['asset_type'], quantity: '', purchase_price: '', current_price: '', purchase_date: new Date().toISOString().split('T')[0], platform: '', commission: '' })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onAdd({
      id: `local-${Date.now()}`,
      user_id: 'local',
      asset_name: form.asset_name,
      asset_type: form.asset_type,
      quantity: parseFloat(form.quantity) || 1,
      purchase_price: parseFloat(form.purchase_price) || 0,
      current_price: parseFloat(form.current_price) || parseFloat(form.purchase_price) || 0,
      purchase_date: form.purchase_date,
      platform: form.platform || null,
      commission: parseFloat(form.commission) || 0,
      notes: null,
      created_at: new Date().toISOString(),
    })
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-slate-900">Agregar Inversión</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Nombre del activo</label>
              <input className="input-field" placeholder="iShares S&P500 ETF" required value={form.asset_name} onChange={(e) => setForm({ ...form, asset_name: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Tipo</label>
              <select className="select-field" value={form.asset_type} onChange={(e) => setForm({ ...form, asset_type: e.target.value as Investment['asset_type'] })}>
                {Object.keys(TYPE_COLORS).map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label-field">Cantidad</label>
              <input type="number" step="any" className="input-field" placeholder="1" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Precio compra</label>
              <input type="number" className="input-field" placeholder="0" required value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Precio actual</label>
              <input type="number" className="input-field" placeholder="0" value={form.current_price} onChange={(e) => setForm({ ...form, current_price: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Plataforma</label>
              <input className="input-field" placeholder="Trii, Tyba..." value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Fecha compra</label>
              <input type="date" className="input-field" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
            <button type="submit" className="btn-primary flex-1">Agregar</button>
          </div>
        </form>
      </div>
    </div>
  )
}


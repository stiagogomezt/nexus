'use client'

import { useState } from 'react'
import { useFinancialStore } from '@/store/financial'
import { formatCurrency } from '@/lib/utils'
import { calcNetWorth } from '@/lib/financial-engine'
import { Plus, Landmark, TrendingUp, TrendingDown, Wallet, Building2, Trash2 } from 'lucide-react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import type { Asset } from '@/types'

const ASSET_COLORS: Record<string, string> = {
  cash: '#10b981', bank_accounts: '#3b82f6', investments: '#6366f1',
  crypto: '#f7931a', real_estate: '#8b5cf6', vehicles: '#06b6d4', other: '#64748b',
}

export function NetWorthPage() {
  const { assets, liabilities, investments, debts, currency, addAsset, removeAsset, cryptoSummary } = useFinancialStore()
  const [showAssetForm, setShowAssetForm] = useState(false)

  const netWorth = calcNetWorth(assets, liabilities, investments, debts, cryptoSummary?.totalValueCop)


  const pieData = Object.entries({
    'Efectivo/Cuentas': netWorth.breakdown.cash + netWorth.breakdown.bank_accounts,
    'Inversiones': netWorth.breakdown.investments,
    'Crypto': netWorth.breakdown.crypto,
    'Otros activos': netWorth.breakdown.other_assets,
  }).filter(([, v]) => v > 0).map(([name, value], i) => ({
    name, value, color: Object.values(ASSET_COLORS)[i] ?? '#94a3b8'
  }))

  function handleDeleteAsset(asset: Asset) {
    if (window.confirm(`¿Eliminar el activo "${asset.name}"?`)) {
      removeAsset(asset.id)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Patrimonio Neto</h2>
          <p className="text-xs text-slate-400">Activos totales − Pasivos totales = Net Worth real</p>
        </div>
        <button onClick={() => setShowAssetForm(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Agregar Activo
        </button>
      </div>

      {/* Net Worth Banner */}
      <div className={`glass-panel p-6 rounded-3xl border relative overflow-hidden ${netWorth.net_worth >= 0 ? 'border-cyan-500/25 bg-gradient-to-r from-cyan-950/30 via-[#0d0f1a] to-indigo-950/20' : 'border-rose-500/25 bg-gradient-to-r from-rose-950/30 via-[#0d0f1a] to-slate-950/20'}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-cyan-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">Patrimonio Neto · NEXUS</span>
            </div>
            <p className={`text-4xl font-black tabular-nums ${netWorth.net_worth >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
              {formatCurrency(netWorth.net_worth, currency)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-1.5 text-emerald-400 mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="font-bold uppercase tracking-wide text-[10px]">Total Activos</span>
              </div>
              <p className="font-extrabold text-emerald-400 tabular-nums text-lg">{formatCurrency(netWorth.total_assets, currency)}</p>
            </div>
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <div className="flex items-center gap-1.5 text-rose-400 mb-1">
                <TrendingDown className="w-3.5 h-3.5" />
                <span className="font-bold uppercase tracking-wide text-[10px]">Total Pasivos</span>
              </div>
              <p className="font-extrabold text-rose-400 tabular-nums text-lg">{formatCurrency(netWorth.total_liabilities, currency)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie chart */}
        <div className="glass-panel p-6 rounded-3xl space-y-4">
          <h3 className="text-sm font-bold text-white">Composición de Activos</h3>
          {pieData.length === 0 ? (
            <div className="h-48 w-full flex flex-col items-center justify-center rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center p-4 space-y-2">
              <Landmark className="w-7 h-7 text-slate-600 mb-1" />
              <p className="text-xs font-semibold text-slate-300">Sin activos registrados</p>
              <p className="text-[11px] text-slate-500">
                Agrega cuentas, efectivo o inversiones para visualizar tu desglose patrimonial.
              </p>
            </div>
          ) : (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                      {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip
                      formatter={(v: unknown) => [formatCurrency(Number(v), currency), '']}
                      contentStyle={{ background: '#0d0f1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5">
                {pieData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-400">
                      <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                      {item.name}
                    </span>
                    <span className="font-bold text-white tabular-nums">{formatCurrency(item.value, currency)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Assets list */}
        <div className="glass-panel p-6 rounded-3xl space-y-4 lg:col-span-2">
          <h3 className="text-sm font-bold text-white">Activos Registrados</h3>
          <div className="space-y-2">
            {assets.map((asset) => (
              <div key={asset.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ background: `${ASSET_COLORS[asset.category] ?? '#64748b'}20` }}>
                    {asset.category === 'cash' || asset.category === 'bank_accounts' ? (
                      <Wallet className="w-4 h-4" style={{ color: ASSET_COLORS[asset.category] ?? '#94a3b8' }} />
                    ) : (
                      <Building2 className="w-4 h-4" style={{ color: ASSET_COLORS[asset.category] ?? '#94a3b8' }} />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{asset.name}</p>
                    <p className="text-[11px] text-slate-500 capitalize">{asset.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <p className="font-extrabold text-emerald-400 tabular-nums">{formatCurrency(asset.current_value, currency)}</p>
                  <button
                    onClick={() => handleDeleteAsset(asset)}
                    title="Eliminar activo"
                    className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-white/[0.04] transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {investments.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/15">
                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{inv.asset_name}</p>
                    <p className="text-[11px] text-slate-500">{inv.quantity} unidades · {inv.platform}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-indigo-400 tabular-nums">{formatCurrency(inv.current_price * inv.quantity, currency)}</p>
                  <p className={`text-[11px] tabular-nums ${inv.current_price >= inv.purchase_price ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {inv.current_price >= inv.purchase_price ? '+' : ''}{(((inv.current_price - inv.purchase_price) / inv.purchase_price) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
            {assets.length === 0 && investments.length === 0 && (
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center space-y-1.5">
                <p className="text-xs font-semibold text-slate-300">Aún no tienes activos o inversiones registrados.</p>
                <p className="text-[11px] text-slate-500">Conecta una cuenta bancaria, agrega efectivo o registra tus inversiones.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAssetForm && (
        <AssetModal
          onClose={() => setShowAssetForm(false)}
          onAdd={(a) => addAsset(a)}
          currency={currency}
        />
      )}
    </div>
  )
}

function AssetModal({ onClose, onAdd, currency }: { onClose: () => void; onAdd: (a: Asset) => void; currency: string }) {
  const [form, setForm] = useState({ name: '', category: 'cash', current_value: '', notes: '' })
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onAdd({ id: `local-${Date.now()}`, user_id: 'local', ...form, current_value: parseFloat(form.current_value) || 0, notes: form.notes || null, created_at: new Date().toISOString() })
    onClose()
  }
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-white">Agregar Activo</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Nombre</label>
              <input className="input-field" placeholder="Ej: Cuenta Nequi" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Categoría</label>
              <select className="select-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {Object.keys(ASSET_COLORS).map((c) => <option key={c} value={c}>{c.replace('_', ' ').charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label-field">Valor Actual ({currency})</label>
            <input type="number" className="input-field" placeholder="0" required value={form.current_value} onChange={(e) => setForm({ ...form, current_value: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
            <button type="submit" className="btn-primary flex-1">Agregar Activo</button>
          </div>
        </form>
      </div>
    </div>
  )
}

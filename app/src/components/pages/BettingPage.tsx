'use client'

import { useState } from 'react'
import { useFinancialStore } from '@/store/financial'
import { formatCurrency, formatDate, formatPercent } from '@/lib/utils'
import { calcBettingMetrics } from '@/lib/financial-engine'
import { Plus, Dices, TrendingUp, TrendingDown, Clock, AlertTriangle } from 'lucide-react'
import type { BettingTransaction } from '@/types'

const RESULT_STYLES = {
  won:        { label: 'Ganada',    class: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  lost:       { label: 'Perdida',   class: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
  pending:    { label: 'Pendiente', class: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  push:       { label: 'Push',      class: 'bg-slate-700/60 text-slate-300 border-slate-600/40' },
  cashed_out: { label: 'Retirada',  class: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
}

export function BettingPage() {
  const { bets, addBet, removeBet, metrics, currency } = useFinancialStore()
  const [showForm, setShowForm] = useState(false)

  const bettingMetrics = calcBettingMetrics(bets, metrics.total_income_month)

  return (
    <div className="space-y-6 pb-12">
      {/* Warning disclaimer */}
      <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-200">
          <strong className="text-amber-300">Módulo de Seguimiento — No es Inversión.</strong>
          <span className="text-amber-400/80"> Las apuestas son entretenimiento de alto riesgo. Este módulo contabiliza el impacto real sobre tu flujo de caja pero está completamente separado de tus finanzas de inversión. ROI negativo sostenido = revisar hábito.</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Betting Tracker</h2>
          <p className="text-xs text-slate-400">Seguimiento riguroso · Impacto sobre flujo de caja</p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-4 py-2.5 rounded-xl font-bold text-sm bg-pink-600 hover:bg-pink-500 text-white transition-all flex items-center gap-2">
          <Plus className="w-4 h-4" /> Registrar Apuesta
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-2xl border-l-4 border-l-pink-500">
          <p className="text-[10px] font-bold uppercase tracking-widest text-pink-400 mb-1">Total Apostado</p>
          <p className="text-xl font-extrabold text-white tabular-nums">{formatCurrency(bettingMetrics.total_staked, currency)}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{formatPercent(bettingMetrics.income_percent)} del ingreso</p>
        </div>
        <div className={`glass-card p-4 rounded-2xl border-l-4 ${bettingMetrics.net_profit >= 0 ? 'border-l-emerald-500' : 'border-l-rose-500'}`}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Neto</p>
          <p className={`text-xl font-extrabold tabular-nums ${bettingMetrics.net_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {bettingMetrics.net_profit >= 0 ? '+' : ''}{formatCurrency(bettingMetrics.net_profit, currency)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">ROI: {formatPercent(bettingMetrics.roi_percent)}</p>
        </div>
        <div className="glass-card p-4 rounded-2xl">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Win Rate</p>
          <p className="text-xl font-extrabold text-indigo-400 tabular-nums">{formatPercent(bettingMetrics.win_rate_percent)}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{bettingMetrics.sessions_count} apuestas registradas</p>
        </div>
        <div className="glass-card p-4 rounded-2xl border-l-4 border-l-amber-500">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-1">Pendientes</p>
          <p className="text-xl font-extrabold text-amber-400 tabular-nums">{bettingMetrics.pending_count}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{formatCurrency(bets.filter(b => b.result === 'pending').reduce((s, b) => s + b.stake_amount, 0), currency)} en riesgo</p>
        </div>
      </div>

      {/* Risk alert */}
      {bettingMetrics.income_percent > 10 && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>⚠️ Estás apostando más del 10% de tu ingreso mensual. El motor de NEXUS recomienda revisar tu límite de riesgo.</span>
        </div>
      )}

      {/* Table */}
      <div className="glass-panel rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Plataforma</th>
                <th>Deporte / Tipo</th>
                <th>Cuota</th>
                <th>Stake</th>
                <th>Retorno</th>
                <th>Neto</th>
                <th>Estado</th>
                <th className="text-center">Acc.</th>
              </tr>
            </thead>
            <tbody>
              {bets.length === 0 ? (
                <tr><td colSpan={9} className="py-10 text-center text-slate-500">Sin apuestas registradas.</td></tr>
              ) : bets.map((bet) => (
                <tr key={bet.id}>
                  <td className="text-slate-400 whitespace-nowrap">{formatDate(bet.date)}</td>
                  <td className="font-medium text-white">{bet.platform}</td>
                  <td className="text-slate-300">{bet.sport}{bet.bet_type ? ` · ${bet.bet_type}` : ''}</td>
                  <td className="tabular-nums font-bold text-indigo-300">{bet.odds.toFixed(2)}x</td>
                  <td className="tabular-nums text-slate-200">{formatCurrency(bet.stake_amount, currency)}</td>
                  <td className="tabular-nums text-slate-200">{bet.result !== 'pending' ? formatCurrency(bet.return_amount, currency) : '—'}</td>
                  <td className={`tabular-nums font-bold ${bet.net_profit > 0 ? 'text-emerald-400' : bet.net_profit < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {bet.result === 'pending' ? '?' : (bet.net_profit >= 0 ? '+' : '') + formatCurrency(bet.net_profit, currency)}
                  </td>
                  <td>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${RESULT_STYLES[bet.result].class}`}>
                      {RESULT_STYLES[bet.result].label}
                    </span>
                  </td>
                  <td className="text-center">
                    <button onClick={() => { if (window.confirm('¿Eliminar apuesta?')) removeBet(bet.id) }}
                      className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors">
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && <BetModal onClose={() => setShowForm(false)} onAdd={addBet} currency={currency} />}
    </div>
  )
}

function BetModal({ onClose, onAdd, currency }: { onClose: () => void; onAdd: (b: BettingTransaction) => void; currency: string }) {
  const [form, setForm] = useState({ platform: 'Betplay', sport: 'Fútbol', bet_type: 'Simple', stake_amount: '', odds: '', result: 'pending' as BettingTransaction['result'], return_amount: '', date: new Date().toISOString().split('T')[0], notes: '' })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const stake = parseFloat(form.stake_amount) || 0
    const returnAmt = parseFloat(form.return_amount) || 0
    onAdd({
      id: `local-${Date.now()}`,
      user_id: 'local',
      date: form.date,
      platform: form.platform,
      sport: form.sport,
      bet_type: form.bet_type || null,
      stake_amount: stake,
      odds: parseFloat(form.odds) || 1,
      result: form.result,
      return_amount: returnAmt,
      net_profit: returnAmt - stake,
      notes: form.notes || null,
      created_at: new Date().toISOString(),
    })
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-white">Registrar Apuesta</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Plataforma</label>
              <select className="select-field" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                {['Betplay', 'Wplay', 'Codere', 'Pixbet', 'Otro'].map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="label-field">Fecha</label>
              <input type="date" className="input-field" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Deporte</label>
              <input className="input-field" value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Tipo de apuesta</label>
              <select className="select-field" value={form.bet_type} onChange={(e) => setForm({ ...form, bet_type: e.target.value })}>
                {['Simple', 'Combinada', 'Sistema', 'En Vivo'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label-field">Stake ({currency})</label>
              <input type="number" className="input-field" placeholder="0" required value={form.stake_amount} onChange={(e) => setForm({ ...form, stake_amount: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Cuota</label>
              <input type="number" step="0.01" className="input-field" placeholder="1.80" value={form.odds} onChange={(e) => setForm({ ...form, odds: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Resultado</label>
              <select className="select-field" value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value as BettingTransaction['result'] })}>
                <option value="pending">Pendiente</option>
                <option value="won">Ganada</option>
                <option value="lost">Perdida</option>
                <option value="push">Push</option>
                <option value="cashed_out">Retirada</option>
              </select>
            </div>
          </div>
          {form.result !== 'lost' && form.result !== 'pending' && (
            <div>
              <label className="label-field">Monto Retornado ({currency})</label>
              <input type="number" className="input-field" placeholder="0" value={form.return_amount} onChange={(e) => setForm({ ...form, return_amount: e.target.value })} />
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
            <button type="submit" className="px-4 py-2.5 rounded-xl font-bold text-sm bg-pink-600 hover:bg-pink-500 text-white transition-all flex-1">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

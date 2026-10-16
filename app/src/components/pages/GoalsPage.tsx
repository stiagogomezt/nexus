'use client'

import { useState } from 'react'
import { useFinancialStore } from '@/store/financial'
import { formatCurrency, formatDate, formatPercent } from '@/lib/utils'
import { calcGoalProgress } from '@/lib/financial-engine'
import { Plus, Target, CheckCircle2, Clock, PauseCircle, Flame, Trash2 } from 'lucide-react'
import type { Goal } from '@/types'

const PRIORITY_STYLES = {
  alta:  { label: 'Alta', class: 'bg-red-50 text-red-600 border-red-200' },
  media: { label: 'Media', class: 'bg-amber-50 text-amber-600 border-amber-200' },
  baja:  { label: 'Baja', class: 'bg-slate-100 text-slate-500 border-slate-200' },
}

const GRADIENT_BY_PRIORITY = {
  alta: 'from-rose-500 to-orange-400',
  media: 'from-indigo-500 to-cyan-400',
  baja: 'from-emerald-500 to-teal-400',
}

export function GoalsPage() {
  const { goals, addGoal, updateGoal, removeGoal, currency } = useFinancialStore()
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')

  const filtered = goals.filter((g) =>
    filter === 'all' ? true : filter === 'active' ? g.status === 'active' : g.status === 'completed'
  )

  const totalProgress = goals.filter(g => g.status === 'active').reduce((acc, g) => {
    const p = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0
    return acc + Math.min(100, p)
  }, 0) / Math.max(1, goals.filter(g => g.status === 'active').length)

  function handleContribute(goal: Goal) {
    const str = window.prompt(`Aporte a "${goal.name}" (${currency}):`)
    if (!str) return
    const amount = parseFloat(str)
    if (isNaN(amount) || amount <= 0) return
    updateGoal(goal.id, { current_amount: goal.current_amount + amount })
  }

  function handleDeleteGoal(goal: Goal) {
    if (window.confirm(`¿Eliminar la meta "${goal.name}"?`)) {
      removeGoal(goal.id)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Metas Financieras</h2>
          <p className="text-xs text-slate-500">Seguimiento, proyección y aportes mensuales</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Nueva Meta
        </button>
      </div>

      {/* Summary */}
      <div
        className="border p-6 rounded-3xl relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, hsl(172, 60%, 97%) 0%, hsl(0, 0%, 100%) 55%, hsl(234, 100%, 98%) 100%)',
          borderColor: 'hsl(172, 50%, 86%)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'hsl(172, 60%, 42%)' }} />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'hsl(172, 60%, 35%)' }}>Motor de Metas · NEXUS</span>
            </div>
            <h3 className="text-2xl font-bold tracking-tight" style={{ color: 'hsl(222, 47%, 11%)' }}>{formatPercent(totalProgress)} Progreso Promedio</h3>
            <p className="text-xs" style={{ color: 'hsl(215, 16%, 45%)' }}>
              {goals.filter(g => g.status === 'active').length} metas activas ·&nbsp;
              {goals.filter(g => g.status === 'completed').length} completadas
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div
              className="p-3.5 rounded-xl"
              style={{ background: 'hsl(172, 60%, 95%)', border: '1px solid hsl(172, 50%, 85%)' }}
            >
              <p style={{ color: 'hsl(172, 40%, 45%)' }}>Capital comprometido</p>
              <p className="font-bold tabular-nums text-base mt-0.5" style={{ color: 'hsl(172, 60%, 36%)' }}>
                {formatCurrency(goals.reduce((s, g) => s + g.current_amount, 0), currency)}
              </p>
            </div>
            <div
              className="p-3.5 rounded-xl"
              style={{ background: 'hsl(220, 20%, 97%)', border: '1px solid hsl(220, 15%, 88%)' }}
            >
              <p style={{ color: 'hsl(215, 15%, 52%)' }}>Capital objetivo</p>
              <p className="font-bold tabular-nums text-base mt-0.5" style={{ color: 'hsl(222, 47%, 11%)' }}>
                {formatCurrency(goals.reduce((s, g) => s + g.target_amount, 0), currency)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {(['all', 'active', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all"
            style={filter === f ? {
              background: 'hsl(234, 100%, 96%)',
              color: 'hsl(234, 85%, 50%)',
              border: '1px solid hsl(234, 60%, 88%)',
            } : {
              color: 'hsl(215, 15%, 52%)',
              border: '1px solid transparent',
            }}
          >
            {f === 'all' ? 'Todas' : f === 'active' ? 'Activas' : 'Completadas'}
          </button>
        ))}
      </div>

      {/* Goal Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.length === 0 ? (
          <div className="col-span-2 empty-state">
            <Target className="w-8 h-8 text-slate-300" />
            <p className="text-sm font-semibold" style={{ color: 'hsl(215, 16%, 40%)' }}>Sin metas. ¡Crea tu primera meta financiera!</p>
          </div>
        ) : filtered.map((goal) => {
          const { progress_percent, remaining, months_to_goal, on_track } = calcGoalProgress(goal)
          return (
            <div key={goal.id} className="glass-card p-6 rounded-3xl space-y-4" style={{ transition: 'all 0.2s' }}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-sm font-extrabold text-slate-900">{goal.name}</h3>
                    {goal.priority === 'alta' && <Flame className="w-3.5 h-3.5 text-red-600" />}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${PRIORITY_STYLES[goal.priority].class}`}>
                      {PRIORITY_STYLES[goal.priority].label}
                    </span>
                  </div>
                  {goal.description && <p className="text-[11px] text-slate-500">{goal.description}</p>}
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="font-semibold px-2.5 py-1 rounded-lg text-[10px] flex items-center gap-1"
                    style={goal.status === 'active' ? {
                      background: 'hsl(152, 60%, 95%)', color: 'hsl(152, 60%, 32%)', border: '1px solid hsl(152, 50%, 82%)'
                    } : goal.status === 'completed' ? {
                      background: 'hsl(172, 60%, 94%)', color: 'hsl(172, 60%, 30%)', border: '1px solid hsl(172, 50%, 80%)'
                    } : {
                      background: 'hsl(220, 20%, 96%)', color: 'hsl(215, 16%, 40%)', border: '1px solid hsl(220, 15%, 88%)'
                    }}
                  >
                    {goal.status === 'active' ? <Clock className="w-3 h-3" /> :
                     goal.status === 'completed' ? <CheckCircle2 className="w-3 h-3" /> :
                     <PauseCircle className="w-3 h-3" />}
                    {goal.status === 'active' ? 'Activa' : goal.status === 'completed' ? 'Completada' : 'Pausada'}
                  </span>
                  <button
                    onClick={() => handleDeleteGoal(goal)}
                    title="Eliminar meta"
                    className="p-1 rounded-lg text-slate-500 hover:text-red-600 hover:bg-slate-100 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-500">Progreso</span>
                  <span className="text-slate-900 tabular-nums">{formatPercent(progress_percent)}</span>
                </div>
                <div className="progress-bar h-2">
                  <div
                    className={`progress-fill bg-gradient-to-r ${GRADIENT_BY_PRIORITY[goal.priority]}`}
                    style={{ width: `${progress_percent}%` }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center p-2.5 rounded-xl" style={{ background: 'hsl(172, 60%, 96%)', border: '1px solid hsl(172, 50%, 88%)' }}>
                  <p className="text-[10px]" style={{ color: 'hsl(172, 40%, 50%)' }}>Acumulado</p>
                  <p className="font-bold tabular-nums" style={{ color: 'hsl(172, 60%, 35%)' }}>{formatCurrency(goal.current_amount, currency)}</p>
                </div>
                <div className="text-center p-2.5 rounded-xl" style={{ background: 'hsl(220, 20%, 97%)', border: '1px solid hsl(220, 15%, 90%)' }}>
                  <p className="text-[10px]" style={{ color: 'hsl(215, 15%, 52%)' }}>Restante</p>
                  <p className="font-bold tabular-nums" style={{ color: 'hsl(222, 47%, 11%)' }}>{formatCurrency(remaining, currency)}</p>
                </div>
                <div className="text-center p-2.5 rounded-xl" style={{ background: 'hsl(234, 100%, 97%)', border: '1px solid hsl(234, 60%, 90%)' }}>
                  <p className="text-[10px]" style={{ color: 'hsl(234, 60%, 55%)' }}>Meses</p>
                  <p className="font-bold tabular-nums" style={{ color: 'hsl(234, 85%, 50%)' }}>{months_to_goal ?? '∞'}</p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid hsl(220, 15%, 93%)' }}>
                <span className="text-[10px] font-semibold" style={{ color: on_track ? 'hsl(152, 60%, 38%)' : 'hsl(38, 90%, 40%)' }}>
                  {on_track ? '✓ En ritmo de la meta' : '⚠ Necesita acelerar'}
                </span>
                {goal.status === 'active' && (
                  <button
                    onClick={() => handleContribute(goal)}
                    className="px-3.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all active:scale-95"
                    style={{ background: 'hsl(172, 60%, 94%)', color: 'hsl(172, 60%, 32%)', border: '1px solid hsl(172, 50%, 82%)' }}
                  >
                    + Aportar
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {showForm && <GoalModal onClose={() => setShowForm(false)} onAdd={addGoal} currency={currency} />}
    </div>
  )
}

function GoalModal({ onClose, onAdd, currency }: { onClose: () => void; onAdd: (g: Goal) => void; currency: string }) {
  const [form, setForm] = useState({ name: '', description: '', target_amount: '', current_amount: '', target_date: '', monthly_contribution: '', priority: 'media' as Goal['priority'], category: 'ahorro' })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onAdd({
      id: `local-${Date.now()}`,
      user_id: 'local',
      ...form,
      target_amount: parseFloat(form.target_amount) || 0,
      current_amount: parseFloat(form.current_amount) || 0,
      monthly_contribution: parseFloat(form.monthly_contribution) || 0,
      target_date: form.target_date || null,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel max-w-lg">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-slate-900">Nueva Meta Financiera</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-field">Nombre de la Meta</label>
            <input className="input-field" placeholder="Ej: Fondo de emergencia" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Descripción</label>
            <input className="input-field" placeholder="Opcional" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Capital Objetivo ({currency})</label>
              <input type="number" className="input-field" placeholder="0" required value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Capital Actual ({currency})</label>
              <input type="number" className="input-field" placeholder="0" value={form.current_amount} onChange={(e) => setForm({ ...form, current_amount: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Aporte Mensual ({currency})</label>
              <input type="number" className="input-field" placeholder="0" value={form.monthly_contribution} onChange={(e) => setForm({ ...form, monthly_contribution: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Fecha Objetivo</label>
              <input type="date" className="input-field" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Prioridad</label>
              <select className="select-field" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Goal['priority'] })}>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </div>
            <div>
              <label className="label-field">Categoría</label>
              <select className="select-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {['ahorro', 'emergencia', 'tecnologia', 'viaje', 'inversion', 'educacion', 'hogar', 'otro'].map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
            <button type="submit" className="btn-primary flex-1">Crear Meta</button>
          </div>
        </form>
      </div>
    </div>
  )
}


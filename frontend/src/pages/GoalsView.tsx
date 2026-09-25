import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { formatCurrency, formatDate } from '../lib/formatters';
import { Goal } from '../types';
import { Plus, Trash2, DollarSign, Clock, CheckCircle } from 'lucide-react';
import { Modal } from '../components/ui/Modal';

interface GoalsViewProps {
  onOpenQuickAdd: (type?: 'goal') => void;
}

export const GoalsView: React.FC<GoalsViewProps> = ({ onOpenQuickAdd }) => {
  const { goals, updateGoalProgress, deleteGoal, currency } = useFinancial();
  const [selectedGoalForContribution, setSelectedGoalForContribution] = useState<string | null>(null);
  const [contributionAmount, setContributionAmount] = useState<string>('');

  const totalTarget = goals.reduce((acc: number, curr: Goal) => acc + curr.target_amount, 0);
  const totalCurrent = goals.reduce((acc: number, curr: Goal) => acc + curr.current_amount, 0);
  const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

  const handleContributeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoalForContribution) return;
    const amount = parseFloat(contributionAmount);
    if (amount > 0) {
      updateGoalProgress(selectedGoalForContribution, amount);
      setSelectedGoalForContribution(null);
      setContributionAmount('');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Metas Financieras</h2>
          <p className="text-xs text-slate-400">Planificación de objetivos, ritmo de aportes y proyecciones de cumplimiento</p>
        </div>

        <button
          onClick={() => onOpenQuickAdd('goal')}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-bold text-xs shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Meta</span>
        </button>
      </div>

      {/* 2. Top Summary Progress Banner */}
      <div className="glass-panel p-6 rounded-3xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-purple-950/30 border border-indigo-500/20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div>
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
              Progreso Consolidado
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white numeric-tabular">
                {overallProgress.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-400">
                ({goals.length} metas activas)
              </span>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Capital Acumulado / Objetivo Total
            </p>
            <p className="text-lg font-bold text-emerald-400 numeric-tabular">
              {formatCurrency(totalCurrent, currency)}{' '}
              <span className="text-slate-400 text-xs font-normal">
                de {formatCurrency(totalTarget, currency)}
              </span>
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Faltante para Cumplimiento
            </p>
            <p className="text-lg font-bold text-slate-200 numeric-tabular">
              {formatCurrency(Math.max(0, totalTarget - totalCurrent), currency)}
            </p>
          </div>
        </div>

        {/* Global progress track */}
        <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden mt-6">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 rounded-full transition-all duration-700"
            style={{ width: `${Math.min(100, overallProgress)}%` }}
          />
        </div>
      </div>

      {/* 3. Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.map((goal: Goal) => {
          const progressPct = Math.min(100, (goal.current_amount / goal.target_amount) * 100);
          const remaining = Math.max(0, goal.target_amount - goal.current_amount);
          
          const monthsRemaining = goal.monthly_contribution > 0 
            ? Math.ceil(remaining / goal.monthly_contribution) 
            : null;

          let requiredMonthlyContribution: number | null = null;
          if (goal.target_date) {
            const targetD = new Date(goal.target_date);
            const nowD = new Date();
            const diffMonths = (targetD.getFullYear() - nowD.getFullYear()) * 12 + (targetD.getMonth() - nowD.getMonth());
            if (diffMonths > 0) {
              requiredMonthlyContribution = remaining / diffMonths;
            }
          }

          const isCompleted = goal.current_amount >= goal.target_amount;

          return (
            <div 
              key={goal.id} 
              className="glass-card p-6 rounded-3xl border border-white/[0.08] flex flex-col justify-between relative group hover:border-indigo-500/40 transition-all space-y-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                    goal.priority === 'alta' ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' :
                    goal.priority === 'media' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                    'bg-slate-700/30 text-slate-300 border-slate-600/30'
                  }`}>
                    Prioridad {goal.priority}
                  </span>

                  {isCompleted ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Completada
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-indigo-400 numeric-tabular">
                      {progressPct.toFixed(1)}%
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-white tracking-tight">{goal.name}</h3>
                {goal.description && (
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{goal.description}</p>
                )}

                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden my-4">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Acumulado actual:</span>
                    <span className="font-extrabold text-emerald-400 numeric-tabular">
                      {formatCurrency(goal.current_amount, currency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Valor objetivo:</span>
                    <span className="font-bold text-white numeric-tabular">
                      {formatCurrency(goal.target_amount, currency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/[0.05] pt-2">
                    <span className="text-slate-400">Dinero restante:</span>
                    <span className="font-bold text-slate-300 numeric-tabular">
                      {formatCurrency(remaining, currency)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Clock className="w-3 h-3 text-indigo-400" />
                      Aporte mensual actual:
                    </span>
                    <span className="font-semibold text-white">
                      {formatCurrency(goal.monthly_contribution, currency)}/mes
                    </span>
                  </div>

                  {monthsRemaining !== null && !isCompleted && (
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400">Tiempo estimado (a ritmo actual):</span>
                      <span className="font-semibold text-indigo-300">
                        ~{monthsRemaining} meses
                      </span>
                    </div>
                  )}

                  {requiredMonthlyContribution !== null && !isCompleted && (
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400">Aporte necesario p/ cumplir fecha:</span>
                      <span className="font-semibold text-emerald-300">
                        {formatCurrency(requiredMonthlyContribution, currency)}/mes
                      </span>
                    </div>
                  )}

                  {goal.target_date && (
                    <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-white/[0.04]">
                      <span>Fecha Límite:</span>
                      <span>{formatDate(goal.target_date)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                <button
                  onClick={() => setSelectedGoalForContribution(goal.id)}
                  className="flex-1 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Aportar</span>
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`¿Eliminar la meta "${goal.name}"?`)) {
                      deleteGoal(goal.id);
                    }
                  }}
                  className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent transition-all"
                  title="Eliminar meta"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Contribution Modal */}
      {selectedGoalForContribution && (
        <Modal
          isOpen={Boolean(selectedGoalForContribution)}
          onClose={() => setSelectedGoalForContribution(null)}
          title="Aportar a Meta"
          subtitle="Registra un avance de capital acumulado hacia tu objetivo"
        >
          <form onSubmit={handleContributeSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Monto del Aporte ({currency}) *
              </label>
              <input
                type="number"
                placeholder="Ej. 250000"
                value={contributionAmount}
                onChange={(e) => setContributionAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-white/[0.1] rounded-xl text-sm text-white font-bold focus:outline-none focus:border-indigo-500"
                required
                autoFocus
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-bold text-xs shadow-md hover:brightness-110 active:scale-95 transition-all"
              >
                Confirmar Aporte
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { formatCurrency } from '../lib/formatters';
import { Debt } from '../types';
import { Plus, Trash2, ShieldAlert, ArrowDown } from 'lucide-react';
import { Modal } from '../components/ui/Modal';

interface DebtsViewProps {
  onOpenQuickAdd: (type?: 'debt') => void;
}

export const DebtsView: React.FC<DebtsViewProps> = ({ onOpenQuickAdd }) => {
  const { debts, makeDebtPayment, deleteDebt, currency } = useFinancial();
  const [selectedDebtForPayment, setSelectedDebtForPayment] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');

  const totalCurrentDebt = debts.reduce((acc: number, curr: Debt) => acc + curr.current_balance, 0);
  const totalInitialDebt = debts.reduce((acc: number, curr: Debt) => acc + curr.initial_balance, 0);
  const totalMonthlyMinimum = debts.reduce((acc: number, curr: Debt) => acc + curr.minimum_payment, 0);

  // Amortization paid progress
  const debtReductionProgress = totalInitialDebt > 0 
    ? ((totalInitialDebt - totalCurrentDebt) / totalInitialDebt) * 100 
    : 0;

  // Estimated annual interest load
  const annualInterestEstimated = debts.reduce((acc: number, curr: Debt) => {
    return acc + (curr.current_balance * (curr.interest_rate_ea / 100));
  }, 0);

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebtForPayment) return;
    const amount = parseFloat(paymentAmount);
    if (amount > 0) {
      makeDebtPayment(selectedDebtForPayment, amount);
      setSelectedDebtForPayment(null);
      setPaymentAmount('');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Administración de Deudas</h2>
          <p className="text-xs text-slate-400">Control de pasivos financieros, tasas de interés y plan de amortización</p>
        </div>

        <button
          onClick={() => onOpenQuickAdd('debt')}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Deuda</span>
        </button>
      </div>

      {/* 2. Debt Summary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-rose-500 bg-gradient-to-br from-rose-950/20 to-slate-900/60">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Saldo Total Pendiente
          </p>
          <h3 className="text-2xl font-extrabold text-white numeric-tabular">
            {formatCurrency(totalCurrentDebt, currency)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            Deuda inicial consolidada: {formatCurrency(totalInitialDebt, currency)}
          </p>
        </div>

        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-950/20 to-slate-900/60">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Cuotas Mínimas Mensuales
          </p>
          <h3 className="text-2xl font-extrabold text-amber-400 numeric-tabular">
            {formatCurrency(totalMonthlyMinimum, currency)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Compromiso mensual exigible</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-950/20 to-slate-900/60">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Reducción Lograda
          </p>
          <h3 className="text-2xl font-extrabold text-emerald-400 numeric-tabular">
            {debtReductionProgress.toFixed(1)}%
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            {formatCurrency(Math.max(0, totalInitialDebt - totalCurrentDebt), currency)} amortizados
          </p>
        </div>

        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-indigo-500 bg-gradient-to-br from-indigo-950/20 to-slate-900/60">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Costo Intereses Est. (Año)
          </p>
          <h3 className="text-2xl font-extrabold text-indigo-300 numeric-tabular">
            {formatCurrency(annualInterestEstimated, currency)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Basado en tasas E.A. vigentes</p>
        </div>
      </div>

      {/* 3. Debt Strategy Notice Banner */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <p className="text-slate-300">
            <strong>Estrategia Recomendada:</strong> Concentra abonos extraordinarios en la deuda con mayor tasa (Método Avalancha) para reducir el costo financiero total.
          </p>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap">
          Simulador Avalancha (Fase 2)
        </span>
      </div>

      {/* 4. Debts Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {debts.map((debt: Debt) => {
          const reductionPct = debt.initial_balance > 0
            ? Math.max(0, ((debt.initial_balance - debt.current_balance) / debt.initial_balance) * 100)
            : 0;

          const estMonths = debt.minimum_payment > 0
            ? Math.ceil(debt.current_balance / debt.minimum_payment)
            : 0;

          return (
            <div 
              key={debt.id} 
              className="glass-card p-6 rounded-3xl border border-white/[0.08] flex flex-col justify-between relative group hover:border-amber-500/40 transition-all space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                      {debt.entity}
                    </span>
                    <h3 className="text-lg font-bold text-white">{debt.name}</h3>
                  </div>

                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/[0.08] text-slate-200">
                    {debt.interest_rate_ea}% E.A.
                  </span>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden my-3">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, reductionPct)}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs my-4">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <span className="text-slate-400 text-[11px]">Saldo Actual:</span>
                    <p className="font-extrabold text-white text-base mt-0.5 numeric-tabular">
                      {formatCurrency(debt.current_balance, currency)}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <span className="text-slate-400 text-[11px]">Saldo Inicial:</span>
                    <p className="font-semibold text-slate-300 text-sm mt-0.5 numeric-tabular">
                      {formatCurrency(debt.initial_balance, currency)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-xs border-t border-white/[0.05] pt-3 text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Cuota mínima mensual:</span>
                    <span className="font-bold text-amber-300">
                      {formatCurrency(debt.minimum_payment, currency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Día límite de pago:</span>
                    <span className="font-semibold text-white">Día {debt.payment_day} de cada mes</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Plazo estimado al mínimo:</span>
                    <span className="font-semibold text-slate-300">~{estMonths} meses</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-white/[0.06]">
                <button
                  onClick={() => setSelectedDebtForPayment(debt.id)}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                  <span>Registrar Abono a Deuda</span>
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`¿Eliminar la deuda "${debt.name}"?`)) {
                      deleteDebt(debt.id);
                    }
                  }}
                  className="p-2.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent transition-all"
                  title="Eliminar deuda"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Payment Modal */}
      {selectedDebtForPayment && (
        <Modal
          isOpen={Boolean(selectedDebtForPayment)}
          onClose={() => setSelectedDebtForPayment(null)}
          title="Registrar Abono / Pago a Deuda"
          subtitle="Disminuye el saldo pendiente del pasivo financiero"
        >
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Monto del Pago ({currency}) *
              </label>
              <input
                type="number"
                placeholder="Ej. 300000"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-white/[0.1] rounded-xl text-sm text-white font-bold focus:outline-none focus:border-amber-500"
                required
                autoFocus
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs shadow-md hover:brightness-110 active:scale-95 transition-all"
              >
                Confirmar Pago
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

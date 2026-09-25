import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { useFinancial } from '../../context/FinancialContext';
import { IncomeSource, ExpenseCategory } from '../../types';
import { ArrowDownLeft, ArrowUpRight, Target, CreditCard, Plus } from 'lucide-react';

interface QuickTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'income' | 'expense' | 'goal' | 'debt';
}

export const QuickTransactionModal: React.FC<QuickTransactionModalProps> = ({
  isOpen,
  onClose,
  defaultType = 'income'
}) => {
  const { addIncome, addExpense, addGoal, addDebt, currency } = useFinancial();
  const [activeTab, setActiveTab] = useState<'income' | 'expense' | 'goal' | 'debt'>(defaultType);

  // Income State (Tailored to Shuffler & Pizza Hut)
  const [incomeSource, setIncomeSource] = useState<IncomeSource>('Shuffler');
  const [customSource, setCustomSource] = useState('');
  const [incomeDesc, setIncomeDesc] = useState('');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeType, setIncomeType] = useState('salary');
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().split('T')[0]);
  const [surcharges, setSurcharges] = useState('');
  const [extraHours, setExtraHours] = useState('');
  const [bonuses, setBonuses] = useState('');
  const [hoursWorked, setHoursWorked] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [incomeNotes, setIncomeNotes] = useState('');

  // Expense State
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('alimentacion');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseMethod, setExpenseMethod] = useState<'debit' | 'credit' | 'cash' | 'transfer'>('debit');
  const [isEssential, setIsEssential] = useState(true);
  const [isRecurring, setIsRecurring] = useState(false);

  // Goal State
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalCurrent, setGoalCurrent] = useState('0');
  const [goalTargetDate, setGoalTargetDate] = useState('2027-12-31');
  const [goalContribution, setGoalContribution] = useState('');
  const [goalPriority, setGoalPriority] = useState<'alta' | 'media' | 'baja'>('alta');

  // Debt State
  const [debtEntity, setDebtEntity] = useState('');
  const [debtName, setDebtName] = useState('');
  const [debtType, setDebtType] = useState<'credit_card' | 'loan' | 'consumer' | 'mortgage' | 'other'>('credit_card');
  const [debtBalance, setDebtBalance] = useState('');
  const [debtRate, setDebtRate] = useState('28.5');
  const [debtMinPay, setDebtMinPay] = useState('');
  const [debtDay, setDebtDay] = useState('15');

  const handleIncomeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sourceFinal = incomeSource === 'Otro' ? customSource || 'Otro' : incomeSource;
    const totalAmount = parseFloat(incomeAmount) || 0;
    if (totalAmount <= 0) return;

    addIncome({
      date: incomeDate,
      source: sourceFinal,
      description: incomeDesc || `Ingreso de ${sourceFinal}`,
      amount: totalAmount,
      income_type: incomeType as any,
      surcharges_amount: surcharges ? parseFloat(surcharges) : 0,
      extra_hours_amount: extraHours ? parseFloat(extraHours) : 0,
      bonus_amount: bonuses ? parseFloat(bonuses) : 0,
      hours_worked: hoursWorked ? parseFloat(hoursWorked) : 0,
      hourly_rate: hourlyRate ? parseFloat(hourlyRate) : 0,
      is_recurring: false,
      notes: incomeNotes,
      account: 'Bancolombia'
    });
    onClose();
  };

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(expenseAmount) || 0;
    if (amountVal <= 0 || !expenseDesc) return;

    addExpense({
      date: expenseDate,
      description: expenseDesc,
      category: expenseCategory,
      amount: amountVal,
      payment_method: expenseMethod,
      is_recurring: isRecurring,
      is_essential: isEssential,
      account: 'Bancolombia'
    });
    onClose();
  };

  const handleGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetVal = parseFloat(goalTarget) || 0;
    if (targetVal <= 0 || !goalName) return;

    addGoal({
      name: goalName,
      target_amount: targetVal,
      current_amount: parseFloat(goalCurrent) || 0,
      target_date: goalTargetDate,
      monthly_contribution: parseFloat(goalContribution) || 0,
      priority: goalPriority,
      category: 'ahorro',
      status: 'active'
    });
    onClose();
  };

  const handleDebtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const balanceVal = parseFloat(debtBalance) || 0;
    if (balanceVal <= 0 || !debtEntity) return;

    addDebt({
      entity: debtEntity,
      name: debtName || debtEntity,
      debt_type: debtType,
      initial_balance: balanceVal,
      current_balance: balanceVal,
      interest_rate_ea: parseFloat(debtRate) || 0,
      minimum_payment: parseFloat(debtMinPay) || 0,
      payment_day: parseInt(debtDay) || 15
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nuevo Registro Financiero"
      subtitle="Ingresa tus transacciones con desglose exacto de origen"
      maxWidthClass="max-w-2xl"
    >
      {/* Category selector pills */}
      <div className="grid grid-cols-4 gap-2 mb-6 p-1 bg-slate-900/60 rounded-xl border border-white/[0.06]">
        <button
          type="button"
          onClick={() => setActiveTab('income')}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'income'
              ? 'bg-emerald-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ArrowDownLeft className="w-3.5 h-3.5" />
          <span>Ingreso</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('expense')}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'expense'
              ? 'bg-rose-500 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>Gasto</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('goal')}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'goal'
              ? 'bg-indigo-500 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>Meta</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('debt')}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'debt'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Deuda</span>
        </button>
      </div>

      {/* 1. INCOME FORM */}
      {activeTab === 'income' && (
        <form onSubmit={handleIncomeSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Fuente Real de Ingreso *
              </label>
              <select
                value={incomeSource}
                onChange={(e) => setIncomeSource(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-white/[0.1] rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 font-medium"
              >
                <option value="Shuffler">Shuffler (Principal)</option>
                <option value="Pizza Hut">Pizza Hut (Side Job)</option>
                <option value="Otro">+ Agregar otra fuente</option>
              </select>
            </div>

            {incomeSource === 'Otro' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nombre de la Fuente *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Inversión CDT, Venta..."
                  value={customSource}
                  onChange={(e) => setCustomSource(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-white/[0.1] rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tipo de Ingreso
                </label>
                <select
                  value={incomeType}
                  onChange={(e) => setIncomeType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-white/[0.1] rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="salary">Salario / Quincena Base</option>
                  <option value="hourly_wage">Pago por Horas</option>
                  <option value="bonus">Bono de Desempeño</option>
                  <option value="surcharge">Recargo Nocturno / Dominical</option>
                  <option value="extra_hours">Horas Adicionales / Extras</option>
                  <option value="other">Otro Pago</option>
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Monto Total Recibido ({currency}) *
              </label>
              <input
                type="number"
                placeholder="Ej. 1850000"
                value={incomeAmount}
                onChange={(e) => setIncomeAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-white/[0.1] rounded-xl text-sm text-white font-bold focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Fecha de Recepción
              </label>
              <input
                type="date"
                value={incomeDate}
                onChange={(e) => setIncomeDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-white/[0.1] rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Conditional Detail: Shuffler specifics */}
          {incomeSource === 'Shuffler' && (
            <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 space-y-3">
              <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                Desglose Shuffler (Opcional)
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Recargos</label>
                  <input
                    type="number"
                    placeholder="$ 0"
                    value={surcharges}
                    onChange={(e) => setSurcharges(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900/80 border border-white/[0.08] rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Horas Extras</label>
                  <input
                    type="number"
                    placeholder="$ 0"
                    value={extraHours}
                    onChange={(e) => setExtraHours(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900/80 border border-white/[0.08] rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Bonos</label>
                  <input
                    type="number"
                    placeholder="$ 0"
                    value={bonuses}
                    onChange={(e) => setBonuses(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900/80 border border-white/[0.08] rounded-lg text-xs text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Conditional Detail: Pizza Hut specifics */}
          {incomeSource === 'Pizza Hut' && (
            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/20 space-y-3">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                Detalle Turnos Pizza Hut (Horas / Tarifa)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Horas Trabajadas</label>
                  <input
                    type="number"
                    placeholder="Ej. 36"
                    value={hoursWorked}
                    onChange={(e) => {
                      setHoursWorked(e.target.value);
                      if (hourlyRate && e.target.value) {
                        const calculated = parseFloat(e.target.value) * parseFloat(hourlyRate);
                        if (!incomeAmount) setIncomeAmount(calculated.toString());
                      }
                    }}
                    className="w-full px-2.5 py-1.5 bg-slate-900/80 border border-white/[0.08] rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Pago por Hora ($)</label>
                  <input
                    type="number"
                    placeholder="Ej. 13500"
                    value={hourlyRate}
                    onChange={(e) => {
                      setHourlyRate(e.target.value);
                      if (hoursWorked && e.target.value) {
                        const calculated = parseFloat(hoursWorked) * parseFloat(e.target.value);
                        if (!incomeAmount) setIncomeAmount(calculated.toString());
                      }
                    }}
                    className="w-full px-2.5 py-1.5 bg-slate-900/80 border border-white/[0.08] rounded-lg text-xs text-white"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Descripción / Notas
            </label>
            <input
              type="text"
              placeholder="Ej. Quincena 1 septiembre + cierre nocturno"
              value={incomeDesc}
              onChange={(e) => setIncomeDesc(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-white/[0.1] rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="pt-3">
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-sm shadow-glow-sm hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Guardar Ingreso</span>
            </button>
          </div>
        </form>
      )}

      {/* 2. EXPENSE FORM */}
      {activeTab === 'expense' && (
        <form onSubmit={handleExpenseSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Categoría *
              </label>
              <select
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2 bg-slate-900 border border-white/[0.1] rounded-xl text-sm text-white focus:outline-none focus:border-rose-500 font-medium"
              >
                <option value="alimentacion">Alimentación</option>
                <option value="vivienda">Vivienda</option>
                <option value="transporte">Transporte</option>
                <option value="servicios">Servicios</option>
                <option value="tecnologia">Tecnología</option>
                <option value="entretenimiento">Entretenimiento</option>
                <option value="compras">Compras</option>
                <option value="salud">Salud</option>
                <option value="educacion">Educación</option>
                <option value="suscripciones">Suscripciones</option>
                <option value="otros">Otros</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Monto del Gasto ({currency}) *
              </label>
              <input
                type="number"
                placeholder="Ej. 125000"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-white/[0.1] rounded-xl text-sm text-white font-bold focus:outline-none focus:border-rose-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Descripción del Gasto *
            </label>
            <input
              type="text"
              placeholder="Ej. Compra de supermercado, Pago de factura de luz..."
              value={expenseDesc}
              onChange={(e) => setExpenseDesc(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-white/[0.1] rounded-xl text-sm text-white focus:outline-none focus:border-rose-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Método de Pago
              </label>
              <select
                value={expenseMethod}
                onChange={(e) => setExpenseMethod(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-900 border border-white/[0.1] rounded-xl text-sm text-white focus:outline-none focus:border-rose-500"
              >
                <option value="debit">Tarjeta Débito</option>
                <option value="transfer">Transferencia / Nequi / PSE</option>
                <option value="cash">Efectivo</option>
                <option value="credit">Tarjeta de Crédito</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Fecha
              </label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-white/[0.1] rounded-xl text-sm text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={isEssential}
                onChange={(e) => setIsEssential(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/20"
              />
              <span>Gasto esencial (Para fondo de emergencia)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/20"
              />
              <span>Gasto recurrente mensual</span>
            </label>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-sm shadow-md hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Gasto</span>
            </button>
          </div>
        </form>
      )}

      {/* 3. GOAL FORM */}
      {activeTab === 'goal' && (
        <form onSubmit={handleGoalSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nombre de la Meta *
            </label>
            <input
              type="text"
              placeholder="Ej. Fondo de Emergencia, Patrimonio $47M, Computador Pro..."
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-white/[0.1] rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Valor Objetivo ({currency}) *
              </label>
              <input
                type="number"
                placeholder="Ej. 10000000"
                value={goalTarget}
                onChange={(e) => setGoalTarget(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-white/[0.1] rounded-xl text-sm text-white font-bold focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Valor Actual Acumulado ({currency})
              </label>
              <input
                type="number"
                placeholder="Ej. 2500000"
                value={goalCurrent}
                onChange={(e) => setGoalCurrent(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-white/[0.1] rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Aporte Mensual Programado ({currency})
              </label>
              <input
                type="number"
                placeholder="Ej. 500000"
                value={goalContribution}
                onChange={(e) => setGoalContribution(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-white/[0.1] rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Fecha Objetivo
              </label>
              <input
                type="date"
                value={goalTargetDate}
                onChange={(e) => setGoalTargetDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-white/[0.1] rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Prioridad
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['alta', 'media', 'baja'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setGoalPriority(p)}
                  className={`py-2 text-xs font-bold capitalize rounded-xl border transition-all ${
                    goalPriority === p
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500'
                      : 'bg-slate-900 border-white/[0.08] text-slate-400 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-bold text-sm shadow-md hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Meta Financiera</span>
            </button>
          </div>
        </form>
      )}

      {/* 4. DEBT FORM */}
      {activeTab === 'debt' && (
        <form onSubmit={handleDebtSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Entidad Financiera *
              </label>
              <input
                type="text"
                placeholder="Ej. Banco Falabella, Bancolombia, Nu..."
                value={debtEntity}
                onChange={(e) => setDebtEntity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-white/[0.1] rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nombre de la Deuda
              </label>
              <input
                type="text"
                placeholder="Ej. Tarjeta de Crédito, Préstamo..."
                value={debtName}
                onChange={(e) => setDebtName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-white/[0.1] rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Saldo Actual Pendiente ({currency}) *
              </label>
              <input
                type="number"
                placeholder="Ej. 3500000"
                value={debtBalance}
                onChange={(e) => setDebtBalance(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-white/[0.1] rounded-xl text-sm text-white font-bold focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tasa Efectiva Anual (E.A. %)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Ej. 32.5"
                value={debtRate}
                onChange={(e) => setDebtRate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-white/[0.1] rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Pago / Cuota Mínima ({currency})
              </label>
              <input
                type="number"
                placeholder="Ej. 250000"
                value={debtMinPay}
                onChange={(e) => setDebtMinPay(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-white/[0.1] rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Día de Pago en el Mes (1 al 31)
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={debtDay}
                onChange={(e) => setDebtDay(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-white/[0.1] rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-sm shadow-md hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Deuda</span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { formatCurrency, formatDate } from '../lib/formatters';
import { Expense } from '../types';
import { Plus, Trash2, Search, Tag } from 'lucide-react';

interface ExpensesViewProps {
  onOpenQuickAdd: (type?: 'expense') => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({ onOpenQuickAdd }) => {
  const { expenses, deleteExpense, currency } = useFinancial();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const totalExpenses = expenses.reduce((acc: number, curr: Expense) => acc + curr.amount, 0);

  const categories = [
    'all',
    'vivienda',
    'alimentacion',
    'transporte',
    'servicios',
    'tecnologia',
    'entretenimiento',
    'compras',
    'salud',
    'educacion',
    'suscripciones',
    'otros'
  ];

  const filteredExpenses = expenses.filter((exp: Expense) => {
    const matchesCat = selectedCategory === 'all' || exp.category === selectedCategory;
    const matchesSearch = exp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const essentialTotal = expenses
    .filter((e: Expense) => e.is_essential)
    .reduce((acc: number, curr: Expense) => acc + curr.amount, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Control de Gastos</h2>
          <p className="text-xs text-slate-400">Seguimiento de salidas por categoría, recurrencia y nivel de necesidad</p>
        </div>

        <button
          onClick={() => onOpenQuickAdd('expense')}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-xs shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Gasto</span>
        </button>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-rose-500 bg-gradient-to-br from-rose-950/20 to-slate-900/60">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Gasto Total Mensual
          </p>
          <h3 className="text-2xl font-extrabold text-white numeric-tabular">
            {formatCurrency(totalExpenses, currency)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">{expenses.length} movimientos registrados</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-cyan-500 bg-gradient-to-br from-cyan-950/20 to-slate-900/60">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Gastos Esenciales (Fijo)
            </p>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-semibold">
              {((essentialTotal / (totalExpenses || 1)) * 100).toFixed(0)}% del total
            </span>
          </div>
          <h3 className="text-2xl font-extrabold text-cyan-400 numeric-tabular">
            {formatCurrency(essentialTotal, currency)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Base para cálculo del Fondo de Emergencia</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-950/20 to-slate-900/60">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Gastos Discrecionales
          </p>
          <h3 className="text-2xl font-extrabold text-amber-400 numeric-tabular">
            {formatCurrency(totalExpenses - essentialTotal, currency)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Margen óptimo para optimización y ahorro</p>
        </div>
      </div>

      {/* 3. Category Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap capitalize transition-all ${
                selectedCategory === cat
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {cat === 'all' ? 'Todas' : cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar gasto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-white/[0.1] text-xs text-white focus:outline-none focus:border-rose-500"
          />
        </div>
      </div>

      {/* 4. Expenses Table */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-white/[0.08]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.03] border-b border-white/[0.06] text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">Fecha</th>
                <th className="py-3.5 px-4">Descripción</th>
                <th className="py-3.5 px-4">Categoría</th>
                <th className="py-3.5 px-4">Método</th>
                <th className="py-3.5 px-4">Tipo</th>
                <th className="py-3.5 px-4 text-right">Monto</th>
                <th className="py-3.5 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No se encontraron gastos en este criterio.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp: Expense) => (
                  <tr key={exp.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-300">
                      {formatDate(exp.date)}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {exp.description}
                      {exp.notes && (
                        <p className="text-[11px] text-slate-400 font-normal mt-0.5">{exp.notes}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-800 text-slate-200 border border-slate-700 capitalize">
                        <Tag className="w-3 h-3 text-rose-400" />
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap capitalize text-slate-300">
                      {exp.payment_method === 'debit' ? 'Tarjeta Débito' :
                       exp.payment_method === 'credit' ? 'Tarjeta Crédito' :
                       exp.payment_method === 'transfer' ? 'Transferencia' : 'Efectivo'}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {exp.is_essential ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Esencial
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                          Discrecional
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-rose-400 text-sm whitespace-nowrap numeric-tabular">
                      -{formatCurrency(exp.amount, currency)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Eliminar gasto "${exp.description}"?`)) {
                            deleteExpense(exp.id);
                          }
                        }}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

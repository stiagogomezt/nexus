import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { formatCurrency, formatDate } from '../lib/formatters';
import { Income } from '../types';
import { Plus, Trash2, Search, Briefcase, Clock } from 'lucide-react';

interface IncomesViewProps {
  onOpenQuickAdd: (type?: 'income') => void;
}

export const IncomesView: React.FC<IncomesViewProps> = ({ onOpenQuickAdd }) => {
  const { incomes, deleteIncome, currency } = useFinancial();
  const [filterSource, setFilterSource] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const shufflerTotal = incomes
    .filter((i: Income) => i.source.toLowerCase().includes('shuffler'))
    .reduce((acc: number, curr: Income) => acc + curr.amount, 0);

  const pizzaHutTotal = incomes
    .filter((i: Income) => i.source.toLowerCase().includes('pizza hut') || i.source.toLowerCase().includes('pizza'))
    .reduce((acc: number, curr: Income) => acc + curr.amount, 0);

  const othersTotal = incomes
    .filter((i: Income) => !i.source.toLowerCase().includes('shuffler') && !i.source.toLowerCase().includes('pizza'))
    .reduce((acc: number, curr: Income) => acc + curr.amount, 0);

  const totalAllIncomes = incomes.reduce((acc: number, curr: Income) => acc + curr.amount, 0);

  const filteredIncomes = incomes.filter((inc: Income) => {
    const matchesSource = 
      filterSource === 'all' ? true :
      filterSource === 'shuffler' ? inc.source.toLowerCase().includes('shuffler') :
      filterSource === 'pizzahut' ? (inc.source.toLowerCase().includes('pizza hut') || inc.source.toLowerCase().includes('pizza')) :
      (!inc.source.toLowerCase().includes('shuffler') && !inc.source.toLowerCase().includes('pizza'));

    const matchesSearch = inc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.source.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSource && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header with Total & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Gestión de Fuentes de Ingreso</h2>
          <p className="text-xs text-slate-400">Control granular de turnos, horas laboradas, bonos y recargos</p>
        </div>

        <button
          onClick={() => onOpenQuickAdd('income')}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs shadow-glow-sm hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Ingreso</span>
        </button>
      </div>

      {/* 2. Source Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Shuffler Card */}
        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-indigo-500 bg-gradient-to-br from-indigo-950/30 to-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <Briefcase className="w-4 h-4" />
              Trabajo Principal: Shuffler
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold">
              {((shufflerTotal / (totalAllIncomes || 1)) * 100).toFixed(0)}% del total
            </span>
          </div>
          <h3 className="text-2xl font-extrabold text-white mt-2 numeric-tabular">
            {formatCurrency(shufflerTotal, currency)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            Salario base + recargos nocturnos + bonos de precisión
          </p>
        </div>

        {/* Pizza Hut Card */}
        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-950/30 to-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              Side Job: Pizza Hut
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold">
              {((pizzaHutTotal / (totalAllIncomes || 1)) * 100).toFixed(0)}% del total
            </span>
          </div>
          <h3 className="text-2xl font-extrabold text-white mt-2 numeric-tabular">
            {formatCurrency(pizzaHutTotal, currency)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            Horas laboradas + horas adicionales + recargos
          </p>
        </div>

        {/* Other Sources Card */}
        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-slate-500 bg-gradient-to-br from-slate-900 to-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Otras Fuentes Agregadas
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-semibold">
              Dinámico
            </span>
          </div>
          <h3 className="text-2xl font-extrabold text-white mt-2 numeric-tabular">
            {formatCurrency(othersTotal, currency)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            Otras fuentes creadas por el usuario (sin freelance por defecto)
          </p>
        </div>
      </div>

      {/* 3. Filters & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'shuffler', label: 'Shuffler' },
            { id: 'pizzahut', label: 'Pizza Hut' },
            { id: 'others', label: 'Otros' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterSource(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                filterSource === tab.id
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por descripción..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-white/[0.1] text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* 4. Incomes Table */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-white/[0.08]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.03] border-b border-white/[0.06] text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">Fecha</th>
                <th className="py-3.5 px-4">Fuente</th>
                <th className="py-3.5 px-4">Descripción</th>
                <th className="py-3.5 px-4">Detalle / Desglose</th>
                <th className="py-3.5 px-4 text-right">Monto</th>
                <th className="py-3.5 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredIncomes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No se encontraron ingresos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredIncomes.map((inc: Income) => (
                  <tr key={inc.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-300">
                      {formatDate(inc.date)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                        inc.source.toLowerCase().includes('shuffler')
                          ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                          : inc.source.toLowerCase().includes('pizza')
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      }`}>
                        {inc.source}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-white">
                      {inc.description}
                      {inc.notes && (
                        <p className="text-[11px] text-slate-400 font-normal mt-0.5">{inc.notes}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {inc.source.toLowerCase().includes('shuffler') ? (
                        <div className="flex items-center gap-2 flex-wrap text-[11px]">
                          {inc.surcharges_amount ? (
                            <span className="bg-slate-800 px-1.5 py-0.5 rounded text-indigo-300">
                              Recargos: {formatCurrency(inc.surcharges_amount, currency)}
                            </span>
                          ) : null}
                          {inc.extra_hours_amount ? (
                            <span className="bg-slate-800 px-1.5 py-0.5 rounded text-indigo-300">
                              H. Extras: {formatCurrency(inc.extra_hours_amount, currency)}
                            </span>
                          ) : null}
                          {inc.bonus_amount ? (
                            <span className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-300">
                              Bono: {formatCurrency(inc.bonus_amount, currency)}
                            </span>
                          ) : null}
                        </div>
                      ) : inc.source.toLowerCase().includes('pizza') ? (
                        <div className="flex items-center gap-2 flex-wrap text-[11px]">
                          {inc.hours_worked ? (
                            <span className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">
                              {inc.hours_worked} hrs
                            </span>
                          ) : null}
                          {inc.hourly_rate ? (
                            <span className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">
                              @ {formatCurrency(inc.hourly_rate, currency)}/hr
                            </span>
                          ) : null}
                          {inc.extra_hours_amount ? (
                            <span className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">
                              Adicional: {formatCurrency(inc.extra_hours_amount, currency)}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Ingreso estándar</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-emerald-400 text-sm whitespace-nowrap numeric-tabular">
                      +{formatCurrency(inc.amount, currency)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Eliminar ingreso "${inc.description}"?`)) {
                            deleteIncome(inc.id);
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

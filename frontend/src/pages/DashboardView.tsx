import React from 'react';
import { useFinancial } from '../context/FinancialContext';
import { formatCurrency, formatPercent } from '../lib/formatters';
import { MetricCard } from '../components/ui/MetricCard';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  CreditCard, 
  Landmark, 
  PiggyBank, 
  TrendingUp, 
  Dices, 
  Target,
  Plus,
  ShieldCheck
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

interface DashboardViewProps {
  onOpenQuickAdd: (type?: 'income' | 'expense' | 'goal' | 'debt') => void;
  onNavigateTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onOpenQuickAdd, onNavigateTab }) => {
  const { metrics, currency, goals, expenses } = useFinancial();

  // Color scheme for categories
  const CATEGORY_COLORS: Record<string, string> = {
    vivienda: '#3b82f6',
    alimentacion: '#10b981',
    transporte: '#f59e0b',
    servicios: '#06b6d4',
    tecnologia: '#6366f1',
    entretenimiento: '#ec4899',
    suscripciones: '#a855f7',
    otros: '#64748b'
  };

  // Aggregated expense distribution for chart
  const categoryTotals = expenses.reduce((acc: Record<string, number>, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {});

  const pieData = Object.entries(categoryTotals).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: CATEGORY_COLORS[name] || '#94a3b8'
  }));

  // Cashflow timeline
  const cashflowData = [
    { month: 'Jun', ingresos: 2600000, gastos: 2100000, flujo: 500000 },
    { month: 'Jul', ingresos: 2850000, gastos: 2050000, flujo: 800000 },
    { month: 'Ago', ingresos: 2950000, gastos: 2150000, flujo: 800000 },
    { 
      month: 'Sep (Actual)', 
      ingresos: metrics.total_income_month, 
      gastos: metrics.total_expenses_month, 
      flujo: metrics.free_cash_flow 
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* 1. TOP BANNER / FINANCIAL PULSE */}
      <div className="glass-panel p-5 lg:p-6 rounded-3xl relative overflow-hidden bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/30 border border-emerald-500/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Pulso Financiero NEXUS
              </span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
              Flujo Libre Mensual: {formatCurrency(metrics.free_cash_flow, currency)}
            </h2>
            <p className="text-xs lg:text-sm text-slate-300">
              Generado tras cubrir {formatCurrency(metrics.total_expenses_month, currency)} de gastos con {formatCurrency(metrics.total_income_month, currency)} recibidos este mes.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onOpenQuickAdd('income')}
              className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Ingreso</span>
            </button>
            <button
              onClick={() => onOpenQuickAdd('expense')}
              className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Gasto</span>
            </button>
            <button
              onClick={() => onNavigateTab('patrimonio')}
              className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border border-white/[0.1] text-xs font-bold transition-all"
            >
              Ver Patrimonio
            </button>
          </div>
        </div>
      </div>

      {/* 2. CORE FINANCIAL METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Income Card with Shuffler & Pizza Hut breakdown */}
        <div className="glass-card p-5 rounded-2xl border border-white/[0.08] relative group hover:border-emerald-500/40 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Ingresos del Mes
              </p>
              <h3 className="text-2xl font-extrabold text-emerald-400 numeric-tabular">
                {formatCurrency(metrics.total_income_month, currency)}
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.05] space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-indigo-300 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                Shuffler
              </span>
              <span className="font-semibold text-slate-200">
                {formatCurrency(metrics.income_by_source.shuffler, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-amber-300 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Pizza Hut
              </span>
              <span className="font-semibold text-slate-200">
                {formatCurrency(metrics.income_by_source.pizza_hut, currency)}
              </span>
            </div>
            {metrics.income_by_source.others > 0 && (
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Otros</span>
                <span>{formatCurrency(metrics.income_by_source.others, currency)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Expenses Card */}
        <MetricCard
          title="Gastos del Mes"
          value={formatCurrency(metrics.total_expenses_month, currency)}
          subtitle={`${expenses.length} transacciones registradas`}
          icon={ArrowUpRight}
          badge={{
            text: `${((metrics.total_expenses_month / (metrics.total_income_month || 1)) * 100).toFixed(0)}% del ingreso`,
            variant: 'negative'
          }}
          iconBgClass="bg-rose-500/10 text-rose-400 border-rose-500/20"
          onClick={() => onNavigateTab('gastos')}
        />

        {/* Total Debt Card */}
        <MetricCard
          title="Deuda Total Pendiente"
          value={formatCurrency(metrics.total_debt, currency)}
          subtitle="Pasivos financieros activos"
          icon={CreditCard}
          badge={{
            text: 'Gestión activa',
            variant: 'amber'
          }}
          iconBgClass="bg-amber-500/10 text-amber-400 border-amber-500/20"
          onClick={() => onNavigateTab('deudas')}
        />

        {/* Net Worth Card */}
        <MetricCard
          title="Patrimonio Neto"
          value={formatCurrency(metrics.net_worth, currency)}
          subtitle="Activos totales menos Deudas"
          icon={Landmark}
          badge={{
            text: metrics.net_worth >= 0 ? 'Positivo' : 'Déficit',
            variant: metrics.net_worth >= 0 ? 'positive' : 'negative'
          }}
          iconBgClass="bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
          onClick={() => onNavigateTab('patrimonio')}
        />
      </div>

      {/* SECONDARY ROW OF FINTECH CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Ahorro Disponible"
          value={formatCurrency(metrics.total_savings, currency)}
          subtitle="Cuentas, efectivo y reservas"
          icon={PiggyBank}
          badge={{ text: 'Líquido', variant: 'positive' }}
          iconBgClass="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          onClick={() => onNavigateTab('ahorro')}
        />

        <MetricCard
          title="Capital Invertido"
          value={formatCurrency(metrics.total_invested, currency)}
          subtitle="ETFs, Acciones & CDTs"
          icon={TrendingUp}
          badge={{ text: 'Activo', variant: 'indigo' }}
          iconBgClass="bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
          onClick={() => onNavigateTab('inversiones')}
        />

        <MetricCard
          title="Destinado a Apuestas"
          value={formatCurrency(metrics.betting_allocated, currency)}
          subtitle="Betting Tracker separado"
          icon={Dices}
          badge={{ text: 'Control Estricto', variant: 'amber' }}
          iconBgClass="bg-pink-500/10 text-pink-400 border-pink-500/20"
          onClick={() => onNavigateTab('apuestas')}
        />

        <MetricCard
          title="Avance de Metas"
          value={formatPercent(metrics.average_goals_progress)}
          subtitle={`${metrics.active_goals_count} metas activas en curso`}
          icon={Target}
          badge={{ text: 'Progreso', variant: 'positive' }}
          iconBgClass="bg-teal-500/10 text-teal-400 border-teal-500/20"
          onClick={() => onNavigateTab('metas')}
        />
      </div>

      {/* 3. CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-3xl lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Comparativa: Ingresos vs Gastos &amp; Flujo
              </h3>
              <p className="text-xs text-slate-400">
                Evolución mes a mes del flujo neto disponible
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Ingresos
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                Gastos
              </span>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashflowData}>
                <defs>
                  <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false} 
                  tickFormatter={(val) => `$${(val / 1000000).toFixed(1)}M`} 
                />
                <Tooltip 
                  formatter={(val: any) => [formatCurrency(Number(val), currency), '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="ingresos" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorInc)" />
                <Area type="monotone" dataKey="gastos" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorExp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Distribución de Gastos
            </h3>
            <p className="text-xs text-slate-400">Porcentaje por categoría en el mes</p>
          </div>

          <div className="h-48 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val: any) => [formatCurrency(Number(val), currency), 'Monto']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06] text-xs">
            {pieData.slice(0, 4).map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-300 truncate">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. GOALS PROGRESS SECTION & RECENT TRANSACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-3xl lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Progreso de Metas Financieras
              </h3>
              <p className="text-xs text-slate-400">
                Objetivos estratégicos y ritmo de ahorro mensual
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('metas')}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
            >
              Ver todas →
            </button>
          </div>

          <div className="space-y-4 pt-2">
            {goals.map((goal) => {
              const progressPct = Math.min(100, (goal.current_amount / goal.target_amount) * 100);
              return (
                <div key={goal.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white text-sm">{goal.name}</span>
                    <span className="font-extrabold text-emerald-400 numeric-tabular">
                      {progressPct.toFixed(1)}%
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>
                      Acumulado: <strong className="text-slate-200">{formatCurrency(goal.current_amount, currency)}</strong>
                    </span>
                    <span>
                      Meta: <strong className="text-slate-200">{formatCurrency(goal.target_amount, currency)}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl space-y-4">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Perfil Financiero</span>
          </div>

          <h4 className="text-base font-bold text-white">Estructura de Ingresos Activa</h4>
          
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 space-y-1">
              <span className="font-bold text-indigo-300">Trabajo Principal: Shuffler</span>
              <p className="text-slate-400 text-[11px]">
                Salario base, recargos nocturnos, bonos por precisión y horas extras.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 space-y-1">
              <span className="font-bold text-amber-300">Trabajo Side: Pizza Hut</span>
              <p className="text-slate-400 text-[11px]">
                Pago por horas trabajadas, recargos dominicales y turnos complementarios.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-white/[0.06] text-[11px] text-slate-400">
              💡 Sin fuentes freelance asumidas. Todas las proyecciones se basan en tu flujo real.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

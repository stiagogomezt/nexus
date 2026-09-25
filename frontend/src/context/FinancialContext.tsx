import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Income, Expense, Goal, Debt, Asset, Liability, 
  DashboardMetrics, BettingStat, InvestmentItem 
} from '../types';

interface FinancialContextType {
  incomes: Income[];
  expenses: Expense[];
  goals: Goal[];
  debts: Debt[];
  assets: Asset[];
  liabilities: Liability[];
  investments: InvestmentItem[];
  bettingStat: BettingStat;
  metrics: DashboardMetrics;
  currency: string;
  setCurrency: (c: string) => void;
  // CRUD Actions
  addIncome: (income: Omit<Income, 'id'>) => void;
  deleteIncome: (id: string) => void;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  deleteExpense: (id: string) => void;
  addGoal: (goal: Omit<Goal, 'id'>) => void;
  updateGoalProgress: (id: string, additionalAmount: number) => void;
  deleteGoal: (id: string) => void;
  addDebt: (debt: Omit<Debt, 'id'>) => void;
  makeDebtPayment: (id: string, paymentAmount: number) => void;
  deleteDebt: (id: string) => void;
  addAsset: (asset: Omit<Asset, 'id'>) => void;
  deleteAsset: (id: string) => void;
  resetToDefaults: () => void;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

// Initial Profile-Tailored Seed Data (Shuffler + Pizza Hut, no freelance)
const INITIAL_INCOMES: Income[] = [
  {
    id: 'inc-1',
    date: '2026-09-15',
    source: 'Shuffler',
    description: 'Pago Quincena 1 - Salario + Recargos Nocturnos',
    amount: 2150000,
    income_type: 'salary',
    base_salary: 1600000,
    surcharges_amount: 350000,
    extra_hours_amount: 200000,
    account: 'Bancolombia Principal',
    is_recurring: true,
    notes: 'Incluye turno nocturno fin de semana',
  },
  {
    id: 'inc-2',
    date: '2026-09-20',
    source: 'Pizza Hut',
    description: 'Turnos Quincenales Pizza Hut (38 hrs)',
    amount: 620000,
    income_type: 'hourly_wage',
    hours_worked: 38,
    hourly_rate: 14000,
    extra_hours_amount: 88000,
    account: 'Nequi',
    is_recurring: false,
    notes: 'Side job - turnos de cierre y fin de semana',
  },
  {
    id: 'inc-3',
    date: '2026-09-05',
    source: 'Shuffler',
    description: 'Bono Trimestral de Rendimiento',
    amount: 450000,
    income_type: 'bonus',
    bonus_amount: 450000,
    account: 'Bancolombia Principal',
    is_recurring: false,
    notes: 'Evaluación de precisión operativa',
  }
];

const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'exp-1',
    date: '2026-09-02',
    description: 'Arriendo Apartamento',
    category: 'vivienda',
    amount: 1100000,
    payment_method: 'transfer',
    is_recurring: true,
    is_essential: true,
    account: 'Bancolombia Principal'
  },
  {
    id: 'exp-2',
    date: '2026-09-07',
    description: 'Mercado Mensual Éxito',
    category: 'alimentacion',
    amount: 480000,
    payment_method: 'debit',
    is_recurring: true,
    is_essential: true,
    account: 'Bancolombia Principal'
  },
  {
    id: 'exp-3',
    date: '2026-09-10',
    description: 'Servicios Públicos (Energía, Agua, Gas)',
    category: 'servicios',
    amount: 210000,
    payment_method: 'transfer',
    is_recurring: true,
    is_essential: true,
  },
  {
    id: 'exp-4',
    date: '2026-09-12',
    description: 'Transporte y Gasolina',
    category: 'transporte',
    amount: 180000,
    payment_method: 'debit',
    is_recurring: false,
    is_essential: true,
  },
  {
    id: 'exp-5',
    date: '2026-09-18',
    description: 'Internet Fibra Óptica + Móvil',
    category: 'tecnologia',
    amount: 95000,
    payment_method: 'debit',
    is_recurring: true,
    is_essential: true,
  },
  {
    id: 'exp-6',
    date: '2026-09-21',
    description: 'Salida Restaurante fin de semana',
    category: 'entretenimiento',
    amount: 140000,
    payment_method: 'credit',
    is_recurring: false,
    is_essential: false,
  },
  {
    id: 'exp-7',
    date: '2026-09-22',
    description: 'Spotify & YouTube Premium',
    category: 'suscripciones',
    amount: 42000,
    payment_method: 'credit',
    is_recurring: true,
    is_essential: false,
  }
];

const INITIAL_GOALS: Goal[] = [
  {
    id: 'goal-1',
    name: 'Fondo de Emergencia (6 Meses)',
    description: 'Colchón financiero de seguridad para gastos esenciales mínimos',
    target_amount: 12000000,
    current_amount: 4500000,
    target_date: '2027-04-30',
    monthly_contribution: 600000,
    priority: 'alta',
    category: 'emergencia',
    status: 'active'
  },
  {
    id: 'goal-2',
    name: 'Meta Patrimonio Inicial',
    description: 'Consolidación patrimonial libre de deudas de consumo',
    target_amount: 47000000,
    current_amount: 10000000,
    target_date: '2028-12-31',
    monthly_contribution: 1000000,
    priority: 'alta',
    category: 'patrimonio',
    status: 'active'
  },
  {
    id: 'goal-3',
    name: 'Nuevo Equipo de Cómputo Pro',
    description: 'Workstation para análisis de datos y proyectos',
    target_amount: 5500000,
    current_amount: 2200000,
    target_date: '2027-02-15',
    monthly_contribution: 400000,
    priority: 'media',
    category: 'tecnologia',
    status: 'active'
  }
];

const INITIAL_DEBTS: Debt[] = [
  {
    id: 'debt-1',
    entity: 'Banco Falabella',
    name: 'Tarjeta de Crédito CMR',
    debt_type: 'credit_card',
    initial_balance: 3800000,
    current_balance: 1950000,
    interest_rate_ea: 34.5,
    minimum_payment: 220000,
    payment_day: 18,
    term_months: 12,
    notes: 'Prioridad 1 para método avalancha'
  },
  {
    id: 'debt-2',
    entity: 'Bancolombia',
    name: 'Crédito de Libre Inversión',
    debt_type: 'loan',
    initial_balance: 8000000,
    current_balance: 4800000,
    interest_rate_ea: 22.8,
    minimum_payment: 340000,
    payment_day: 5,
    term_months: 24,
    notes: 'Cuotas fijas mensuales'
  }
];

const INITIAL_ASSETS: Asset[] = [
  { id: 'ast-1', name: 'Cuenta de Ahorros Bancolombia', category: 'bank_accounts', current_value: 3850000 },
  { id: 'ast-2', name: 'Fondo de Emergencia en Fiducuenta', category: 'savings', current_value: 4500000 },
  { id: 'ast-3', name: 'Billetera Nequi & Efectivo', category: 'cash', current_value: 750000 },
  { id: 'ast-4', name: 'Portafolio de Inversión (trii + ETFs)', category: 'investments', current_value: 3200000 },
  { id: 'ast-5', name: 'Vehículo / Moto', category: 'vehicles', current_value: 8500000 }
];

const INITIAL_LIABILITIES: Liability[] = [
  { id: 'lia-1', name: 'Tarjeta Falabella CMR', category: 'credit_cards', current_balance: 1950000 },
  { id: 'lia-2', name: 'Crédito Libre Inversión Bancolombia', category: 'personal_loans', current_balance: 4800000 }
];

const INITIAL_INVESTMENTS: InvestmentItem[] = [
  { id: 'inv-1', asset_name: 'iShares Core S&P 500 ETF (CSPX)', asset_type: 'etf', quantity: 2, purchase_price: 1800000, current_price: 2100000, platform: 'trii' },
  { id: 'inv-2', asset_name: 'Acciones Ecopetrol', asset_type: 'stocks', quantity: 500, purchase_price: 2100, current_price: 2200, platform: 'trii' }
];

const INITIAL_BETTING: BettingStat = {
  total_staked: 350000,
  total_returned: 410000,
  net_profit: 60000,
  pending_bets: 1
};

export const FinancialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrency] = useState<string>('COP');

  const [incomes, setIncomes] = useState<Income[]>(() => {
    const saved = localStorage.getItem('nexus_incomes');
    return saved ? JSON.parse(saved) : INITIAL_INCOMES;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('nexus_expenses');
    return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
  });

  const [goals, setGoals] = useState<Goal[]>(() => {
    const saved = localStorage.getItem('nexus_goals');
    return saved ? JSON.parse(saved) : INITIAL_GOALS;
  });

  const [debts, setDebts] = useState<Debt[]>(() => {
    const saved = localStorage.getItem('nexus_debts');
    return saved ? JSON.parse(saved) : INITIAL_DEBTS;
  });

  const [assets, setAssets] = useState<Asset[]>(() => {
    const saved = localStorage.getItem('nexus_assets');
    return saved ? JSON.parse(saved) : INITIAL_ASSETS;
  });

  const [liabilities, setLiabilities] = useState<Liability[]>(() => {
    const saved = localStorage.getItem('nexus_liabilities');
    return saved ? JSON.parse(saved) : INITIAL_LIABILITIES;
  });

  const [investments] = useState<InvestmentItem[]>(INITIAL_INVESTMENTS);
  const [bettingStat] = useState<BettingStat>(INITIAL_BETTING);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('nexus_incomes', JSON.stringify(incomes));
  }, [incomes]);

  useEffect(() => {
    localStorage.setItem('nexus_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('nexus_goals', JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem('nexus_debts', JSON.stringify(debts));
  }, [debts]);

  useEffect(() => {
    localStorage.setItem('nexus_assets', JSON.stringify(assets));
  }, [assets]);

  useEffect(() => {
    localStorage.setItem('nexus_liabilities', JSON.stringify(liabilities));
  }, [liabilities]);

  // Compute live metrics
  const total_income_month = incomes.reduce((acc, curr) => acc + curr.amount, 0);

  const shuffler_income = incomes
    .filter(inc => inc.source.toLowerCase().includes('shuffler'))
    .reduce((acc, curr) => acc + curr.amount, 0);

  const pizzahut_income = incomes
    .filter(inc => inc.source.toLowerCase().includes('pizza hut') || inc.source.toLowerCase().includes('pizza'))
    .reduce((acc, curr) => acc + curr.amount, 0);

  const other_income = total_income_month - (shuffler_income + pizzahut_income);

  const total_expenses_month = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const free_cash_flow = total_income_month - total_expenses_month;

  const total_debt = debts.reduce((acc, curr) => acc + curr.current_balance, 0);
  const total_assets = assets.reduce((acc, curr) => acc + curr.current_value, 0);
  const total_liabilities = total_debt; // Keep synced with debts
  const net_worth = total_assets - total_liabilities;

  const total_savings = assets
    .filter(a => a.category === 'savings' || a.category === 'cash' || a.category === 'bank_accounts')
    .reduce((acc, curr) => acc + curr.current_value, 0);

  const total_invested = assets
    .filter(a => a.category === 'investments' || a.category === 'cdt')
    .reduce((acc, curr) => acc + curr.current_value, 0);

  const average_goals_progress = goals.length > 0
    ? goals.reduce((acc, curr) => acc + (curr.current_amount / curr.target_amount) * 100, 0) / goals.length
    : 0;

  const metrics: DashboardMetrics = {
    total_income_month,
    income_by_source: {
      shuffler: shuffler_income,
      pizza_hut: pizzahut_income,
      others: other_income
    },
    total_expenses_month,
    free_cash_flow,
    total_debt,
    total_assets,
    total_liabilities,
    net_worth,
    total_savings,
    total_invested,
    betting_allocated: bettingStat.total_staked,
    active_goals_count: goals.filter(g => g.status === 'active').length,
    average_goals_progress
  };

  // Actions
  const addIncome = (newInc: Omit<Income, 'id'>) => {
    const inc: Income = {
      ...newInc,
      id: `inc-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    setIncomes(prev => [inc, ...prev]);
  };

  const deleteIncome = (id: string) => {
    setIncomes(prev => prev.filter(i => i.id !== id));
  };

  const addExpense = (newExp: Omit<Expense, 'id'>) => {
    const exp: Expense = {
      ...newExp,
      id: `exp-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    setExpenses(prev => [exp, ...prev]);
  };

  const deleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const addGoal = (newGoal: Omit<Goal, 'id'>) => {
    const g: Goal = {
      ...newGoal,
      id: `goal-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    setGoals(prev => [...prev, g]);
  };

  const updateGoalProgress = (id: string, additionalAmount: number) => {
    setGoals(prev => prev.map(g => {
      if (g.id === id) {
        const updated = Math.min(g.target_amount, g.current_amount + additionalAmount);
        return {
          ...g,
          current_amount: updated,
          status: updated >= g.target_amount ? 'completed' : g.status
        };
      }
      return g;
    }));
  };

  const deleteGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const addDebt = (newDebt: Omit<Debt, 'id'>) => {
    const d: Debt = {
      ...newDebt,
      id: `debt-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    setDebts(prev => [...prev, d]);
  };

  const makeDebtPayment = (id: string, paymentAmount: number) => {
    setDebts(prev => prev.map(d => {
      if (d.id === id) {
        const newBalance = Math.max(0, d.current_balance - paymentAmount);
        return { ...d, current_balance: newBalance };
      }
      return d;
    }));
  };

  const deleteDebt = (id: string) => {
    setDebts(prev => prev.filter(d => d.id !== id));
  };

  const addAsset = (newAsset: Omit<Asset, 'id'>) => {
    const a: Asset = {
      ...newAsset,
      id: `ast-${Date.now()}`
    };
    setAssets(prev => [...prev, a]);
  };

  const deleteAsset = (id: string) => {
    setAssets(prev => prev.filter(a => a.id !== id));
  };

  const resetToDefaults = () => {
    setIncomes(INITIAL_INCOMES);
    setExpenses(INITIAL_EXPENSES);
    setGoals(INITIAL_GOALS);
    setDebts(INITIAL_DEBTS);
    setAssets(INITIAL_ASSETS);
    setLiabilities(INITIAL_LIABILITIES);
  };

  return (
    <FinancialContext.Provider value={{
      incomes,
      expenses,
      goals,
      debts,
      assets,
      liabilities,
      investments,
      bettingStat,
      metrics,
      currency,
      setCurrency,
      addIncome,
      deleteIncome,
      addExpense,
      deleteExpense,
      addGoal,
      updateGoalProgress,
      deleteGoal,
      addDebt,
      makeDebtPayment,
      deleteDebt,
      addAsset,
      deleteAsset,
      resetToDefaults
    }}>
      {children}
    </FinancialContext.Provider>
  );
};

export const useFinancial = () => {
  const context = useContext(FinancialContext);
  if (!context) {
    throw new Error('useFinancial must be used within a FinancialProvider');
  }
  return context;
};

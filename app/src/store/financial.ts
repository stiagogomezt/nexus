'use client'

import { create } from 'zustand'
import type {
  Income,
  Expense,
  Goal,
  Debt,
  Investment,
  BettingTransaction,
  Asset,
  Liability,
  Account,
  Category,
  Budget,
  DashboardMetrics,
  Currency,
} from '@/types'
import type { CryptoHolding, WalletAccount, CryptoNetWorthSummary } from '@/types/crypto'
import type {
  BankConnection,
  BankAccount,
  BankTransaction,
  BankConsentLog,
  BankingCashFlowSummary,
  BankReconciliationReport,
} from '@/types/banking'
import type { AuthUser } from '@/lib/supabase/auth'
import { calcDashboardMetrics, calcBankingCashFlow } from '@/lib/financial-engine'
import { PortfolioAggregator } from '@/lib/crypto/portfolio-aggregator'
import { walletService } from '@/lib/wallets/wallet-service'
import { OpenFinanceProvider } from '@/lib/banking/providers/open-finance-provider'
import { CSVBankProvider } from '@/lib/banking/providers/csv-bank-provider'
import { BankSyncService } from '@/lib/banking/bank-sync-service'
import { BankReconciliationEngine } from '@/lib/banking/reconciliation-engine'
import { DeduplicationEngine } from '@/lib/banking/deduplication-engine'
import type { FinancialSnapshot, FinancialDigitalTwin } from '@/types/digital-twin'
import type {
  FinancialEvent,
  FinancialAlert,
  IntelligenceInsight,
  AlertPreferences,
  DailyBrief,
  WeeklyFinancialReview,
  AlertStatus,
} from '@/types/intelligence'
import { EventEngine } from '@/lib/intelligence/event-engine'
import { AlertCenter } from '@/lib/intelligence/alert-center'
import { IntelligenceEngine } from '@/lib/intelligence/intelligence-engine'
import { BriefService } from '@/lib/intelligence/brief-service'
import { DigitalTwinService } from '@/lib/digital-twin/digital-twin-service'
import type {
  CopilotContext,
  NexusTodaySummary,
  ProactiveInsight,
  CopilotPreferences,
  ScenarioBridgeAction,
} from '@/types/copilot'
import { CopilotContextBuilder } from '@/lib/copilot/copilot-context-builder'
import { ProactiveCopilotService } from '@/lib/copilot/proactive-copilot-service'
import { SmartAllocationEngine, AllocationState, AllocationConfig } from '@/lib/financial/smart-allocation-engine'
import * as dal from '@/lib/dal'

interface FinancialState {
  // Current user
  user: AuthUser | null

  // Data
  incomes: Income[]
  expenses: Expense[]
  goals: Goal[]
  debts: Debt[]
  investments: Investment[]
  bets: BettingTransaction[]
  assets: Asset[]
  liabilities: Liability[]
  accounts: Account[]
  categories: Category[]
  budgets: Budget[]
  cryptoHoldings: CryptoHolding[]
  wallets: WalletAccount[]
  bankConnections: BankConnection[]
  bankAccounts: BankAccount[]
  bankTransactions: BankTransaction[]
  bankConsents: BankConsentLog[]
  snapshots: FinancialSnapshot[]

  // Settings
  currency: Currency

  // Computed via Financial Engine & Digital Twin
  metrics: DashboardMetrics
  cryptoSummary: CryptoNetWorthSummary | null
  bankingCashFlow: BankingCashFlowSummary | null
  digitalTwin: FinancialDigitalTwin | null

  // Intelligence, Events & Alerts (Fase O)
  events: FinancialEvent[]
  alerts: FinancialAlert[]
  insights: IntelligenceInsight[]
  alertPreferences: AlertPreferences | null
  dailyBrief: DailyBrief | null
  weeklyReview: WeeklyFinancialReview | null

  // Proactive Copilot (Fase P)
  copilotContext: CopilotContext | null
  nexusToday: NexusTodaySummary | null
  proactiveInsights: ProactiveInsight[]
  copilotPreferences: CopilotPreferences | null
  activeScenarioPresetParams: {
    preset: 'ahorro' | 'deuda' | 'gastos' | 'ingresos' | 'inversion' | 'custom' | 'personalizado'
    params: {
      extraSaving?: number
      incomeChange?: number
      expenseChange?: number
      extraDebtPayment?: number
      horizon?: number
      targetGoalId?: string
      targetDebtId?: string
      [key: string]: unknown
    }
  } | null

  // Smart Allocation
  currentAllocationState: AllocationState | null
  calculateAllocation: (incomeAmount: number) => AllocationState
  clearAllocation: () => void

  // Status & Mode
  isLoading: boolean
  isSubmitting: boolean
  authState: 'AUTH_LOADING' | 'AUTHENTICATED' | 'UNAUTHENTICATED'
  isDemoMode: boolean

  // Session & Sync
  setUser: (user: AuthUser | null) => void
  setAuthState: (state: 'AUTH_LOADING' | 'AUTHENTICATED' | 'UNAUTHENTICATED') => void
  setDemoMode: (enabled: boolean) => void
  enterDemoMode: () => void
  exitDemoMode: () => void
  fetchUserData: (userId: string) => Promise<void>
  clearUserData: () => void
  setCurrency: (currency: Currency) => void
  setLoading: (loading: boolean) => void
  recomputeMetrics: () => void
  refreshCryptoSummary: () => Promise<CryptoNetWorthSummary>
  recomputeBankingCashFlow: () => void
  refreshDigitalTwin: () => Promise<FinancialDigitalTwin>
  takeSnapshot: (date?: string) => Promise<FinancialSnapshot>

  // Intelligence Actions
  fetchAlerts: (status?: AlertStatus | 'ALL') => Promise<FinancialAlert[]>
  markAlertAsRead: (alertId: string) => Promise<void>
  dismissAlert: (alertId: string) => Promise<void>
  runIntelligenceEngine: () => Promise<{
    events: FinancialEvent[]
    alerts: FinancialAlert[]
    insights: IntelligenceInsight[]
  }>
  updateAlertPreferences: (prefs: Partial<AlertPreferences>) => Promise<AlertPreferences>
  refreshDailyBrief: () => Promise<DailyBrief | null>
  refreshWeeklyReview: () => Promise<WeeklyFinancialReview | null>

  // Proactive Copilot Actions (Fase P)
  runProactiveCopilot: () => Promise<{
    context: CopilotContext
    nexusToday: NexusTodaySummary
    insights: ProactiveInsight[]
  }>
  loadScenarioPresetToLab: (action: ScenarioBridgeAction) => void
  clearScenarioPreset: () => void
  fetchCopilotPreferences: () => Promise<CopilotPreferences>
  updateCopilotPreferences: (prefs: Partial<CopilotPreferences>) => Promise<CopilotPreferences>

  // DAL-backed Mutations
  addIncome: (income: Omit<Income, 'id' | 'user_id' | 'created_at' | 'income_source_key'>) => Promise<Income>
  removeIncome: (id: string) => Promise<void>
  addExpense: (expense: Omit<Expense, 'id' | 'user_id' | 'created_at'>) => Promise<Expense>
  removeExpense: (id: string) => Promise<void>
  addGoal: (goal: Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Goal>
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<Goal>
  removeGoal: (id: string) => Promise<void>
  contributeToGoal: (goalId: string, amount: number) => Promise<void>
  addDebt: (debt: Omit<Debt, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Debt>
  updateDebt: (id: string, updates: Partial<Debt>) => Promise<Debt>
  removeDebt: (id: string) => Promise<void>
  payDebt: (debtId: string, amount: number) => Promise<Debt>
  addAsset: (asset: Omit<Asset, 'id' | 'user_id' | 'created_at'>) => Promise<Asset>
  removeAsset: (id: string) => Promise<void>
  addBudget: (budget: Omit<Budget, 'id' | 'user_id' | 'created_at'>) => Promise<Budget>
  updateBudget: (id: string, updates: Partial<Budget>) => Promise<Budget>
  removeBudget: (id: string) => Promise<void>
  upsertBudget: (category_name: string, month: number, year: number, amount: number) => Promise<Budget>
  addBet: (bet: BettingTransaction) => void
  removeBet: (id: string) => void

  // Crypto & Wallets Mutations
  addCryptoHolding: (data: Omit<CryptoHolding, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<CryptoHolding>
  updateCryptoHolding: (id: string, updates: Partial<CryptoHolding>) => Promise<CryptoHolding>
  removeCryptoHolding: (id: string) => Promise<void>
  addWallet: (data: Omit<WalletAccount, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<WalletAccount>
  updateWallet: (id: string, updates: Partial<WalletAccount>) => Promise<WalletAccount>
  removeWallet: (id: string) => Promise<void>
  syncWallets: () => Promise<void>

  // Banking Mutations
  addBankConnection: (
    data: Omit<BankConnection, 'id' | 'created_at' | 'updated_at'>
  ) => Promise<BankConnection>
  revokeBankConsent: (connectionId: string) => Promise<void>
  removeBankConnection: (connectionId: string) => Promise<void>
  syncBankConnection: (connectionId: string) => Promise<void>
  importCSVStatement: (
    accountId: string,
    csvContent: string,
    institutionHint?: string
  ) => Promise<{ importedCount: number; duplicatesSkipped: number }>
  reconcileAccount: (accountId: string) => BankReconciliationReport | null

  // Sync setters (used during load)
  setIncomes: (data: Income[]) => void
  setExpenses: (data: Expense[]) => void
  setGoals: (data: Goal[]) => void
  setDebts: (data: Debt[]) => void
  setInvestments: (data: Investment[]) => void
  setBets: (data: BettingTransaction[]) => void
  setAssets: (data: Asset[]) => void
  setLiabilities: (data: Liability[]) => void
  setAccounts: (data: Account[]) => void
  setCategories: (data: Category[]) => void
  setBudgets: (data: Budget[]) => void
  setCryptoHoldings: (data: CryptoHolding[]) => void
  setWallets: (data: WalletAccount[]) => void
  setCryptoSummary: (summary: CryptoNetWorthSummary | null) => void
  setBankConnections: (data: BankConnection[]) => void
  setBankAccounts: (data: BankAccount[]) => void
  setBankTransactions: (data: BankTransaction[]) => void
}

const EMPTY_METRICS: DashboardMetrics = {
  total_income_month: 0,
  total_expenses_month: 0,
  free_cash_flow: 0,
  savings_rate: 0,
  income_by_source: { shuffler: 0, pizza_hut: 0, others: 0 },
  net_worth: 0,
  total_assets: 0,
  total_debt: 0,
  active_goals_count: 0,
  average_goals_progress: 0,
  total_invested: 0,
  betting_net_month: 0,
  betting_staked_month: 0,
}

function computeMetrics(state: {
  incomes: Income[]
  expenses: Expense[]
  goals: Goal[]
  debts: Debt[]
  assets: Asset[]
  liabilities: Liability[]
  investments: Investment[]
  bets: BettingTransaction[]
  cryptoSummary?: CryptoNetWorthSummary | null
  bankAccounts?: BankAccount[]
}): DashboardMetrics {
  const bankAccountsValueCop = (state.bankAccounts || [])
    .filter((a) => a.is_active)
    .reduce((sum, a) => sum + a.current_balance, 0)

  return calcDashboardMetrics({
    incomes: state.incomes,
    expenses: state.expenses,
    goals: state.goals,
    debts: state.debts,
    assets: state.assets,
    liabilities: state.liabilities,
    investments: state.investments,
    bets: state.bets,
    cryptoHoldingsValueCop: state.cryptoSummary?.totalValueCop ?? 0,
    bankAccountsValueCop,
  })
}

export const useFinancialStore = create<FinancialState>((set, get) => ({
  user: null,
  incomes: [],
  expenses: [],
  goals: [],
  debts: [],
  investments: [],
  bets: [],
  assets: [],
  liabilities: [],
  accounts: [],
  categories: [],
  budgets: [],
  cryptoHoldings: [],
  wallets: [],
  bankConnections: [],
  bankAccounts: [],
  bankTransactions: [],
  bankConsents: [],
  snapshots: [],
  currency: 'COP',
  metrics: EMPTY_METRICS,
  cryptoSummary: null,
  bankingCashFlow: null,
  digitalTwin: null,
  events: [],
  alerts: [],
  insights: [],
  alertPreferences: null,
  dailyBrief: null,
  weeklyReview: null,
  copilotContext: null,
  nexusToday: null,
  proactiveInsights: [],
  copilotPreferences: null,
  activeScenarioPresetParams: null,
  currentAllocationState: null,
  isLoading: false,
  isSubmitting: false,
  authState: 'AUTH_LOADING',
  isDemoMode: false,

  setUser: (user) => set({ user, authState: user ? 'AUTHENTICATED' : 'UNAUTHENTICATED' }),
  setAuthState: (authState) => set({ authState }),
  setDemoMode: (isDemoMode) => set({ isDemoMode }),

  enterDemoMode: () => {
    const demoUser: AuthUser = {
      id: 'usr-demo-sandbox',
      email: 'demo@nexusfinance.com',
      full_name: 'Modo Demostración (Ficticio)',
      created_at: new Date().toISOString(),
    }
    set({
      user: demoUser,
      isDemoMode: true,
      authState: 'AUTHENTICATED',
      incomes: [
        {
          id: 'demo-inc-1',
          user_id: demoUser.id,
          account_id: null,
          source: 'Salario Tech (Demo)',
          income_source_key: 'other',
          description: 'Ingreso mensual sandbox',
          amount: 2500000,
          income_type: 'salary',
          base_salary: 2500000,
          bonus_amount: 0,
          surcharges_amount: 0,
          extra_hours_amount: 0,
          other_payments_amount: 0,
          hours_worked: 160,
          hourly_rate: 15625,
          is_recurring: true,
          notes: 'Datos ficticios para demostración',
          date: '2026-10-01',
          created_at: new Date().toISOString(),
        },
      ],
      expenses: [
        {
          id: 'demo-exp-1',
          user_id: demoUser.id,
          account_id: null,
          category_id: null,
          category_name: 'vivienda',
          amount: 800000,
          date: '2026-10-02',
          description: 'Arriendo mensual (Demo)',
          payment_method: 'transfer',
          is_recurring: true,
          is_essential: true,
          notes: 'Datos ficticios para demostración',
          created_at: new Date().toISOString(),
        },
      ],
      bankAccounts: [
        {
          id: 'demo-acc-1',
          user_id: demoUser.id,
          institution_id: 'bancolombia',
          institution_name: 'Bancolombia (Sandbox)',
          account_name: 'Cuenta Ahorros Demo',
          account_type: 'savings',
          currency: 'COP',
          masked_account_number: '***9999',
          current_balance: 1500000,
          available_balance: 1500000,
          is_active: true,
          data_provenance: 'MANUAL',
          connection_state: 'CONNECTED',
          last_synced_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    })
    get().recomputeMetrics()
    get().recomputeBankingCashFlow()
  },

  exitDemoMode: () => {
    get().clearUserData()
  },

  fetchUserData: async (userId: string) => {
    set({ isLoading: true })
    try {
      const bundle = await dal.loadAllUserData(userId)
      set((s) => {
        const next = {
          ...s,
          authState: 'AUTHENTICATED' as const,
          incomes: bundle.incomes,
          expenses: bundle.expenses,
          goals: bundle.goals,
          debts: bundle.debts,
          assets: bundle.assets,
          liabilities: bundle.liabilities,
          accounts: bundle.accounts,
          categories: bundle.categories,
          budgets: bundle.budgets,
          cryptoHoldings: bundle.cryptoHoldings,
          wallets: bundle.wallets,
          bankConnections: bundle.bankConnections,
          bankAccounts: bundle.bankAccounts,
          bankTransactions: bundle.bankTransactions,
          snapshots: bundle.snapshots || [],
          isLoading: false,
        }
        return {
          ...next,
          metrics: computeMetrics(next),
        }
      })

      // Recompute banking cash flow
      get().recomputeBankingCashFlow()

      // Asynchronously calculate crypto summary and integrate into net worth
      try {
        await get().refreshCryptoSummary()
      } catch (cryptoErr) {
        console.warn('[FinancialStore] Initial crypto summary computation warning:', cryptoErr)
      }

      // Compute unified Financial Digital Twin
      try {
        await get().refreshDigitalTwin()
      } catch (twinErr) {
        console.warn('[FinancialStore] Initial digital twin computation warning:', twinErr)
      }

      // Run Financial Intelligence & Event Engine (Fase O)
      try {
        await get().runIntelligenceEngine()
      } catch (intelErr) {
        console.warn('[FinancialStore] Initial intelligence computation warning:', intelErr)
      }

      // Run Proactive Financial Copilot (Fase P)
      try {
        await get().runProactiveCopilot()
      } catch (copilotErr) {
        console.warn('[FinancialStore] Initial proactive copilot warning:', copilotErr)
      }
    } catch (error) {
      console.error('Error fetching user data from DAL:', error)
      set({ isLoading: false })
    }
  },

  clearUserData: () => {
    set({
      user: null,
      authState: 'UNAUTHENTICATED',
      isDemoMode: false,
      incomes: [],
      expenses: [],
      goals: [],
      debts: [],
      investments: [],
      bets: [],
      assets: [],
      liabilities: [],
      accounts: [],
      budgets: [],
      cryptoHoldings: [],
      wallets: [],
      bankConnections: [],
      bankAccounts: [],
      bankTransactions: [],
      bankConsents: [],
      snapshots: [],
      cryptoSummary: null,
      bankingCashFlow: null,
      digitalTwin: null,
      events: [],
      alerts: [],
      insights: [],
      alertPreferences: null,
      dailyBrief: null,
      weeklyReview: null,
      copilotContext: null,
      nexusToday: null,
      proactiveInsights: [],
      copilotPreferences: null,
      activeScenarioPresetParams: null,
      currentAllocationState: null,
      metrics: EMPTY_METRICS,
      isLoading: false,
    })
  },

  setCurrency: (currency) => set({ currency }),
  setLoading: (isLoading) => set({ isLoading }),
  recomputeMetrics: () => set((s) => ({ metrics: computeMetrics(s) })),
  recomputeBankingCashFlow: () => {
    const { bankTransactions } = get()
    const summary = calcBankingCashFlow(bankTransactions)
    set({ bankingCashFlow: summary })
  },

  refreshCryptoSummary: async () => {
    const { cryptoHoldings, wallets } = get()
    const summary = await PortfolioAggregator.aggregate({
      holdings: cryptoHoldings,
      wallets: wallets,
    })
    set((s) => {
      const next = { ...s, cryptoSummary: summary }
      return {
        ...next,
        metrics: computeMetrics(next),
      }
    })
    return summary
  },

  refreshDigitalTwin: async () => {
    const s = get()
    const bundle: dal.UserFinancialBundle = {
      incomes: s.incomes,
      expenses: s.expenses,
      categories: s.categories,
      goals: s.goals,
      debts: s.debts,
      assets: s.assets,
      liabilities: s.liabilities,
      accounts: s.accounts,
      budgets: s.budgets,
      cryptoHoldings: s.cryptoHoldings,
      wallets: s.wallets,
      bankConnections: s.bankConnections,
      bankAccounts: s.bankAccounts,
      bankTransactions: s.bankTransactions,
      snapshots: s.snapshots,
    }
    if (!s.user) return null as any
    const twin = await DigitalTwinService.getDigitalTwin(s.user.id, bundle)
    set({ digitalTwin: twin })
    return twin
  },

  takeSnapshot: async (date?: string) => {
    const s = get()
    if (!s.user) throw new Error('Usuario no autenticado')
    const bundle: dal.UserFinancialBundle = {
      incomes: s.incomes,
      expenses: s.expenses,
      categories: s.categories,
      goals: s.goals,
      debts: s.debts,
      assets: s.assets,
      liabilities: s.liabilities,
      accounts: s.accounts,
      budgets: s.budgets,
      cryptoHoldings: s.cryptoHoldings,
      wallets: s.wallets,
      bankConnections: s.bankConnections,
      bankAccounts: s.bankAccounts,
      bankTransactions: s.bankTransactions,
      snapshots: s.snapshots,
    }
    const snap = await DigitalTwinService.takeSnapshot(s.user.id, date, bundle)
    set((state) => ({
      snapshots: [snap, ...state.snapshots.filter((x) => x.snapshot_date !== snap.snapshot_date)],
    }))
    await get().refreshDigitalTwin()
    return snap
  },

  // Intelligence Actions (Fase O)
  runIntelligenceEngine: async () => {
    const s = get()
    if (!s.user) return { events: [], alerts: [], insights: [] }
    const userId = s.user.id
    const twin = s.digitalTwin || (await get().refreshDigitalTwin())
    if (!twin) return { events: [], alerts: [], insights: [] }
    const state = twin.currentState
    const snapshots = s.snapshots
    const baseline = snapshots.length > 0 ? snapshots[0] : null
    const prefs = s.alertPreferences || (await dal.getAlertPreferences(userId))

    // Detect events
    const events = EventEngine.detectEvents(state, baseline, prefs.thresholds, {
      budgets: s.budgets,
      goals: s.goals,
      debts: s.debts,
      cryptoHoldings: s.cryptoHoldings,
      bankConnections: s.bankConnections,
    })

    // Process alerts with deduplication
    const alerts = await AlertCenter.syncAlerts(userId, events)

    // Generate insights
    const insights = IntelligenceEngine.generateInsights(state, baseline, events)

    // Generate daily brief and weekly review
    const dailyBrief = BriefService.generateDailyBrief(state, alerts, events)
    const weeklyReview = BriefService.generateWeeklyReview(state, baseline)

    set({
      events,
      alerts,
      insights,
      alertPreferences: prefs,
      dailyBrief,
      weeklyReview,
    })

    return { events, alerts, insights }
  },

  fetchAlerts: async (statusFilter = 'ALL') => {
    const userId = get().user?.id
    if (!userId) return []
    const alerts = await dal.getFinancialAlerts(userId, statusFilter)
    set({ alerts })
    return alerts
  },

  markAlertAsRead: async (alertId: string) => {
    const userId = get().user?.id
    if (!userId) return
    await AlertCenter.markAsRead(userId, alertId)
    set((s) => ({
      alerts: s.alerts.map((a) => (a.id === alertId ? { ...a, status: 'READ' } : a)),
    }))
  },

  dismissAlert: async (alertId: string) => {
    const userId = get().user?.id
    if (!userId) return
    await AlertCenter.dismiss(userId, alertId)
    set((s) => ({
      alerts: s.alerts.map((a) => (a.id === alertId ? { ...a, status: 'DISMISSED' } : a)),
    }))
  },

  updateAlertPreferences: async (prefs: Partial<AlertPreferences>) => {
    const userId = get().user?.id
    if (!userId) throw new Error('Usuario no autenticado')
    const updated = await dal.updateAlertPreferences(userId, prefs)
    set({ alertPreferences: updated })
    return updated
  },

  refreshDailyBrief: async () => {
    const s = get()
    if (!s.digitalTwin) await get().refreshDigitalTwin()
    const state = get().digitalTwin?.currentState
    if (!state) return null
    const brief = BriefService.generateDailyBrief(state, s.alerts, s.events)
    set({ dailyBrief: brief })
    return brief
  },

  refreshWeeklyReview: async () => {
    const s = get()
    if (!s.digitalTwin) await get().refreshDigitalTwin()
    const state = get().digitalTwin?.currentState
    if (!state) return null
    const baseline = s.snapshots.length > 0 ? s.snapshots[0] : null
    const review = BriefService.generateWeeklyReview(state, baseline)
    set({ weeklyReview: review })
    return review
  },

  // Proactive Copilot Actions (Fase P)
  runProactiveCopilot: async () => {
    const userId = get().user?.id
    if (!userId) {
      return {
        context: null as any,
        nexusToday: null as any,
        insights: [],
      }
    }
    const context = await CopilotContextBuilder.build(userId)
    const nexusToday = await ProactiveCopilotService.generateNexusToday(userId)
    const insights = await ProactiveCopilotService.generateProactiveInsights(userId)
    const prefs = await dal.getCopilotPreferences(userId)

    set({
      copilotContext: context,
      nexusToday,
      proactiveInsights: insights,
      copilotPreferences: prefs,
    })

    return { context, nexusToday, insights }
  },

  loadScenarioPresetToLab: (action: ScenarioBridgeAction) => {
    set({
      activeScenarioPresetParams: {
        preset: action.recommended_preset,
        params: {
          ...action.suggested_params,
          extraSaving: action.suggested_params.extraSaving ?? action.suggested_params.extra_monthly_saving,
          incomeChange: action.suggested_params.incomeChange ?? action.suggested_params.income_change_percent,
          expenseChange: action.suggested_params.expenseChange ?? action.suggested_params.expense_change_percent,
          extraDebtPayment: action.suggested_params.extraDebtPayment ?? action.suggested_params.extra_debt_payment,
          horizon: action.suggested_params.horizon ?? action.suggested_params.months ?? action.suggested_params.horizon_months,
          targetGoalId: action.suggested_params.targetGoalId ?? action.suggested_params.selected_goal_id ?? undefined,
          targetDebtId: action.suggested_params.targetDebtId ?? action.suggested_params.selected_debt_id ?? undefined,
        },
      },
    })
  },

  clearScenarioPreset: () => {
    set({ activeScenarioPresetParams: null })
  },

  fetchCopilotPreferences: async () => {
    const userId = get().user?.id
    if (!userId) throw new Error('Usuario no autenticado')
    const prefs = await dal.getCopilotPreferences(userId)
    set({ copilotPreferences: prefs })
    return prefs
  },

  updateCopilotPreferences: async (prefs: Partial<CopilotPreferences>) => {
    const userId = get().user?.id
    if (!userId) throw new Error('Usuario no autenticado')
    const updated = await dal.upsertCopilotPreferences(userId, prefs)
    set({ copilotPreferences: updated })
    return updated
  },

  // Smart Allocation
  calculateAllocation: (incomeAmount: number) => {
    const s = get()
    
    // Config hardcoded for now, ideally fetched from a settings table in DB
    const config: AllocationConfig = {
      fixedCommitments: {
        transport: 150000,
        services: 200000,
        internet: 100000,
        icetex: 350000 // Moving ICETEX to fixed as requested
      },
      variableNeeds: {
        food: 600000
      }
    }

    // Incomes of the current month to calculate "alreadyAssigned"
    // simplistic calculation for now
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    
    const alreadyAssigned = s.incomes
      .filter(i => {
        const d = new Date(i.date)
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear
      })
      .reduce((sum, i) => sum + i.amount, 0)

    const allocation = SmartAllocationEngine.distribute({
      incomeAmount,
      alreadyAssignedInMonth: alreadyAssigned,
      config,
      goals: s.goals,
      debts: s.debts.filter(d => d.entity.toLowerCase() !== 'icetex') // exclude ICETEX from debts to avoid double count
    })

    set({ currentAllocationState: allocation })
    return allocation
  },

  clearAllocation: () => {
    set({ currentAllocationState: null })
  },

  // DAL Mutations
  addIncome: async (data) => {
    const user = get().user
    if (!user) throw new Error('Usuario no autenticado')
    const saved = await dal.createIncome(user.id, data)
    set((s) => {
      const next = { ...s, incomes: [saved, ...s.incomes] }
      return { ...next, metrics: computeMetrics(next) }
    })
    return saved
  },

  removeIncome: async (id) => {
    const user = get().user
    if (!user) throw new Error('Usuario no autenticado')
    await dal.deleteIncome(user.id, id)
    set((s) => {
      const next = { ...s, incomes: s.incomes.filter((i) => i.id !== id) }
      return { ...next, metrics: computeMetrics(next) }
    })
  },

  addExpense: async (data) => {
    const user = get().user
    if (!user) throw new Error('Usuario no autenticado')
    const saved = await dal.createExpense(user.id, data)
    set((s) => {
      const next = { ...s, expenses: [saved, ...s.expenses] }
      return { ...next, metrics: computeMetrics(next) }
    })
    return saved
  },

  removeExpense: async (id) => {
    const user = get().user
    if (!user) throw new Error('Usuario no autenticado')
    await dal.deleteExpense(user.id, id)
    set((s) => {
      const next = { ...s, expenses: s.expenses.filter((e) => e.id !== id) }
      return { ...next, metrics: computeMetrics(next) }
    })
  },

  addGoal: async (data) => {
    const user = get().user
    if (!user) throw new Error('Usuario no autenticado')
    const saved = await dal.createGoal(user.id, data)
    set((s) => {
      const next = { ...s, goals: [saved, ...s.goals] }
      return { ...next, metrics: computeMetrics(next) }
    })
    return saved
  },

  updateGoal: async (id, updates) => {
    const user = get().user
    if (!user) throw new Error('Usuario no autenticado')
    const updated = await dal.updateGoal(user.id, id, updates)
    set((s) => {
      const next = {
        ...s,
        goals: s.goals.map((g) => (g.id === id ? updated : g)),
      }
      return { ...next, metrics: computeMetrics(next) }
    })
    return updated
  },

  removeGoal: async (id) => {
    const user = get().user
    if (!user) throw new Error('Usuario no autenticado')
    await dal.deleteGoal(user.id, id)
    set((s) => {
      const next = { ...s, goals: s.goals.filter((g) => g.id !== id) }
      return { ...next, metrics: computeMetrics(next) }
    })
  },

  contributeToGoal: async (goalId, amount) => {
    const user = get().user
    if (!user) throw new Error('Usuario no autenticado')
    await dal.addGoalContribution(user.id, goalId, amount)
    const refreshed = await dal.getGoals(user.id)
    set((s) => {
      const next = { ...s, goals: refreshed }
      return { ...next, metrics: computeMetrics(next) }
    })
  },

  addDebt: async (data) => {
    const user = get().user
    if (!user) throw new Error('Usuario no autenticado')
    const saved = await dal.createDebt(user.id, data)
    set((s) => {
      const next = { ...s, debts: [saved, ...s.debts] }
      return { ...next, metrics: computeMetrics(next) }
    })
    return saved
  },

  updateDebt: async (id, updates) => {
    const user = get().user
    if (!user) throw new Error('Usuario no autenticado')
    const updated = await dal.updateDebt(user.id, id, updates)
    set((s) => {
      const next = {
        ...s,
        debts: s.debts.map((d) => (d.id === id ? updated : d)),
      }
      return { ...next, metrics: computeMetrics(next) }
    })
    return updated
  },

  removeDebt: async (id) => {
    const user = get().user
    if (!user) throw new Error('Usuario no autenticado')
    await dal.deleteDebt(user.id, id)
    set((s) => {
      const next = { ...s, debts: s.debts.filter((d) => d.id !== id) }
      return { ...next, metrics: computeMetrics(next) }
    })
  },

  payDebt: async (debtId, amount) => {
    const user = get().user
    if (!user) throw new Error('Usuario no autenticado')
    const updated = await dal.payDebt(user.id, debtId, amount)
    set((s) => {
      const next = {
        ...s,
        debts: s.debts.map((d) => (d.id === debtId ? updated : d)),
      }
      return { ...next, metrics: computeMetrics(next) }
    })
    return updated
  },

  addAsset: async (data) => {
    const user = get().user
    if (!user) throw new Error('Usuario no autenticado')
    const saved = await dal.createAsset(user.id, data)
    set((s) => {
      const next = { ...s, assets: [saved, ...s.assets] }
      return { ...next, metrics: computeMetrics(next) }
    })
    return saved
  },

  removeAsset: async (id) => {
    const user = get().user
    if (!user) throw new Error('Usuario no autenticado')
    await dal.deleteAsset(user.id, id)
    set((s) => {
      const next = { ...s, assets: s.assets.filter((a) => a.id !== id) }
      return { ...next, metrics: computeMetrics(next) }
    })
  },

  addBudget: async (data) => {
    const user = get().user
    if (!user) throw new Error('Usuario no autenticado')
    const saved = await dal.createBudget(user.id, data)
    set((s) => ({ ...s, budgets: [saved, ...s.budgets] }))
    return saved
  },

  updateBudget: async (id, updates) => {
    const user = get().user
    if (!user) throw new Error('Usuario no autenticado')
    const updated = await dal.updateBudget(user.id, id, updates)
    set((s) => ({
      ...s,
      budgets: s.budgets.map((b) => (b.id === id ? updated : b)),
    }))
    return updated
  },

  removeBudget: async (id) => {
    const user = get().user
    if (!user) throw new Error('Usuario no autenticado')
    await dal.deleteBudget(user.id, id)
    set((s) => ({
      ...s,
      budgets: s.budgets.filter((b) => b.id !== id),
    }))
  },

  upsertBudget: async (category_name, month, year, amount) => {
    const user = get().user
    if (!user) throw new Error('Usuario no autenticado')
    const saved = await dal.upsertBudget(user.id, category_name, month, year, amount)
    set((s) => {
      const cleanCat = category_name.toLowerCase().trim()
      const exists = s.budgets.some(
        (b) => b.id === saved.id || (b.category_name.toLowerCase().trim() === cleanCat && b.month === month && b.year === year)
      )
      const nextBudgets = exists
        ? s.budgets.map((b) =>
            b.id === saved.id || (b.category_name.toLowerCase().trim() === cleanCat && b.month === month && b.year === year)
              ? saved
              : b
          )
        : [saved, ...s.budgets]
      return { ...s, budgets: nextBudgets }
    })
    return saved
  },

  // Crypto Holdings Actions
  addCryptoHolding: async (data) => {
    const user = get().user
    if (!user) throw new Error('Usuario no autenticado')
    const saved = await dal.createCryptoHolding(user.id, data)
    set((s) => ({ ...s, cryptoHoldings: [saved, ...s.cryptoHoldings] }))
    await get().refreshCryptoSummary()
    return saved
  },

  updateCryptoHolding: async (id, updates) => {
    const user = get().user
    if (!user) throw new Error('Usuario no autenticado')
    const updated = await dal.updateCryptoHolding(user.id, id, updates)
    set((s) => ({
      ...s,
      cryptoHoldings: s.cryptoHoldings.map((h) => (h.id === id ? updated : h)),
    }))
    await get().refreshCryptoSummary()
    return updated
  },

  removeCryptoHolding: async (id) => {
    const user = get().user
    if (!user) throw new Error('Usuario no autenticado')
    await dal.deleteCryptoHolding(user.id, id)
    set((s) => ({
      ...s,
      cryptoHoldings: s.cryptoHoldings.filter((h) => h.id !== id),
    }))
    await get().refreshCryptoSummary()
  },

  // Wallet Actions
  addWallet: async (data) => {
    const user = get().user
    if (!user) throw new Error('Usuario no autenticado')
    const saved = await dal.createWallet(user.id, data)
    set((s) => ({ ...s, wallets: [saved, ...s.wallets] }))
    await get().refreshCryptoSummary()
    return saved
  },

  updateWallet: async (id, updates) => {
    const user = get().user
    if (!user) throw new Error('Usuario no autenticado')
    const updated = await dal.updateWallet(user.id, id, updates)
    set((s) => ({
      ...s,
      wallets: s.wallets.map((w) => (w.id === id ? updated : w)),
    }))
    await get().refreshCryptoSummary()
    return updated
  },

  removeWallet: async (id) => {
    const user = get().user
    if (!user) throw new Error('Usuario no autenticado')
    await dal.deleteWallet(user.id, id)
    set((s) => ({
      ...s,
      wallets: s.wallets.filter((w) => w.id !== id),
    }))
    await get().refreshCryptoSummary()
  },

  syncWallets: async () => {
    const { wallets, cryptoHoldings } = get()
    const activeWallets = wallets.filter((w) => w.is_active)
    const walletBalances = await walletService.getAllWalletsBalances(activeWallets)
    const summary = await PortfolioAggregator.aggregate({
      holdings: cryptoHoldings,
      wallets: wallets,
      walletBalances,
    })
    set((s) => {
      const next = { ...s, cryptoSummary: summary }
      return {
        ...next,
        metrics: computeMetrics(next),
      }
    })
  },

  addBet: (bet) => set((s) => {
    const next = { ...s, bets: [bet, ...s.bets] }
    return { ...next, metrics: computeMetrics(next) }
  }),
  removeBet: (id) => set((s) => {
    const next = { ...s, bets: s.bets.filter((b) => b.id !== id) }
    return { ...next, metrics: computeMetrics(next) }
  }),

  // Banking Mutations
  addBankConnection: async (data) => {
    const user = get().user
    if (!user) throw new Error('Usuario no autenticado')
    const saved = await dal.createBankConnection({
      ...data,
      user_id: user.id,
    })
    // Audit consent grant
    await dal.createBankConsentLog({
      user_id: user.id,
      connection_id: saved.id,
      action: 'granted',
      scopes: saved.consent_scopes,
    })
    set((s) => ({ ...s, bankConnections: [saved, ...s.bankConnections] }))
    // Initial sync
    await get().syncBankConnection(saved.id)
    return saved
  },

  revokeBankConsent: async (connectionId) => {
    const user = get().user
    if (!user) throw new Error('Usuario no autenticado')
    await dal.updateBankConnection(connectionId, user.id, {
      consent_status: 'revoked',
      sync_status: 'idle',
    })
    await dal.createBankConsentLog({
      user_id: user.id,
      connection_id: connectionId,
      action: 'revoked',
      scopes: [],
    })
    set((s) => ({
      ...s,
      bankConnections: s.bankConnections.map((c) =>
        c.id === connectionId ? { ...c, consent_status: 'revoked' } : c
      ),
    }))
  },

  removeBankConnection: async (connectionId) => {
    const user = get().user
    if (!user) throw new Error('Usuario no autenticado')
    await dal.deleteBankConnection(connectionId, user.id)
    set((s) => ({
      ...s,
      bankConnections: s.bankConnections.filter((c) => c.id !== connectionId),
    }))
  },

  syncBankConnection: async (connectionId) => {
    const user = get().user
    if (!user) return
    const { bankConnections, bankAccounts, bankTransactions, incomes } = get()
    const conn = bankConnections.find((c) => c.id === connectionId)
    if (!conn) return

    const provider = new OpenFinanceProvider()
    const isAvail = await provider.isAvailable()
    if (!isAvail) {
      const updatedConn: BankConnection = {
        ...conn,
        sync_status: 'failed',
        connection_state: 'UNAVAILABLE',
        sync_error:
          'Conexión automática no disponible: Se requieren credenciales corporativas AISP (Decreto 0368 de 2026). Por favor importe su extracto en CSV, PDF o Imagen.',
        updated_at: new Date().toISOString(),
      }
      await dal.updateBankConnection(connectionId, user.id, updatedConn)
      set((s) => ({
        ...s,
        bankConnections: s.bankConnections.map((c) => (c.id === connectionId ? updatedConn : c)),
      }))
      return
    }

    const { updatedConnection, accounts, transactions } = await BankSyncService.syncConnection(
      conn,
      provider,
      bankAccounts,
      bankTransactions,
      incomes.map((i) => ({ id: i.id, source: i.source, amount: i.amount, date: i.date }))
    )

    // Actualizar persistencia DAL
    await dal.updateBankConnection(connectionId, user.id, updatedConnection)
    for (const acc of accounts) {
      const exists = bankAccounts.some((a) => a.id === acc.id)
      if (exists) {
        await dal.updateBankAccount(acc.id, user.id, acc)
      } else {
        await dal.createBankAccount(acc)
      }
    }
    const newTxToPersist = transactions.filter(
      (tx) => !bankTransactions.some((existing) => existing.id === tx.id)
    )
    if (newTxToPersist.length > 0) {
      await dal.createBankTransactions(newTxToPersist)
    }

    set((s) => {
      const next = {
        ...s,
        bankConnections: s.bankConnections.map((c) =>
          c.id === connectionId ? updatedConnection : c
        ),
        bankAccounts: accounts,
        bankTransactions: transactions,
      }
      return {
        ...next,
        metrics: computeMetrics(next),
      }
    })

    get().recomputeBankingCashFlow()
  },

  importCSVStatement: async (accountId, csvContent, institutionHint) => {
    const user = get().user
    if (!user) throw new Error('Usuario no autenticado')
    const { bankAccounts, bankTransactions, incomes } = get()

    const targetAccount = bankAccounts.find((a) => a.id === accountId)
    const newTxs = CSVBankProvider.extractAllTransactions(csvContent, {
      accountId,
      userId: user.id,
      institutionHint: institutionHint || targetAccount?.institution_name,
    })

    const { newTransactions, skippedCount } = DeduplicationEngine.filterDuplicates(
      newTxs,
      bankTransactions
    )

    const consolidated = [...bankTransactions, ...newTransactions]
    const withTransfers = DeduplicationEngine.detectInternalTransfers(consolidated)
    const finalTransactions = DeduplicationEngine.reconcileWithIncomes(
      withTransfers.updatedTransactions,
      incomes.map((i) => ({ id: i.id, source: i.source, amount: i.amount, date: i.date })) as any
    )

    if (newTransactions.length > 0) {
      await dal.createBankTransactions(newTransactions)
    }

    set((s) => {
      const next = {
        ...s,
        bankTransactions: finalTransactions.updatedTransactions,
      }
      return {
        ...next,
        metrics: computeMetrics(next),
      }
    })

    get().recomputeBankingCashFlow()

    return {
      importedCount: newTransactions.length,
      duplicatesSkipped: skippedCount,
    }
  },

  reconcileAccount: (accountId) => {
    const { bankAccounts, bankTransactions } = get()
    const target = bankAccounts.find((a) => a.id === accountId)
    if (!target) return null
    return BankReconciliationEngine.reconcileAccount(target, bankTransactions)
  },

  // Setters
  setIncomes: (data) => set((s) => {
    const next = { ...s, incomes: data }
    return { ...next, metrics: computeMetrics(next) }
  }),
  setExpenses: (data) => set((s) => {
    const next = { ...s, expenses: data }
    return { ...next, metrics: computeMetrics(next) }
  }),
  setGoals: (data) => set((s) => {
    const next = { ...s, goals: data }
    return { ...next, metrics: computeMetrics(next) }
  }),
  setDebts: (data) => set((s) => {
    const next = { ...s, debts: data }
    return { ...next, metrics: computeMetrics(next) }
  }),
  setInvestments: (data) => set((s) => {
    const next = { ...s, investments: data }
    return { ...next, metrics: computeMetrics(next) }
  }),
  setBets: (data) => set((s) => {
    const next = { ...s, bets: data }
    return { ...next, metrics: computeMetrics(next) }
  }),
  setAssets: (data) => set((s) => {
    const next = { ...s, assets: data }
    return { ...next, metrics: computeMetrics(next) }
  }),
  setLiabilities: (data) => set((s) => {
    const next = { ...s, liabilities: data }
    return { ...next, metrics: computeMetrics(next) }
  }),
  setAccounts: (data) => set({ accounts: data }),
  setCategories: (data) => set({ categories: data }),
  setBudgets: (data) => set({ budgets: data }),
  setCryptoHoldings: (data) => set({ cryptoHoldings: data }),
  setWallets: (data) => set({ wallets: data }),
  setBankConnections: (data) => set({ bankConnections: data }),
  setBankAccounts: (data) => set((s) => {
    const next = { ...s, bankAccounts: data }
    return { ...next, metrics: computeMetrics(next) }
  }),
  setBankTransactions: (data) => set((s) => {
    const next = { ...s, bankTransactions: data }
    return { ...next, bankingCashFlow: calcBankingCashFlow(data) }
  }),
  setCryptoSummary: (summary) => set((s) => {
    const next = { ...s, cryptoSummary: summary }
    return { ...next, metrics: computeMetrics(next) }
  }),
}))


import { getIncomes, createIncome, updateIncome, deleteIncome } from './incomes'
import { getExpenses, createExpense, updateExpense, deleteExpense } from './expenses'
import { getCategories, createCategory } from './categories'
import { getGoals, createGoal, updateGoal, deleteGoal, addGoalContribution } from './goals'
import { getDebts, createDebt, updateDebt, deleteDebt, payDebt } from './debts'
import { getAssets, createAsset, updateAsset, deleteAsset } from './assets'
import { getLiabilities, createLiability } from './liabilities'
import { getAccounts, createAccount } from './accounts'
import { getBudgets, createBudget, updateBudget, deleteBudget, upsertBudget } from './budgets'
import { getCryptoHoldings, createCryptoHolding, updateCryptoHolding, deleteCryptoHolding } from './crypto'
import { getWallets, createWallet, updateWallet, deleteWallet } from './wallets'
import {
  getBankConnections,
  createBankConnection,
  updateBankConnection,
  deleteBankConnection,
  getBankAccounts,
  createBankAccount,
  updateBankAccount,
  getBankTransactions,
  createBankTransactions,
  updateBankTransaction,
  getBankConsentLogs,
  createBankConsentLog,
} from './banking'
import {
  getFinancialSnapshots,
  saveFinancialSnapshot,
  deleteFinancialSnapshot,
} from './snapshots'

export * from './incomes'
export * from './expenses'
export * from './categories'
export * from './goals'
export * from './debts'
export * from './assets'
export * from './liabilities'
export * from './accounts'
export * from './budgets'
export * from './crypto'
export * from './wallets'
export * from './banking'
export * from './snapshots'
export * from './intelligence'
export * from './copilot'
export {
  getFinancialSnapshots,
  saveFinancialSnapshot,
  deleteFinancialSnapshot,
}

export interface UserFinancialBundle {
  incomes: Awaited<ReturnType<typeof getIncomes>>
  expenses: Awaited<ReturnType<typeof getExpenses>>
  categories: Awaited<ReturnType<typeof getCategories>>
  goals: Awaited<ReturnType<typeof getGoals>>
  debts: Awaited<ReturnType<typeof getDebts>>
  assets: Awaited<ReturnType<typeof getAssets>>
  liabilities: Awaited<ReturnType<typeof getLiabilities>>
  accounts: Awaited<ReturnType<typeof getAccounts>>
  budgets: Awaited<ReturnType<typeof getBudgets>>
  cryptoHoldings: Awaited<ReturnType<typeof getCryptoHoldings>>
  wallets: Awaited<ReturnType<typeof getWallets>>
  bankConnections: Awaited<ReturnType<typeof getBankConnections>>
  bankAccounts: Awaited<ReturnType<typeof getBankAccounts>>
  bankTransactions: Awaited<ReturnType<typeof getBankTransactions>>
  snapshots: Awaited<ReturnType<typeof getFinancialSnapshots>>
}

/**
 * Loads all persistent financial data for a user in a single optimized pass.
 * Fetches from Supabase if active, or from the isolated per-user local store.
 */
export async function loadAllUserData(userId: string): Promise<UserFinancialBundle> {
  const [
    incomes,
    expenses,
    categories,
    goals,
    debts,
    assets,
    liabilities,
    accounts,
    budgets,
    cryptoHoldings,
    wallets,
    bankConnections,
    bankAccounts,
    bankTransactions,
    snapshots,
  ] = await Promise.all([
    getIncomes(userId),
    getExpenses(userId),
    getCategories(userId),
    getGoals(userId),
    getDebts(userId),
    getAssets(userId),
    getLiabilities(userId),
    getAccounts(userId),
    getBudgets(userId),
    getCryptoHoldings(userId),
    getWallets(userId),
    getBankConnections(userId),
    getBankAccounts(userId),
    getBankTransactions(userId),
    getFinancialSnapshots(userId),
  ])

  return {
    incomes,
    expenses,
    categories,
    goals,
    debts,
    assets,
    liabilities,
    accounts,
    budgets,
    cryptoHoldings,
    wallets,
    bankConnections,
    bankAccounts,
    bankTransactions,
    snapshots,
  }
}



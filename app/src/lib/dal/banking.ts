/**
 * NEXUS Finance — Data Access Layer: Banking & Open Finance
 * Paso 18: Tablas bank_connections, bank_accounts, bank_transactions, bank_consents_log
 * Soporta Supabase PostgreSQL con RLS y fallback local determinista aislado por usuario.
 */

import { createClient } from '@/lib/supabase/client'
import { createTableStorage } from './storage-fallback'
import type {
  BankConnection,
  BankAccount,
  BankTransaction,
  BankConsentLog,
} from '@/types/banking'

const connectionsStorage = createTableStorage<BankConnection>('bank_connections')
const accountsStorage = createTableStorage<BankAccount>('bank_accounts')
const transactionsStorage = createTableStorage<BankTransaction>('bank_transactions')
const consentsStorage = createTableStorage<BankConsentLog>('bank_consents_log')


// ─────────────────────────────────────────────
// BANK CONNECTIONS CRUD
// ─────────────────────────────────────────────
export async function getBankConnections(userId: string): Promise<BankConnection[]> {
  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('bank_connections')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('[DAL] Bank connections query error, fallback:', error.message)
      return connectionsStorage.getAll(userId)
    }
    return data || []
  }
  return connectionsStorage.getAll(userId)
}

export async function createBankConnection(
  connection: Omit<BankConnection, 'id' | 'created_at' | 'updated_at'>
): Promise<BankConnection> {
  const id = `conn_${connection.institution_id}_${Date.now()}`
  const now = new Date().toISOString()
  const newConn: BankConnection = {
    ...connection,
    id,
    created_at: now,
    updated_at: now,
  }

  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase.from('bank_connections').insert(newConn).select().single()
    if (!error && data) return data
  }

  return connectionsStorage.insert(newConn.user_id, newConn)
}

export async function updateBankConnection(
  id: string,
  userId: string,
  updates: Partial<BankConnection>
): Promise<BankConnection | null> {
  const updatedWithTimestamp = {
    ...updates,
    updated_at: new Date().toISOString(),
  }

  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('bank_connections')
      .update(updatedWithTimestamp)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (!error && data) return data
  }

  return connectionsStorage.update(userId, id, updatedWithTimestamp)
}

export async function deleteBankConnection(id: string, userId: string): Promise<boolean> {
  const supabase = createClient()
  if (supabase) {
    const { error } = await supabase.from('bank_connections').delete().eq('id', id).eq('user_id', userId)
    if (!error) {
      connectionsStorage.delete(userId, id)
      return true
    }
  }
  return connectionsStorage.delete(userId, id)
}

// ─────────────────────────────────────────────
// BANK ACCOUNTS CRUD
// ─────────────────────────────────────────────
export async function getBankAccounts(userId: string): Promise<BankAccount[]> {
  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('account_name', { ascending: true })

    if (error) {
      console.warn('[DAL] Bank accounts query error, fallback:', error.message)
      return accountsStorage.getAll(userId)
    }
    return data || []
  }
  return accountsStorage.getAll(userId)
}

export async function createBankAccount(
  account: Omit<BankAccount, 'id' | 'created_at' | 'updated_at'>
): Promise<BankAccount> {
  const id = `bacc_${account.institution_id}_${Date.now()}`
  const now = new Date().toISOString()
  const newAccount: BankAccount = {
    ...account,
    id,
    created_at: now,
    updated_at: now,
  }

  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase.from('bank_accounts').insert(newAccount).select().single()
    if (!error && data) return data
  }

  return accountsStorage.insert(newAccount.user_id, newAccount)
}

export async function updateBankAccount(
  id: string,
  userId: string,
  updates: Partial<BankAccount>
): Promise<BankAccount | null> {
  const updatedWithTimestamp = {
    ...updates,
    updated_at: new Date().toISOString(),
  }

  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('bank_accounts')
      .update(updatedWithTimestamp)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (!error && data) return data
  }

  return accountsStorage.update(userId, id, updatedWithTimestamp)
}

// ─────────────────────────────────────────────
// BANK TRANSACTIONS CRUD
// ─────────────────────────────────────────────
export async function getBankTransactions(
  userId: string,
  accountId?: string,
  startDate?: string,
  endDate?: string
): Promise<BankTransaction[]> {
  const supabase = createClient()
  if (supabase) {
    let query = supabase
      .from('bank_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })

    if (accountId) query = query.eq('account_id', accountId)
    if (startDate) query = query.gte('date', startDate)
    if (endDate) query = query.lte('date', endDate)

    const { data, error } = await query
    if (error) {
      console.warn('[DAL] Bank transactions query error, fallback:', error.message)
      return filterTransactionsLocal(userId, accountId, startDate, endDate)
    }
    return data || []
  }

  return filterTransactionsLocal(userId, accountId, startDate, endDate)
}

function filterTransactionsLocal(
  userId: string,
  accountId?: string,
  startDate?: string,
  endDate?: string
): BankTransaction[] {
  let txs = transactionsStorage.getAll(userId)
  if (accountId) txs = txs.filter((t) => t.account_id === accountId)
  if (startDate) txs = txs.filter((t) => t.date >= startDate)
  if (endDate) txs = txs.filter((t) => t.date <= endDate)
  return txs.sort((a, b) => b.date.localeCompare(a.date))
}

export async function createBankTransactions(transactions: BankTransaction[]): Promise<BankTransaction[]> {
  if (transactions.length === 0) return []

  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase.from('bank_transactions').insert(transactions).select()
    if (!error && data) {
      for (const t of transactions) {
        transactionsStorage.insert(t.user_id, t)
      }
      return data
    }
  }

  const created: BankTransaction[] = []
  for (const t of transactions) {
    created.push(transactionsStorage.insert(t.user_id, t))
  }
  return created
}

export async function updateBankTransaction(
  id: string,
  userId: string,
  updates: Partial<BankTransaction>
): Promise<BankTransaction | null> {
  const updatedWithTimestamp = {
    ...updates,
    updated_at: new Date().toISOString(),
  }

  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('bank_transactions')
      .update(updatedWithTimestamp)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (!error && data) return data
  }

  return transactionsStorage.update(userId, id, updatedWithTimestamp)
}

// ─────────────────────────────────────────────
// CONSENT AUDIT LOGS
// ─────────────────────────────────────────────
export async function getBankConsentLogs(userId: string): Promise<BankConsentLog[]> {
  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('bank_consents_log')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })

    if (error) {
      return consentsStorage.getAll(userId)
    }
    return data || []
  }
  return consentsStorage.getAll(userId)
}

export async function createBankConsentLog(
  log: Omit<BankConsentLog, 'id' | 'timestamp'>
): Promise<BankConsentLog> {
  const newLog: BankConsentLog = {
    ...log,
    id: `blog_${Date.now()}`,
    timestamp: new Date().toISOString(),
  }

  const supabase = createClient()
  if (supabase) {
    const { data } = await supabase.from('bank_consents_log').insert(newLog).select().single()
    if (data) return data
  }

  return consentsStorage.insert(newLog.user_id, newLog)
}

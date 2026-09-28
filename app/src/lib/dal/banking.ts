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

// ─────────────────────────────────────────────
// SEEDS AISLADOS PARA FALLBACK LOCAL
// ─────────────────────────────────────────────
const defaultConnections: BankConnection[] = [
  {
    id: 'conn-bancolombia-01',
    user_id: 'usr-kevin-001',
    provider: 'open_finance',
    institution_id: 'bancolombia',
    institution_name: 'Bancolombia',
    institution_logo: null,
    consent_status: 'active',
    consent_scopes: ['accounts.read', 'balances.read', 'transactions.read'],
    consent_expires_at: '2027-09-25T00:00:00.000Z',
    last_synced_at: new Date().toISOString(),
    sync_status: 'success',
    sync_error: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'conn-nequi-01',
    user_id: 'usr-kevin-001',
    provider: 'open_finance',
    institution_id: 'nequi',
    institution_name: 'Nequi',
    institution_logo: null,
    consent_status: 'active',
    consent_scopes: ['accounts.read', 'balances.read', 'transactions.read'],
    consent_expires_at: '2027-09-25T00:00:00.000Z',
    last_synced_at: new Date().toISOString(),
    sync_status: 'success',
    sync_error: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

const defaultAccounts: BankAccount[] = [
  {
    id: 'acc-bancolombia-ahorros',
    user_id: 'usr-kevin-001',
    connection_id: 'conn-bancolombia-01',
    institution_id: 'bancolombia',
    institution_name: 'Bancolombia',
    account_name: 'Bancolombia Cuenta Ahorros Principal',
    account_type: 'savings',
    currency: 'COP',
    masked_account_number: '***5421',
    current_balance: 3200000,
    available_balance: 3200000,
    credit_limit: null,
    is_active: true,
    last_synced_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'acc-nequi-colombia',
    user_id: 'usr-kevin-001',
    connection_id: 'conn-nequi-01',
    institution_id: 'nequi',
    institution_name: 'Nequi',
    account_name: 'Nequi Personal',
    account_type: 'digital_wallet',
    currency: 'COP',
    masked_account_number: '***9812',
    current_balance: 1450000,
    available_balance: 1450000,
    credit_limit: null,
    is_active: true,
    last_synced_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

const defaultTransactions: BankTransaction[] = [
  {
    id: 'btx-001',
    user_id: 'usr-kevin-001',
    account_id: 'acc-bancolombia-ahorros',
    external_transaction_id: 'banc-ref-1001',
    date: '2026-09-15',
    posted_at: '2026-09-15T09:30:00Z',
    description: 'PAGO NOMINA SHUFFLER ENTERPRISES',
    clean_merchant: 'Shuffler',
    amount: 2100000,
    currency: 'COP',
    transaction_type: 'income',
    category: 'Ingresos Laborales',
    category_source: 'rule',
    is_internal_transfer: false,
    linked_transaction_id: null,
    linked_income_id: 'inc-shuffler',
    linked_expense_id: null,
    is_reconciled: true,
    notes: 'Pago quincena Shuffler',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'btx-002',
    user_id: 'usr-kevin-001',
    account_id: 'acc-nequi-colombia',
    external_transaction_id: 'neq-ref-2001',
    date: '2026-09-15',
    posted_at: '2026-09-15T18:00:00Z',
    description: 'ABONO NOMINA PIZZA HUT S.A.S.',
    clean_merchant: 'Pizza Hut',
    amount: 650000,
    currency: 'COP',
    transaction_type: 'income',
    category: 'Ingresos Laborales',
    category_source: 'rule',
    is_internal_transfer: false,
    linked_transaction_id: null,
    linked_income_id: 'inc-pizzahut',
    linked_expense_id: null,
    is_reconciled: true,
    notes: 'Pago Pizza Hut turno secundario',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'btx-003',
    user_id: 'usr-kevin-001',
    account_id: 'acc-bancolombia-ahorros',
    external_transaction_id: 'banc-ref-1002',
    date: '2026-09-16',
    posted_at: '2026-09-16T11:20:00Z',
    description: 'TRANSFERENCIA A NEQUI 310***9812',
    clean_merchant: 'Nequi Transferencia',
    amount: 300000,
    currency: 'COP',
    transaction_type: 'transfer',
    category: 'Transferencias',
    category_source: 'rule',
    is_internal_transfer: true,
    linked_transaction_id: 'btx-004',
    linked_income_id: null,
    linked_expense_id: null,
    is_reconciled: true,
    notes: 'Traspaso a cuenta Nequi',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'btx-004',
    user_id: 'usr-kevin-001',
    account_id: 'acc-nequi-colombia',
    external_transaction_id: 'neq-ref-2002',
    date: '2026-09-16',
    posted_at: '2026-09-16T11:20:05Z',
    description: 'TRANSFERENCIA RECIBIDA DESDE BANCOLOMBIA 5421',
    clean_merchant: 'Bancolombia Transferencia',
    amount: 300000,
    currency: 'COP',
    transaction_type: 'transfer',
    category: 'Transferencias',
    category_source: 'rule',
    is_internal_transfer: true,
    linked_transaction_id: 'btx-003',
    linked_income_id: null,
    linked_expense_id: null,
    is_reconciled: true,
    notes: 'Traspaso recibido de Bancolombia',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'btx-005',
    user_id: 'usr-kevin-001',
    account_id: 'acc-bancolombia-ahorros',
    external_transaction_id: 'banc-ref-1003',
    date: '2026-09-18',
    posted_at: '2026-09-18T14:10:00Z',
    description: 'COMPRA ALMACENES EXITO CALLE 80',
    clean_merchant: 'Éxito',
    amount: 185000,
    currency: 'COP',
    transaction_type: 'expense',
    category: 'Alimentación',
    category_source: 'rule',
    is_internal_transfer: false,
    linked_transaction_id: null,
    linked_income_id: null,
    linked_expense_id: null,
    is_reconciled: true,
    notes: 'Mercado quincenal',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'btx-006',
    user_id: 'usr-kevin-001',
    account_id: 'acc-bancolombia-ahorros',
    external_transaction_id: 'banc-ref-1004',
    date: '2026-09-19',
    posted_at: '2026-09-19T08:05:00Z',
    description: 'RECARGA TRANSMILENIO ESTACION FLORES',
    clean_merchant: 'Transmilenio',
    amount: 29500,
    currency: 'COP',
    transaction_type: 'expense',
    category: 'Transporte',
    category_source: 'rule',
    is_internal_transfer: false,
    linked_transaction_id: null,
    linked_income_id: null,
    linked_expense_id: null,
    is_reconciled: true,
    notes: 'Transporte semanal',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

const connectionsStorage = createTableStorage<BankConnection>('bank_connections', {
  'usr-kevin-001': defaultConnections,
})

const accountsStorage = createTableStorage<BankAccount>('bank_accounts', {
  'usr-kevin-001': defaultAccounts,
})

const transactionsStorage = createTableStorage<BankTransaction>('bank_transactions', {
  'usr-kevin-001': defaultTransactions,
})

const consentsStorage = createTableStorage<BankConsentLog>('bank_consents_log', {
  'usr-kevin-001': [
    {
      id: 'log-001',
      user_id: 'usr-kevin-001',
      connection_id: 'conn-bancolombia-01',
      action: 'granted',
      scopes: ['accounts.read', 'balances.read', 'transactions.read'],
      ip_address: '127.0.0.1',
      user_agent: 'NexusFinance/1.0',
      timestamp: new Date().toISOString(),
    },
  ],
})

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

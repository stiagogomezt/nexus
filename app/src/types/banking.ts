/**
 * NEXUS Finance — Banking & Open Finance Intelligence Types
 * Standard domain models for Open Finance connections, bank accounts, canonical transactions,
 * reconciliation, and statement parsing under Colombian regulatory framework (Decreto 0368 de 2026).
 */

export type BankConnectionProvider = 'open_finance' | 'prometeo' | 'belvo' | 'csv' | 'manual'

export type BankConsentStatus = 'active' | 'revoked' | 'expired' | 'error'

export type BankSyncStatus = 'idle' | 'syncing' | 'success' | 'partial' | 'failed' | 'reauth_required'

export type BankConnectionState =
  | 'NO_CONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'SYNCING'
  | 'SYNCED'
  | 'REQUIRES_REAUTH'
  | 'EXPIRED'
  | 'ERROR'
  | 'UNAVAILABLE'

export type DataProvenance = 'MANUAL' | 'OPEN_FINANCE' | 'CSV' | 'PDF' | 'IMAGE' | 'WALLET' | 'AI'

export type BankAccountType = 'savings' | 'checking' | 'credit_card' | 'digital_wallet'

export type BankTransactionType = 'income' | 'expense' | 'transfer' | 'adjustment'

export type CategorySource = 'manual' | 'rule' | 'ai' | 'provider'

export interface InstitutionCatalogItem {
  id: string
  name: string
  category: 'bank' | 'digital_wallet' | 'financing'
  logo?: string
  availability_status: 'AVAILABLE' | 'UNAVAILABLE' | 'COMING_SOON'
  connection_type: 'OPEN_FINANCE_FAPI' | 'AGGREGATOR' | 'CSV_STATEMENT' | 'NONE'
  supports_balances: boolean
  supports_transactions: boolean
  supports_incremental_sync: boolean
  supports_csv_import: boolean
  supports_pdf_import: boolean
  oauth_flow_type: 'REDIRECT_OAUTH_PKCE' | 'NONE'
  regulatory_framework: string
  unavailability_reason?: string
}

export interface BankConnection {
  id: string
  user_id: string
  provider: BankConnectionProvider
  institution_id: string // 'bancolombia', 'nequi', 'davivienda', 'nu', 'bogota'
  institution_name: string // 'Bancolombia', 'Nequi', 'Nu Colombia'
  institution_logo?: string | null
  consent_status: BankConsentStatus
  consent_scopes: string[] // ['accounts', 'balances', 'transactions']
  consent_expires_at?: string | null
  last_synced_at?: string | null
  sync_status: BankSyncStatus
  connection_state?: BankConnectionState
  data_provenance?: DataProvenance
  sync_error?: string | null
  created_at: string
  updated_at: string
}

export interface BankAccount {
  id: string
  user_id: string
  connection_id?: string | null
  institution_id: string
  institution_name: string
  account_name: string
  account_type: BankAccountType
  currency: string
  masked_account_number: string // e.g. '***5421'
  current_balance: number
  available_balance: number
  credit_limit?: number | null
  is_active: boolean
  data_provenance?: DataProvenance
  connection_state?: BankConnectionState
  last_synced_at?: string | null
  created_at: string
  updated_at: string
}

export interface BankTransaction {
  id: string
  user_id: string
  account_id: string
  external_transaction_id?: string | null
  data_provenance?: DataProvenance
  date: string // YYYY-MM-DD
  posted_at?: string | null
  description: string
  clean_merchant?: string | null
  amount: number // Positive number always; sign determined by transaction_type
  currency: string
  transaction_type: BankTransactionType
  category: string
  category_source: CategorySource
  is_internal_transfer: boolean
  linked_transaction_id?: string | null
  internal_transfer_pair_id?: string | null
  linked_income_id?: string | null
  linked_expense_id?: string | null
  is_reconciled: boolean
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface BankConsentLog {
  id: string
  user_id: string
  connection_id?: string | null
  action: 'granted' | 'renewed' | 'revoked' | 'expired'
  scopes: string[]
  ip_address?: string | null
  user_agent?: string | null
  timestamp: string
}

export interface BankingCashFlowSummary {
  total_cash_in: number
  total_cash_out: number
  internal_transfers_volume: number
  net_cash_flow: number
  period: {
    start_date: string
    end_date: string
  }
  transactions_count: number
}

export interface BankReconciliationReport {
  account_id: string
  account_name: string
  institution_name: string
  reported_bank_balance: number
  calculated_ledger_balance: number
  discrepancy: number
  status: 'balanced' | 'discrepant'
  unreconciled_transactions_count: number
  last_reconciled_at: string
}

export interface CSVStatementMapping {
  dateColumn: string
  descriptionColumn: string
  amountColumn: string
  typeColumn?: string
  referenceColumn?: string
  dateFormat?: string
}

export interface CSVParsePreview {
  institution_suggested: string
  detected_columns: string[]
  total_rows: number
  valid_rows: number
  potential_duplicates: number
  sample_transactions: Partial<BankTransaction>[]
}

/**
 * NEXUS Finance — Document Intelligence Types (FASE V)
 * =====================================================
 * Types for Bank Statement extraction from photos, screenshots, and PDFs.
 *
 * Pipeline:
 * Upload (Image / PDF) → Gemini Multimodal Extraction → BankDataNormalizer →
 * Deduplication & Fingerprint → Accounting Reconciliation →
 * Mandatory User Preview → Confirm / Edit / Cancel → DAL Persistence →
 * Financial Engine & Digital Twin Recalculation.
 */

import type { BankTransactionType, CategorySource } from './banking'

export type DocumentMimeType =
  | 'image/jpeg'
  | 'image/jpg'
  | 'image/png'
  | 'image/webp'
  | 'application/pdf'

export interface ExtractedTransaction {
  id?: string
  date: string                // ISO YYYY-MM-DD
  description: string
  merchant_name: string | null
  amount: number              // Positive COP number (cents preserved if present)
  transaction_type: 'inflow' | 'outflow' | 'transfer'
  category: string
  category_source?: CategorySource
  confidence: number          // 0.0 to 1.0
  subsequent_balance?: number | null
  currency: string

  // Specialized flags
  is_internal_transfer: boolean
  is_payroll: boolean
  is_fee: boolean
  is_debt_payment: boolean
  is_withdrawal: boolean
  is_deposit: boolean

  // Review & Duplicate status
  is_duplicate?: boolean
  duplicate_reason?: string
  needs_manual_review?: boolean
  review_reasons?: string[]
  fingerprint?: string
  raw_text?: string
  selected_for_import?: boolean
  linked_income_id?: string | null
}

export interface StatementReconciliation {
  calculated_balance: number
  reported_balance: number
  discrepancy: number
  status: 'balanced' | 'discrepant'
  inflows_total: number
  outflows_total: number
  opening_balance: number
  closing_balance: number
  adjustments_total: number
}

export interface StatementSummary {
  total_found: number
  new_count: number
  duplicate_count: number
  manual_review_count: number
  inflows_sum: number
  outflows_sum: number
}

export interface ExtractedBankStatement {
  statement_id: string
  institution_name: string
  account_type: 'savings' | 'checking' | 'credit' | 'wallet' | 'unknown'
  masked_account_number: string
  currency: string
  statement_period: {
    start: string             // ISO YYYY-MM-DD
    end: string               // ISO YYYY-MM-DD
  }
  opening_balance: number
  closing_balance: number
  transactions: ExtractedTransaction[]
  reconciliation: StatementReconciliation
  summary: StatementSummary
  page_count?: number
  document_type?: 'pdf' | 'image' | 'csv' | 'unknown'
  unreadable_pages_warning?: boolean
  warning_message?: string
  extracted_at: string
  matched_account_id?: string | null
  matched_account_name?: string | null
}

export interface DocumentParseResponse {
  success: boolean
  statement?: ExtractedBankStatement
  error?: string
  warnings?: string[]
}

export interface DocumentConfirmRequest {
  statement_id: string
  account_id?: string
  institution_name?: string
  account_type?: string
  masked_account_number?: string
  opening_balance?: number
  closing_balance?: number
  document_type?: string
  transactions: ExtractedTransaction[]
  userId?: string
}

export interface DocumentConfirmResponse {
  success: boolean
  imported_count: number
  duplicates_skipped: number
  reconciled: boolean
  error?: string
}

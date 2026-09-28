/**
 * NEXUS Finance — AI Entry Intent Types
 * =====================================================
 * Shared types for the Natural Language Financial Entry pipeline.
 *
 * Pipeline: NL Input → Parse → Validate → Preview → Confirm → Write → Recalculate
 *
 * SECURITY RULES:
 * - Gemini NEVER writes to Supabase directly.
 * - Gemini produces ONLY structured intents (parse step).
 * - All writes pass through: Intent → Validator → WriteExecutor → DAL → Supabase.
 * - userId is ALWAYS derived from the authenticated session, never from client body.
 */

// ─────────────────────────────────────────────────────────────
// OPERATION TYPES
// ─────────────────────────────────────────────────────────────

export type EntryOperationType =
  | 'EXPENSE'
  | 'INCOME'
  | 'INTERNAL_TRANSFER'
  | 'ACCOUNT_ADJUSTMENT'

export type EntryConfidence = 'HIGH' | 'MEDIUM' | 'LOW'

// ─────────────────────────────────────────────────────────────
// LINE ITEMS (Each individual transaction within an intent)
// ─────────────────────────────────────────────────────────────

export interface ExpenseLineItem {
  type: 'EXPENSE'
  description: string
  amount: number            // Integer COP (never float)
  category_name: string
  category_confidence: EntryConfidence
  account_id?: string | null
  account_name?: string     // Display only
  date: string              // ISO YYYY-MM-DD
  is_essential?: boolean
  payment_method?: 'debit' | 'credit' | 'cash' | 'transfer'
  notes?: string
}

export interface IncomeLineItem {
  type: 'INCOME'
  description: string
  amount: number
  source: string
  income_type: 'salary' | 'bonus' | 'surcharge' | 'extra_hours' | 'hourly_wage' | 'other'
  account_id?: string | null
  account_name?: string
  date: string
  is_recurring?: boolean
  notes?: string
}

export interface InternalTransferLineItem {
  type: 'INTERNAL_TRANSFER'
  description: string
  amount: number
  from_account_id?: string | null
  from_account_name?: string
  to_account_id?: string | null
  to_account_name?: string
  date: string
  notes?: string
}

export interface AccountAdjustmentLineItem {
  type: 'ACCOUNT_ADJUSTMENT'
  description: string
  amount: number            // Positive = credit, Negative = debit
  account_id?: string | null
  account_name?: string
  date: string
  notes?: string
}

export type EntryLineItem =
  | ExpenseLineItem
  | IncomeLineItem
  | InternalTransferLineItem
  | AccountAdjustmentLineItem

// ─────────────────────────────────────────────────────────────
// PENDING INTENT (Output of parse step, input to confirm step)
// ─────────────────────────────────────────────────────────────

export interface MissingField {
  field: 'account' | 'source' | 'category' | 'date' | 'amount'
  message: string
}

export interface PendingIntent {
  intent_id: string         // UUID generated server-side
  original_text: string
  operations: EntryLineItem[]
  total_income: number
  total_expense: number
  net_change: number
  missing_fields: MissingField[]
  requires_clarification: boolean
  clarification_question?: string
  preview_lines: string[]   // Human-readable preview for UI
  parsed_at: string
  // provenance
  source: 'ai_quick_entry'
}

// ─────────────────────────────────────────────────────────────
// PARSE REQUEST / RESPONSE
// ─────────────────────────────────────────────────────────────

export interface ParseEntryRequest {
  text: string
  // Optional context hints provided by client to help parser:
  context_date?: string     // ISO date hint (today's date)
  preferred_account_id?: string
}

export interface ParseEntryResponse {
  success: boolean
  intent?: PendingIntent
  error?: string
}

// ─────────────────────────────────────────────────────────────
// CONFIRM REQUEST / RESPONSE
// ─────────────────────────────────────────────────────────────

export interface ConfirmEntryRequest {
  intent_id: string
  operations: EntryLineItem[]   // Possibly edited by user in preview
}

export interface ConfirmEntryResult {
  operation_type: EntryOperationType
  record_id: string
  description: string
  amount: number
}

export interface ConfirmEntryResponse {
  success: boolean
  results?: ConfirmEntryResult[]
  message?: string
  error?: string
}

// ─────────────────────────────────────────────────────────────
// KNOWN CATEGORIES (for offline classification)
// ─────────────────────────────────────────────────────────────

export const KNOWN_CATEGORIES = [
  'vivienda',
  'alimentacion',
  'transporte',
  'educacion',
  'servicios',
  'tecnologia',
  'entretenimiento',
  'compras',
  'salud',
  'suscripciones',
  'otros',
] as const

export type KnownCategory = typeof KNOWN_CATEGORIES[number]

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

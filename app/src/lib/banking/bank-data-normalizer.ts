/**
 * NEXUS Finance — Bank Data Normalizer
 * Transforms heterogeneous raw bank transactions into CanonicalBankTransactions.
 * Normalizes dates, merchant names, amounts, and transaction types.
 * Applies intelligent auto-categorization preserving user-confirmed categories.
 */

import type { BankTransaction, BankTransactionType, CategorySource } from '@/types/banking'

export interface RawBankTransactionInput {
  externalId?: string
  date: string | Date
  description: string
  amount: number
  currency?: string
  rawType?: string // 'debito', 'credito', 'transferencia', 'abono', etc.
  category?: string
}

interface MerchantRule {
  pattern: RegExp
  cleanMerchant: string
  category: string
  suggestedType?: BankTransactionType
  isPayrollShuffler?: boolean
  isPayrollPizzaHut?: boolean
}

const MERCHANT_RULES: MerchantRule[] = [
  // Payroll & Incomes
  { pattern: /shuffler|pago\s+nomina\s+shuffler|shuffler\s+colombia/i, cleanMerchant: 'Shuffler Corp', category: 'salario', suggestedType: 'income', isPayrollShuffler: true },
  { pattern: /pizza\s*hut|telepizza|operadora\s+de\s+franquicias/i, cleanMerchant: 'Pizza Hut', category: 'salario', suggestedType: 'income', isPayrollPizzaHut: true },

  // Subscriptions & Entertainment
  { pattern: /netflix/i, cleanMerchant: 'Netflix', category: 'suscripciones', suggestedType: 'expense' },
  { pattern: /spotify/i, cleanMerchant: 'Spotify', category: 'suscripciones', suggestedType: 'expense' },
  { pattern: /prime\s*video|amazon\s*prime/i, cleanMerchant: 'Amazon Prime', category: 'suscripciones', suggestedType: 'expense' },
  { pattern: /youtube\s*premium|google\s*youtube/i, cleanMerchant: 'YouTube Premium', category: 'suscripciones', suggestedType: 'expense' },
  { pattern: /hbo\s*max|max\s*digital/i, cleanMerchant: 'Max (HBO)', category: 'suscripciones', suggestedType: 'expense' },
  { pattern: /cine\s*colombia|cinemark|cinepolis/i, cleanMerchant: 'Cine Colombia', category: 'entretenimiento', suggestedType: 'expense' },

  // Food & Groceries
  { pattern: /exito|almacenes\s*exito/i, cleanMerchant: 'Éxito', category: 'alimentacion', suggestedType: 'expense' },
  { pattern: /carulla/i, cleanMerchant: 'Carulla', category: 'alimentacion', suggestedType: 'expense' },
  { pattern: /jumbo|tiendas\s*jumbo|cencosud/i, cleanMerchant: 'Jumbo', category: 'alimentacion', suggestedType: 'expense' },
  { pattern: /tiendas\s*d1|d1\s*sas/i, cleanMerchant: 'Tiendas D1', category: 'alimentacion', suggestedType: 'expense' },
  { pattern: /tiendas\s*ara|jeromino\s*martins/i, cleanMerchant: 'Tiendas Ara', category: 'alimentacion', suggestedType: 'expense' },
  { pattern: /rappi/i, cleanMerchant: 'Rappi', category: 'alimentacion', suggestedType: 'expense' },

  // Transport & Mobility
  { pattern: /transmilenio|recaudo\s*bogota|tullave/i, cleanMerchant: 'TransMilenio (TuLlave)', category: 'transporte', suggestedType: 'expense' },
  { pattern: /uber/i, cleanMerchant: 'Uber', category: 'transporte', suggestedType: 'expense' },
  { pattern: /didi/i, cleanMerchant: 'DiDi', category: 'transporte', suggestedType: 'expense' },
  { pattern: /cabify/i, cleanMerchant: 'Cabify', category: 'transporte', suggestedType: 'expense' },
  { pattern: /terpel|primax|esso|mobil|biomax/i, cleanMerchant: 'Gasolinera Terpel', category: 'transporte', suggestedType: 'expense' },

  // Utilities & Housing
  { pattern: /enel|codensa/i, cleanMerchant: 'Enel Colombia', category: 'servicios', suggestedType: 'expense' },
  { pattern: /vanti|gas\s*natural/i, cleanMerchant: 'Vanti (Gas)', category: 'servicios', suggestedType: 'expense' },
  { pattern: /acueducto\s*bogota|eaab/i, cleanMerchant: 'Acueducto Bogotá (EAAB)', category: 'servicios', suggestedType: 'expense' },
  { pattern: /etb|claro|tigo|movistar/i, cleanMerchant: 'Telecomunicaciones (Claro/ETB)', category: 'servicios', suggestedType: 'expense' },

  // Internal Transfers Keywords
  { pattern: /transferencia\s+a\s+nequi|traslado\s+a\s+nequi|abono\s+de\s+nequi/i, cleanMerchant: 'Nequi', category: 'transferencia', suggestedType: 'transfer' },
  { pattern: /transferencia\s+a\s+daviplata|traslado\s+daviplata/i, cleanMerchant: 'Daviplata', category: 'transferencia', suggestedType: 'transfer' },
  { pattern: /traslado\s+fondos|transferencia\s+entre\s+cuentas/i, cleanMerchant: 'Transferencia Bancaria', category: 'transferencia', suggestedType: 'transfer' },
]

export class BankDataNormalizer {
  /**
   * Cleans and classifies a transaction text.
   */
  public static categorizeDescription(description: string): {
    cleanMerchant: string
    category: string
    categorySource: CategorySource
    suggestedType?: BankTransactionType
    isPayrollShuffler?: boolean
    isPayrollPizzaHut?: boolean
  } {
    const text = description.trim()

    for (const rule of MERCHANT_RULES) {
      if (rule.pattern.test(text)) {
        return {
          cleanMerchant: rule.cleanMerchant,
          category: rule.category,
          categorySource: 'rule',
          suggestedType: rule.suggestedType,
          isPayrollShuffler: rule.isPayrollShuffler,
          isPayrollPizzaHut: rule.isPayrollPizzaHut,
        }
      }
    }

    // Default classification if no rule matches
    return {
      cleanMerchant: text.length > 40 ? text.substring(0, 37) + '...' : text,
      category: 'otros',
      categorySource: 'rule',
    }
  }

  /**
   * Normalizes arbitrary date formats (YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, ISO) to YYYY-MM-DD.
   */
  public static normalizeDate(dateVal: string | Date): string {
    if (dateVal instanceof Date) {
      return dateVal.toISOString().split('T')[0]
    }

    const str = String(dateVal).trim()

    // Match DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0')
      const month = dmyMatch[2].padStart(2, '0')
      const year = dmyMatch[3]
      return `${year}-${month}-${day}`
    }

    // Match YYYY-MM-DD
    const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/)
    if (ymdMatch) {
      const year = ymdMatch[1]
      const month = ymdMatch[2].padStart(2, '0')
      const day = ymdMatch[3].padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    try {
      const parsed = new Date(str)
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0]
      }
    } catch {
      // Fallback to today's date if unparseable
    }

    return new Date().toISOString().split('T')[0]
  }

  /**
   * Generates a deterministic external_transaction_id if none was provided by the provider.
   */
  public static generateFingerprint(accountId: string, date: string, amount: number, description: string): string {
    const raw = `${accountId}|${date}|${Math.round(amount * 100)}|${description.trim().toLowerCase()}`
    let hash = 0
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i)
      hash |= 0
    }
    return `tx-${Math.abs(hash).toString(36)}-${Math.abs(hash % 9999).toString(36)}`
  }

  /**
   * Normalizes raw transaction input into canonical BankTransaction structure.
   */
  public static normalize(
    input: RawBankTransactionInput,
    userId: string,
    accountId: string
  ): Omit<BankTransaction, 'id' | 'created_at' | 'updated_at'> {
    const date = this.normalizeDate(input.date)
    const rawAmt = input.amount

    let type: BankTransactionType = 'expense'
    if (input.rawType) {
      const rt = input.rawType.toLowerCase()
      if (rt.includes('abono') || rt.includes('credito') || rt.includes('ingreso') || rt.includes('consignacion')) {
        type = 'income'
      } else if (rt.includes('transferencia') || rt.includes('traslado')) {
        type = 'transfer'
      } else if (rt.includes('ajuste')) {
        type = 'adjustment'
      }
    } else if (rawAmt > 0 && String(input.rawType || '').toLowerCase().includes('in')) {
      type = 'income'
    } else if (rawAmt < 0) {
      type = 'expense'
    }

    const { cleanMerchant, category, categorySource, suggestedType } = this.categorizeDescription(input.description)

    if (suggestedType && (!input.rawType || input.rawType === 'unknown')) {
      type = suggestedType
    }

    const absAmount = Math.abs(rawAmt)
    const extId = input.externalId || this.generateFingerprint(accountId, date, absAmount, input.description)

    return {
      user_id: userId,
      account_id: accountId,
      external_transaction_id: extId,
      date,
      posted_at: new Date().toISOString(),
      description: input.description.trim(),
      clean_merchant: cleanMerchant,
      amount: absAmount,
      currency: input.currency || 'COP',
      transaction_type: type,
      category: input.category || category,
      category_source: categorySource,
      is_internal_transfer: type === 'transfer',
      linked_transaction_id: null,
      linked_income_id: null,
      linked_expense_id: null,
      is_reconciled: false,
      notes: null,
    }
  }

  /**
   * Helper that normalizes raw input and returns a complete canonical BankTransaction with id and timestamps.
   */
  public static normalizeRawTransaction(params: {
    externalId?: string
    date: string | Date
    description: string
    amount: number
    currency?: string
    accountId: string
    userId: string
    source?: string
  }): BankTransaction {
    const norm = this.normalize(
      {
        externalId: params.externalId,
        date: params.date,
        description: params.description,
        amount: params.amount,
        currency: params.currency,
      },
      params.userId,
      params.accountId
    )
    const now = new Date().toISOString()
    return {
      ...norm,
      id: `btx_${params.accountId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      created_at: now,
      updated_at: now,
    }
  }
}

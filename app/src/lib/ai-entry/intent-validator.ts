/**
 * NEXUS Finance — Intent Validator
 * =====================================================
 * Validates a PendingIntent against business rules and DB state
 * BEFORE any write is attempted.
 *
 * Rules enforced:
 * - amount > 0
 * - amount is an integer (no floats)
 * - date is valid ISO date
 * - category is a known NEXUS category
 * - account_id (if provided) belongs to the authenticated user
 * - operation type is in the allowed set
 * - no prohibited operations (trading, real bank transfers, crypto sends)
 */

import { KNOWN_CATEGORIES } from '@/types/ai-entry'
import type { EntryLineItem, ExpenseLineItem, IncomeLineItem, InternalTransferLineItem } from '@/types/ai-entry'
import type { Account } from '@/types'

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

const ALLOWED_OPERATION_TYPES = new Set(['EXPENSE', 'INCOME', 'INTERNAL_TRANSFER', 'ACCOUNT_ADJUSTMENT'])

export function validateIntent(
  operations: EntryLineItem[],
  userAccountIds: string[]
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!operations || operations.length === 0) {
    return { valid: false, errors: ['No hay operaciones que validar.'], warnings: [] }
  }

  for (let i = 0; i < operations.length; i++) {
    const op = operations[i]
    const prefix = `Operación ${i + 1} (${op.type})`

    // ── Type check ──────────────────────────────────────────
    if (!ALLOWED_OPERATION_TYPES.has(op.type)) {
      errors.push(`${prefix}: Tipo de operación no permitido.`)
      continue
    }

    // ── Amount validation ────────────────────────────────────
    if (typeof op.amount !== 'number' || isNaN(op.amount)) {
      errors.push(`${prefix}: El monto no es un número válido.`)
      continue
    }
    if (op.amount <= 0) {
      errors.push(`${prefix}: El monto debe ser mayor a cero. Recibido: ${op.amount}`)
    }
    if (!Number.isInteger(op.amount)) {
      warnings.push(`${prefix}: El monto no es entero (${op.amount}). Se redondeará a ${Math.round(op.amount)}.`)
    }

    // ── Date validation ──────────────────────────────────────
    if (!op.date || !/^\d{4}-\d{2}-\d{2}$/.test(op.date)) {
      errors.push(`${prefix}: Fecha inválida "${op.date}". Formato esperado: YYYY-MM-DD.`)
    } else {
      const d = new Date(op.date)
      if (isNaN(d.getTime())) {
        errors.push(`${prefix}: Fecha "${op.date}" no es una fecha real.`)
      }
      // Don't allow future dates more than 1 day ahead (prevent user error)
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      if (d > tomorrow) {
        warnings.push(`${prefix}: La fecha "${op.date}" está en el futuro. ¿Es correcta?`)
      }
    }

    // ── Description ──────────────────────────────────────────
    if (!op.description || op.description.trim().length === 0) {
      errors.push(`${prefix}: La descripción no puede estar vacía.`)
    }
    if (op.description && op.description.length > 500) {
      errors.push(`${prefix}: La descripción es demasiado larga (máximo 500 caracteres).`)
    }

    // ── Type-specific validations ────────────────────────────
    if (op.type === 'EXPENSE') {
      const exp = op as ExpenseLineItem
      if (!KNOWN_CATEGORIES.includes(exp.category_name as typeof KNOWN_CATEGORIES[number])) {
        warnings.push(`${prefix}: Categoría "${exp.category_name}" no reconocida. Se usará "otros".`)
      }
      if (exp.account_id && !userAccountIds.includes(exp.account_id)) {
        errors.push(`${prefix}: La cuenta "${exp.account_id}" no pertenece al usuario autenticado.`)
      }
    }

    if (op.type === 'INCOME') {
      const inc = op as IncomeLineItem
      if (!inc.source || inc.source.trim().length === 0) {
        errors.push(`${prefix}: El ingreso debe tener una fuente definida.`)
      }
      if (inc.account_id && !userAccountIds.includes(inc.account_id)) {
        errors.push(`${prefix}: La cuenta "${inc.account_id}" no pertenece al usuario autenticado.`)
      }
    }

    if (op.type === 'INTERNAL_TRANSFER') {
      const tr = op as InternalTransferLineItem
      if (tr.from_account_id && !userAccountIds.includes(tr.from_account_id)) {
        errors.push(`${prefix}: La cuenta origen "${tr.from_account_id}" no pertenece al usuario autenticado.`)
      }
      if (tr.to_account_id && !userAccountIds.includes(tr.to_account_id)) {
        errors.push(`${prefix}: La cuenta destino "${tr.to_account_id}" no pertenece al usuario autenticado.`)
      }
      if (tr.from_account_id && tr.to_account_id && tr.from_account_id === tr.to_account_id) {
        errors.push(`${prefix}: La cuenta origen y destino no pueden ser la misma.`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Sanitize operations to ensure all amounts are integers and categories are valid.
 */
export function sanitizeOperations(operations: EntryLineItem[]): EntryLineItem[] {
  return operations.map((op) => {
    const sanitized = { ...op, amount: Math.round(op.amount) }
    if (sanitized.type === 'EXPENSE') {
      const exp = sanitized as ExpenseLineItem
      if (!KNOWN_CATEGORIES.includes(exp.category_name as typeof KNOWN_CATEGORIES[number])) {
        return { ...exp, category_name: 'otros' }
      }
    }
    return sanitized
  })
}

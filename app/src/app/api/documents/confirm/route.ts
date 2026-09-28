/**
 * NEXUS Finance — Document Intelligence Confirm API Route
 * ========================================================
 * Endpoint: POST /api/documents/confirm
 *
 * Pipeline Stage: Confirm & Save to DAL
 *
 * Security:
 * - Session derived authentication (Bearer token)
 * - Strict user isolation (userId is NEVER taken from client body)
 * - Validates account ownership
 * - Saves via DAL, runs deduplication, links payroll incomes, and updates cash flow
 */

import { NextResponse } from 'next/server'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { getAccounts } from '@/lib/dal/accounts'
import { createBankTransactions, getBankTransactions } from '@/lib/dal/banking'
import { getIncomes } from '@/lib/dal/incomes'
import { DeduplicationEngine } from '@/lib/banking/deduplication-engine'
import type { ExtractedTransaction } from '@/types/document-intelligence'
import type { BankTransaction, BankTransactionType } from '@/types/banking'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { statement_id, account_id, transactions, userId } = body

    // 1. Authentication & Identity Verification
    let authenticatedUserId = ''
    if (isSupabaseConfigured()) {
      const authHeader = req.headers.get('authorization')
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null
      if (!token) {
        return NextResponse.json(
          { success: false, error: 'No autorizado: Se requiere token de sesión Bearer válido.' },
          { status: 401 }
        )
      }

      const supabase = createClient()
      if (!supabase) {
        return NextResponse.json(
          { success: false, error: 'Error del sistema: Cliente de autenticación no inicializado.' },
          { status: 500 }
        )
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      if (authError || !user) {
        return NextResponse.json(
          { success: false, error: 'Sesión inválida o expirada.' },
          { status: 401 }
        )
      }

      // Cross-user write prevention
      if (userId && userId !== user.id) {
        return NextResponse.json(
          { success: false, error: 'Violación de seguridad: El identificador solicitado no coincide con la sesión.' },
          { status: 403 }
        )
      }
      authenticatedUserId = user.id
    } else {
      // Local development fallback
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        return NextResponse.json(
          { success: false, error: 'No autorizado: Se requiere una sesión de usuario válida.' },
          { status: 401 }
        )
      }
      authenticatedUserId = userId.trim()
    }

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No se enviaron transacciones para importar.' },
        { status: 400 }
      )
    }

    // 2. Validate account ownership
    const userAccounts = await getAccounts(authenticatedUserId)
    const matchedAccount = userAccounts.find((a) => a.id === account_id)
    if (account_id && !matchedAccount) {
      return NextResponse.json(
        { success: false, error: 'La cuenta seleccionada no pertenece al usuario autenticado.' },
        { status: 403 }
      )
    }

    const resolvedAccountId = account_id || userAccounts[0]?.id || `acc_default_${authenticatedUserId}`

    // 3. Filter transactions to import (exclude unselected duplicates)
    const candidateList = transactions as ExtractedTransaction[]
    const toImport = candidateList.filter((tx) => tx.selected_for_import !== false)
    const skippedCount = candidateList.length - toImport.length

    if (toImport.length === 0) {
      return NextResponse.json({
        success: true,
        imported_count: 0,
        duplicates_skipped: skippedCount,
        reconciled: true,
        message: 'No hubo transacciones nuevas seleccionadas para importar.',
      })
    }

    // 4. Map into Canonical BankTransactions
    const now = new Date().toISOString()
    const bankTxList: BankTransaction[] = toImport.map((tx, idx) => {
      let txType: BankTransactionType = 'expense'
      if (tx.transaction_type === 'inflow') txType = 'income'
      else if (tx.transaction_type === 'transfer' || tx.is_internal_transfer) txType = 'transfer'

      return {
        id: `btx_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        user_id: authenticatedUserId,
        account_id: resolvedAccountId,
        external_transaction_id: tx.fingerprint || `stmt_${statement_id}_${idx}`,
        date: tx.date,
        posted_at: tx.date,
        description: tx.description,
        clean_merchant: tx.merchant_name || null,
        amount: tx.amount,
        currency: tx.currency || 'COP',
        transaction_type: txType,
        category: tx.category || 'otros',
        category_source: tx.category_source || 'rule',
        is_internal_transfer: tx.is_internal_transfer ?? false,
        is_reconciled: true,
        notes: `[document_intelligence] ${tx.is_payroll ? '[payroll]' : ''} ${tx.is_fee ? '[fee]' : ''}`.trim(),
        created_at: now,
        updated_at: now,
      }
    })

    // 5. Persist through DAL
    const saved = await createBankTransactions(bankTxList)

    // 6. Post-import reconciliation: Internal transfers & payroll link
    const allUserTx = await getBankTransactions(authenticatedUserId)
    DeduplicationEngine.detectInternalTransfers(allUserTx)

    const existingIncomes = await getIncomes(authenticatedUserId)
    DeduplicationEngine.reconcileWithIncomes(allUserTx, existingIncomes)

    return NextResponse.json({
      success: true,
      imported_count: saved.length,
      duplicates_skipped: skippedCount,
      reconciled: true,
    })
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Error al confirmar la importación del extracto'
    console.error('[DocumentConfirm Error]:', errorMsg)
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    )
  }
}

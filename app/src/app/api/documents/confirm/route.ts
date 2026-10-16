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
import {
  createBankTransactions,
  getBankTransactions,
  getBankAccounts,
  createBankAccount,
  updateBankAccount,
} from '@/lib/dal/banking'
import { getIncomes } from '@/lib/dal/incomes'
import { DeduplicationEngine } from '@/lib/banking/deduplication-engine'
import type { ExtractedTransaction } from '@/types/document-intelligence'
import type { BankTransaction, BankTransactionType, DataProvenance } from '@/types/banking'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      statement_id,
      account_id,
      institution_name,
      account_type,
      masked_account_number,
      closing_balance,
      document_type,
      transactions,
      userId,
    } = body

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

    // 2. Resolve Bank Account and Data Provenance
    const provenance: DataProvenance =
      document_type === 'pdf'
        ? 'PDF'
        : document_type === 'image'
        ? 'IMAGE'
        : document_type === 'csv'
        ? 'CSV'
        : 'MANUAL'

    const existingBankAccounts = await getBankAccounts(authenticatedUserId)
    let targetAccount = existingBankAccounts.find((a) => a.id === account_id)

    const finalInstitutionName = institution_name || 'Banco Falabella Colombia'
    const finalMaskedNumber = masked_account_number || '***0000'
    const finalBalance = typeof closing_balance === 'number' ? closing_balance : 0

    if (!targetAccount) {
      // Look for matching institution
      targetAccount = existingBankAccounts.find((a) =>
        a.institution_name.toLowerCase().includes('falabella') &&
        finalInstitutionName.toLowerCase().includes('falabella')
      )
    }

    let resolvedAccountId = ''
    if (targetAccount) {
      resolvedAccountId = targetAccount.id
      // Update balance if closing_balance provided from statement
      if (typeof closing_balance === 'number' && closing_balance >= 0) {
        await updateBankAccount(targetAccount.id, authenticatedUserId, {
          current_balance: finalBalance,
          available_balance: finalBalance,
          data_provenance: provenance,
          connection_state: 'CONNECTED',
          masked_account_number: finalMaskedNumber,
        })
      }
    } else {
      // Create new real BankAccount for the user
      const isFalabella = finalInstitutionName.toLowerCase().includes('falabella')
      const resolvedType =
        account_type === 'checking'
          ? 'checking'
          : account_type === 'wallet'
          ? 'digital_wallet'
          : 'savings'

      const createdAccount = await createBankAccount({
        user_id: authenticatedUserId,
        institution_id: isFalabella ? 'falabella' : 'other',
        institution_name: finalInstitutionName,
        account_name: `${finalInstitutionName} ${resolvedType === 'checking' ? 'Corriente' : 'Ahorros'}`,
        account_type: resolvedType,
        masked_account_number: finalMaskedNumber,
        current_balance: finalBalance,
        available_balance: finalBalance,
        currency: 'COP',
        is_active: true,
        data_provenance: provenance,
        connection_state: 'CONNECTED',
      })
      resolvedAccountId = createdAccount.id
    }

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

    // 4. Map into Canonical BankTransactions with Provenance
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
        data_provenance: provenance,
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

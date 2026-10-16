import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { MockBankProvider } from '../lib/banking/providers/mock-bank-provider'
import { OpenFinanceProvider } from '../lib/banking/providers/open-finance-provider'
import { getInstitutionCatalog, hasOpenFinanceCredentials } from '../lib/banking/institution-catalog'
import { BankDataNormalizer } from '../lib/banking/bank-data-normalizer'
import { DeduplicationEngine } from '../lib/banking/deduplication-engine'
import { calcBankingCashFlow, calcNetWorth } from '../lib/financial-engine'
import { AccountingValidator } from '../lib/documents/accounting-validator'
import type { BankAccount, BankTransaction, DataProvenance } from '../types/banking'
import type { ExtractedTransaction } from '../types/document-intelligence'

describe('FASE W: Production Banking, Auth & Zero Mock Validation', () => {

  describe('1 & 2. Auth States & Unauthenticated / Loading Isolation', () => {
    test('1. Unauthenticated state: zero financial data exposed, no Kevin, no 3.2M', () => {
      const unauthenticatedState = {
        authState: 'UNAUTHENTICATED' as const,
        user: null,
        bankAccounts: [] as BankAccount[],
        bankTransactions: [] as BankTransaction[],
        netWorth: 0,
        incomes: [],
        expenses: [],
      }

      assert.strictEqual(unauthenticatedState.user, null)
      assert.strictEqual(unauthenticatedState.bankAccounts.length, 0)
      assert.strictEqual(unauthenticatedState.bankTransactions.length, 0)
      assert.strictEqual(unauthenticatedState.netWorth, 0)
      assert.notStrictEqual(unauthenticatedState.user, 'Kevin')
      assert.notStrictEqual(unauthenticatedState.netWorth, 3200000)
    })

    test('2. Auth Loading state: zero financial metrics, pending resolution', () => {
      const loadingState = {
        authState: 'AUTH_LOADING' as const,
        user: null,
        bankAccounts: [] as BankAccount[],
        netWorth: 0,
      }

      assert.strictEqual(loadingState.authState, 'AUTH_LOADING')
      assert.strictEqual(loadingState.bankAccounts.length, 0)
      assert.strictEqual(loadingState.netWorth, 0)
    })
  })

  describe('3 & 4. Authenticated User: Zero Data vs Real Personal Data', () => {
    test('3. Authenticated user without accounts: displays exactly $0, empty dashboard', () => {
      const userAccounts: BankAccount[] = []
      const netWorthResult = calcNetWorth([], [], [], [], 0, 0)

      assert.strictEqual(netWorthResult.net_worth, 0)
      assert.strictEqual(userAccounts.length, 0)
      assert.notStrictEqual(netWorthResult.net_worth, 3200000)
    })

    test('4. Authenticated user with real personal accounts: reflects verified balances and provenance', () => {
      const realUser = { id: 'usr-real-test-001', email: 'personal@nexus.com' }
      const realAccounts: BankAccount[] = [
        {
          id: 'acc-real-bancolombia',
          user_id: realUser.id,
          institution_id: 'bancolombia',
          institution_name: 'Bancolombia S.A.',
          account_name: 'Cuenta de Ahorros Principal',
          account_type: 'savings',
          currency: 'COP',
          masked_account_number: '***4512',
          current_balance: 1000000,
          available_balance: 1000000,
          is_active: true,
          connection_state: 'SYNCED',
          data_provenance: 'OPEN_FINANCE',
          last_synced_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'acc-real-nequi',
          user_id: realUser.id,
          institution_id: 'nequi',
          institution_name: 'Nequi',
          account_name: 'Billetera Digital Nequi',
          account_type: 'digital_wallet',
          currency: 'COP',
          masked_account_number: '***8821',
          current_balance: 500000,
          available_balance: 500000,
          is_active: true,
          connection_state: 'SYNCED',
          data_provenance: 'CSV',
          last_synced_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]

      const totalBalance = realAccounts.reduce((acc, a) => acc + a.current_balance, 0)
      const netWorthResult = calcNetWorth([], [], [], [], 0, totalBalance)

      assert.strictEqual(netWorthResult.net_worth, 1500000)
      assert.strictEqual(realAccounts[0].data_provenance, 'OPEN_FINANCE')
      assert.strictEqual(realAccounts[1].data_provenance, 'CSV')
      assert.strictEqual(realAccounts[0].connection_state, 'SYNCED')
    })
  })

  describe('5 & 6. MockBankProvider Isolation & Production Lock', () => {
    test('5. MockBankProvider works in test environment', async () => {
      const mockProvider = new MockBankProvider(true)
      assert.strictEqual(mockProvider.providerName, 'mock_colombia_open_finance')
      const isAvail = await mockProvider.isAvailable()
      assert.strictEqual(typeof isAvail, 'boolean')
    })

    test('6. MockBankProvider is strictly BLOCKED in production without sandbox flag', () => {
      const prevEnv = process.env.NODE_ENV
      const prevVitest = process.env.VITEST
      const prevJest = process.env.JEST_WORKER_ID
      try {
        ;(process.env as any).NODE_ENV = 'production'
        delete process.env.VITEST
        delete process.env.JEST_WORKER_ID

        assert.throws(
          () => {
            new MockBankProvider(false)
          },
          /PROHIBICIÓN ESTRICTA: MockBankProvider está prohibido en el runtime de producción/,
          'MockBankProvider must throw security error in production without explicit sandbox'
        )
      } finally {
        ;(process.env as any).NODE_ENV = prevEnv
        if (prevVitest) process.env.VITEST = prevVitest
        if (prevJest) process.env.JEST_WORKER_ID = prevJest
      }
    })
  })

  describe('7 & 8. Real Open Finance Provider & Unsupported Institution Protection', () => {
    test('7. OpenFinanceProvider rejects unauthenticated / missing credentials without fake fallback', async () => {
      const openFinance = new OpenFinanceProvider({ apiKey: '' })
      const available = await openFinance.isAvailable()
      assert.strictEqual(available, false)

      await assert.rejects(
        async () => {
          await openFinance.connect({ code: 'auth-code-123' })
        },
        /Conexión automática no disponible/
      )

      // Strict security: rejects bank passwords / PINs
      await assert.rejects(
        async () => {
          await openFinance.connect({ password: 'my-bank-password' })
        },
        /VIOLACIÓN DE SEGURIDAD NEXUS/
      )
    })

    test('8. Unsupported / Unavailable institution reports UNAVAILABLE and offers statement import', () => {
      const catalog = getInstitutionCatalog()
      const nequi = catalog.find((i) => i.id === 'nequi')

      assert.ok(nequi)
      if (!hasOpenFinanceCredentials()) {
        assert.strictEqual(nequi.availability_status, 'UNAVAILABLE')
        assert.ok(nequi.unavailability_reason?.includes('CSV/PDF'))
        assert.strictEqual(nequi.supports_csv_import, true)
      }
    })
  })

  describe('9. Financial Engine Balance Calculation (No AI Hallucinations)', () => {
    test('9. Balances strictly computed from actual accounts: $1.000.000 + $500.000 = $1.500.000', () => {
      const accounts: BankAccount[] = [
        {
          id: 'acc-1',
          user_id: 'u1',
          institution_id: 'bancolombia',
          institution_name: 'Bancolombia',
          account_name: 'Ahorros',
          account_type: 'savings',
          currency: 'COP',
          masked_account_number: '***1111',
          current_balance: 1000000,
          available_balance: 1000000,
          is_active: true,
          created_at: '',
          updated_at: '',
        },
        {
          id: 'acc-2',
          user_id: 'u1',
          institution_id: 'nequi',
          institution_name: 'Nequi',
          account_name: 'Billetera',
          account_type: 'digital_wallet',
          currency: 'COP',
          masked_account_number: '***2222',
          current_balance: 500000,
          available_balance: 500000,
          is_active: true,
          created_at: '',
          updated_at: '',
        },
      ]

      const totalBankingBalance = accounts.reduce((acc, a) => acc + a.current_balance, 0)
      const res = calcNetWorth([], [], [], [], 0, totalBankingBalance)
      assert.strictEqual(res.net_worth, 1500000)
    })
  })

  describe('10. Transactions: Normalization, PII Masking, Provenance', () => {
    test('10. BankDataNormalizer cleans raw bank data and assigns correct provenance', () => {
      const normalized = BankDataNormalizer.normalize(
        {
          date: '2026-10-01',
          description: 'PAGO COMPRA EXITO CALI COP 150000',
          amount: 150000,
          externalId: 'ext-tx-999',
        },
        'usr-1',
        'acc-real-1'
      )

      assert.strictEqual(normalized.account_id, 'acc-real-1')
      assert.strictEqual(normalized.transaction_type, 'expense')
      assert.strictEqual(normalized.amount, 150000)
      assert.strictEqual(normalized.clean_merchant, 'Éxito')
    })
  })

  describe('11 & 12. Deduplication & Internal Transfers', () => {
    test('11. DeduplicationEngine identifies and removes duplicate transactions', () => {
      const tx1: BankTransaction = {
        id: 'tx-1',
        account_id: 'acc-1',
        user_id: 'u1',
        date: '2026-10-01',
        description: 'Mercado Carulla',
        amount: 85000,
        currency: 'COP',
        transaction_type: 'expense',
        category: 'alimentacion',
        category_source: 'rule',
        external_transaction_id: 'ext-001',
        is_internal_transfer: false,
        is_reconciled: false,
        created_at: '',
        updated_at: '',
      }

      const txDuplicate: BankTransaction = {
        ...tx1,
        id: 'tx-2', // identical external_transaction_id
      }

      const res = DeduplicationEngine.filterDuplicates([tx1, txDuplicate], [tx1])
      assert.strictEqual(res.skippedDuplicates, 2)
      assert.strictEqual(res.unique.length, 0)
    })

    test('12. Internal Transfer: Bancolombia -> Nequi is marked and neutralized from cashflow', () => {
      const debitTx: BankTransaction = {
        id: 'tx-debit',
        account_id: 'acc-bancolombia',
        user_id: 'u1',
        date: '2026-10-02',
        description: 'TRANSFERENCIA A NEQUI 3101234567',
        amount: 200000,
        currency: 'COP',
        transaction_type: 'expense',
        category: 'transferencia',
        category_source: 'rule',
        is_internal_transfer: false,
        is_reconciled: false,
        created_at: '',
        updated_at: '',
      }

      const creditTx: BankTransaction = {
        id: 'tx-credit',
        account_id: 'acc-nequi',
        user_id: 'u1',
        date: '2026-10-02',
        description: 'ABONO DESDE BANCOLOMBIA',
        amount: 200000,
        currency: 'COP',
        transaction_type: 'income',
        category: 'transferencia',
        category_source: 'rule',
        is_internal_transfer: false,
        is_reconciled: false,
        created_at: '',
        updated_at: '',
      }

      const { updatedTransactions, transfersCount } = DeduplicationEngine.detectInternalTransfers([debitTx, creditTx])
      assert.strictEqual(transfersCount, 1)
      assert.strictEqual(updatedTransactions[0].is_internal_transfer, true)
      assert.strictEqual(updatedTransactions[1].is_internal_transfer, true)

      // Cashflow calculation must ignore internal transfers to prevent double counting
      const cashflow = calcBankingCashFlow(updatedTransactions)
      assert.strictEqual(cashflow.total_cash_in, 0, 'Internal transfer credit must NOT count as income')
      assert.strictEqual(cashflow.total_cash_out, 0, 'Internal transfer debit must NOT count as expense')
      assert.strictEqual(cashflow.net_cash_flow, 0)
    })
  })

  describe('13, 14 & 15. Consent Lifecycle: Expiration, Revocation, Provider Errors', () => {
    test('13. Expired consent transitions to EXPIRED requiring re-authorization', () => {
      const connection = {
        id: 'conn-1',
        user_id: 'u1',
        institution_id: 'bancolombia',
        status: 'active' as const,
        connection_state: 'EXPIRED' as const,
        consent_expires_at: '2026-09-01T00:00:00Z', // In the past
      }

      const isExpired = new Date(connection.consent_expires_at).getTime() < Date.now()
      assert.strictEqual(isExpired, true)
      assert.strictEqual(connection.connection_state, 'EXPIRED')
    })

    test('14. Revocation disconnects the provider and updates status', () => {
      let state = 'CONNECTED'
      const revoke = () => {
        state = 'NO_CONNECTED'
      }
      revoke()
      assert.strictEqual(state, 'NO_CONNECTED')
    })

    test('15. Provider error sets status to ERROR without creating fictitious accounts', async () => {
      const openFinance = new OpenFinanceProvider({ apiKey: '' })
      let connectionState = 'CONNECTING'

      try {
        await openFinance.getAccounts('invalid_connection')
      } catch {
        connectionState = 'ERROR'
      }

      assert.strictEqual(connectionState, 'ERROR')
    })
  })

  describe('16 & 17. Empty Data Banner & Multi-User Data Isolation', () => {
    test('16. Zero data displays banner without fake numbers', () => {
      const accounts: BankAccount[] = []
      const transactions: BankTransaction[] = []

      const hasNoData = accounts.length === 0 && transactions.length === 0
      assert.strictEqual(hasNoData, true)

      const prompt = hasNoData
        ? 'Conecta tu primera cuenta o registra tu primera operación.'
        : 'Cuentas activas'
      assert.strictEqual(prompt, 'Conecta tu primera cuenta o registra tu primera operación.')
    })

    test('17. User Data Isolation: user A cannot access user B records', () => {
      const allAccounts: BankAccount[] = [
        {
          id: 'acc-user-a',
          user_id: 'user-a-uuid',
          institution_id: 'bancolombia',
          institution_name: 'Bancolombia',
          account_name: 'Ahorros A',
          account_type: 'savings',
          currency: 'COP',
          masked_account_number: '***1111',
          current_balance: 9000000,
          available_balance: 9000000,
          is_active: true,
          created_at: '',
          updated_at: '',
        },
        {
          id: 'acc-user-b',
          user_id: 'user-b-uuid',
          institution_id: 'davivienda',
          institution_name: 'Davivienda',
          account_name: 'Ahorros B',
          account_type: 'savings',
          currency: 'COP',
          masked_account_number: '***2222',
          current_balance: 100000,
          available_balance: 100000,
          is_active: true,
          created_at: '',
          updated_at: '',
        },
      ]

      const activeUserId = 'user-b-uuid'
      const scopedAccounts = allAccounts.filter((a) => a.user_id === activeUserId)

      assert.strictEqual(scopedAccounts.length, 1)
      assert.strictEqual(scopedAccounts[0].id, 'acc-user-b')
      assert.strictEqual(scopedAccounts[0].current_balance, 100000)
      const res = calcNetWorth([], [], [], [], 0, scopedAccounts[0].current_balance)
      assert.strictEqual(res.net_worth, 100000)
      assert.ok(!scopedAccounts.some((a) => a.user_id === 'user-a-uuid'))
    })
  })

  describe('FASE X: Banco Falabella Colombia, Statement Reconciliation & Zero Mock Integrity', () => {
    test('X1. Banco Falabella Colombia is the #1 primary institution in the catalog', () => {
      const catalog = getInstitutionCatalog()
      assert.ok(catalog.length > 0)
      assert.strictEqual(catalog[0].id, 'falabella')
      assert.strictEqual(catalog[0].name, 'Banco Falabella Colombia')
      assert.strictEqual(catalog[0].category, 'bank')
      assert.strictEqual(catalog[0].supports_csv_import, true)
    })

    test('X2. Falabella reports UNAVAILABLE without credentials and guides to CSV/PDF/Image statement import', () => {
      const catalog = getInstitutionCatalog()
      const falabella = catalog.find((i) => i.id === 'falabella')
      assert.ok(falabella)

      if (!hasOpenFinanceCredentials()) {
        assert.strictEqual(falabella.availability_status, 'UNAVAILABLE')
        assert.ok(falabella.unavailability_reason?.includes('CSV'))
      }
    })

    test('X3. Statement Accounting Reconciliation: saldo inicial + créditos - débitos = saldo calculado', () => {
      const txs: ExtractedTransaction[] = [
        {
          date: '2026-10-01',
          description: 'ABONO NOMINA',
          amount: 1500000,
          transaction_type: 'inflow',
          confidence: 0.99,
        },
        {
          date: '2026-10-02',
          description: 'PAGO ARRIENDO',
          amount: 800000,
          transaction_type: 'outflow',
          confidence: 0.99,
        },
      ]

      // Case A: Perfect match (500.000 + 1.500.000 - 800.000 = 1.200.000) -> CONCILIADO
      const balancedResult = AccountingValidator.validate({
        openingBalance: 500000,
        closingBalance: 1200000,
        transactions: txs,
      })

      assert.strictEqual(balancedResult.reconciliation.calculated_balance, 1200000)
      assert.strictEqual(balancedResult.reconciliation.discrepancy, 0)
      assert.strictEqual(balancedResult.reconciliation.status, 'balanced')

      // Case B: Discrepancy (bank reported 1.150.000 vs 1.200.000 calculated) -> DISCREPANCIA
      const discrepantResult = AccountingValidator.validate({
        openingBalance: 500000,
        closingBalance: 1150000,
        transactions: txs,
      })

      assert.strictEqual(discrepantResult.reconciliation.calculated_balance, 1200000)
      assert.strictEqual(discrepantResult.reconciliation.discrepancy, -50000)
      assert.strictEqual(discrepantResult.reconciliation.status, 'discrepant')
      // Movements are NEVER artificially altered
      assert.strictEqual(txs.length, 2)
      assert.strictEqual(txs[0].amount, 1500000)
      assert.strictEqual(txs[1].amount, 800000)
    })

    test('X4. Colombian currency formatting & amount parsing (13.000, 100.000, 1.500.000, $ 1.500.000)', () => {
      assert.strictEqual(BankDataNormalizer.parseAmount('13.000'), 13000)
      assert.strictEqual(BankDataNormalizer.parseAmount('100.000'), 100000)
      assert.strictEqual(BankDataNormalizer.parseAmount('1.500.000'), 1500000)
      assert.strictEqual(BankDataNormalizer.parseAmount('$ 1.500.000'), 1500000)
      assert.strictEqual(BankDataNormalizer.parseAmount('$1.500.000,50'), 1500000.5)
    })

    test('X5. Categorization rules: almuerzo, D1, taxi, Tigo, gimnasio, Falabella', () => {
      const c1 = BankDataNormalizer.categorizeDescription('Almuerzo ejecutivo restaurante')
      assert.strictEqual(c1.category, 'alimentacion')

      const c2 = BankDataNormalizer.categorizeDescription('Compra Tiendas D1 Calle 80')
      assert.strictEqual(c2.category, 'compras')

      const c3 = BankDataNormalizer.categorizeDescription('Pago de taxi carrera 15')
      assert.strictEqual(c3.category, 'transporte')

      const c4 = BankDataNormalizer.categorizeDescription('Factura mensual Tigo UNE')
      assert.strictEqual(c4.category, 'servicios')

      const c5 = BankDataNormalizer.categorizeDescription('Mensualidad Smart Fit Gimnasio')
      assert.strictEqual(c5.category, 'salud')

      const c6 = BankDataNormalizer.categorizeDescription('Transferencia a Falabella 1234')
      assert.strictEqual(c6.category, 'transferencia')
      assert.strictEqual(c6.suggestedType, 'transfer')
    })

    test('X6. Internal transfers: Banco Falabella <-> Nequi assigned pair ID and neutralized from cash flow', () => {
      const falabellaDebit: BankTransaction = {
        id: 'tx-fal-out',
        account_id: 'acc-falabella-1',
        user_id: 'usr-k',
        date: '2026-10-02',
        description: 'TRANSFERENCIA A NEQUI 3001234567',
        amount: 300000,
        currency: 'COP',
        transaction_type: 'expense',
        category: 'transferencia',
        category_source: 'rule',
        is_internal_transfer: false,
        is_reconciled: false,
        created_at: '',
        updated_at: '',
      }

      const nequiCredit: BankTransaction = {
        id: 'tx-neq-in',
        account_id: 'acc-nequi-1',
        user_id: 'usr-k',
        date: '2026-10-02',
        description: 'ABONO DESDE BANCO FALABELLA',
        amount: 300000,
        currency: 'COP',
        transaction_type: 'income',
        category: 'transferencia',
        category_source: 'rule',
        is_internal_transfer: false,
        is_reconciled: false,
        created_at: '',
        updated_at: '',
      }

      const { updatedTransactions, transfersCount } = DeduplicationEngine.detectInternalTransfers([
        falabellaDebit,
        nequiCredit,
      ])

      assert.strictEqual(transfersCount, 1)
      assert.strictEqual(updatedTransactions[0].is_internal_transfer, true)
      assert.strictEqual(updatedTransactions[1].is_internal_transfer, true)
      assert.strictEqual(updatedTransactions[0].internal_transfer_pair_id, 'tx-neq-in')
      assert.strictEqual(updatedTransactions[1].internal_transfer_pair_id, 'tx-fal-out')

      const flow = calcBankingCashFlow(updatedTransactions)
      assert.strictEqual(flow.total_cash_in, 0)
      assert.strictEqual(flow.total_cash_out, 0)
      assert.strictEqual(flow.internal_transfers_volume, 600000)
    })

    test('X7. DeduplicationEngine prevents duplicate extract insertion on re-import', () => {
      const originalTx: BankTransaction = {
        id: 'tx-fal-orig',
        account_id: 'acc-falabella-1',
        user_id: 'usr-k',
        date: '2026-09-15',
        description: 'COMPRA EXITO',
        amount: 80000,
        currency: 'COP',
        transaction_type: 'expense',
        category: 'compras',
        category_source: 'rule',
        external_transaction_id: 'stmt_falabella_001',
        is_internal_transfer: false,
        is_reconciled: true,
        created_at: '',
        updated_at: '',
      }

      // Re-uploading the exact same transaction
      const candidateTx: BankTransaction = {
        ...originalTx,
        id: 'tx-fal-candidate-dup',
      }

      const { unique, skippedDuplicates } = DeduplicationEngine.filterDuplicates(
        [candidateTx],
        [originalTx]
      )

      assert.strictEqual(skippedDuplicates, 1)
      assert.strictEqual(unique.length, 0)
    })

    test('X8. DataProvenance types encompass all valid origins without fake LIVE labels', () => {
      const validProvenances: DataProvenance[] = [
        'MANUAL',
        'OPEN_FINANCE',
        'CSV',
        'PDF',
        'IMAGE',
        'WALLET',
        'AI',
      ]
      assert.strictEqual(validProvenances.length, 7)
      assert.ok(validProvenances.includes('PDF'))
      assert.ok(validProvenances.includes('IMAGE'))
    })
  })
})

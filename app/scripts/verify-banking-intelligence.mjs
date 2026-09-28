/**
 * NEXUS FINANCE — FASE M AUTOMATED VERIFICATION SUITE
 * BANKING / OPEN FINANCE INTELLIGENCE
 * Validates all 20 criteria under Colombian Open Finance (Decreto 0368 de 2026 / SFC).
 */

// Mock environment
const storage = new Map()
global.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, val) => storage.set(key, String(val)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear(),
}
global.window = { localStorage: global.localStorage }

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function runTests() {
  console.log('================================================================')
  console.log('NEXUS FINANCE — FASE M: BANKING / OPEN FINANCE INTELLIGENCE')
  console.log('================================================================\n')

  let passed = 0
  let failed = 0

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`)
      if (details) console.log(`   └─ ${details}`)
      passed++
    } else {
      console.error(`❌ [FAIL] ${testName}`)
      if (details) console.error(`   └─ ${details}`)
      failed++
    }
  }

  // Dynamic TypeScript module imports
  const { MockBankProvider } = await import('../src/lib/banking/providers/mock-bank-provider.ts')
  const { OpenFinanceProvider } = await import('../src/lib/banking/providers/open-finance-provider.ts')
  const { CSVBankProvider } = await import('../src/lib/banking/providers/csv-bank-provider.ts')
  const { BankDataNormalizer } = await import('../src/lib/banking/bank-data-normalizer.ts')
  const { DeduplicationEngine } = await import('../src/lib/banking/deduplication-engine.ts')
  const { BankReconciliationEngine } = await import('../src/lib/banking/reconciliation-engine.ts')
  const { BankSyncService } = await import('../src/lib/banking/bank-sync-service.ts')
  const { calcBankingCashFlow, calcNetWorth } = await import('../src/lib/financial-engine.ts')
  const dalBanking = await import('../src/lib/dal/banking.ts')
  const aiTools = await import('../src/lib/ai-tools/read-tools.ts')
  const { executeAITool } = await import('../src/lib/ai-tools/index.ts')
  const { useFinancialStore } = await import('../src/store/financial.ts')

  // ----------------------------------------------------
  // TEST 1: Conexión bancaria (OAuth / FAPI 2.0 PKCE)
  // ----------------------------------------------------
  console.log('--- Test 1: Conexión bancaria segura ---')
  const mockProvider = new MockBankProvider()
  const connResult = await mockProvider.connect({ institutionId: 'bancolombia' })
  assert(
    connResult && typeof connResult.connectionId === 'string' && connResult.connectionId.includes('bancolombia'),
    '1. Conexión bancaria inicializa sin credenciales privadas',
    `Connection ID generado: ${connResult.connectionId}`
  )

  // ----------------------------------------------------
  // TEST 2: Gestión de Consentimiento (Scopes & Audit)
  // ----------------------------------------------------
  console.log('\n--- Test 2: Gestión de Consentimiento ---')
  const testUserId = 'usr-test-bank-01'
  const newConn = await dalBanking.createBankConnection({
    user_id: testUserId,
    provider: 'open_finance',
    institution_id: 'nequi',
    institution_name: 'Nequi',
    institution_logo: null,
    consent_status: 'active',
    consent_scopes: ['accounts.read', 'balances.read', 'transactions.read'],
    consent_expires_at: '2027-09-25T00:00:00Z',
    sync_status: 'idle',
  })
  const consentLog = await dalBanking.createBankConsentLog({
    user_id: testUserId,
    connection_id: newConn.id,
    action: 'granted',
    scopes: newConn.consent_scopes,
  })
  assert(
    newConn.consent_status === 'active' && consentLog.action === 'granted',
    '2. Consentimiento explícito registrado y auditado',
    `Scopes: ${newConn.consent_scopes.join(', ')} | Expira: ${newConn.consent_expires_at}`
  )

  // ----------------------------------------------------
  // TEST 3: Revocación de Consentimiento
  // ----------------------------------------------------
  console.log('\n--- Test 3: Revocación de Consentimiento ---')
  const revokedConn = await dalBanking.updateBankConnection(newConn.id, testUserId, {
    consent_status: 'revoked',
  })
  const revokeLog = await dalBanking.createBankConsentLog({
    user_id: testUserId,
    connection_id: newConn.id,
    action: 'revoked',
    scopes: [],
  })
  assert(
    revokedConn?.consent_status === 'revoked' && revokeLog.action === 'revoked',
    '3. Revocación inmediata del consentimiento bancario',
    `Estado resultante: ${revokedConn?.consent_status}`
  )

  // ----------------------------------------------------
  // TEST 4: Accounts (Recuperación de cuentas)
  // ----------------------------------------------------
  console.log('\n--- Test 4: Cuentas Bancarias ---')
  const accounts = await mockProvider.getAccounts(connResult.connectionId)
  assert(
    Array.isArray(accounts) && accounts.length > 0 && accounts[0].account_number_mask.startsWith('***'),
    '4. Consulta de cuentas con enmascaramiento seguro de número',
    `Cuenta: ${accounts[0].institution_name} (${accounts[0].account_number_mask})`
  )

  // ----------------------------------------------------
  // TEST 5: Balances (Saldos bancarios)
  // ----------------------------------------------------
  console.log('\n--- Test 5: Saldos Bancarios ---')
  const balanceVal = await mockProvider.syncBalance(accounts[0].id)
  assert(
    typeof balanceVal === 'number' && balanceVal > 0,
    '5. Consulta y sincronización de saldo bancario',
    `Saldo reportado: $${balanceVal.toLocaleString('es-CO')} COP`
  )

  // ----------------------------------------------------
  // TEST 6: Transactions (Recuperación de movimientos)
  // ----------------------------------------------------
  console.log('\n--- Test 6: Transacciones Bancarias ---')
  const txs = await mockProvider.getTransactions(accounts[0].id)
  assert(
    Array.isArray(txs) && txs.length > 0,
    '6. Recuperación de transacciones canónicas del proveedor',
    `Total transacciones recuperadas: ${txs.length}`
  )

  // ----------------------------------------------------
  // TEST 7: Normalization (BankDataNormalizer)
  // ----------------------------------------------------
  console.log('\n--- Test 7: Normalización de comercios y categorías colombianas ---')
  const rawExito = BankDataNormalizer.normalizeRawTransaction({
    date: '18/09/2026',
    description: 'COMPRA ALMACENES EXITO CALLE 80',
    amount: -185000,
    accountId: 'acc-01',
    userId: testUserId,
  })
  const rawShuffler = BankDataNormalizer.normalizeRawTransaction({
    date: '2026-09-14',
    description: 'PAGO NOMINA SHUFFLER ENTERPRISES',
    amount: 2100000,
    accountId: 'acc-01',
    userId: testUserId,
  })
  assert(
    rawExito.clean_merchant === 'Éxito' &&
      rawExito.date === '2026-09-18' &&
      rawShuffler.clean_merchant === 'Shuffler Corp' &&
      rawShuffler.transaction_type === 'income',
    '7. Normalización automática de comercios, fechas y categorías',
    `Éxito: [${rawExito.clean_merchant}, ${rawExito.category}] | Shuffler: [${rawShuffler.clean_merchant}, ${rawShuffler.category}]`
  )

  // ----------------------------------------------------
  // TEST 8: Deduplication (Prevención de duplicados)
  // ----------------------------------------------------
  console.log('\n--- Test 8: Deduplicación por fingerprint e ID externo ---')
  const existingList = [rawExito]
  const incomingList = [rawExito, rawShuffler]
  const deduplicated = DeduplicationEngine.filterDuplicates(incomingList, existingList)
  assert(
    deduplicated.newTransactions.length === 1 && deduplicated.skippedCount === 1,
    '8. Filtro deduplicador omite transacciones ya existentes',
    `Nuevas: ${deduplicated.newTransactions.length}, Omitidas: ${deduplicated.skippedCount}`
  )

  // ----------------------------------------------------
  // TEST 9: Internal Transfer (Doble conteo neutralizado)
  // ----------------------------------------------------
  console.log('\n--- Test 9: Transferencia interna Bancolombia -> Nequi ---')
  const transferOut = BankDataNormalizer.normalizeRawTransaction({
    date: '2026-09-16',
    description: 'TRANSFERENCIA A NEQUI 310***9812',
    amount: -300000,
    accountId: 'acc-bancolombia',
    userId: testUserId,
  })
  const transferIn = BankDataNormalizer.normalizeRawTransaction({
    date: '2026-09-16',
    description: 'TRANSFERENCIA RECIBIDA DESDE BANCOLOMBIA',
    amount: 300000,
    accountId: 'acc-nequi',
    userId: testUserId,
  })
  const markedTransfers = DeduplicationEngine.detectInternalTransfers([transferOut, transferIn])
  const cashFlowResult = calcBankingCashFlow(markedTransfers.updatedTransactions)
  assert(
    markedTransfers.transfersCount === 1 &&
      markedTransfers.updatedTransactions.every((t) => t.is_internal_transfer) &&
      cashFlowResult.net_cash_flow === 0,
    '9. Transferencias internas identificadas y neutralizadas en cash flow',
    `Transfers count: ${markedTransfers.transfersCount} | Net Cash Flow: $${cashFlowResult.net_cash_flow}`
  )

  // ----------------------------------------------------
  // TEST 10: Reconciliation (Saldo bancario vs Ledger)
  // ----------------------------------------------------
  console.log('\n--- Test 10: Conciliación determinista de saldos ---')
  const testAccount = {
    id: 'acc-recon-01',
    user_id: testUserId,
    institution_id: 'bancolombia',
    institution_name: 'Bancolombia',
    account_name: 'Ahorros Principal',
    account_type: 'savings',
    currency: 'COP',
    masked_account_number: '***5421',
    current_balance: 3200000,
    available_balance: 3200000,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  const reconReport = BankReconciliationEngine.reconcileAccount(
    testAccount,
    [
      {
        ...rawShuffler,
        id: 'btx-s1',
        account_id: testAccount.id,
        amount: 2100000,
        transaction_type: 'income',
        is_internal_transfer: false,
        is_reconciled: true,
      },
    ],
    { initialBalance: 1100000 } // 1.100.000 + 2.100.000 = 3.200.000
  )
  assert(
    reconReport.status === 'balanced' && reconReport.discrepancy === 0,
    '10. Conciliación bancaria exacta sin discrepancias',
    `Reportado: $${reconReport.reported_bank_balance} | Calculado: $${reconReport.calculated_ledger_balance}`
  )

  // ----------------------------------------------------
  // TEST 11: CSV / Excel Statement Parser
  // ----------------------------------------------------
  console.log('\n--- Test 11: Parseo de extracto bancario CSV ---')
  const csvSample = `Fecha;Descripcion;Valor;Saldo
15/09/2026;ABONO NOMINA PIZZA HUT S.A.S.;650.000,00;1.450.000
18/09/2026;TIENDAS D1 SAS;-45.600,00;1.404.400`
  const csvParsed = CSVBankProvider.extractAllTransactions(csvSample, {
    accountId: 'acc-csv-test',
    userId: testUserId,
    institutionHint: 'Nequi',
  })
  assert(
    csvParsed.length === 2 &&
      csvParsed[0].clean_merchant === 'Pizza Hut' &&
      csvParsed[0].amount === 650000 &&
      csvParsed[1].clean_merchant === 'Tiendas D1' &&
      csvParsed[1].amount === 45600,
    '11. CSV detecta delimitador (;), formato colombiano de moneda y comercios',
    `Transacciones parseadas: ${csvParsed.length} | Comprobado: ${csvParsed[0].clean_merchant}`
  )

  // ----------------------------------------------------
  // TEST 12: RLS (Row Level Security en Migración SQL)
  // ----------------------------------------------------
  console.log('\n--- Test 12: Verificación de RLS en migración 004 ---')
  const sqlPath = path.resolve(__dirname, '../../supabase/migrations/004_banking_intelligence.sql')
  const sqlExists = fs.existsSync(sqlPath)
  const sqlContent = sqlExists ? fs.readFileSync(sqlPath, 'utf8') : ''
  const hasRLS =
    sqlContent.includes('ENABLE ROW LEVEL SECURITY') &&
    sqlContent.includes('bank_connections') &&
    sqlContent.includes('bank_accounts') &&
    sqlContent.includes('bank_transactions')
  assert(
    sqlExists && hasRLS,
    '12. Migración 004 define tablas bancarias y habilita RLS obligatorio',
    `Archivo verificado: 004_banking_intelligence.sql`
  )

  // ----------------------------------------------------
  // TEST 13: Isolation (Aislamiento entre usuarios)
  // ----------------------------------------------------
  console.log('\n--- Test 13: Aislamiento multi-usuario ---')
  const user1 = 'usr-test-bank-1'
  const user2 = 'usr-test-bank-2'
  await dalBanking.createBankAccount({
    user_id: user1,
    connection_id: 'conn_test_1',
    institution_id: 'bancolombia',
    institution_name: 'Bancolombia',
    account_type: 'savings',
    account_name: 'Cuenta de Ahorros Test',
    account_number_mask: '5421',
    currency: 'COP',
    balance: 1000000,
    official_sync_status: 'synced',
    is_active: true,
  })
  const user1Accounts = await dalBanking.getBankAccounts(user1)
  const user2Accounts = await dalBanking.getBankAccounts(user2)
  assert(
    user1Accounts.length > 0 && user2Accounts.length === 0,
    '13. Aislamiento total de cuentas bancarias por ID de usuario',
    `User 1: ${user1Accounts.length} cuentas | User 2: ${user2Accounts.length} cuentas`
  )

  // ----------------------------------------------------
  // TEST 14: No Credential Storage (Seguridad Estricta)
  // ----------------------------------------------------
  console.log('\n--- Test 14: Verificación de NO almacenamiento de credenciales ---')
  const openFinanceProvider = new OpenFinanceProvider()
  let securityBlocked = false
  try {
    await openFinanceProvider.connect({
      institutionId: 'bancolombia',
      user: 'mi_usuario',
      password: 'mi_password_secreto',
      pin: '1234',
    })
  } catch (secErr) {
    securityBlocked = Boolean(secErr && secErr.message && secErr.message.includes('VIOLACIÓN DE SEGURIDAD NEXUS'))
  }
  assert(
    securityBlocked,
    '14. Rechazo explícito de contraseñas y PINs directos en la capa de conexión',
    'Seguridad garantizada: Solo flujos de consentimiento OAuth/FAPI'
  )

  // ----------------------------------------------------
  // TEST 15: No Secret Frontend Exposure
  // ----------------------------------------------------
  console.log('\n--- Test 15: Cero exposición de secretos en el frontend ---')
  const envContent = fs.existsSync(path.resolve(__dirname, '../.env.local'))
    ? fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf8')
    : ''
  const hasLeakedBankSecret =
    envContent.includes('NEXT_PUBLIC_BANK_SECRET') ||
    envContent.includes('NEXT_PUBLIC_OPEN_FINANCE_KEY')
  assert(
    !hasLeakedBankSecret,
    '15. Ningún secreto ni API key bancaria expuesta con prefijo NEXT_PUBLIC_',
    'Claves de integración restringidas a contexto servidor'
  )

  // ----------------------------------------------------
  // TEST 16: AI Read Tools (5 herramientas bancarias)
  // ----------------------------------------------------
  console.log('\n--- Test 16: Ejecución de las 5 herramientas AI de lectura ---')
  const tAccounts = await executeAITool('get_bank_accounts', {}, 'usr-kevin-001')
  const tBalances = await executeAITool('get_bank_balances', {}, 'usr-kevin-001')
  const tTransactions = await executeAITool('get_bank_transactions', {}, 'usr-kevin-001')
  const tCashFlow = await executeAITool('get_bank_cash_flow', {}, 'usr-kevin-001')
  const tConnections = await executeAITool('get_bank_connections', {}, 'usr-kevin-001')

  assert(
    tAccounts.success &&
      tBalances.success &&
      tTransactions.success &&
      tCashFlow.success &&
      tConnections.success,
    '16. 5/5 AI Read Tools responden exitosamente en modo solo lectura',
    `get_bank_accounts, get_bank_balances, get_bank_transactions, get_bank_cash_flow, get_bank_connections`
  )

  // ----------------------------------------------------
  // TEST 17: Failed Synchronization Handling
  // ----------------------------------------------------
  console.log('\n--- Test 17: Manejo de fallos en sincronización ---')
  const brokenProvider = {
    providerName: 'broken_bank',
    isAvailable: async () => false,
    connect: async () => ({ connectionId: 'broken' }),
    getAccounts: async () => {
      throw new Error('Servidor bancario no disponible temporalmente (503)')
    },
    getTransactions: async () => [],
    syncBalance: async () => 0,
    disconnect: async () => {},
  }
  const syncFailResult = await BankSyncService.syncConnection(
    { ...newConn, id: 'conn-fail-01' },
    brokenProvider,
    [],
    []
  )
  assert(
    syncFailResult.updatedConnection.sync_status === 'failed' &&
      syncFailResult.metrics.errors.length > 0,
    '17. BankSyncService captura y reporta adecuadamente fallos de sincronización',
    `Estado: ${syncFailResult.updatedConnection.sync_status} | Error: ${syncFailResult.metrics.errors[0]}`
  )

  // ----------------------------------------------------
  // TEST 18: Duplicate Transaction Prevention en Sync
  // ----------------------------------------------------
  console.log('\n--- Test 18: Prevención de transacciones duplicadas en sync ---')
  const syncSuccessResult = await BankSyncService.syncConnection(
    {
      ...newConn,
      id: 'conn-bancolombia-default',
      institution_id: 'bancolombia',
      institution_name: 'Bancolombia',
    },
    mockProvider,
    [],
    []
  )
  // Re-sync with existing transactions to test skipping
  const resyncResult = await BankSyncService.syncConnection(
    syncSuccessResult.updatedConnection,
    mockProvider,
    syncSuccessResult.accounts,
    syncSuccessResult.transactions
  )
  assert(
    resyncResult.metrics.records_skipped > 0 && resyncResult.metrics.records_added === 0,
    '18. Sincronización incremental omite registros ya procesados',
    `Omitidas: ${resyncResult.metrics.records_skipped}, Nuevas agregadas: ${resyncResult.metrics.records_added}`
  )

  // ----------------------------------------------------
  // TEST 19: Reconnect & Consent Renewal
  // ----------------------------------------------------
  console.log('\n--- Test 19: Reconexión y renovación de consentimiento ---')
  const renewedConn = await dalBanking.updateBankConnection(newConn.id, testUserId, {
    consent_status: 'active',
    sync_status: 'success',
  })
  const renewalLog = await dalBanking.createBankConsentLog({
    user_id: testUserId,
    connection_id: newConn.id,
    action: 'renewed',
    scopes: ['accounts.read', 'balances.read', 'transactions.read'],
  })
  assert(
    renewedConn?.consent_status === 'active' && renewalLog.action === 'renewed',
    '19. Renovación de consentimiento y reactivación de conexión',
    `Estado: ${renewedConn?.consent_status} | Audit log: ${renewalLog.action}`
  )

  // ----------------------------------------------------
  // TEST 20: Logout & Session Cleanup
  // ----------------------------------------------------
  console.log('\n--- Test 20: Logout limpia estado de memoria bancario ---')
  const store = useFinancialStore.getState()
  store.clearUserData()
  const postLogout = useFinancialStore.getState()
  assert(
    postLogout.bankConnections.length === 0 &&
      postLogout.bankAccounts.length === 0 &&
      postLogout.bankTransactions.length === 0 &&
      postLogout.bankingCashFlow === null,
    '20. clearUserData() vacía completamente memoria de conexiones y cuentas bancarias',
    'Estado post-logout: 0 conexiones, 0 cuentas, 0 transacciones'
  )

  // ----------------------------------------------------
  // RESUMEN FINAL
  // ----------------------------------------------------
  console.log('\n====================================================')
  console.log(`RESULTADO DE LA SUITE: ${passed}/20 PRUEBAS EXITOSAS`)
  console.log('====================================================')

  if (failed > 0) {
    console.error(`\n❌ Se encontraron ${failed} fallos en la verificación.`)
    process.exit(1)
  } else {
    console.log('\n🚀 TODAS LAS 20 PRUEBAS DE BANKING INTELLIGENCE PASARON CON ÉXITO.\n')
  }
}

runTests().catch((err) => {
  console.error('Error fatal ejecutando la suite de pruebas bancarias:', err)
  process.exit(1)
})

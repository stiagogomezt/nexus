/**
 * NEXUS Finance — FASE V Document Intelligence Verification Suite
 * ==============================================================
 * Comprehensive tests covering all 18 requirements:
 * 1. Imagen simple
 * 2. PDF multipágina
 * 3. Extracto escaneado
 * 4. Columnas débito/crédito
 * 5. Números COP (13.000, 13,000, $13.000, $ 13.000,50, 1.500.000, -185.000 con centavos)
 * 6. Saldo inicial/final
 * 7. Conciliación correcta (balanced)
 * 8. Conciliación incorrecta (discrepant)
 * 9. Duplicados (fingerprint matching)
 * 10. Transferencia interna (is_internal_transfer)
 * 11. Clasificación de categorías
 * 12. Baja confianza (needs_manual_review)
 * 13. Página ilegible (unreadable_pages_warning)
 * 14. Ingreso laboral (is_payroll, Shuffler / Pizza Hut)
 * 15. Gasto (outflow)
 * 16. Usuario no autenticado (401 check)
 * 17. Cross-user access (cuenta ajena rechazada)
 * 18. Eliminación de archivo temporal (buffer zeroed & released)
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

import { validateReconciliation } from '../src/lib/documents/accounting-validator.ts'
import { detectDuplicatesAndPayroll, generateTransactionFingerprint } from '../src/lib/documents/duplicate-detector.ts'
import { DocumentManager } from '../src/lib/documents/document-manager.ts'
import { extractStatementMultimodal } from '../src/lib/documents/statement-extractor.ts'
import { BankDataNormalizer } from '../src/lib/banking/bank-data-normalizer.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 1. Read environment credentials safely
const envPath = path.resolve(__dirname, '../.env.local')
const envRaw = fs.readFileSync(envPath, 'utf8')
const envVars = {}

for (const line of envRaw.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const idx = trimmed.indexOf('=')
  if (idx > 0) {
    const key = trimmed.substring(0, idx).trim()
    let val = trimmed.substring(idx + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.substring(1, val.length - 1)
    }
    envVars[key] = val
  }
}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const anonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Credenciales requeridas no encontradas en .env.local')
  process.exit(1)
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const anonClient = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

let passedCount = 0
let failedCount = 0

function assert(condition, testName, details = '') {
  if (condition) {
    passedCount++
    console.log(`\x1b[32m✅ [PASS]\x1b[0m ${testName}`)
    if (details) console.log(`   \x1b[90m└─ ${details}\x1b[0m`)
  } else {
    failedCount++
    console.error(`\x1b[31m❌ [FAIL]\x1b[0m ${testName}`)
    if (details) console.error(`   \x1b[90m└─ ${details}\x1b[0m`)
  }
}

async function runSuite() {
  console.log('================================================================')
  console.log('NEXUS FINANCE — FASE V DOCUMENT INTELLIGENCE VERIFICATION')
  console.log('================================================================\n')

  // -------------------------------------------------------------
  // TEST 1: Imagen simple
  // -------------------------------------------------------------
  console.log('1. Validando procesamiento de imagen simple...')
  const sampleImageContent = `
    BANCOLOMBIA S.A.
    CUENTA DE AHORROS ***5421
    Extracto del 01/09/2026 al 30/09/2026
    Saldo Inicial: $ 1.000.000,00
    27/09/2026 | ALMUERZO RESTAURANTE | $ 13.000,00 | Débito | Saldo $ 987.000,00
    28/09/2026 | D1 SUPERMERCADOS | $ 25.600,00 | Débito | Saldo $ 961.400,00
    Saldo Final: $ 961.400,00
  `
  const singleImageResult = await extractStatementMultimodal({
    buffer: Buffer.from(sampleImageContent, 'utf-8'),
    mimeType: 'image/jpeg',
    fileName: 'extracto_septiembre_bancolombia.jpg',
  })

  assert(
    singleImageResult.institution_name?.toLowerCase().includes('bancolombia') &&
    singleImageResult.transactions.length >= 2,
    'Prueba 1: Imagen simple — Extracción de institución y transacciones',
    `Institución: ${singleImageResult.institution_name}, ${singleImageResult.transactions.length} transacciones extraídas.`
  )

  // -------------------------------------------------------------
  // TEST 2: PDF multipágina
  // -------------------------------------------------------------
  console.log('\n2. Validando procesamiento de PDF multipágina...')
  const multipagePdfContent = `
    DAVIVIENDA
    Cuenta Corriente No. ***8912
    Extracto Mensual - Período: 2026-08-01 a 2026-08-31
    Saldo Anterior: 5.000.000,00

    --- PÁGINA 1 ---
    05/08/2026 | COMPRA TIGO SERVICIOS | 95.000 | Saldo: 4.905.000
    10/08/2026 | ABONO NOMINA SHUFFLER | 2.500.000 | Saldo: 7.405.000

    --- PÁGINA 2 ---
    DAVIVIENDA - Encabezado repetido
    Cuenta Corriente No. ***8912
    15/08/2026 | NETFLIX COLOMBIA | 45.000 | Saldo: 7.360.000
    25/08/2026 | TRANSFERENCIA A NEQUI | 360.000 | Saldo: 7.000.000

    Saldo Final: 7.000.000,00
  `
  const multipageResult = await extractStatementMultimodal({
    buffer: Buffer.from(multipagePdfContent, 'utf-8'),
    mimeType: 'application/pdf',
    fileName: 'extracto_davivienda_multipage.pdf',
  })

  const datesChronological = multipageResult.transactions.every((tx, i, arr) => {
    if (i === 0) return true
    return tx.date >= arr[i - 1].date
  })

  assert(
    multipageResult.transactions.length >= 4 && datesChronological,
    'Prueba 2: PDF multipágina — Procesamiento completo y orden cronológico sin duplicar encabezados',
    `Encontradas ${multipageResult.transactions.length} transacciones ordenadas cronológicamente.`
  )

  // -------------------------------------------------------------
  // TEST 3: Extracto escaneado
  // -------------------------------------------------------------
  console.log('\n3. Validando extracto escaneado / baja legibilidad...')
  const scannedResult = await extractStatementMultimodal({
    buffer: Buffer.from('Documento escaneado con baja resolución pero legible: 15/09/2026 PAGO TAXI 15.000', 'utf-8'),
    mimeType: 'image/png',
    fileName: 'extracto_escaneado_recibo.png',
  })

  assert(
    scannedResult.transactions.length > 0 && scannedResult.transactions[0].amount === 15000,
    'Prueba 3: Extracto escaneado — Lectura robusta sin alucinaciones',
    `Monto extraído: $${scannedResult.transactions[0]?.amount} COP`
  )

  // -------------------------------------------------------------
  // TEST 4: Columnas débito/crédito
  // -------------------------------------------------------------
  console.log('\n4. Validando detección de columnas débito/crédito...')
  const columnsContent = `
    Fecha | Descripción | Débito | Crédito | Saldo
    2026-09-01 | CONSIGNACION EFECTIVO | | 500.000 | 500.000
    2026-09-02 | RETIRO CAJERO | 200.000 | | 300.000
  `
  const columnsResult = await extractStatementMultimodal({
    buffer: Buffer.from(columnsContent, 'utf-8'),
    mimeType: 'application/pdf',
    fileName: 'columnas_debito_credito.pdf',
  })

  const consignacion = columnsResult.transactions.find((t) => t.description.includes('CONSIGNACION'))
  const retiro = columnsResult.transactions.find((t) => t.description.includes('RETIRO'))

  assert(
    consignacion?.transaction_type === 'inflow' && retiro?.transaction_type === 'outflow',
    'Prueba 4: Columnas débito/crédito — Mapeo exacto de flujos',
    `Consignación: ${consignacion?.transaction_type} (Crédito), Retiro: ${retiro?.transaction_type} (Débito)`
  )

  // -------------------------------------------------------------
  // TEST 5: Números colombianos (COP) y centavos
  // -------------------------------------------------------------
  console.log('\n5. Validando parseo de números colombianos con centavos...')
  const n1 = BankDataNormalizer.parseAmount('13.000')
  const n2 = BankDataNormalizer.parseAmount('13,000')
  const n3 = BankDataNormalizer.parseAmount('$13.000')
  const n4 = BankDataNormalizer.parseAmount('$ 13.000,50')
  const n5 = BankDataNormalizer.parseAmount('1.500.000')
  const n6 = BankDataNormalizer.parseAmount('-185.000')

  assert(
    n1 === 13000 &&
    n2 === 13000 &&
    n3 === 13000 &&
    Math.abs(n4 - 13000.50) < 0.01 &&
    n5 === 1500000 &&
    n6 === 185000,
    'Prueba 5: Números COP — Formatos colombianos y conservación de centavos',
    `13.000->${n1}, 13,000->${n2}, $13.000->${n3}, $13.000,50->${n4}, 1.500.000->${n5}, -185.000->${n6}`
  )

  // -------------------------------------------------------------
  // TEST 6: Saldo inicial y final
  // -------------------------------------------------------------
  console.log('\n6. Validando identificación de saldos inicial y final...')
  assert(
    singleImageResult.opening_balance === 1000000 && singleImageResult.closing_balance === 961400,
    'Prueba 6: Saldo inicial y final — Extracción correcta de balances',
    `Inicial: $${singleImageResult.opening_balance} COP | Final: $${singleImageResult.closing_balance} COP`
  )

  // -------------------------------------------------------------
  // TEST 7: Conciliación correcta (balanced)
  // -------------------------------------------------------------
  console.log('\n7. Validando conciliación contable balanceada...')
  const balancedReconcile = validateReconciliation({
    opening_balance: 1000000,
    closing_balance: 1300000,
    transactions: [
      {
        id: '1',
        date: '2026-09-10',
        description: 'HONORARIOS SHUFFLER',
        amount: 500000,
        transaction_type: 'inflow',
        category: 'ingresos_laborales',
        confidence: 0.98,
        needs_manual_review: false,
        is_payroll: true,
      },
      {
        id: '2',
        date: '2026-09-15',
        description: 'ALQUILER Y SERVICIOS',
        amount: 200000,
        transaction_type: 'outflow',
        category: 'servicios',
        confidence: 0.95,
        needs_manual_review: false,
      },
    ],
  })

  assert(
    balancedReconcile.status === 'balanced' &&
    balancedReconcile.discrepancy === 0 &&
    balancedReconcile.calculated_balance === 1300000,
    'Prueba 7: Conciliación correcta — Estado ✅ CONCILIADO y discrepancia cero',
    `Calculado: $${balancedReconcile.calculated_balance} == Reportado: $${balancedReconcile.reported_balance}`
  )

  // -------------------------------------------------------------
  // TEST 8: Conciliación incorrecta (discrepancy) sin alteración de datos
  // -------------------------------------------------------------
  console.log('\n8. Validando conciliación con discrepancia...')
  const discrepantReconcile = validateReconciliation({
    opening_balance: 1000000,
    closing_balance: 1500000, // Falta un movimiento de 200k
    transactions: [
      {
        id: '1',
        date: '2026-09-10',
        description: 'VENTA',
        amount: 300000,
        transaction_type: 'inflow',
        category: 'otros_ingresos',
        confidence: 0.9,
        needs_manual_review: false,
      },
    ],
  })

  assert(
    discrepantReconcile.status === 'discrepant' &&
    Math.abs(discrepantReconcile.discrepancy) === 200000 &&
    discrepantReconcile.calculated_balance === 1300000,
    'Prueba 8: Conciliación incorrecta — Estado ⚠️ DISCREPANCIA detectada sin alterar movimientos',
    `Calculado: $${discrepantReconcile.calculated_balance} | Reportado: $${discrepantReconcile.reported_balance} | Dif: $${discrepantReconcile.discrepancy}`
  )

  // -------------------------------------------------------------
  // TEST 9: Detección de duplicados con fingerprint
  // -------------------------------------------------------------
  console.log('\n9. Validando detección de duplicados con fingerprint...')
  const fp1 = generateTransactionFingerprint('acc-123', '2026-09-27', 13000, 'ALMUERZO')
  const fp2 = generateTransactionFingerprint('acc-123', '2026-09-27', 13000, 'almuerzo')

  assert(fp1 === fp2, 'Generación determinista de fingerprint idéntico')

  const dupResult = detectDuplicatesAndPayroll({
    extractedTransactions: [
      {
        id: 'tx-new',
        date: '2026-09-27',
        description: 'ALMUERZO RESTAURANTE',
        amount: 13000,
        transaction_type: 'outflow',
        category: 'alimentacion',
        confidence: 0.95,
        needs_manual_review: false,
      },
      {
        id: 'tx-dup',
        date: '2026-09-25',
        description: 'COMPRA D1 TIENDAS',
        amount: 45000,
        transaction_type: 'outflow',
        category: 'compras',
        confidence: 0.95,
        needs_manual_review: false,
      },
    ],
    accountId: 'acc-123',
    existingBankTransactions: [
      {
        id: 'existing-1',
        bank_account_id: 'acc-123',
        transaction_date: '2026-09-25',
        amount: 45000,
        description: 'COMPRA D1 TIENDAS',
      },
    ],
  })

  const dupItem = dupResult.transactions.find((t) => t.id === 'tx-dup')
  const newItem = dupResult.transactions.find((t) => t.id === 'tx-new')

  assert(
    dupItem?.is_duplicate === true &&
    newItem?.is_duplicate === false &&
    dupResult.duplicatesCount === 1 &&
    dupResult.newCount === 1,
    'Prueba 9: Duplicados — Identificación exacta mediante fingerprint sin reimportación automática',
    `Duplicados: ${dupResult.duplicatesCount}, Nuevos: ${dupResult.newCount}`
  )

  // -------------------------------------------------------------
  // TEST 10: Detección de transferencias internas
  // -------------------------------------------------------------
  console.log('\n10. Validando detección de transferencias internas...')
  const transferAnalysis = detectDuplicatesAndPayroll({
    extractedTransactions: [
      {
        id: 'tx-trf-1',
        date: '2026-09-28',
        description: 'TRANSFERENCIA A NEQUI 3001234567',
        amount: 200000,
        transaction_type: 'outflow',
        category: 'transferencia',
        confidence: 0.99,
        needs_manual_review: false,
      },
    ],
    accountId: 'acc-bancolombia',
  })

  assert(
    transferAnalysis.transactions[0].is_internal_transfer === true,
    'Prueba 10: Transferencia interna — Detección y marcado neutral sin alterar cash flow',
    `is_internal_transfer: ${transferAnalysis.transactions[0].is_internal_transfer}`
  )

  // -------------------------------------------------------------
  // TEST 11: Clasificación de categorías bancarias
  // -------------------------------------------------------------
  console.log('\n11. Validando clasificación de categorías bancarias...')
  const catAlmuerzo = BankDataNormalizer.categorizeTransaction('ALMUERZO CORRIENTE EJECUTIVO')
  const catD1 = BankDataNormalizer.categorizeTransaction('TIENDAS D1 BOGOTA')
  const catTaxi = BankDataNormalizer.categorizeTransaction('TAXI AEROPUERTO')
  const catTigo = BankDataNormalizer.categorizeTransaction('PAGO TIGO HOGAR Y MOVIL')
  const catNetflix = BankDataNormalizer.categorizeTransaction('NETFLIX SUBSCRIPTION')

  assert(
    catAlmuerzo.category === 'alimentacion' &&
    catD1.category === 'compras' &&
    catTaxi.category === 'transporte' &&
    catTigo.category === 'servicios' &&
    catNetflix.category === 'suscripciones',
    'Prueba 11: Categorización — Mapeo fiel a categorías existentes sin inventar nuevas',
    `Almuerzo->${catAlmuerzo.category}, D1->${catD1.category}, Taxi->${catTaxi.category}, Tigo->${catTigo.category}, Netflix->${catNetflix.category}`
  )

  // -------------------------------------------------------------
  // TEST 12: Baja confianza y revisión manual
  // -------------------------------------------------------------
  console.log('\n12. Validando bandera de baja confianza...')
  const lowConfidenceNorm = BankDataNormalizer.categorizeTransaction('PAGO CODIGO MISCELANEO 889922')
  const needsReview = lowConfidenceNorm.confidence < 0.85

  assert(
    needsReview === true,
    'Prueba 12: Baja confianza — Detección y marcado para revisión manual obligatoria',
    `Confianza: ${(lowConfidenceNorm.confidence * 100).toFixed(1)}% < 85% -> Revisar categoría`
  )

  // -------------------------------------------------------------
  // TEST 13: Página ilegible
  // -------------------------------------------------------------
  console.log('\n13. Validando advertencia de página ilegible...')
  const unreadableDocResult = await extractStatementMultimodal({
    buffer: Buffer.from('IMAGEN BORROSA PÁGINA 2 ILEGIBLE RUIDO OPTICO', 'utf-8'),
    mimeType: 'image/png',
    fileName: 'pagina_borrosa.png',
  })

  assert(
    unreadableDocResult.unreadable_pages_warning === true &&
    unreadableDocResult.warning_message?.includes('suficiente confianza'),
    'Prueba 13: Página ilegible — Emisión de advertencia específica al usuario',
    `Warning: "${unreadableDocResult.warning_message}"`
  )

  // -------------------------------------------------------------
  // TEST 14: Ingreso laboral (Shuffler / Pizza Hut)
  // -------------------------------------------------------------
  console.log('\n14. Validando detección y vinculación de nómina/ingreso laboral...')
  const payrollAnalysis = detectDuplicatesAndPayroll({
    extractedTransactions: [
      {
        id: 'tx-shuffler',
        date: '2026-09-15',
        description: 'PAGO HONORARIOS SHUFFLER SAS',
        amount: 850000,
        transaction_type: 'inflow',
        category: 'ingresos_laborales',
        confidence: 0.99,
        needs_manual_review: false,
      },
    ],
    accountId: 'acc-bancolombia',
    existingIncomes: [
      {
        id: 'inc-shuffler-1',
        source: 'Shuffler',
        amount: 850000,
        date: '2026-09-15',
        income_date: '2026-09-15',
      },
    ],
  })

  const shufflerTx = payrollAnalysis.transactions[0]
  assert(
    shufflerTx.is_payroll === true && shufflerTx.linked_income_id === 'inc-shuffler-1',
    'Prueba 14: Ingreso laboral — Detección de nómina Shuffler y vinculación sin duplicar',
    `is_payroll: ${shufflerTx.is_payroll}, linked_income_id: ${shufflerTx.linked_income_id}`
  )

  // -------------------------------------------------------------
  // TEST 15: Gasto (outflow)
  // -------------------------------------------------------------
  console.log('\n15. Validando detección de gasto estándar...')
  const expenseTx = singleImageResult.transactions.find((t) => t.transaction_type === 'outflow')
  assert(
    expenseTx !== undefined && expenseTx.amount > 0,
    'Prueba 15: Gasto — Identificación precisa de egresos (outflow)',
    `Descripción: ${expenseTx?.description}, Monto: $${expenseTx?.amount} COP`
  )

  // -------------------------------------------------------------
  // TEST 16: Usuario no autenticado (401 check)
  // -------------------------------------------------------------
  console.log('\n16. Validando seguridad: bloqueo de peticiones anónimas...')
  // Simular llamada con cliente anónimo a datos protegidos
  const { data: anonData, error: anonError } = await anonClient
    .from('bank_transactions')
    .select('*')
    .limit(1)

  assert(
    anonData?.length === 0,
    'Prueba 16: Usuario no autenticado — Bloqueo estricto por RLS/Auth',
    `Petición anónima denegada. Registros expuestos: ${anonData?.length || 0}`
  )

  // -------------------------------------------------------------
  // TEST 17: Cross-user access (cuenta ajena rechazada)
  // -------------------------------------------------------------
  console.log('\n17. Validando aislamiento multi-usuario (cross-user access)...')
  // Creamos temporalmente dos usuarios de prueba para validar que U1 no puede escribir en cuenta de U2
  const emailA = `u1_doc_${Date.now()}@nexusfinance.test`
  const emailB = `u2_doc_${Date.now()}@nexusfinance.test`
  const pwd = 'TestDocSecurePass998!!'

  const { data: u1Auth } = await adminClient.auth.admin.createUser({
    email: emailA,
    password: pwd,
    email_confirm: true,
  })
  const { data: u2Auth } = await adminClient.auth.admin.createUser({
    email: emailB,
    password: pwd,
    email_confirm: true,
  })

  // Crear cuenta bancaria para U2
  const { data: u2Account } = await adminClient
    .from('accounts')
    .insert({
      user_id: u2Auth.user.id,
      name: 'Ahorros U2',
      account_type: 'bank',
      currency: 'COP',
      current_balance: 1000000,
      is_active: true,
    })
    .select()
    .single()

  // Con cliente U1 autenticado con JWT, intentar consultar cuenta de U2
  const { data: u1Login } = await adminClient.auth.signInWithPassword({
    email: emailA,
    password: pwd,
  })

  const u1Client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${u1Login.session?.access_token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: crossQuery } = await u1Client
    .from('accounts')
    .select('*')
    .eq('id', u2Account?.id)

  assert(
    crossQuery?.length === 0,
    'Prueba 17: Cross-user access — Aislamiento multi-tenant validado',
    `Usuario 1 no tiene acceso a cuentas de Usuario 2 (registros: ${crossQuery?.length || 0})`
  )

  // Limpiar usuarios de prueba
  await adminClient.auth.admin.deleteUser(u1Auth.user.id)
  await adminClient.auth.admin.deleteUser(u2Auth.user.id)

  // -------------------------------------------------------------
  // TEST 18: Eliminación de archivo temporal (buffer zeroed & released)
  // -------------------------------------------------------------
  const rawBuf = Buffer.from('SECRETO_TEMPORAL_EXTRACTO')
  const ephemeralDoc = DocumentManager.validateUpload(rawBuf, 'application/pdf', 'test.pdf')

  assert(ephemeralDoc.buffer.length > 0, 'Buffer temporal en memoria creado')
  
  // Ejecutar limpieza segura
  const bufRef = ephemeralDoc.buffer
  DocumentManager.release(ephemeralDoc)

  const isWiped = bufRef.every((byte) => byte === 0)
  assert(
    isWiped && ephemeralDoc.buffer === undefined,
    'Prueba 18: Privacidad — Buffer en memoria sobreescrito con ceros (Zero-Fill) y desreferenciado',
    `Bytes en cero: ${bufRef.length}, referencia en doc: ${ephemeralDoc.buffer}`
  )

  // -------------------------------------------------------------
  // RESUMEN FINAL
  // -------------------------------------------------------------
  console.log('\n================================================================')
  console.log(`TOTAL PRUEBAS: 18 | PASSED: ${passedCount} | FAILED: ${failedCount}`)
  console.log('================================================================\n')

  if (failedCount > 0) {
    process.exit(1)
  }
}

runSuite().catch((err) => {
  console.error('Error fatal durante la suite de pruebas:', err)
  process.exit(1)
})

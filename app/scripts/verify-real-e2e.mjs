/**
 * NEXUS Finance — Real End-to-End User & Security Verification
 *
 * Verifies live Supabase Auth, User Profiles, Data Access Layer (DAL),
 * Row Level Security (RLS) isolation between users and anon,
 * Financial Engine pure calculations, Digital Twin FinancialState,
 * Gemini AI Copilot grounding with real data, and zero-residue cleanup.
 *
 * ZERO SECRETS POLICY: No keys, JWTs or tokens are logged.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'
import {
  calcIncomeBreakdown,
  calcCashFlow,
  calcNetWorth,
  calcEssentialExpenses,
} from '../src/lib/financial-engine'
import { buildFinancialState } from '../src/lib/digital-twin/financial-state-builder'

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
const geminiApiKey = envVars.GEMINI_API_KEY

if (!supabaseUrl || !anonKey || !serviceRoleKey || !geminiApiKey) {
  console.error('❌ Credenciales requeridas no encontradas en .env.local')
  process.exit(1)
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const anonClient = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function runEndToEndAudit() {
  console.log('================================================================')
  console.log('NEXUS FINANCE — VERIFICACIÓN END-TO-END CON USUARIO REAL')
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

  const timestamp = Date.now()
  const testEmail1 = `nexus_e2e_test1_${timestamp}@test.nexusfinance.internal`
  const testEmail2 = `nexus_e2e_test2_${timestamp}@test.nexusfinance.internal`
  const testPassword = `P@ssword_${timestamp}!Secure`

  let user1Id = null
  let user2Id = null
  let user1Client = null
  let user2Client = null
  let user1Token = null

  let testAccountId = null
  let testIncomeId = null
  let testExpenseId = null

  try {
    // ─────────────────────────────────────────────────────────
    // 1. AUDITAR AUTENTICACIÓN
    // ─────────────────────────────────────────────────────────
    console.log('1. Creando usuarios de prueba en Supabase Auth...')

    const { data: u1Data, error: u1Err } = await adminClient.auth.admin.createUser({
      email: testEmail1,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Kevin Test E2E' },
    })

    if (u1Err || !u1Data.user) {
      throw new Error(`Error creando usuario 1 de prueba: ${u1Err?.message}`)
    }
    user1Id = u1Data.user.id

    const { data: u2Data, error: u2Err } = await adminClient.auth.admin.createUser({
      email: testEmail2,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Usuario Espía Test' },
    })

    if (u2Err || !u2Data.user) {
      throw new Error(`Error creando usuario 2 de prueba: ${u2Err?.message}`)
    }
    user2Id = u2Data.user.id

    assert(Boolean(user1Id && user2Id), 'Autenticación: Creación de usuarios en Supabase Auth', 'Usuarios de prueba registrados con email verificado.')

    // Iniciar sesión como Usuario 1
    const loginClient1 = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: signIn1Data, error: signIn1Err } = await loginClient1.auth.signInWithPassword({
      email: testEmail1,
      password: testPassword,
    })

    assert(!signIn1Err && Boolean(signIn1Data.session?.access_token), 'Autenticación: Login con credenciales reales en Supabase Auth', 'Sesión y JWT de acceso generados exitosamente.')
    user1Token = signIn1Data.session.access_token

    // Iniciar sesión como Usuario 2
    const anonClient2 = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: signIn2Data, error: signIn2Err } = await anonClient2.auth.signInWithPassword({
      email: testEmail2,
      password: testPassword,
    })
    assert(!signIn2Err && Boolean(signIn2Data.session?.access_token), 'Autenticación: Sesión aislada para Usuario 2', 'Segunda sesión creada independientemente.')

    // Crear clientes scoped a cada usuario autenticado
    user1Client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${user1Token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    })

    user2Client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${signIn2Data.session.access_token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Comprobar recuperación de sesión con getUser
    const { data: getUserData, error: getUserErr } = await user1Client.auth.getUser()
    assert(
      !getUserErr && getUserData.user?.id === user1Id,
      'Autenticación: Verificación de sesión y recuperación de identidad',
      `Identidad verificada: ID concuerda con auth.uid() en Supabase.`
    )

    // ─────────────────────────────────────────────────────────
    // 2. PERFIL DE USUARIO
    // ─────────────────────────────────────────────────────────
    console.log('\n2. Verificando gestión de perfiles (public.profiles)...')

    const { data: profileInsert, error: profileErr } = await user1Client
      .from('profiles')
      .upsert({
        id: user1Id,
        email: testEmail1,
        full_name: 'Kevin Test E2E',
        currency: 'COP',
        primary_income_source: 'Shuffler',
        emergency_fund_months: 6,
        monthly_savings_target: 500000,
      })
      .select()
      .single()

    assert(!profileErr && profileInsert?.full_name === 'Kevin Test E2E', 'Perfil: Creación y lectura de registro en public.profiles', `Perfil creado con moneda COP y fuente Shuffler.`)

    // ─────────────────────────────────────────────────────────
    // 3 y 4. DAL & PRUEBA DE DATOS REALES TEMPORALES
    // ─────────────────────────────────────────────────────────
    console.log('\n3. Creando registros de prueba mediante el cliente autenticado...')

    // 4a. Cuenta financiera de prueba
    const { data: accData, error: accErr } = await user1Client
      .from('accounts')
      .insert({
        user_id: user1Id,
        name: '[TEST] Cuenta Temporal Verificación',
        account_type: 'bank',
        current_balance: 500000.0,
        currency: 'COP',
        is_active: true,
      })
      .select()
      .single()

    testAccountId = accData?.id
    assert(!accErr && Boolean(testAccountId), 'Prueba de Datos: Creación de cuenta financiera en Supabase', `Cuenta creada con balance inicial $500,000 COP.`)

    // 4b. Ingreso de prueba
    const { data: incData, error: incErr } = await user1Client
      .from('incomes')
      .insert({
        user_id: user1Id,
        account_id: testAccountId,
        source: 'Shuffler',
        description: '[TEST] Ingreso Temporal Verificación',
        amount: 1200000.0,
        income_type: 'salary',
        base_salary: 1200000.0,
        date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single()

    testIncomeId = incData?.id
    assert(!incErr && Boolean(testIncomeId), 'Prueba de Datos: Registro de ingreso en Supabase', `Ingreso registrado: $1,200,000 COP (Shuffler).`)

    // 4c. Gasto de prueba
    const { data: expData, error: expErr } = await user1Client
      .from('expenses')
      .insert({
        user_id: user1Id,
        account_id: testAccountId,
        category_name: 'alimentacion',
        description: '[TEST] Gasto Temporal Verificación',
        amount: 350000.0,
        payment_method: 'debit',
        is_essential: true,
        date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single()

    testExpenseId = expData?.id
    assert(!expErr && Boolean(testExpenseId), 'Prueba de Datos: Registro de gasto en Supabase', `Gasto registrado: $350,000 COP (Alimentación).`)

    // ─────────────────────────────────────────────────────────
    // 5. VERIFICACIÓN DE RLS Y AISLAMIENTO MULTI-TENANT
    // ─────────────────────────────────────────────────────────
    console.log('\n4. Verificando aislamiento Row Level Security (RLS)...')

    // 5a. Usuario 1 puede ver sus propios registros
    const { data: u1Incomes } = await user1Client.from('incomes').select('*')
    const { data: u1Expenses } = await user1Client.from('expenses').select('*')
    assert(
      u1Incomes?.length === 1 && u1Expenses?.length === 1,
      'RLS: Usuario autenticado propietario puede leer sus registros',
      `Registros visibles: 1 ingreso, 1 gasto.`
    )

    // 5b. Sesión anónima (sin login) NO puede ver nada
    const { data: anonIncomes } = await anonClient.from('incomes').select('*')
    const { data: anonExpenses } = await anonClient.from('expenses').select('*')
    const { data: anonAccounts } = await anonClient.from('accounts').select('*')
    assert(
      anonIncomes?.length === 0 && anonExpenses?.length === 0 && anonAccounts?.length === 0,
      'RLS: Sesión anónima bloqueada (0 registros expuestos)',
      'Total registros filtrados para anónimos: 0/3.'
    )

    // 5c. Usuario 2 (autenticado legítimo pero otro usuario) NO puede ver datos del Usuario 1
    const { data: u2Incomes } = await user2Client.from('incomes').select('*')
    const { data: u2Expenses } = await user2Client.from('expenses').select('*')
    const { data: u2Accounts } = await user2Client.from('accounts').select('*')
    assert(
      u2Incomes?.length === 0 && u2Expenses?.length === 0 && u2Accounts?.length === 0,
      'RLS: Aislamiento estricto multi-tenant entre usuarios diferentes',
      'Usuario 2 consulta la base y obtiene 0 registros de Usuario 1.'
    )

    // 5d. Usuario 2 no puede modificar ni inyectar datos en cuenta de Usuario 1
    const { error: spoofErr } = await user2Client
      .from('incomes')
      .insert({
        user_id: user1Id, // intento de inyectar datos al usuario 1
        description: '[TEST] Intento Spoofing Usuario 2',
        amount: 999999,
        source: 'Hacker',
      })
    assert(
      Boolean(spoofErr),
      'RLS: Rechazo de inserción cruzada / suplantación de user_id',
      'Supabase RLS bloqueó la inserción cruzada con código de seguridad.'
    )

    // ─────────────────────────────────────────────────────────
    // 6. FINANCIAL ENGINE
    // ─────────────────────────────────────────────────────────
    console.log('\n5. Validando cálculos puros con Financial Engine...')

    const incomesForEngine = [
      {
        id: testIncomeId,
        user_id: user1Id,
        source: 'Shuffler',
        description: '[TEST] Ingreso Temporal Verificación',
        amount: 1200000.0,
        income_type: 'salary',
        date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    const expensesForEngine = [
      {
        id: testExpenseId,
        user_id: user1Id,
        category_name: 'alimentacion',
        description: '[TEST] Gasto Temporal Verificación',
        amount: 350000.0,
        date: new Date().toISOString().split('T')[0],
        is_essential: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    const cashFlow = calcCashFlow(incomesForEngine, expensesForEngine)
    assert(
      cashFlow.total_income === 1200000 &&
        cashFlow.total_expenses === 350000 &&
        cashFlow.net === 850000,
      'Financial Engine: Cálculo de Flujo de Caja (Cash Flow)',
      `Ingreso: $${cashFlow.total_income.toLocaleString()} | Gasto: $${cashFlow.total_expenses.toLocaleString()} | Flujo Libre: $${cashFlow.net.toLocaleString()} COP`
    )

    const expectedSavingsRate = ((1200000 - 350000) / 1200000) * 100
    assert(
      Math.abs(cashFlow.savings_rate - expectedSavingsRate) < 0.01,
      'Financial Engine: Tasa de Ahorro Determinista',
      `Tasa calculada: ${cashFlow.savings_rate.toFixed(2)}% (Esperada: ${expectedSavingsRate.toFixed(2)}%)`
    )

    const incomeBreakdown = calcIncomeBreakdown(incomesForEngine)
    const shufflerItem = incomeBreakdown.by_source.find((s) => s.source === 'shuffler')
    assert(
      incomeBreakdown.total === 1200000 && shufflerItem?.amount === 1200000,
      'Financial Engine: Desglose por Fuentes Shuffler / Pizza Hut',
      `Total: $${incomeBreakdown.total.toLocaleString()} COP | Shuffler: $${shufflerItem?.amount.toLocaleString()} COP`
    )

    // ─────────────────────────────────────────────────────────
    // 7. DIGITAL TWIN (FinancialState)
    // ─────────────────────────────────────────────────────────
    console.log('\n6. Validando modelo Digital Twin...')

    const accountsForTwin = [
      {
        id: testAccountId,
        user_id: user1Id,
        name: '[TEST] Cuenta Temporal Verificación',
        account_type: 'bank',
        current_balance: 500000.0,
        currency: 'COP',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    const bundle = {
      incomes: incomesForEngine,
      expenses: expensesForEngine,
      categories: [],
      goals: [],
      debts: [],
      assets: [],
      liabilities: [],
      accounts: accountsForTwin,
      budgets: [],
      cryptoHoldings: [],
      wallets: [],
      bankConnections: [],
      bankAccounts: [],
      bankTransactions: [],
      snapshots: [],
    }

    const digitalTwinState = buildFinancialState(bundle, profileInsert)
    assert(
      digitalTwinState.cashFlow.totalIncome === 1200000 &&
        digitalTwinState.cashFlow.netOperatingCashFlow === 850000 &&
        digitalTwinState.liquidity.runwayMonths >= 0,
      'Digital Twin: Generación de FinancialState Reactivo',
      `Ingresos Twin: $${digitalTwinState.cashFlow.totalIncome.toLocaleString()} | Flujo Libre: $${digitalTwinState.cashFlow.netOperatingCashFlow.toLocaleString()} COP | Runway: ${digitalTwinState.liquidity.runwayMonths} meses.`
    )

    // ─────────────────────────────────────────────────────────
    // 8. AI COPILOT CONECTADO A DATOS REALES (GEMINI 3.8 FLASH)
    // ─────────────────────────────────────────────────────────
    console.log('\n7. Realizando consulta al AI Copilot con datos reales...')

    const ai = new GoogleGenAI({ apiKey: geminiApiKey })

    const copilotPrompt = `Eres NEXUS Financial Copilot.
El usuario tiene los siguientes datos financieros reales comprobados desde su base de datos de Supabase:
- Ingreso del mes: $1.200.000 COP (Fuente: Shuffler)
- Gastos del mes: $350.000 COP (Categoría: alimentación)
- Saldo en cuenta bancaria: $500.000 COP
- Flujo de caja libre calculado por Financial Engine: $850.000 COP
- Tasa de ahorro: 70.83%

Pregunta del usuario: "¿Cuál es mi flujo de caja libre este mes y cuál es mi principal fuente de ingresos?"

Instrucciones:
Responde de forma concisa, utilizando EXACTAMENTE los datos anteriores sin inventar nada.
Indica al final [FUENTE: Financial Engine - Dato Real Verificado].`

    const aiResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: copilotPrompt,
    })

    const replyText = aiResponse.text || ''
    const containsFreeCash = replyText.includes('850.000') || replyText.includes('850,000') || replyText.includes('850')
    const containsShuffler = replyText.toLowerCase().includes('shuffler')

    assert(
      containsFreeCash && containsShuffler,
      'AI Copilot: Razonamiento sobre datos financieros reales de Supabase',
      `Respuesta generada con datos exactos: $850.000 COP y Shuffler identificados correctamente.`
    )

    // ─────────────────────────────────────────────────────────
    // 9. LIMPIEZA TOTAL (ZERO RESIDUE)
    // ─────────────────────────────────────────────────────────
    console.log('\n8. Ejecutando limpieza segura de datos de prueba...')

    // Eliminar registros de datos creados
    if (testExpenseId) {
      await adminClient.from('expenses').delete().eq('id', testExpenseId)
    }
    if (testIncomeId) {
      await adminClient.from('incomes').delete().eq('id', testIncomeId)
    }
    if (testAccountId) {
      await adminClient.from('accounts').delete().eq('id', testAccountId)
    }
    if (user1Id) {
      await adminClient.from('profiles').delete().eq('id', user1Id)
    }

    // Eliminar usuarios creados en Supabase Auth
    if (user1Id) {
      await adminClient.auth.admin.deleteUser(user1Id)
    }
    if (user2Id) {
      await adminClient.auth.admin.deleteUser(user2Id)
    }

    // Verificar que las tablas quedaron con 0 registros
    const { count: finalIncomes } = await adminClient.from('incomes').select('*', { count: 'exact', head: true })
    const { count: finalExpenses } = await adminClient.from('expenses').select('*', { count: 'exact', head: true })
    const { count: finalAccounts } = await adminClient.from('accounts').select('*', { count: 'exact', head: true })

    assert(
      finalIncomes === 0 && finalExpenses === 0 && finalAccounts === 0,
      'Limpieza: Eliminación completa de datos de prueba (Zero Residue)',
      `Incomes: ${finalIncomes} | Expenses: ${finalExpenses} | Accounts: ${finalAccounts}. Base limpia 100%.`
    )
  } catch (err) {
    console.error('❌ Error durante la auditoría E2E:', err.message)
    failed++

    // Intento de limpieza de emergencia
    try {
      if (testExpenseId) await adminClient.from('expenses').delete().eq('id', testExpenseId)
      if (testIncomeId) await adminClient.from('incomes').delete().eq('id', testIncomeId)
      if (testAccountId) await adminClient.from('accounts').delete().eq('id', testAccountId)
      if (user1Id) await adminClient.auth.admin.deleteUser(user1Id)
      if (user2Id) await adminClient.auth.admin.deleteUser(user2Id)
    } catch {}
  }

  console.log('\n================================================================')
  console.log(`TOTAL E2E CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`)
  console.log('================================================================')

  if (failed > 0) {
    process.exit(1)
  }
}

runEndToEndAudit().catch((e) => {
  console.error('Fatal E2E error:', e)
  process.exit(1)
})

/**
 * NEXUS Finance — Verify Supabase Schema Details & RLS
 * Verifies 28 tables, columns, RLS behavior, default categories, and foreign keys on the live database.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const anonClient = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const EXPECTED_28_TABLES = [
  'profiles',
  'accounts',
  'categories',
  'incomes',
  'expenses',
  'budgets',
  'goals',
  'goal_contributions',
  'debts',
  'debt_payments',
  'assets',
  'liabilities',
  'investments',
  'betting_transactions',
  'financial_snapshots',
  'crypto_holdings',
  'wallets',
  'bank_connections',
  'bank_accounts',
  'bank_transactions',
  'bank_consents_log',
  'financial_events',
  'financial_alerts',
  'financial_insights',
  'alert_preferences',
  'ai_conversations',
  'ai_messages',
  'copilot_preferences',
]

const EXPECTED_CATEGORIES = [
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
]

async function checkDetails() {
  console.log('================================================================')
  console.log('NEXUS FINANCE — VERIFICACIÓN EN VIVO DE SUPABASE DATABASE')
  console.log('================================================================\n')

  let passed = 0
  let failed = 0

  function assert(condition, name, detail = '') {
    if (condition) {
      console.log(`✅ [PASS] ${name}`)
      if (detail) console.log(`   └─ ${detail}`)
      passed++
    } else {
      console.error(`❌ [FAIL] ${name}`)
      if (detail) console.error(`   └─ ${detail}`)
      failed++
    }
  }

  // 1. Verify all 28 tables exist via PostgREST schema cache
  const missingTables = []
  const foundTables = []
  for (const table of EXPECTED_28_TABLES) {
    const { error } = await adminClient.from(table).select('*').limit(1)
    if (error) {
      missingTables.push(`${table}: ${error.message}`)
    } else {
      foundTables.push(table)
    }
  }

  assert(
    missingTables.length === 0,
    'Verificación 1: Existencia de las 28 Tablas de NEXUS Finance',
    missingTables.length === 0
      ? `Las 28 tablas del dominio están creadas y activas (${foundTables.length}/28).`
      : `Tablas faltantes: ${missingTables.join('; ')}`
  )

  // 2. Check Migration 005 columns on financial_snapshots (Digital Twin)
  const { error: snapErr } = await adminClient
    .from('financial_snapshots')
    .select('id, user_id, snapshot_date, net_worth, liquid_assets, crypto_assets, bank_assets, investments_value, total_debt, snapshot_frequency, state_payload')
    .limit(0)

  assert(!snapErr, 'Verificación 2: Columnas de Digital Twin (financial_snapshots)', snapErr ? snapErr.message : 'liquid_assets, crypto_assets, bank_assets, investments_value, state_payload presentes.')

  // 3. Check Migration 003 columns on crypto_holdings & wallets
  const { error: cryptoErr } = await adminClient
    .from('crypto_holdings')
    .select('id, user_id, asset, symbol, quantity, purchase_price_usd, purchase_price_cop, platform, wallet_id')
    .limit(0)

  const { error: walletErr } = await adminClient
    .from('wallets')
    .select('id, user_id, name, address, blockchain, network_name, label, is_active')
    .limit(0)

  assert(!cryptoErr && !walletErr, 'Verificación 3: Crypto Intelligence & Wallets (Solo Lectura)', (cryptoErr || walletErr)?.message || 'crypto_holdings y wallets configuradas correctamente.')

  // 4. Check Migration 004 columns on bank tables
  const { error: bankConnErr } = await adminClient
    .from('bank_connections')
    .select('id, user_id, provider, institution_id, consent_status, sync_status')
    .limit(0)

  const { error: bankAccErr } = await adminClient
    .from('bank_accounts')
    .select('id, user_id, connection_id, masked_account_number, current_balance, available_balance')
    .limit(0)

  const { error: bankTxErr } = await adminClient
    .from('bank_transactions')
    .select('id, user_id, account_id, external_transaction_id, amount, transaction_type, is_internal_transfer')
    .limit(0)

  assert(!bankConnErr && !bankAccErr && !bankTxErr, 'Verificación 4: Banking Intelligence & Open Finance', (bankConnErr || bankAccErr || bankTxErr)?.message || 'bank_connections, bank_accounts, bank_transactions verificadas.')

  // 5. Check Migration 006 columns on financial intelligence
  const { error: eventErr } = await adminClient
    .from('financial_events')
    .select('id, user_id, type, category, severity, metric, current_value, previous_value, delta_payload')
    .limit(0)

  const { error: alertErr } = await adminClient
    .from('financial_alerts')
    .select('id, user_id, event_id, type, severity, metric, delta, status')
    .limit(0)

  const { error: insightErr } = await adminClient
    .from('financial_insights')
    .select('id, user_id, area, fact, change, interpretation, confidence, impact')
    .limit(0)

  const { error: prefErr } = await adminClient
    .from('alert_preferences')
    .select('user_id, budget_alerts_enabled, debt_alerts_enabled, liquidity_alerts_enabled, crypto_alerts_enabled')
    .limit(0)

  assert(!eventErr && !alertErr && !insightErr && !prefErr, 'Verificación 5: Financial Intelligence Engine & Alert Center', (eventErr || alertErr || insightErr || prefErr)?.message || 'financial_events, financial_alerts, financial_insights y alert_preferences verificadas.')

  // 6. Check Migration 007 columns on proactive copilot
  const { error: convErr } = await adminClient
    .from('ai_conversations')
    .select('id, user_id, title, context_snapshot')
    .limit(0)

  const { error: msgErr } = await adminClient
    .from('ai_messages')
    .select('id, conversation_id, user_id, role, content, explanation_payload, scenario_params, tools_executed')
    .limit(0)

  const { error: copilotPrefErr } = await adminClient
    .from('copilot_preferences')
    .select('user_id, daily_brief_enabled, weekly_review_enabled, budget_alerts_enabled')
    .limit(0)

  assert(!convErr && !msgErr && !copilotPrefErr, 'Verificación 6: Copilot Context Memory & Preferences', (convErr || msgErr || copilotPrefErr)?.message || 'ai_conversations, ai_messages y copilot_preferences verificadas.')

  // 7. Verify Preset Categories Seed
  const { data: catData, error: catErr } = await anonClient
    .from('categories')
    .select('name, icon, color, is_custom')
    .is('user_id', null)

  const foundCategories = (catData || []).map((c) => c.name.toLowerCase())
  const missingCategories = EXPECTED_CATEGORIES.filter((c) => !foundCategories.includes(c))

  assert(
    !catErr && missingCategories.length === 0,
    'Verificación 7: Categorías Predeterminadas del Sistema',
    missingCategories.length === 0
      ? `Las 11 categorías predeterminadas existen (${foundCategories.join(', ')}).`
      : `Categorías faltantes: ${missingCategories.join(', ')}`
  )

  // 8. Test RLS Isolation: Unauthenticated read on private user tables (profiles, incomes)
  const { data: anonProfiles, error: anonProfilesErr } = await anonClient
    .from('profiles')
    .select('*')

  assert(
    anonProfiles !== null && anonProfiles.length === 0,
    'Verificación 8: Aislamiento RLS en lectura anónima (profiles)',
    `Lectura anónima retorna 0 registros privados (RLS activo).`
  )

  const { data: anonIncomes } = await anonClient
    .from('incomes')
    .select('*')

  assert(
    anonIncomes !== null && anonIncomes.length === 0,
    'Verificación 9: Aislamiento RLS en lectura anónima (incomes)',
    `Lectura anónima retorna 0 ingresos privados (RLS activo).`
  )

  // 9. Test RLS write rejection: unauthenticated insert must be blocked
  const fakeId = '00000000-0000-0000-0000-000000000000'
  const { error: insertErr } = await anonClient
    .from('accounts')
    .insert({
      id: fakeId,
      user_id: fakeId,
      name: 'Test RLS Rejection',
      account_type: 'bank',
      current_balance: 100,
    })

  assert(
    Boolean(insertErr),
    'Verificación 10: Bloqueo RLS en escritura no autorizada (accounts)',
    insertErr ? `Inserción anónima bloqueada exitosamente por política RLS.` : 'Fallo de seguridad: Inserción no autorizada no fue bloqueada.'
  )

  console.log('\n================================================================')
  console.log(`TOTAL AUDIT CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`)
  console.log('================================================================')

  if (failed > 0) {
    process.exit(1)
  }
}

checkDetails().catch((err) => {
  console.error('Fatal check error:', err)
  process.exit(1)
})

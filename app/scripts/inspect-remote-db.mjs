import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const envRaw = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf8')
const env = {}
for (const line of envRaw.split('\n')) {
  const t = line.trim()
  const idx = t.indexOf('=')
  if (idx > 0 && !t.startsWith('#')) {
    env[t.substring(0, idx).trim()] = t.substring(idx + 1).trim().replace(/^['"]|['"]$/g, '')
  }
}

const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const TABLES = [
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

async function run() {
  const existing = []
  const missing = []
  for (const table of TABLES) {
    const res = await client.from(table).select('*').limit(1)
    if (res.error) {
      missing.push({ table, code: res.error.code, message: res.error.message })
    } else {
      existing.push({ table, count: res.data ? res.data.length : 0 })
    }
  }
  console.log(`Tables found: ${existing.length}`)
  console.log(`Tables missing: ${missing.length}`)
  if (existing.length > 0) {
    console.log('Existing:', existing.map(e => e.table).join(', '))
  }
}

run()

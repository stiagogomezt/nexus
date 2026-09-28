/**
 * NEXUS Finance — Secure Real Connectivity & Configuration Verifier
 * Validates presence, formatting, and live network reachability of configured credentials.
 * STRICT SECURITY: Zero secret values or keys are ever printed or logged.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function sanitizeError(err) {
  if (!err) return 'Unknown error'
  const str = String(err.message || err)
  // Strip any accidental key leakage in query params or headers
  return str
    .replace(/key=[a-zA-Z0-9_\-]+/gi, 'key=[REDACTED]')
    .replace(/apiKey=[a-zA-Z0-9_\-]+/gi, 'apiKey=[REDACTED]')
    .replace(/Bearer\s+[a-zA-Z0-9_\.\-]+/gi, 'Bearer [REDACTED]')
    .replace(/X-CMC_PRO_API_KEY:[^\n\r]+/gi, 'X-CMC_PRO_API_KEY: [REDACTED]')
}

async function verifyAll() {
  console.log('================================================================')
  console.log('NEXUS FINANCE — VERIFICACIÓN DE CONFIGURACIÓN Y CONECTIVIDAD')
  console.log('================================================================\n')

  const envPath = path.resolve(__dirname, '../.env.local')
  if (!fs.existsSync(envPath)) {
    console.error('❌ Archivo app/.env.local no encontrado.')
    process.exit(1)
  }

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

  // ----------------------------------------------------
  // 1. AUDITORÍA DE FORMATO Y ESTADO (SIN IMPRIMIR VALORES)
  // ----------------------------------------------------
  const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || ''
  const geminiKey = envVars.GEMINI_API_KEY || ''
  const cmcKey = envVars.COINMARKETCAP_API_KEY || ''

  function checkFormat(val, type) {
    if (!val || val.trim() === '') return 'NOT SET'
    if (val.includes('your-') || val.includes('placeholder') || val.includes('example')) return 'INVALID (PLACEHOLDER)'

    if (type === 'url') {
      try {
        const u = new URL(val)
        if (u.protocol === 'https:' && u.hostname.length > 5) return 'SET'
        return 'INVALID FORMAT'
      } catch {
        return 'INVALID FORMAT'
      }
    }

    if (type === 'jwt_or_key') {
      if (val.length >= 20) return 'SET'
      return 'INVALID (TOO SHORT)'
    }

    if (type === 'api_key') {
      if (val.length >= 15) return 'SET'
      return 'INVALID (TOO SHORT)'
    }

    return 'SET'
  }

  const statusFormat = {
    NEXT_PUBLIC_SUPABASE_URL: checkFormat(supabaseUrl, 'url'),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: checkFormat(supabaseAnonKey, 'jwt_or_key'),
    SUPABASE_SERVICE_ROLE_KEY: checkFormat(supabaseServiceKey, 'jwt_or_key'),
    GEMINI_API_KEY: checkFormat(geminiKey, 'api_key'),
    COINMARKETCAP_API_KEY: checkFormat(cmcKey, 'api_key'),
  }

  console.log('1. Verificación de Formato de Variables:')
  for (const [k, v] of Object.entries(statusFormat)) {
    const icon = v === 'SET' ? '✅' : '❌'
    console.log(`   ${icon} ${k}: ${v}`)
  }
  console.log('')

  // ----------------------------------------------------
  // 2. CONECTIVIDAD SUPABASE CLOUD (ANON KEY)
  // ----------------------------------------------------
  let supabaseAnonOk = false
  let supabaseAnonError = ''

  if (statusFormat.NEXT_PUBLIC_SUPABASE_URL === 'SET' && statusFormat.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'SET') {
    try {
      const authHealthUrl = `${supabaseUrl.replace(/\/+$/, '')}/auth/v1/health`
      const res = await fetch(authHealthUrl, {
        headers: { apikey: supabaseAnonKey },
      })
      if (res.ok) {
        supabaseAnonOk = true
      } else {
        supabaseAnonError = `HTTP ${res.status}: ${res.statusText}`
      }
    } catch (err) {
      supabaseAnonError = sanitizeError(err)
    }
  } else {
    supabaseAnonError = 'Variables no configuradas adecuadamente'
  }

  // ----------------------------------------------------
  // 3. CONECTIVIDAD SUPABASE SERVICE ROLE
  // ----------------------------------------------------
  let supabaseAdminOk = false
  let supabaseAdminError = ''

  if (statusFormat.NEXT_PUBLIC_SUPABASE_URL === 'SET' && statusFormat.SUPABASE_SERVICE_ROLE_KEY === 'SET') {
    try {
      const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1 })
      if (!error) {
        supabaseAdminOk = true
      } else {
        supabaseAdminError = error.message
      }
    } catch (err) {
      supabaseAdminError = sanitizeError(err)
    }
  } else {
    supabaseAdminError = 'Variable SUPABASE_SERVICE_ROLE_KEY no configurada'
  }

  // ----------------------------------------------------
  // 4. CONECTIVIDAD GEMINI API
  // ----------------------------------------------------
  let geminiOk = false
  let geminiError = ''

  if (statusFormat.GEMINI_API_KEY === 'SET') {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey })
      const res = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: 'Responde únicamente con la palabra: OK',
      })
      if (res && res.text) {
        geminiOk = true
      } else {
        geminiError = 'Respuesta vacía del modelo'
      }
    } catch (err) {
      geminiError = sanitizeError(err)
    }
  } else {
    geminiError = 'GEMINI_API_KEY no configurada'
  }

  // ----------------------------------------------------
  // 5. CONECTIVIDAD COINMARKETCAP API
  // ----------------------------------------------------
  let cmcOk = false
  let cmcError = ''

  if (statusFormat.COINMARKETCAP_API_KEY === 'SET') {
    try {
      const url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=BTC&convert=USD'
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'X-CMC_PRO_API_KEY': cmcKey,
        },
      })

      if (res.ok) {
        const json = await res.json()
        if (json.status?.error_code === 0 && json.data?.BTC?.quote?.USD?.price > 0) {
          cmcOk = true
        } else {
          cmcError = json.status?.error_message || 'Respuesta inválida de CoinMarketCap'
        }
      } else {
        const errJson = await res.json().catch(() => null)
        cmcError = `HTTP ${res.status}: ${errJson?.status?.error_message || res.statusText}`
      }
    } catch (err) {
      cmcError = sanitizeError(err)
    }
  } else {
    cmcError = 'COINMARKETCAP_API_KEY no configurada'
  }

  // ----------------------------------------------------
  // REPORTE CONSOLIDADO
  // ----------------------------------------------------
  console.log('================================================================')
  console.log('RESULTADOS DE CONECTIVIDAD EN VIVO')
  console.log('================================================================')
  console.log(`Supabase Anon:         ${supabaseAnonOk ? '✅ CONECTADO' : '❌ FALLÓ (' + supabaseAnonError + ')'}`)
  console.log(`Supabase Service Role: ${supabaseAdminOk ? '✅ AUTORIZADO' : '❌ FALLÓ (' + supabaseAdminError + ')'}`)
  console.log(`Gemini API:            ${geminiOk ? '✅ CONECTADO' : '❌ FALLÓ (' + geminiError + ')'}`)
  console.log(`CoinMarketCap API:     ${cmcOk ? '✅ CONECTADO' : '❌ FALLÓ (' + cmcError + ')'}`)
  console.log('================================================================\n')

  return {
    statusFormat,
    supabaseAnonOk,
    supabaseAnonError,
    supabaseAdminOk,
    supabaseAdminError,
    geminiOk,
    geminiError,
    cmcOk,
    cmcError,
  }
}

verifyAll()
  .then((results) => {
    const allConfigured = Object.values(results.statusFormat).every((v) => v === 'SET')
    const allConnected = results.supabaseAnonOk && results.supabaseAdminOk && results.geminiOk && results.cmcOk

    if (allConfigured && allConnected) {
      console.log('STATUS: ALL_OK')
      process.exit(0)
    } else {
      console.log('STATUS: PARTIAL_OR_FAILED')
      process.exit(0)
    }
  })
  .catch((err) => {
    console.error('Error fatal durante la verificación:', sanitizeError(err))
    process.exit(1)
  })

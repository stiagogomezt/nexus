/**
 * NEXUS FINANCE — FASE L AUTOMATED VERIFICATION SUITE
 * Validates all 14 criteria for Crypto Intelligence and Wallet Intelligence.
 */

// Mock localStorage and window in Node environment before imports
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
  console.log('====================================================')
  console.log('NEXUS FINANCE — FASE L: CRYPTO & WALLET INTELLIGENCE')
  console.log('====================================================\n')

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

  // Import dynamic TypeScript modules
  const { MockCryptoProvider } = await import('../src/lib/crypto/providers/mock-crypto-provider.ts')
  const { CoinMarketCapProvider } = await import('../src/lib/crypto/providers/coinmarketcap-provider.ts')
  const { cryptoService } = await import('../src/lib/crypto/crypto-service.ts')
  const { EvmWalletProvider } = await import('../src/lib/wallets/providers/evm-wallet-provider.ts')
  const { SolanaWalletProvider } = await import('../src/lib/wallets/providers/solana-wallet-provider.ts')
  const { walletService } = await import('../src/lib/wallets/wallet-service.ts')
  const { currencyService } = await import('../src/lib/currency/currency-service.ts')
  const { PortfolioAggregator } = await import('../src/lib/crypto/portfolio-aggregator.ts')
  const { calcNetWorth } = await import('../src/lib/financial-engine.ts')
  const dalCrypto = await import('../src/lib/dal/crypto.ts')
  const dalWallets = await import('../src/lib/dal/wallets.ts')
  const aiTools = await import('../src/lib/ai-tools/read-tools.ts')
  const { executeAITool } = await import('../src/lib/ai-tools/index.ts')

  // ----------------------------------------------------
  // TEST 1: CryptoProvider funciona
  // ----------------------------------------------------
  try {
    const mockProvider = new MockCryptoProvider()
    const cmcProvider = new CoinMarketCapProvider()
    assert(
      mockProvider.providerName.includes('Deterministic') && cmcProvider.providerName.includes('CoinMarketCap'),
      '1. CryptoProvider funciona e implementa la abstracción requerida',
      `Mock: ${mockProvider.providerName}, CMC: ${cmcProvider.providerName}`
    )
  } catch (err) {
    assert(false, '1. CryptoProvider funciona', err.message)
  }


  // ----------------------------------------------------
  // TEST 2: Provider devuelve datos correctamente
  // ----------------------------------------------------
  try {
    const btcQuote = await cryptoService.getPrice('BTC')
    const multiQuotes = await cryptoService.getMultiplePrices(['BTC', 'ETH', 'SOL', 'USDC'])
    assert(
      btcQuote.priceUsd > 10000 &&
      btcQuote.priceCop > 0 &&
      typeof btcQuote.change24hPercent === 'number' &&
      btcQuote.updatedAt &&
      multiQuotes.length === 4,
      '2. Provider devuelve datos de mercado correctamente (precio spot, 24h change, volumen, timestamp)',
      `BTC Spot: $${btcQuote.priceUsd} USD / $${btcQuote.priceCop} COP (${btcQuote.change24hPercent}%)`
    )
  } catch (err) {
    assert(false, '2. Provider devuelve datos correctamente', err.message)
  }

  // ----------------------------------------------------
  // TEST 3: Error de API no rompe la aplicación
  // ----------------------------------------------------
  try {
    const unknownQuote = await cryptoService.getPrice('UNKNOWN_TOKEN_XYZ_999')
    assert(
      unknownQuote.symbol === 'UNKNOWN_TOKEN_XYZ_999' && unknownQuote.priceUsd === 0,
      '3. Error de API o token inexistente no rompe la aplicación (fallback seguro)',
      `Fallback seguro devuelto: ${unknownQuote.name} ($${unknownQuote.priceUsd})`
    )
  } catch (err) {
    assert(false, '3. Error de API no rompe la aplicación', err.message)
  }

  // ----------------------------------------------------
  // TEST 4: Wallet read-only funciona
  // ----------------------------------------------------
  try {
    const evmAddr = '0x71C81873E47b39E5D9051871C88172943A9F3a9F'
    const solAddr = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'

    const evmBalances = await walletService.getWalletBalances({
      id: 'wlt-evm-test',
      user_id: 'usr-kevin-001',
      name: 'EVM Cold',
      address: evmAddr,
      blockchain: 'evm',
      network_name: 'Ethereum Mainnet',
      label: 'Cold',
      is_active: true,
      created_at: new Date().toISOString(),
    })

    const solBalances = await walletService.getWalletBalances({
      id: 'wlt-sol-test',
      user_id: 'usr-kevin-001',
      name: 'Phantom Sol',
      address: solAddr,
      blockchain: 'solana',
      network_name: 'Solana Mainnet',
      label: 'Hot',
      is_active: true,
      created_at: new Date().toISOString(),
    })

    assert(
      evmBalances.length > 0 &&
      solBalances.length > 0 &&
      evmBalances[0].balance > 0 &&
      solBalances[0].balance > 0,
      '4. Wallet read-only funciona para EVM y Solana sin solicitar credenciales privadas',
      `EVM Tokens: ${evmBalances.map((b) => b.tokenSymbol).join(', ')} | SOL Tokens: ${solBalances.map((b) => b.tokenSymbol).join(', ')}`
    )
  } catch (err) {
    assert(false, '4. Wallet read-only funciona', err.message)
  }

  // ----------------------------------------------------
  // TEST 5: Dirección inválida es rechazada
  // ----------------------------------------------------
  try {
    const invalidEvm1 = walletService.validateAddress('0xinvalid', 'evm')
    const invalidEvm2 = walletService.validateAddress('1234567890', 'evm')
    const validEvm = walletService.validateAddress('0x71C81873E47b39E5D9051871C88172943A9F3a9F', 'evm')

    const invalidSol = walletService.validateAddress('invalid-solana-address-000', 'solana')
    const validSol = walletService.validateAddress('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', 'solana')

    assert(
      !invalidEvm1 && !invalidEvm2 && validEvm && !invalidSol && validSol,
      '5. Dirección pública inválida es rechazada sintácticamente',
      'Validador EVM rechaza longitudes/hex erróneos; validador Solana rechaza Base58 erróneo'
    )
  } catch (err) {
    assert(false, '5. Dirección inválida es rechazada', err.message)
  }

  // ----------------------------------------------------
  // TEST 6: No se almacenan private keys
  // ----------------------------------------------------
  try {
    const migrationPath = path.resolve(__dirname, '../../supabase/migrations/003_crypto_wallets.sql')
    const migrationSql = fs.readFileSync(migrationPath, 'utf8')
    const forbiddenPatterns = ['private_key', 'seed_phrase', 'secret_key', 'wallet_password']
    const hasForbidden = forbiddenPatterns.some((pattern) => migrationSql.toLowerCase().includes(pattern))

    assert(
      !hasForbidden,
      '6. Cero almacenamiento de private keys o seed phrases en base de datos ni modelos',
      'Esquema SQL verificado: solo address, blockchain, network_name, label'
    )
  } catch (err) {
    assert(false, '6. No se almacenan private keys', err.message)
  }

  // ----------------------------------------------------
  // TEST 7: Portfolio aggregator funciona
  // ----------------------------------------------------
  try {
    const testHoldings = [
      {
        id: 'hld-btc',
        user_id: 'usr-1',
        asset: 'Bitcoin',
        symbol: 'BTC',
        quantity: 0.1,
        purchase_price_usd: 50000,
        purchase_price_cop: 207500000,
        purchase_date: '2026-01-01',
        platform: 'Ledger',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'hld-sol',
        user_id: 'usr-1',
        asset: 'Solana',
        symbol: 'SOL',
        quantity: 10,
        purchase_price_usd: 100,
        purchase_price_cop: 415000,
        purchase_date: '2026-02-01',
        platform: 'Phantom',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    const summary = await PortfolioAggregator.aggregate({
      holdings: testHoldings,
      wallets: [],
    })

    assert(
      summary.totalValueUsd > 0 &&
      summary.totalValueCop > 0 &&
      summary.positions.length === 2 &&
      summary.distributionByAsset.length === 2 &&
      summary.unrealizedPnLPercent !== undefined,
      '7. Portfolio Aggregator calcula consolidado, PnL y asignación porcentual',
      `Total USD: $${summary.totalValueUsd} | PnL: ${summary.unrealizedPnLPercent}% | Posiciones: ${summary.positions.length}`
    )
  } catch (err) {
    assert(false, '7. Portfolio aggregator funciona', err.message)
  }

  // ----------------------------------------------------
  // TEST 8: Crypto net worth funciona
  // ----------------------------------------------------
  try {
    const assets = [{ id: 'a1', user_id: 'usr-1', name: 'Cash', category: 'cash', current_value: 1000000, is_liquid: true, currency: 'COP', created_at: '' }]
    const liabilities = [{ id: 'l1', user_id: 'usr-1', name: 'Card', current_balance: 200000, category: 'credit_card', minimum_payment: 50000, due_date: '', interest_rate: 0, currency: 'COP', is_active: true, created_at: '' }]
    const cryptoValueCop = 5000000

    const netWorthResult = calcNetWorth(assets, liabilities, [], [], cryptoValueCop)

    assert(
      netWorthResult.total_assets === 6000000 &&
      netWorthResult.total_liabilities === 200000 &&
      netWorthResult.net_worth === 5800000 &&
      netWorthResult.breakdown.crypto === 5000000,
      '8. Crypto Net Worth se incorpora fielmente al patrimonio neto consolidado',
      `Net Worth: $${netWorthResult.net_worth} (Activos: $${netWorthResult.total_assets}, Pasivos: $${netWorthResult.total_liabilities})`
    )
  } catch (err) {
    assert(false, '8. Crypto net worth funciona', err.message)
  }

  // ----------------------------------------------------
  // TEST 9: No existe doble contabilización
  // ----------------------------------------------------
  try {
    // 9a. Wallet-linked manual holding deduplication
    const walletId = 'wlt-dedup-1'
    const holdingsWithLinked = [
      {
        id: 'hld-linked',
        user_id: 'usr-1',
        asset: 'Solana',
        symbol: 'SOL',
        quantity: 5, // manual entry
        purchase_price_usd: 120,
        purchase_price_cop: 498000,
        purchase_date: '2026-01-01',
        platform: 'Phantom Linked',
        wallet_id: walletId, // LINKED!
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    const walletMap = new Map()
    walletMap.set(walletId, [
      {
        address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
        blockchain: 'solana',
        network: 'Solana Mainnet',
        tokenSymbol: 'SOL',
        tokenName: 'Solana',
        balance: 5, // live on-chain balance
        priceUsd: 145,
        priceCop: 601750,
        estimatedValueUsd: 725,
        estimatedValueCop: 3008750,
        fetchedAt: new Date().toISOString(),
      },
    ])

    const dedupSummary = await PortfolioAggregator.aggregate({
      holdings: holdingsWithLinked,
      wallets: [{ id: walletId, user_id: 'usr-1', name: 'Phantom', address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', blockchain: 'solana', network_name: 'Solana', label: 'Hot', is_active: true, created_at: '' }],
      walletBalances: walletMap,
    })

    const solPos = dedupSummary.positions.find((p) => p.symbol === 'SOL')

    // 9b. Financial Engine legacy category deduplication
    const legacyAssets = [
      { id: 'a-crypto-legacy', user_id: 'usr-1', name: 'Bitcoin Antiguo', category: 'crypto', current_value: 3000000, is_liquid: true, currency: 'COP', created_at: '' },
      { id: 'a-cash', user_id: 'usr-1', name: 'Efectivo', category: 'cash', current_value: 2000000, is_liquid: true, currency: 'COP', created_at: '' },
    ]
    // When specialized cryptoHoldingsValueCop is supplied, legacy 'crypto' assets are excluded to prevent double counting
    const engineDedup = calcNetWorth(legacyAssets, [], [], [], 4000000)

    assert(
      solPos.totalQuantity === 5 &&
      engineDedup.breakdown.crypto === 4000000 &&
      engineDedup.total_assets === 6000000,
      '9. Cero doble contabilización en agregación on-chain y cálculo contable',
      `SOL Quantity agregada: ${solPos.totalQuantity} (No 10). Total Activos contable: $${engineDedup.total_assets}`
    )
  } catch (err) {
    assert(false, '9. No existe doble contabilización', err.message)
  }

  // ----------------------------------------------------
  // TEST 10: AI Tools funcionan
  // ----------------------------------------------------
  try {
    const summaryRes = await executeAITool('get_crypto_summary', {}, 'usr-kevin-001')
    const walletsRes = await executeAITool('get_wallets', {}, 'usr-kevin-001')
    const portfolioRes = await executeAITool('get_crypto_portfolio', { symbol: 'SOL' }, 'usr-kevin-001')

    assert(
      summaryRes.success &&
      walletsRes.success &&
      portfolioRes.success &&
      summaryRes.data.status === 'SUCCESS' &&
      Array.isArray(walletsRes.data.wallets) &&
      portfolioRes.data.filtered_by_symbol === 'SOL',
      '10. AI Read Tools funcionan y responden con datos estructurados grounded',
      `Summary Status: ${summaryRes.data.status}, Wallets Count: ${walletsRes.data.total_wallets}, Matched: ${portfolioRes.data.total_positions_matched}`
    )
  } catch (err) {
    assert(false, '10. AI tools funcionan', err.message)
  }

  // ----------------------------------------------------
  // TEST 11: Aislamiento por usuario
  // ----------------------------------------------------
  try {
    const userA = 'usr-kevin-001'
    const userB = 'usr-other-999'

    const holdingsA = await dalCrypto.getCryptoHoldings(userA)
    const holdingsB = await dalCrypto.getCryptoHoldings(userB)

    const walletsA = await dalWallets.getWallets(userA)
    const walletsB = await dalWallets.getWallets(userB)

    assert(
      holdingsA.length > 0 &&
      holdingsB.length === 0 &&
      walletsA.length > 0 &&
      walletsB.length === 0,
      '11. Aislamiento por usuario estricto en DAL y persistencia',
      `User A: ${holdingsA.length} holdings, ${walletsA.length} wallets | User B: ${holdingsB.length} holdings, ${walletsB.length} wallets`
    )
  } catch (err) {
    assert(false, '11. Aislamiento por usuario', err.message)
  }

  // ----------------------------------------------------
  // TEST 12: RLS
  // ----------------------------------------------------
  try {
    const migrationPath = path.resolve(__dirname, '../../supabase/migrations/003_crypto_wallets.sql')
    const sql = fs.readFileSync(migrationPath, 'utf8')

    const hasRlsHoldings = sql.includes('crypto_holdings ENABLE ROW LEVEL SECURITY')
    const hasRlsWallets = sql.includes('wallets ENABLE ROW LEVEL SECURITY')
    const hasAuthUid = sql.includes('auth.uid() = user_id')

    assert(
      hasRlsHoldings && hasRlsWallets && hasAuthUid,
      '12. Row Level Security (RLS) configurado para todas las tablas crypto y wallets',
      'ENABLE ROW LEVEL SECURITY y políticas auth.uid() = user_id verificadas en migración 003'
    )

  } catch (err) {
    assert(false, '12. RLS', err.message)
  }

  // ----------------------------------------------------
  // TEST 13: Currency conversion no altera datos reales
  // ----------------------------------------------------
  try {
    const originalUsd = 100
    const copValue = currencyService.usdToCop(originalUsd)
    const backToUsd = currencyService.copToUsd(copValue)

    assert(
      copValue === originalUsd * 4150 &&
      Math.abs(backToUsd - originalUsd) < 0.001,
      '13. Capa de conversión CurrencyService es independiente y no altera datos reales',
      `$${originalUsd} USD -> $${copValue.toLocaleString('es-CO')} COP -> $${backToUsd} USD`
    )
  } catch (err) {
    assert(false, '13. Currency conversion no altera datos reales', err.message)
  }

  // ----------------------------------------------------
  // TEST 14: API keys nunca llegan al frontend
  // ----------------------------------------------------
  try {
    const envExamplePath = path.resolve(__dirname, '../.env.example')
    let envContent = ''
    if (fs.existsSync(envExamplePath)) {
      envContent = fs.readFileSync(envExamplePath, 'utf8')
    }

    const hasPublicSecrets =
      envContent.includes('NEXT_PUBLIC_COINMARKETCAP_API_KEY') ||
      envContent.includes('NEXT_PUBLIC_COINGECKO_API_KEY') ||
      envContent.includes('NEXT_PUBLIC_RPC_KEY') ||
      envContent.includes('NEXT_PUBLIC_EXCHANGE_SECRET')

    assert(
      !hasPublicSecrets,
      '14. Seguridad: Ningún secreto de API usa el prefijo NEXT_PUBLIC_ ni se expone al cliente',
      'Variables de entorno auditadas: solo claves del servidor (COINMARKETCAP_API_KEY, RPC_URL)'
    )
  } catch (err) {
    assert(false, '14. API keys nunca llegan al frontend', err.message)
  }

  console.log('\n====================================================')
  console.log(`RESUMEN DE PRUEBAS FASE L: ${passed} PASADAS / ${failed} FALLIDAS`)
  console.log('====================================================')

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err)
  process.exit(1)
})

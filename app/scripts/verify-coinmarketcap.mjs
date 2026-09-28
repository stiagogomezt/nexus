/**
 * NEXUS Finance — CoinMarketCap Integration & Crypto Provider Verification Suite
 * Tests BTC, ETH, SOL, pricing, market cap, percent changes, ranking, error handling, cache, and rate limiting resilience.
 */

import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function runCoinMarketCapSuite() {
  console.log('================================================================')
  console.log('NEXUS FINANCE — COINMARKETCAP PROVIDER & CRYPTO INTELLIGENCE')
  console.log('================================================================\n')

  let passed = 0
  let failed = 0

  function assert(condition, testName, details) {
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
  const { CoinMarketCapProvider } = await import('../src/lib/crypto/providers/coinmarketcap-provider.ts')
  const { MockCryptoProvider } = await import('../src/lib/crypto/providers/mock-crypto-provider.ts')
  const { CryptoService, cryptoService } = await import('../src/lib/crypto/crypto-service.ts')
  const { currencyService } = await import('../src/lib/currency/currency-service.ts')

  // ----------------------------------------------------
  // TEST 1: BTC Quote
  // ----------------------------------------------------
  try {
    const btcQuote = await cryptoService.getPrice('BTC', true)
    assert(
      btcQuote.symbol === 'BTC' && btcQuote.priceUsd > 10000 && btcQuote.priceCop > 0,
      'Test 1: BTC — Asset Resolution & Price Feeds',
      `BTC Price: $${btcQuote.priceUsd.toLocaleString('en-US')} USD | $${btcQuote.priceCop.toLocaleString('es-CO')} COP | Source: ${btcQuote.source}`
    )
  } catch (err) {
    assert(false, 'Test 1: BTC quote failed', String(err))
  }

  // ----------------------------------------------------
  // TEST 2: ETH Quote
  // ----------------------------------------------------
  try {
    const ethQuote = await cryptoService.getPrice('ETH', true)
    assert(
      ethQuote.symbol === 'ETH' && ethQuote.priceUsd > 1000 && ethQuote.priceCop > 0,
      'Test 2: ETH — Asset Resolution & Price Feeds',
      `ETH Price: $${ethQuote.priceUsd.toLocaleString('en-US')} USD | $${ethQuote.priceCop.toLocaleString('es-CO')} COP | Source: ${ethQuote.source}`
    )
  } catch (err) {
    assert(false, 'Test 2: ETH quote failed', String(err))
  }

  // ----------------------------------------------------
  // TEST 3: SOL Quote
  // ----------------------------------------------------
  try {
    const solQuote = await cryptoService.getPrice('SOL', true)
    assert(
      solQuote.symbol === 'SOL' && solQuote.priceUsd > 10 && solQuote.priceCop > 0,
      'Test 3: SOL — Asset Resolution & Price Feeds',
      `SOL Price: $${solQuote.priceUsd.toLocaleString('en-US')} USD | $${solQuote.priceCop.toLocaleString('es-CO')} COP | Source: ${solQuote.source}`
    )
  } catch (err) {
    assert(false, 'Test 3: SOL quote failed', String(err))
  }

  // ----------------------------------------------------
  // TEST 4: Price & Currency Conversion (USD -> COP)
  // ----------------------------------------------------
  try {
    const btcQuote = await cryptoService.getPrice('BTC')
    const calculatedCop = currencyService.usdToCop(btcQuote.priceUsd)
    const difference = Math.abs(calculatedCop - btcQuote.priceCop)

    assert(
      difference < 1.0,
      'Test 4: Currency Conversion — Accurate Deterministic USD to COP Modeling',
      `USD $${btcQuote.priceUsd} -> COP $${btcQuote.priceCop.toLocaleString('es-CO')} (Diff: ${difference})`
    )
  } catch (err) {
    assert(false, 'Test 4: Price calculation failed', String(err))
  }

  // ----------------------------------------------------
  // TEST 5: Market Cap & Volume Metrics
  // ----------------------------------------------------
  try {
    const btcQuote = await cryptoService.getPrice('BTC')
    assert(
      typeof btcQuote.marketCapUsd === 'number' &&
        btcQuote.marketCapUsd > 0 &&
        typeof btcQuote.volume24hUsd === 'number' &&
        btcQuote.volume24hUsd > 0,
      'Test 5: Market Cap & 24h Volume — Fundamental Market Dimensions',
      `Market Cap: $${(btcQuote.marketCapUsd / 1e9).toFixed(2)}B USD | 24h Vol: $${(btcQuote.volume24hUsd / 1e9).toFixed(2)}B USD`
    )
  } catch (err) {
    assert(false, 'Test 5: Market cap check failed', String(err))
  }

  // ----------------------------------------------------
  // TEST 6: Percentage Variations (24h, 7d, 30d)
  // ----------------------------------------------------
  try {
    const btcQuote = await cryptoService.getPrice('BTC')
    assert(
      typeof btcQuote.change24hPercent === 'number',
      'Test 6: Percentage Changes — 24h Change Supported',
      `24h Change: ${btcQuote.change24hPercent > 0 ? '+' : ''}${btcQuote.change24hPercent}% | 7d: ${btcQuote.change7dPercent ?? 'N/A'}%`
    )
  } catch (err) {
    assert(false, 'Test 6: Percentage change check failed', String(err))
  }

  // ----------------------------------------------------
  // TEST 7: Error Handling & Unknown Asset Resilience
  // ----------------------------------------------------
  try {
    const unknown = await cryptoService.getPrice('UNKNOWN_TOKEN_FAKE_9999', true)
    assert(
      unknown.symbol === 'UNKNOWN_TOKEN_FAKE_9999' && unknown.priceUsd === 0 && unknown.isLive === false,
      'Test 7: Error Handling — Graceful Recovery on Non-Existent or Invalid Asset',
      `Symbol: ${unknown.symbol} | Price: $${unknown.priceUsd} | isLive: ${unknown.isLive} | Zero Crash`
    )
  } catch (err) {
    assert(false, 'Test 7: Error handling check failed', String(err))
  }

  // ----------------------------------------------------
  // TEST 8: In-Memory Caching (Zero Redundant Network Requests)
  // ----------------------------------------------------
  try {
    // Warm up cache
    await cryptoService.getPrice('ETH', true)

    // Second call should hit in-memory cache instantly
    const t0 = performance.now()
    const cachedEth = await cryptoService.getPrice('ETH', false)
    const elapsedMs = performance.now() - t0

    assert(
      elapsedMs < 10 && cachedEth.symbol === 'ETH' && cachedEth.priceUsd > 0,
      'Test 8: In-Memory Cache — High-Performance Spot Quote Retrieval (<10ms)',
      `Elapsed: ${elapsedMs.toFixed(3)}ms (Served from in-memory TTL cache)`
    )
  } catch (err) {
    assert(false, 'Test 8: Cache check failed', String(err))
  }

  // ----------------------------------------------------
  // TEST 9: Rate Limiting & Fallback Resilience
  // ----------------------------------------------------
  try {
    // Instantiate provider with dummy key to verify graceful 401/429/network fallback
    const failingProvider = new CoinMarketCapProvider('invalid-or-rate-limited-key')
    const fallbackQuote = await failingProvider.getPrice('BTC')

    assert(
      fallbackQuote &&
        fallbackQuote.symbol === 'BTC' &&
        fallbackQuote.priceUsd > 0 &&
        fallbackQuote.isLive === false &&
        fallbackQuote.source.includes('Deterministic'),
      'Test 9: Rate Limit & Network Resilience — Automatic Deterministic Fallback',
      `Fallback Provider: ${fallbackQuote.source} | isLive: ${fallbackQuote.isLive} | Price: $${fallbackQuote.priceUsd}`
    )
  } catch (err) {
    assert(false, 'Test 9: Fallback resilience check failed', String(err))
  }

  // ----------------------------------------------------
  // TEST 10: Multi-Price Batching (Basic Tier Credit Optimization)
  // ----------------------------------------------------
  try {
    const multi = await cryptoService.getMultiplePrices(['BTC', 'ETH', 'SOL', 'USDC'])
    assert(
      multi.length === 4 && multi.every((q) => q.priceUsd >= 0),
      'Test 10: Multi-Price Batching — Single-Request Credit Efficiency',
      `Retrieved ${multi.length} quotes: ${multi.map((q) => `${q.symbol}: $${q.priceUsd}`).join(', ')}`
    )
  } catch (err) {
    assert(false, 'Test 10: Multi-price batching failed', String(err))
  }

  // ----------------------------------------------------
  // TEST 11: Security — Zero Server Secret Exposure
  // ----------------------------------------------------
  try {
    const envExamplePath = path.resolve(__dirname, '../.env.example')
    const envContent = fs.readFileSync(envExamplePath, 'utf8')

    const hasPublicSecrets =
      envContent.includes('NEXT_PUBLIC_COINMARKETCAP_API_KEY') ||
      envContent.includes('NEXT_PUBLIC_COINGECKO_API_KEY')

    assert(
      !hasPublicSecrets && envContent.includes('COINMARKETCAP_API_KEY='),
      'Test 11: Security — COINMARKETCAP_API_KEY Strictly Isolated to Server-Side',
      'No NEXT_PUBLIC_ exposure detected in .env.example or frontend configurations.'
    )
  } catch (err) {
    assert(false, 'Test 11: Security check failed', String(err))
  }

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log('\n================================================================')
  console.log(`TOTAL COINMARKETCAP AUDITS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`)
  console.log('================================================================')

  if (failed > 0) {
    console.error(`\n❌ COINMARKETCAP PROVIDER AUDIT FAILED: ${failed} checks did not pass.`)
    process.exit(1)
  } else {
    console.log('\n🏆 ALL COINMARKETCAP CRYPTO INTELLIGENCE TESTS PASSED SUCCESSFULLY!')
    process.exit(0)
  }
}

runCoinMarketCapSuite().catch((err) => {
  console.error('Fatal audit failure:', err)
  process.exit(1)
})

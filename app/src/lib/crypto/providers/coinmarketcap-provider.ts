/**
 * NEXUS Finance — CoinMarketCap Crypto Provider
 * Connects to CoinMarketCap's v1 Basic API with timeout, rate limit handling, and graceful fallback.
 * Strictly server-compatible: never exposes API keys to client.
 */

import type { CryptoPriceQuote, CryptoHistoricalPoint } from '@/types/crypto'
import { currencyService } from '@/lib/currency/currency-service'
import { MockCryptoProvider } from './mock-crypto-provider'

export class CoinMarketCapProvider {
  public providerName = 'CoinMarketCap API'
  private fallbackProvider = new MockCryptoProvider()
  private apiKey: string | null = null

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.COINMARKETCAP_API_KEY || null
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    }
    if (this.apiKey) {
      headers['X-CMC_PRO_API_KEY'] = this.apiKey
    }
    return headers
  }

  public async getPrice(symbol: string): Promise<CryptoPriceQuote> {
    const sym = symbol.toUpperCase().trim()

    // If no API key is provided, use deterministic fallback
    if (!this.apiKey) {
      return this.fallbackProvider.getPrice(sym)
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 4000)

      const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${encodeURIComponent(sym)}&convert=USD`
      const res = await fetch(url, {
        headers: this.getHeaders(),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!res.ok) {
        // Fallback on 429 (Rate Limit) or server errors
        console.warn(`[CoinMarketCapProvider] HTTP ${res.status}. Falling back to deterministic cache.`)
        return this.fallbackProvider.getPrice(sym)
      }

      const json = await res.json()
      if (json.status?.error_code !== 0 || !json.data) {
        return this.fallbackProvider.getPrice(sym)
      }

      const raw = json.data[sym]
      const item = Array.isArray(raw) ? raw[0] : raw
      if (!item || !item.quote?.USD || typeof item.quote.USD.price !== 'number') {
        return this.fallbackProvider.getPrice(sym)
      }

      const quoteUsd = item.quote.USD
      const priceUsd = quoteUsd.price
      const priceCop = currencyService.usdToCop(priceUsd)

      return {
        symbol: sym,
        name: item.name || sym,
        priceUsd,
        priceCop,
        change24hPercent: Math.round((quoteUsd.percent_change_24h || 0) * 100) / 100,
        change7dPercent:
          typeof quoteUsd.percent_change_7d === 'number'
            ? Math.round(quoteUsd.percent_change_7d * 100) / 100
            : undefined,
        change30dPercent:
          typeof quoteUsd.percent_change_30d === 'number'
            ? Math.round(quoteUsd.percent_change_30d * 100) / 100
            : undefined,
        marketCapUsd: quoteUsd.market_cap,
        volume24hUsd: quoteUsd.volume_24h,
        ranking: item.cmc_rank || undefined,
        updatedAt: quoteUsd.last_updated || new Date().toISOString(),
        source: this.providerName,
        isLive: true,
      }
    } catch {
      // Network timeout or offline recovery
      return this.fallbackProvider.getPrice(sym)
    }
  }

  public async getMultiplePrices(symbols: string[]): Promise<CryptoPriceQuote[]> {
    const cleanSymbols = symbols.map((s) => s.toUpperCase().trim()).filter(Boolean)
    if (cleanSymbols.length === 0) return []

    if (!this.apiKey) {
      return this.fallbackProvider.getMultiplePrices(cleanSymbols)
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 4500)

      const symbolsParam = encodeURIComponent(cleanSymbols.join(','))
      const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbolsParam}&convert=USD&skip_invalid=true`
      const res = await fetch(url, {
        headers: this.getHeaders(),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!res.ok) {
        console.warn(`[CoinMarketCapProvider] HTTP ${res.status}. Falling back to deterministic cache.`)
        return this.fallbackProvider.getMultiplePrices(cleanSymbols)
      }

      const json = await res.json()
      if (json.status?.error_code !== 0 || !json.data) {
        return this.fallbackProvider.getMultiplePrices(cleanSymbols)
      }

      return cleanSymbols.map((sym) => {
        const raw = json.data[sym]
        const item = Array.isArray(raw) ? raw[0] : raw
        if (!item || !item.quote?.USD || typeof item.quote.USD.price !== 'number') {
          return {
            symbol: sym,
            name: sym,
            priceUsd: 0,
            priceCop: 0,
            change24hPercent: 0,
            updatedAt: new Date().toISOString(),
            source: this.providerName,
            isLive: false,
          }
        }

        const quoteUsd = item.quote.USD
        const priceUsd = quoteUsd.price
        return {
          symbol: sym,
          name: item.name || sym,
          priceUsd,
          priceCop: currencyService.usdToCop(priceUsd),
          change24hPercent: Math.round((quoteUsd.percent_change_24h || 0) * 100) / 100,
          change7dPercent:
            typeof quoteUsd.percent_change_7d === 'number'
              ? Math.round(quoteUsd.percent_change_7d * 100) / 100
              : undefined,
          change30dPercent:
            typeof quoteUsd.percent_change_30d === 'number'
              ? Math.round(quoteUsd.percent_change_30d * 100) / 100
              : undefined,
          marketCapUsd: quoteUsd.market_cap,
          volume24hUsd: quoteUsd.volume_24h,
          ranking: item.cmc_rank || undefined,
          updatedAt: quoteUsd.last_updated || new Date().toISOString(),
          source: this.providerName,
          isLive: true,
        }
      })
    } catch {
      return this.fallbackProvider.getMultiplePrices(cleanSymbols)
    }
  }

  public async getMarketOverview(): Promise<CryptoPriceQuote[]> {
    const defaultSymbols = ['BTC', 'ETH', 'SOL', 'USDC', 'USDT', 'BNB']
    return this.getMultiplePrices(defaultSymbols)
  }

  public async getHistoricalPrices(symbol: string, days: number = 30): Promise<CryptoHistoricalPoint[]> {
    return this.fallbackProvider.getHistoricalPrices(symbol, days)
  }
}

export { CoinMarketCapProvider as CoinMarketCapCryptoProvider }

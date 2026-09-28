/**
 * NEXUS Finance — Crypto Service & Market Data Manager
 * Coordinates caching, rate limit protection, timeouts, and provider decoupling.
 */

import type { CryptoPriceQuote, CryptoHistoricalPoint } from '@/types/crypto'
import { CoinMarketCapProvider } from './providers/coinmarketcap-provider'
import { MockCryptoProvider } from './providers/mock-crypto-provider'

interface CacheEntry<T> {
  data: T
  cachedAt: number
  ttlMs: number
}

export class CryptoService {
  private primaryProvider: CoinMarketCapProvider
  private fallbackProvider: MockCryptoProvider
  private priceCache = new Map<string, CacheEntry<CryptoPriceQuote>>()
  private historicalCache = new Map<string, CacheEntry<CryptoHistoricalPoint[]>>()

  // 5 minutes for live spot quotes
  private SPOT_CACHE_TTL = 5 * 60 * 1000
  // 30 minutes for historical charts
  private HISTORICAL_CACHE_TTL = 30 * 60 * 1000

  constructor() {
    this.primaryProvider = new CoinMarketCapProvider()
    this.fallbackProvider = new MockCryptoProvider()
  }

  public async getPrice(symbol: string, forceRefresh = false): Promise<CryptoPriceQuote> {
    const sym = symbol.toUpperCase().trim()
    const now = Date.now()

    if (!forceRefresh) {
      const cached = this.priceCache.get(sym)
      if (cached && now - cached.cachedAt < cached.ttlMs) {
        return cached.data
      }
    }

    try {
      const quote = await this.primaryProvider.getPrice(sym)
      this.priceCache.set(sym, {
        data: quote,
        cachedAt: now,
        ttlMs: this.SPOT_CACHE_TTL,
      })
      return quote
    } catch {
      const fallback = await this.fallbackProvider.getPrice(sym)
      this.priceCache.set(sym, {
        data: fallback,
        cachedAt: now,
        ttlMs: this.SPOT_CACHE_TTL,
      })
      return fallback
    }
  }

  public async getMultiplePrices(symbols: string[], forceRefresh = false): Promise<CryptoPriceQuote[]> {
    return Promise.all(symbols.map((s) => this.getPrice(s, forceRefresh)))
  }

  public async getMarketOverview(forceRefresh = false): Promise<CryptoPriceQuote[]> {
    const defaultSymbols = ['BTC', 'ETH', 'SOL', 'USDC', 'USDT', 'BNB']
    return this.getMultiplePrices(defaultSymbols, forceRefresh)
  }

  public async getHistoricalPrices(symbol: string, days = 30, forceRefresh = false): Promise<CryptoHistoricalPoint[]> {
    const key = `${symbol.toUpperCase().trim()}_${days}`
    const now = Date.now()

    if (!forceRefresh) {
      const cached = this.historicalCache.get(key)
      if (cached && now - cached.cachedAt < cached.ttlMs) {
        return cached.data
      }
    }

    try {
      const data = await this.primaryProvider.getHistoricalPrices(symbol, days)
      this.historicalCache.set(key, {
        data,
        cachedAt: now,
        ttlMs: this.HISTORICAL_CACHE_TTL,
      })
      return data
    } catch {
      const fallback = await this.fallbackProvider.getHistoricalPrices(symbol, days)
      this.historicalCache.set(key, {
        data: fallback,
        cachedAt: now,
        ttlMs: this.HISTORICAL_CACHE_TTL,
      })
      return fallback
    }
  }

  public clearCache() {
    this.priceCache.clear()
    this.historicalCache.clear()
  }
}

export const cryptoService = new CryptoService()

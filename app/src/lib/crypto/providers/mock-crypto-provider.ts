/**
 * NEXUS Finance — Deterministic Mock Crypto Provider
 * Provides robust, offline market data fallback for tests, development, and rate-limit recovery.
 */

import type { CryptoPriceQuote, CryptoHistoricalPoint } from '@/types/crypto'
import { currencyService } from '@/lib/currency/currency-service'

interface SeedQuote {
  symbol: string
  name: string
  priceUsd: number
  change24hPercent: number
  change7dPercent: number
  change30dPercent: number
  marketCapUsd: number
  volume24hUsd: number
}

const SEED_MARKET: Record<string, SeedQuote> = {
  BTC: {
    symbol: 'BTC',
    name: 'Bitcoin',
    priceUsd: 64500.0,
    change24hPercent: 2.35,
    change7dPercent: 5.12,
    change30dPercent: 14.8,
    marketCapUsd: 1_270_000_000_000,
    volume24hUsd: 28_500_000_000,
  },
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    priceUsd: 3480.0,
    change24hPercent: 1.82,
    change7dPercent: 4.25,
    change30dPercent: 11.2,
    marketCapUsd: 418_000_000_000,
    volume24hUsd: 16_200_000_000,
  },
  SOL: {
    symbol: 'SOL',
    name: 'Solana',
    priceUsd: 152.5,
    change24hPercent: 4.65,
    change7dPercent: 9.8,
    change30dPercent: 24.5,
    marketCapUsd: 71_000_000_000,
    volume24hUsd: 3_800_000_000,
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    priceUsd: 1.0,
    change24hPercent: 0.01,
    change7dPercent: 0.02,
    change30dPercent: 0.01,
    marketCapUsd: 35_000_000_000,
    volume24hUsd: 5_200_000_000,
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    priceUsd: 1.0,
    change24hPercent: -0.02,
    change7dPercent: 0.01,
    change30dPercent: 0.03,
    marketCapUsd: 118_000_000_000,
    volume24hUsd: 45_000_000_000,
  },
  BNB: {
    symbol: 'BNB',
    name: 'BNB Chain',
    priceUsd: 585.0,
    change24hPercent: 0.95,
    change7dPercent: 2.1,
    change30dPercent: 6.4,
    marketCapUsd: 89_000_000_000,
    volume24hUsd: 1_200_000_000,
  },
  ADA: {
    symbol: 'ADA',
    name: 'Cardano',
    priceUsd: 0.38,
    change24hPercent: -1.2,
    change7dPercent: 1.5,
    change30dPercent: 4.8,
    marketCapUsd: 13_500_000_000,
    volume24hUsd: 350_000_000,
  },
}

export class MockCryptoProvider {
  public providerName = 'NEXUS Deterministic Crypto Engine'

  public async getPrice(symbol: string): Promise<CryptoPriceQuote> {
    const sym = symbol.toUpperCase().trim()
    const item = SEED_MARKET[sym] || {
      symbol: sym,
      name: sym,
      priceUsd: 0.0,
      change24hPercent: 0.0,
      change7dPercent: 0.0,
      change30dPercent: 0.0,
      marketCapUsd: 0,
      volume24hUsd: 0,
    }


    const priceCop = currencyService.usdToCop(item.priceUsd)

    return {
      symbol: item.symbol,
      name: item.name,
      priceUsd: item.priceUsd,
      priceCop,
      change24hPercent: item.change24hPercent,
      change7dPercent: item.change7dPercent,
      change30dPercent: item.change30dPercent,
      marketCapUsd: item.marketCapUsd,
      volume24hUsd: item.volume24hUsd,
      updatedAt: new Date().toISOString(),
      source: this.providerName,
      isLive: false,
    }
  }

  public async getMultiplePrices(symbols: string[]): Promise<CryptoPriceQuote[]> {
    return Promise.all(symbols.map((s) => this.getPrice(s)))
  }

  public async getMarketOverview(): Promise<CryptoPriceQuote[]> {
    const keys = Object.keys(SEED_MARKET)
    return this.getMultiplePrices(keys)
  }

  public async getHistoricalPrices(symbol: string, days: number = 30): Promise<CryptoHistoricalPoint[]> {
    const base = await this.getPrice(symbol)
    const points: CryptoHistoricalPoint[] = []
    const now = new Date()

    for (let i = days; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      // Slight smooth synthetic drift based on change30dPercent
      const progress = (days - i) / Math.max(1, days)
      const drift = 1 + ((base.change30dPercent || 5) / 100) * (progress - 0.5)
      const pUsd = Math.round(base.priceUsd * drift * 100) / 100
      const pCop = currencyService.usdToCop(pUsd)

      points.push({
        date: d.toISOString().split('T')[0],
        priceUsd: pUsd,
        priceCop: pCop,
      })
    }

    return points
  }
}

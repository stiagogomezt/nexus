/**
 * NEXUS Finance — Currency Conversion & Exchange Rate Layer
 * Provides clean, decoupled currency translation (USD <-> COP).
 * Protects Financial Engine from hardcoded currency assumptions.
 */

export interface CurrencyProvider {
  providerName: string
  getExchangeRate(from: string, to: string): Promise<number>
}

// Current benchmark rate COP/USD
const DEFAULT_USD_TO_COP_RATE = 4150.0

class CurrencyService {
  private currentUsdToCopRate: number = DEFAULT_USD_TO_COP_RATE
  private lastFetchedAt: string = new Date().toISOString()
  private customProvider: CurrencyProvider | null = null

  constructor(initialRate?: number) {
    if (initialRate && initialRate > 0) {
      this.currentUsdToCopRate = initialRate
    }
  }

  public setCustomProvider(provider: CurrencyProvider) {
    this.customProvider = provider
  }

  public setExchangeRate(rate: number) {
    if (rate > 0) {
      this.currentUsdToCopRate = rate
      this.lastFetchedAt = new Date().toISOString()
    }
  }

  public getUsdToCopRate(): number {
    return this.currentUsdToCopRate
  }

  public getLastFetchedAt(): string {
    return this.lastFetchedAt
  }

  public usdToCop(amountUsd: number, customRate?: number): number {
    const rate = customRate && customRate > 0 ? customRate : this.currentUsdToCopRate
    return Math.round(amountUsd * rate * 100) / 100
  }

  public copToUsd(amountCop: number, customRate?: number): number {
    const rate = customRate && customRate > 0 ? customRate : this.currentUsdToCopRate
    if (rate <= 0) return 0
    return Math.round((amountCop / rate) * 10000) / 10000
  }

  public async syncLiveRate(): Promise<number> {
    if (this.customProvider) {
      try {
        const liveRate = await this.customProvider.getExchangeRate('USD', 'COP')
        if (liveRate > 0) {
          this.setExchangeRate(liveRate)
          return liveRate
        }
      } catch (err) {
        console.warn('[CurrencyService] Fallback to cached exchange rate:', err)
      }
    }
    return this.currentUsdToCopRate
  }
}

export const currencyService = new CurrencyService()

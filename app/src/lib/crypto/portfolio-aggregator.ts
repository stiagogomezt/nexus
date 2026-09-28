/**
 * NEXUS Finance — Crypto Portfolio Aggregator
 * Consolidates manual crypto holdings and on-chain wallet balances into a unified,
 * deduplicated view. Computes total Crypto Net Worth, PnL, and asset allocation.
 */

import type {
  CryptoHolding,
  WalletAccount,
  OnChainBalanceItem,
  AggregatedCryptoPosition,
  CryptoNetWorthSummary,
  CryptoPriceQuote,
} from '@/types/crypto'
import { cryptoService } from '@/lib/crypto/crypto-service'
import { currencyService } from '@/lib/currency/currency-service'

export interface AggregatorInput {
  holdings: CryptoHolding[]
  wallets: WalletAccount[]
  walletBalances?: Map<string, OnChainBalanceItem[]>
  marketQuotes?: Map<string, CryptoPriceQuote>
}

export class PortfolioAggregator {
  /**
   * Aggregates manual holdings and wallet balances into deduplicated positions.
   */
  public static async aggregate(input: AggregatorInput): Promise<CryptoNetWorthSummary> {
    const { holdings, wallets, walletBalances } = input

    // Extract all unique symbols across holdings and wallets
    const symbolSet = new Set<string>()
    for (const h of holdings) {
      if (h.symbol) symbolSet.add(h.symbol.toUpperCase().trim())
    }

    if (walletBalances) {
      for (const balances of walletBalances.values()) {
        for (const b of balances) {
          if (b.tokenSymbol) symbolSet.add(b.tokenSymbol.toUpperCase().trim())
        }
      }
    }

    const uniqueSymbols = Array.from(symbolSet)

    // Fetch live or cached quotes for all symbols
    const quotesList = input.marketQuotes
      ? Array.from(input.marketQuotes.values())
      : await cryptoService.getMultiplePrices(uniqueSymbols)

    const quotesMap = new Map<string, CryptoPriceQuote>()
    for (const q of quotesList) {
      quotesMap.set(q.symbol.toUpperCase().trim(), q)
    }

    // Temporary accumulation bucket by symbol
    interface SymbolBucket {
      symbol: string
      assetName: string
      totalQuantity: number
      totalCostBasisUsd: number
      totalCostBasisCop: number
      sources: AggregatedCryptoPosition['sources']
    }

    const buckets = new Map<string, SymbolBucket>()

    const getOrCreateBucket = (sym: string, defaultName: string): SymbolBucket => {
      const upper = sym.toUpperCase().trim()
      let b = buckets.get(upper)
      if (!b) {
        b = {
          symbol: upper,
          assetName: defaultName,
          totalQuantity: 0,
          totalCostBasisUsd: 0,
          totalCostBasisCop: 0,
          sources: [],
        }
        buckets.set(upper, b)
      }
      return b
    }

    // 1. Process Manual Holdings
    for (const h of holdings) {
      const sym = h.symbol.toUpperCase().trim()
      const bucket = getOrCreateBucket(sym, h.asset || sym)
      const quote = quotesMap.get(sym)
      const curPriceUsd = quote?.priceUsd || h.purchase_price_usd
      const curPriceCop = quote?.priceCop || h.purchase_price_cop

      // If manual holding is linked to a wallet, the wallet on-chain reading will supply the live balance.
      // However, if no on-chain balance was provided, we use the manual quantity.
      const isLinkedToWallet = Boolean(h.wallet_id && wallets.some((w) => w.id === h.wallet_id))

      if (!isLinkedToWallet) {
        bucket.totalQuantity += h.quantity
        bucket.totalCostBasisUsd += h.quantity * h.purchase_price_usd
        bucket.totalCostBasisCop += h.quantity * h.purchase_price_cop

        bucket.sources.push({
          sourceType: 'manual',
          sourceId: h.id,
          sourceName: h.platform || 'Registro Manual',
          quantity: h.quantity,
          estimatedValueUsd: h.quantity * curPriceUsd,
          estimatedValueCop: h.quantity * curPriceCop,
        })
      } else {
        // Linked holding stores cost basis reference
        bucket.totalCostBasisUsd += h.quantity * h.purchase_price_usd
        bucket.totalCostBasisCop += h.quantity * h.purchase_price_cop
      }
    }

    // 2. Process On-Chain Wallets
    if (walletBalances) {
      for (const [walletId, balances] of walletBalances.entries()) {
        const wallet = wallets.find((w) => w.id === walletId)
        const walletName = wallet ? `${wallet.name} (${wallet.network_name})` : 'On-Chain Wallet'

        for (const bal of balances) {
          const sym = bal.tokenSymbol.toUpperCase().trim()
          const bucket = getOrCreateBucket(sym, bal.tokenName || sym)
          const quote = quotesMap.get(sym)
          const curPriceUsd = quote?.priceUsd || bal.priceUsd
          const curPriceCop = quote?.priceCop || bal.priceCop

          bucket.totalQuantity += bal.balance

          // If there was no manual cost basis for this wallet, assume purchase price = current price
          const existingCostBasis = bucket.totalCostBasisUsd
          if (existingCostBasis === 0) {
            bucket.totalCostBasisUsd += bal.balance * curPriceUsd
            bucket.totalCostBasisCop += bal.balance * curPriceCop
          }

          bucket.sources.push({
            sourceType: 'wallet',
            sourceId: walletId,
            sourceName: walletName,
            quantity: bal.balance,
            estimatedValueUsd: bal.balance * curPriceUsd,
            estimatedValueCop: bal.balance * curPriceCop,
          })
        }
      }
    }

    // 3. Compute Position Totals and Aggregated Metrics
    let totalPortfolioValueUsd = 0
    let totalPortfolioValueCop = 0
    let totalPortfolioCostBasisUsd = 0
    let totalPortfolioCostBasisCop = 0
    let total24hChangeUsd = 0

    const positions: AggregatedCryptoPosition[] = []

    for (const b of buckets.values()) {
      if (b.totalQuantity <= 0) continue

      const quote = quotesMap.get(b.symbol)
      const currentPriceUsd = quote?.priceUsd || 0
      const currentPriceCop = quote?.priceCop || currencyService.usdToCop(currentPriceUsd)
      const change24h = quote?.change24hPercent || 0

      const totalCurrentValueUsd = b.totalQuantity * currentPriceUsd
      const totalCurrentValueCop = b.totalQuantity * currentPriceCop

      const avgPurchaseUsd = b.totalCostBasisUsd / b.totalQuantity
      const avgPurchaseCop = b.totalCostBasisCop / b.totalQuantity

      const unrealizedPnLUsd = totalCurrentValueUsd - b.totalCostBasisUsd
      const unrealizedPnLCop = totalCurrentValueCop - b.totalCostBasisCop
      const unrealizedPnLPercent =
        b.totalCostBasisUsd > 0 ? (unrealizedPnLUsd / b.totalCostBasisUsd) * 100 : 0

      totalPortfolioValueUsd += totalCurrentValueUsd
      totalPortfolioValueCop += totalCurrentValueCop
      totalPortfolioCostBasisUsd += b.totalCostBasisUsd
      totalPortfolioCostBasisCop += b.totalCostBasisCop
      total24hChangeUsd += totalCurrentValueUsd * (change24h / 100)

      positions.push({
        symbol: b.symbol,
        assetName: b.assetName,
        totalQuantity: b.totalQuantity,
        averagePurchasePriceUsd: Math.round(avgPurchaseUsd * 100) / 100,
        averagePurchasePriceCop: Math.round(avgPurchaseCop),
        currentPriceUsd,
        currentPriceCop,
        totalCurrentValueUsd: Math.round(totalCurrentValueUsd * 100) / 100,
        totalCurrentValueCop: Math.round(totalCurrentValueCop),
        totalCostBasisUsd: Math.round(b.totalCostBasisUsd * 100) / 100,
        totalCostBasisCop: Math.round(b.totalCostBasisCop),
        unrealizedPnLUsd: Math.round(unrealizedPnLUsd * 100) / 100,
        unrealizedPnLCop: Math.round(unrealizedPnLCop),
        unrealizedPnLPercent: Math.round(unrealizedPnLPercent * 100) / 100,
        change24hPercent: change24h,
        sources: b.sources,
        allocationPercent: 0, // Assigned below once totalPortfolioValue is known
      })
    }

    // Assign allocation percentages and sort descending by value
    for (const pos of positions) {
      pos.allocationPercent =
        totalPortfolioValueUsd > 0
          ? Math.round((pos.totalCurrentValueUsd / totalPortfolioValueUsd) * 10000) / 100
          : 0
    }
    positions.sort((a, b) => b.totalCurrentValueUsd - a.totalCurrentValueUsd)

    // Distribution by Asset
    const distributionByAsset = positions.map((p) => ({
      symbol: p.symbol,
      name: p.assetName,
      valueCop: p.totalCurrentValueCop,
      percent: p.allocationPercent,
    }))

    // Distribution by Source (Manual vs specific Wallets)
    const sourceMap = new Map<string, number>()
    for (const pos of positions) {
      for (const src of pos.sources) {
        const cur = sourceMap.get(src.sourceName) || 0
        sourceMap.set(src.sourceName, cur + src.estimatedValueCop)
      }
    }

    const distributionBySource = Array.from(sourceMap.entries()).map(([source, val]) => ({
      source,
      valueCop: val,
      percent:
        totalPortfolioValueCop > 0 ? Math.round((val / totalPortfolioValueCop) * 10000) / 100 : 0,
    }))

    const totalPnLUsd = totalPortfolioValueUsd - totalPortfolioCostBasisUsd
    const totalPnLCop = totalPortfolioValueCop - totalPortfolioCostBasisCop
    const totalPnLPercent =
      totalPortfolioCostBasisUsd > 0 ? (totalPnLUsd / totalPortfolioCostBasisUsd) * 100 : 0

    return {
      totalValueUsd: Math.round(totalPortfolioValueUsd * 100) / 100,
      totalValueCop: Math.round(totalPortfolioValueCop),
      totalCostBasisUsd: Math.round(totalPortfolioCostBasisUsd * 100) / 100,
      totalCostBasisCop: Math.round(totalPortfolioCostBasisCop),
      unrealizedPnLUsd: Math.round(totalPnLUsd * 100) / 100,
      unrealizedPnLCop: Math.round(totalPnLCop),
      unrealizedPnLPercent: Math.round(totalPnLPercent * 100) / 100,
      change24hUsd: Math.round(total24hChangeUsd * 100) / 100,
      change24hCop: Math.round(currencyService.usdToCop(total24hChangeUsd)),
      totalHoldingsCount: holdings.length,
      activeWalletsCount: wallets.filter((w) => w.is_active).length,
      positions,
      distributionByAsset,
      distributionBySource,
      exchangeRateUsdToCop: currencyService.getUsdToCopRate(),
      lastUpdated: new Date().toISOString(),
    }
  }
}

/**
 * NEXUS Finance — Crypto Intelligence & Wallet Intelligence Types
 * Models domain entities for market quotes, manual holdings, on-chain wallets, and portfolio aggregation.
 */

export interface CryptoHolding {
  id: string
  user_id: string
  asset: string // e.g. "Bitcoin", "Ethereum", "Solana"
  symbol: string // e.g. "BTC", "ETH", "SOL", "USDC"
  quantity: number
  purchase_price_usd: number
  purchase_price_cop: number
  purchase_date: string // YYYY-MM-DD
  platform: string // "Binance", "Phantom", "Ledger", "Metamask", "Coinbase", "Manual"
  wallet_id?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface WalletAccount {
  id: string
  user_id: string
  name: string // "Mi Phantom Solana", "Ledger EVM Cold"
  address: string // Dirección pública (0x... o Base58)
  blockchain: 'evm' | 'solana' | 'bitcoin'
  network_name: string // "Ethereum", "Polygon", "Arbitrum", "Solana Mainnet"
  label: string // "Personal", "Cold Storage", "DeFi", "Trading"
  is_active: boolean
  last_synced_at?: string | null
  created_at: string
  updated_at?: string
}

export interface CryptoPriceQuote {
  symbol: string
  name: string
  priceUsd: number
  priceCop: number
  change24hPercent: number
  change7dPercent?: number
  change30dPercent?: number
  marketCapUsd?: number
  volume24hUsd?: number
  ranking?: number
  updatedAt: string
  source: string // e.g. "CoinMarketCap", "Deterministic Cache"
  isLive: boolean
}

export interface CryptoHistoricalPoint {
  date: string
  priceUsd: number
  priceCop: number
}

export interface OnChainBalanceItem {
  address: string
  blockchain: 'evm' | 'solana' | 'bitcoin'
  network: string
  tokenSymbol: string
  tokenName: string
  balance: number
  priceUsd: number
  priceCop: number
  estimatedValueUsd: number
  estimatedValueCop: number
  fetchedAt: string
  isNative?: boolean
}


export interface AggregatedCryptoPosition {
  symbol: string
  assetName: string
  totalQuantity: number
  averagePurchasePriceUsd: number
  averagePurchasePriceCop: number
  currentPriceUsd: number
  currentPriceCop: number
  totalCurrentValueUsd: number
  totalCurrentValueCop: number
  totalCostBasisUsd: number
  totalCostBasisCop: number
  unrealizedPnLUsd: number
  unrealizedPnLCop: number
  unrealizedPnLPercent: number
  change24hPercent: number
  sources: {
    sourceType: 'manual' | 'wallet'
    sourceId: string
    sourceName: string
    quantity: number
    estimatedValueUsd: number
    estimatedValueCop: number
  }[]
  allocationPercent: number
}

export interface CryptoNetWorthSummary {
  totalValueUsd: number
  totalValueCop: number
  totalCostBasisUsd: number
  totalCostBasisCop: number
  unrealizedPnLUsd: number
  unrealizedPnLCop: number
  unrealizedPnLPercent: number
  change24hUsd: number
  change24hCop: number
  totalHoldingsCount: number
  activeWalletsCount: number
  positions: AggregatedCryptoPosition[]
  distributionByAsset: {
    symbol: string
    name: string
    valueCop: number
    percent: number
  }[]
  distributionBySource: {
    source: string
    valueCop: number
    percent: number
  }[]
  exchangeRateUsdToCop: number
  lastUpdated: string
}

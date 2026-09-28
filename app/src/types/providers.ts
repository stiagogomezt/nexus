/**
 * NEXUS Finance — Future Integration Provider Contracts
 * Decouples external banking, crypto, wallet, exchange, and AI services from core business logic.
 */

// ─────────────────────────────────────────────
// 1. BANK & OPEN FINANCE PROVIDER
// ─────────────────────────────────────────────
export interface BankAccountMetadata {
  id: string
  institution_id: string
  institution_name: string
  account_number_mask: string
  account_type: 'checking' | 'savings' | 'credit_card' | 'investment'
  balance: number
  currency: string
  last_synced_at: string
}

export interface BankTransactionItem {
  id: string
  account_id: string
  date: string
  description: string
  amount: number
  category?: string
  pending: boolean
}

export interface BankProvider {
  providerName: string
  isAvailable(): Promise<boolean>
  connect(credentials: Record<string, unknown>): Promise<{ connectionId: string }>
  getAccounts(connectionId: string): Promise<BankAccountMetadata[]>
  getTransactions(
    accountId: string,
    startDate?: string,
    endDate?: string
  ): Promise<BankTransactionItem[]>
  syncBalance(accountId: string): Promise<number>
  disconnect(connectionId: string): Promise<void>
}

// ─────────────────────────────────────────────
// 2. CRYPTO & ON-CHAIN WALLET PROVIDERS
// ─────────────────────────────────────────────
export interface CryptoPriceQuote {
  symbol: string
  name: string
  priceUsd: number
  change24hPercent: number
  updatedAt: string
}

export interface CryptoProvider {
  providerName: string
  getPrice(symbol: string): Promise<CryptoPriceQuote>
  getMultiplePrices(symbols: string[]): Promise<CryptoPriceQuote[]>
  getMarketOverview(): Promise<CryptoPriceQuote[]>
}

export interface WalletBalanceItem {
  address: string
  network: 'ethereum' | 'bitcoin' | 'solana' | 'polygon' | 'arbitrum'
  tokenSymbol: string
  balance: number
  estimatedUsdValue: number
}

export interface WalletProvider {
  providerName: string
  // NOTE: Reads ONLY public public addresses. NEVER accepts or stores seed phrases or private keys.
  validateAddress(address: string, network: string): boolean
  getWalletBalances(address: string, network: string): Promise<WalletBalanceItem[]>
  getRecentTransactions(address: string, network: string, limit?: number): Promise<unknown[]>
}

// ─────────────────────────────────────────────
// 3. EXCHANGE PROVIDER (CEX / DEX)
// ─────────────────────────────────────────────
export interface ExchangeBalance {
  asset: string
  free: number
  locked: number
  total: number
}

export interface ExchangeProvider {
  exchangeName: string
  isConfigured(): boolean
  getBalances(apiKey: string): Promise<ExchangeBalance[]>
  getTicker(pair: string): Promise<{ symbol: string; lastPrice: number }>
}

// ─────────────────────────────────────────────
// 4. AI & AGENTIC PROVIDER
// ─────────────────────────────────────────────
export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_call_id?: string
  name?: string
}

export interface AIToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface AIResponse {
  message: AIMessage
  toolCalls?: AIToolCall[]
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface AIProvider {
  providerName: string
  generateResponse(
    messages: AIMessage[],
    tools?: Record<string, unknown>[]
  ): Promise<AIResponse>
  streamResponse?(
    messages: AIMessage[],
    tools?: Record<string, unknown>[],
    onChunk?: (chunk: string) => void
  ): Promise<AIResponse>
}

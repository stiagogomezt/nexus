/**
 * NEXUS Finance — Wallet Service & Public On-Chain Reader
 * Coordinates blockchain providers (EVM, Solana).
 * Strictly READ-ONLY: Never requests or stores private keys or seed phrases.
 */

import type { OnChainBalanceItem, WalletAccount } from '@/types/crypto'
import { EVMWalletProvider } from './providers/evm-wallet-provider'
import { SolanaWalletProvider } from './providers/solana-wallet-provider'

export class WalletService {
  private evmProvider: EVMWalletProvider
  private solanaProvider: SolanaWalletProvider

  constructor() {
    this.evmProvider = new EVMWalletProvider()
    this.solanaProvider = new SolanaWalletProvider()
  }

  public validateAddress(address: string, blockchain: 'evm' | 'solana' | 'bitcoin'): boolean {
    if (!address) return false
    const clean = address.trim()

    if (blockchain === 'evm') {
      return this.evmProvider.validateAddress(clean)
    }
    if (blockchain === 'solana') {
      return this.solanaProvider.validateAddress(clean)
    }
    if (blockchain === 'bitcoin') {
      // Basic Bitcoin address validation (Legacy, SegWit, Taproot: 1..., 3..., bc1...)
      return /^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$/.test(clean)
    }
    return false
  }

  public abbreviateAddress(address: string, blockchain: 'evm' | 'solana' | 'bitcoin' = 'evm'): string {
    if (blockchain === 'solana') {
      return this.solanaProvider.abbreviateAddress(address)
    }
    return this.evmProvider.abbreviateAddress(address)
  }

  public async getWalletBalances(wallet: WalletAccount): Promise<OnChainBalanceItem[]> {
    if (!wallet.is_active) return []

    if (wallet.blockchain === 'evm') {
      return this.evmProvider.getBalances(wallet.address, wallet.network_name)
    }
    if (wallet.blockchain === 'solana') {
      return this.solanaProvider.getBalances(wallet.address, wallet.network_name)
    }

    return []
  }

  public async getAllWalletsBalances(wallets: WalletAccount[]): Promise<Map<string, OnChainBalanceItem[]>> {
    const results = new Map<string, OnChainBalanceItem[]>()

    await Promise.all(
      wallets.map(async (w) => {
        try {
          const balances = await this.getWalletBalances(w)
          results.set(w.id, balances)
        } catch (err) {
          console.warn(`[WalletService] Error syncing wallet ${w.id}:`, err)
          results.set(w.id, [])
        }
      })
    )

    return results
  }
}

export const walletService = new WalletService()

'use client'

import React, { useState } from 'react'
import { useFinancialStore } from '@/store/financial'
import { formatCurrency } from '@/lib/utils'
import {
  Wallet,
  ShieldCheck,
  RefreshCw,
  Plus,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  Lock,
  Layers,
  Sparkles,
  AlertCircle,
} from 'lucide-react'
import { walletService } from '@/lib/wallets/wallet-service'

export function WalletsPage() {
  const {
    wallets,
    cryptoSummary,
    syncWallets,
    addWallet,
    removeWallet,
  } = useFinancialStore()

  const [isSyncing, setIsSyncing] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    name: 'Phantom Solana Hot',
    blockchain: 'solana' as 'evm' | 'solana',
    network_name: 'Solana Mainnet',
    address: '',
    label: 'Personal',
  })

  const handleCopy = (address: string, id: string) => {
    navigator.clipboard.writeText(address)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      await syncWallets()
    } finally {
      setIsSyncing(false)
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    const cleanAddress = formData.address.trim()
    const isValid = walletService.validateAddress(cleanAddress, formData.blockchain)
    if (!isValid) {
      setValidationError(
        `Dirección inválida para la blockchain ${formData.blockchain.toUpperCase()}. Verifica que no contenga espacios ni caracteres no permitidos.`
      )
      return
    }

    setIsSubmitting(true)
    try {
      await addWallet({
        name: formData.name.trim() || 'Billetera Pública',
        blockchain: formData.blockchain,
        network_name: formData.network_name.trim() || 'Mainnet',
        address: cleanAddress,
        label: formData.label.trim() || 'Personal',
        is_active: true,
      })

      setShowAddModal(false)
      setFormData({
        name: '',
        blockchain: 'evm',
        network_name: 'Ethereum Mainnet',
        address: '',
        label: 'Personal',
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar billetera'
      setValidationError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate estimated on-chain values
  const activeWallets = wallets.filter((w) => w.is_active)

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Wallet Intelligence
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Read Only
                </span>
              </h1>
              <p className="text-sm text-muted-foreground">
                Monitoreo de direcciones públicas on-chain en EVM (Ethereum/Polygon/Arbitrum) y Solana.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-surface border border-border hover:bg-surface-elevated transition-colors text-slate-200 disabled:opacity-50"
            title="Sincronizar balances on-chain de las billeteras"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-violet-400' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Actualizar'}</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold transition-colors shadow-lg shadow-violet-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Wallet</span>
          </button>
        </div>
      </div>

      {/* Security Assurance Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/30 to-violet-950/30 border border-emerald-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Seguridad y Privacidad Estricta
            </h4>
            <p className="text-xs text-slate-300 mt-0.5">
              NEXUS opera exclusivamente en modo <strong>READ-ONLY</strong>. Nunca almacena ni solicita frases de recuperación (seed phrases), claves privadas ni contraseñas.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Direcciones Públicas Seguras</span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-surface/70 border border-border/60 backdrop-blur-md">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Billeteras Registradas
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white">{wallets.length}</span>
            <span className="text-xs text-muted-foreground">({activeWallets.length} activas)</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Billeteras frías y calientes vinculadas para lectura de balances.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-surface/70 border border-border/60 backdrop-blur-md">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Redes Blockchain
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              EVM (ETH, MATIC)
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Solana (SOL, SPL)
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Soporte nativo y tokens estándar multichain.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-surface/70 border border-border/60 backdrop-blur-md">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Consultas On-Chain
          </p>
          <div className="mt-2 text-2xl font-extrabold text-white">
            Spot + RPC
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Valuación estimada en COP basada en cotizaciones de mercado en tiempo real.
          </p>
        </div>
      </div>

      {/* Wallets Cards List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-violet-400" />
            Billeteras Conectadas
          </h2>
          <span className="text-xs text-muted-foreground font-mono">
            {wallets.length} Registrada{wallets.length !== 1 ? 's' : ''}
          </span>
        </div>

        {wallets.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-surface/70 border border-border/60">
            <Wallet className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-white">No tienes billeteras registradas</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
              Registra tu dirección pública de Ethereum, Polygon o Solana para consultar tus saldos automáticamente.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Registrar Primera Billetera
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {wallets.map((w) => {
              const isCopied = copiedId === w.id
              const abbr = walletService.abbreviateAddress(w.address, w.blockchain)

              return (
                <div
                  key={w.id}
                  className="p-5 rounded-2xl bg-surface/70 border border-border/60 backdrop-blur-md space-y-4 hover:border-violet-500/40 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{w.name}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                            w.blockchain === 'solana'
                              ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                              : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                          }`}
                        >
                          {w.blockchain.toUpperCase()}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-surface-elevated text-slate-300 border border-border">
                          {w.label}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {w.network_name}
                      </div>
                    </div>

                    <button
                      onClick={() => removeWallet(w.id)}
                      className="p-1.5 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Eliminar billetera"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Address with copy */}
                  <div className="p-2.5 rounded-xl bg-surface-elevated/60 border border-border/40 flex items-center justify-between font-mono text-xs">
                    <span className="text-slate-300 select-all">{abbr}</span>
                    <button
                      onClick={() => handleCopy(w.address, w.id)}
                      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-white transition-colors"
                      title="Copiar dirección completa"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-sans">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span className="font-sans">Copiar</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Sync status */}
                  <div className="pt-2 border-t border-border/30 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Última sincronización:</span>
                    <span>{w.last_synced_at ? new Date(w.last_synced_at).toLocaleString('es-CO') : 'Pendiente'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Wallet Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-elevated border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-violet-400" />
                Registrar Billetera Pública
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-muted-foreground hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {validationError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{validationError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1">Nombre o Alias</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Mi Phantom Wallet"
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-white focus:border-violet-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1">Blockchain</label>
                  <select
                    value={formData.blockchain}
                    onChange={(e) => {
                      const bc = e.target.value as 'evm' | 'solana'
                      setFormData({
                        ...formData,
                        blockchain: bc,
                        network_name: bc === 'evm' ? 'Ethereum Mainnet' : 'Solana Mainnet',
                      })
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-white focus:border-violet-400 focus:outline-none"
                  >
                    <option value="solana">Solana (SOL)</option>
                    <option value="evm">EVM (ETH, Polygon)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Red</label>
                  <input
                    type="text"
                    required
                    value={formData.network_name}
                    onChange={(e) => setFormData({ ...formData, network_name: e.target.value })}
                    placeholder="Solana Mainnet"
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-white focus:border-violet-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">
                  Dirección Pública {formData.blockchain === 'evm' ? '(0x... 42 caracteres)' : '(Base58)'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder={
                    formData.blockchain === 'evm'
                      ? '0x71C81873E47b39E5D9051871C88172943A9F3a9F'
                      : '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
                  }
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-white font-mono focus:border-violet-400 focus:outline-none select-all"
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">Etiqueta / Uso</label>
                <select
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-white focus:border-violet-400 focus:outline-none"
                >
                  <option value="Personal">Personal</option>
                  <option value="Cold Storage">Cold Storage (Hardware)</option>
                  <option value="DeFi / Staking">DeFi / Staking</option>
                  <option value="Trading">Trading / Hot</option>
                </select>
              </div>

              <div className="p-2.5 rounded-lg bg-surface border border-border/60 text-[11px] text-muted-foreground flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Solo ingresa tu dirección pública. NUNCA ingreses tu frase semilla.</span>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-surface hover:bg-surface-elevated text-slate-300 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Verificando...' : 'Conectar Wallet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import React, { useState } from 'react'
import { useFinancialStore } from '@/store/financial'
import { formatCurrency } from '@/lib/utils'
import {
  Coins,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Plus,
  ShieldCheck,
  Wallet,
  ExternalLink,
  Trash2,
  PieChart,
  Layers,
  ArrowUpRight,
  Info,
  Clock,
} from 'lucide-react'
import type { CryptoHolding } from '@/types/crypto'

export function CryptoPage() {
  const {
    cryptoSummary,
    cryptoHoldings,
    wallets,
    metrics,
    refreshCryptoSummary,
    addCryptoHolding,
    removeCryptoHolding,
  } = useFinancialStore()

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    asset: 'Solana',
    symbol: 'SOL',
    quantity: '',
    purchase_price_usd: '',
    purchase_date: new Date().toISOString().split('T')[0],
    platform: 'Phantom Wallet',
    notes: '',
  })

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshCryptoSummary()
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.symbol || !formData.quantity) return

    setIsSubmitting(true)
    try {
      const qty = parseFloat(formData.quantity)
      const priceUsd = parseFloat(formData.purchase_price_usd) || 0
      const rate = cryptoSummary?.exchangeRateUsdToCop || 4150

      await addCryptoHolding({
        asset: formData.asset.trim() || formData.symbol.toUpperCase(),
        symbol: formData.symbol.toUpperCase().trim(),
        quantity: qty,
        purchase_price_usd: priceUsd,
        purchase_price_cop: Math.round(priceUsd * rate),
        purchase_date: formData.purchase_date,
        platform: formData.platform.trim() || 'Manual',
        wallet_id: null,
        notes: formData.notes.trim() || null,
      })

      setShowAddModal(false)
      setFormData({
        asset: 'Solana',
        symbol: 'SOL',
        quantity: '',
        purchase_price_usd: '',
        purchase_date: new Date().toISOString().split('T')[0],
        platform: 'Phantom Wallet',
        notes: '',
      })
    } catch (err) {
      console.error('Error adding crypto holding:', err)
      alert('Error al registrar criptoactivo')
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalCryptoCop = cryptoSummary?.totalValueCop ?? 0
  const totalCryptoUsd = cryptoSummary?.totalValueUsd ?? 0
  const pnlCop = cryptoSummary?.unrealizedPnLCop ?? 0
  const pnlPct = cryptoSummary?.unrealizedPnLPercent ?? 0
  const change24hCop = cryptoSummary?.change24hCop ?? 0
  const netWorthCop = metrics.net_worth > 0 ? metrics.net_worth : totalCryptoCop
  const cryptoWeight = netWorthCop > 0 ? (totalCryptoCop / netWorthCop) * 100 : 0
  const positions = cryptoSummary?.positions ?? []

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/40 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                Crypto Intelligence
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
                {cryptoSummary?.lastUpdated && (
                  <span className="text-[11px] font-normal text-slate-500 font-mono flex items-center gap-1 ml-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {new Date(cryptoSummary.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </h1>
              <p className="text-sm text-muted-foreground">
                Consolidación patrimonial de activos digitales, precios de mercado y billeteras on-chain.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-white border border-slate-200 hover:bg-white-elevated transition-colors text-slate-700 disabled:opacity-50"
            title="Actualizar cotizaciones y balances"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-600' : ''}`} />
            <span>{isRefreshing ? 'Actualizando...' : 'Actualizar Precios'}</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold transition-colors shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Cripto</span>
          </button>
        </div>
      </div>

      {/* Hero Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Crypto Net Worth */}
        <div className="p-5 rounded-2xl bg-white/70 border border-slate-200/60 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Coins className="w-16 h-16 text-amber-600" />
          </div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Total Patrimonio Crypto
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">
              {formatCurrency(totalCryptoCop)}
            </span>
          </div>
          <div className="mt-1 text-xs text-amber-600 font-mono font-medium">
            ≈ ${totalCryptoUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200/40 flex items-center justify-between text-xs text-muted-foreground">
            <span>Tasa de cambio:</span>
            <span className="font-mono text-slate-600">
              1 USD = ${cryptoSummary?.exchangeRateUsdToCop?.toLocaleString('es-CO')} COP
            </span>
          </div>
        </div>

        {/* Unrealized PnL */}
        <div className="p-5 rounded-2xl bg-white/70 border border-slate-200/60 backdrop-blur-md relative overflow-hidden">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Rendimiento No Realizado (PnL)
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-extrabold ${pnlCop >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {pnlCop >= 0 ? '+' : ''}{formatCurrency(pnlCop)}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold">
            {pnlPct >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-red-600" />
            )}
            <span className={pnlPct >= 0 ? 'text-emerald-600' : 'text-red-600'}>
              {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}% de retorno global
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200/40 flex items-center justify-between text-xs text-muted-foreground">
            <span>Costo de adquisición:</span>
            <span className="font-mono text-slate-600">
              {formatCurrency(cryptoSummary?.totalCostBasisCop ?? 0)}
            </span>
          </div>
        </div>

        {/* 24h Variation */}
        <div className="p-5 rounded-2xl bg-white/70 border border-slate-200/60 backdrop-blur-md relative overflow-hidden">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Variación Estimada 24h
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-extrabold ${change24hCop >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {change24hCop >= 0 ? '+' : ''}{formatCurrency(change24hCop)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Impacto acumulado de los movimientos de mercado en 24h
          </p>
          <div className="mt-4 pt-3 border-t border-slate-200/40 flex items-center justify-between text-xs text-muted-foreground">
            <span>Estado del mercado:</span>
            <span className="text-emerald-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              24h Spot Activo
            </span>
          </div>
        </div>

        {/* Crypto Weight in Net Worth */}
        <div className="p-5 rounded-2xl bg-white/70 border border-slate-200/60 backdrop-blur-md relative overflow-hidden">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Peso en Patrimonio Neto
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-cyan-600">
              {cryptoWeight.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2 w-full bg-white-elevated h-2 rounded-full overflow-hidden border border-slate-200/30">
            <div
              className="bg-cyan-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, cryptoWeight))}%` }}
            />
          </div>
          <div className="mt-3 pt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{cryptoHoldings.length} posiciones</span>
            <span>{wallets.filter((w) => w.is_active).length} billeteras on-chain</span>
          </div>
        </div>
      </div>

      {/* Conceptual Distinction Banner: PRECIO DE MERCADO vs VALOR DE MI TENENCIA */}
      <div className="p-4 rounded-xl bg-white/40 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <Info className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <span className="font-semibold text-slate-900">Diferenciación de Conceptos:</span>{' '}
            <span className="text-slate-600">
              <strong>Precio de Mercado (Spot)</strong> es el valor unitario suministrado por el proveedor externo, mientras que{' '}
              <strong>Valor de Mi Tenencia</strong> es el producto exacto de tu saldo (on-chain o registrado) por la cotización actual menos tu costo base.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground shrink-0 font-mono text-[11px]">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          <span>Cache TTL: 5m spot / 30m histórico</span>
        </div>
      </div>

      {/* Holdings & Positions Table */}
      <div className="rounded-2xl bg-white/70 border border-slate-200/60 backdrop-blur-md overflow-hidden">
        <div className="p-5 border-b border-slate-200/40 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" />
              Posiciones y Activos Consolidados
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Valuación individual por token combinando balances manuales y billeteras públicas sin duplicar activos.
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-white-elevated border border-slate-200 text-slate-600 font-mono">
            {positions.length} Activo{positions.length !== 1 ? 's' : ''}
          </span>
        </div>

        {positions.length === 0 ? (
          <div className="p-12 text-center">
            <Coins className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-slate-900">No tienes activos cripto registrados</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
              Registra tus tenencias manuales o vincula una billetera pública (EVM o Solana) para ver tu patrimonio en tiempo real.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Registrar Primer Criptoactivo
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white-elevated/40 border-b border-slate-200/40 text-muted-foreground uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Activo</th>
                  <th className="px-4 py-3.5 text-right">Cantidad</th>
                  <th className="px-4 py-3.5 text-right">Precio de Compra</th>
                  <th className="px-4 py-3.5 text-right">Precio de Mercado</th>
                  <th className="px-4 py-3.5 text-right">Valor de Tenencia</th>
                  <th className="px-4 py-3.5 text-right">PnL / Retorno</th>
                  <th className="px-4 py-3.5 text-center">Asignación</th>
                  <th className="px-4 py-3.5">Origen / Fuente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {positions.map((pos) => {
                  const isPositive = pos.unrealizedPnLCop >= 0
                  return (
                    <tr key={pos.symbol} className="hover:bg-white-elevated/30 transition-colors">
                      {/* Asset & Symbol */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-bold text-amber-600 text-xs">
                            {pos.symbol.substring(0, 3)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{pos.assetName}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">{pos.symbol}</div>
                          </div>
                        </div>
                      </td>

                      {/* Total Quantity */}
                      <td className="px-4 py-4 text-right font-mono text-slate-700">
                        {pos.totalQuantity.toLocaleString('en-US', { maximumFractionDigits: 6 })}
                      </td>

                      {/* Purchase Price (Cost Basis) */}
                      <td className="px-4 py-4 text-right">
                        <div className="font-mono text-slate-600">
                          ${pos.averagePurchasePriceUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {formatCurrency(pos.averagePurchasePriceCop)}
                        </div>
                      </td>

                      {/* Current Market Price (Spot) */}
                      <td className="px-4 py-4 text-right">
                        <div className="font-mono font-medium text-amber-600">
                          ${pos.currentPriceUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {formatCurrency(pos.currentPriceCop)}
                        </div>
                      </td>

                      {/* Total Holding Value */}
                      <td className="px-4 py-4 text-right">
                        <div className="font-mono font-semibold text-slate-900">
                          {formatCurrency(pos.totalCurrentValueCop)}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          ${pos.totalCurrentValueUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                        </div>
                      </td>

                      {/* Unrealized PnL */}
                      <td className="px-4 py-4 text-right">
                        <div className={`font-mono font-semibold flex items-center justify-end gap-1 ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                          {isPositive ? '+' : ''}{formatCurrency(pos.unrealizedPnLCop)}
                        </div>
                        <div className={`text-[10px] font-medium ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                          {isPositive ? '+' : ''}{pos.unrealizedPnLPercent.toFixed(2)}%
                        </div>
                      </td>

                      {/* Allocation % */}
                      <td className="px-4 py-4 text-center">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-white-elevated border border-slate-200 text-slate-600">
                          {pos.allocationPercent.toFixed(1)}%
                        </span>
                      </td>

                      {/* Sources */}
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          {pos.sources.map((src, i) => (
                            <span
                              key={i}
                              className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                src.sourceType === 'wallet'
                                  ? 'bg-violet-50 text-violet-600 border-violet-500/20'
                                  : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                              }`}
                            >
                              {src.sourceName}: {src.quantity}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Holdings Registry Section */}
      <div className="rounded-2xl bg-white/70 border border-slate-200/60 backdrop-blur-md p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Registros Manuales de Cripto
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Criptoactivos custodiados en exchanges o hardware wallets sin conexión on-chain directa.
            </p>
          </div>
        </div>

        {cryptoHoldings.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No hay registros manuales cargados.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {cryptoHoldings.map((h) => (
              <div
                key={h.id}
                className="p-3.5 rounded-xl bg-white-elevated/40 border border-slate-200/40 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">{h.symbol}</span>
                    <span className="text-[11px] text-muted-foreground">({h.asset})</span>
                  </div>
                  <div className="text-xs font-mono text-slate-600 mt-1">
                    {h.quantity} @ ${h.purchase_price_usd.toLocaleString('en-US')} USD
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {h.platform} • {h.purchase_date}
                  </div>
                </div>
                <button
                  onClick={() => removeCryptoHolding(h.id)}
                  className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-rose-500/10 rounded-lg transition-colors"
                  title="Eliminar posición"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Holding Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white-elevated border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/40 pb-3">
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-600" />
                Registrar Criptoactivo Manual
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-muted-foreground hover:text-slate-900 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1">Símbolo (ej. BTC, ETH, SOL)</label>
                  <input
                    type="text"
                    required
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                    placeholder="BTC"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 font-mono uppercase focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Nombre del Activo</label>
                  <input
                    type="text"
                    required
                    value={formData.asset}
                    onChange={(e) => setFormData({ ...formData, asset: e.target.value })}
                    placeholder="Bitcoin"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1">Cantidad</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="0.05"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Precio Compra (USD)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.purchase_price_usd}
                    onChange={(e) => setFormData({ ...formData, purchase_price_usd: e.target.value })}
                    placeholder="65000"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1">Fecha de Compra</label>
                  <input
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Plataforma / Custodio</label>
                  <input
                    type="text"
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                    placeholder="Phantom, Ledger, Binance"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">Notas (Opcional)</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Estrategia HODL a 5 años"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200/40">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-white hover:bg-white-elevated text-slate-600 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Posición'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}


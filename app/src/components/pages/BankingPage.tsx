'use client'

import React, { useState } from 'react'
import { useFinancialStore } from '@/store/financial'
import { formatCurrency } from '@/lib/utils'
import {
  Building2,
  ShieldCheck,
  RefreshCw,
  Plus,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  ExternalLink,
  Lock,
  Search,
  Filter,
  Check,
  Sparkles,
  Layers,
  Info,
} from 'lucide-react'
import { CSVBankProvider } from '@/lib/banking/providers/csv-bank-provider'
import type { BankReconciliationReport } from '@/types/banking'

export function BankingPage() {
  const {
    user,
    bankConnections,
    bankAccounts,
    bankTransactions,
    bankingCashFlow,
    syncBankConnection,
    addBankConnection,
    revokeBankConsent,
    importCSVStatement,
    reconcileAccount,
  } = useFinancialStore()

  const [isSyncing, setIsSyncing] = useState<string | null>(null)
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [showCSVModal, setShowCSVModal] = useState(false)
  const [selectedInstitution, setSelectedInstitution] = useState('bancolombia')
  const [csvContent, setCsvContent] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [csvPreview, setCsvPreview] = useState<ReturnType<typeof CSVBankProvider.parseStatement> | null>(null)
  const [csvSuccessMsg, setCsvSuccessMsg] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reconciliation state
  const [activeReconciliation, setActiveReconciliation] = useState<BankReconciliationReport | null>(null)

  // Transaction filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all')

  const totalBankBalance = bankAccounts
    .filter((a) => a.is_active)
    .reduce((sum, a) => sum + a.current_balance, 0)

  const handleSync = async (connectionId: string) => {
    setIsSyncing(connectionId)
    try {
      await syncBankConnection(connectionId)
    } finally {
      setIsSyncing(null)
    }
  }

  const handleConnectBank = async () => {
    setIsSubmitting(true)
    try {
      const instMap: Record<string, string> = {
        bancolombia: 'Bancolombia',
        nequi: 'Nequi',
        nu: 'Nu Colombia',
        davivienda: 'Davivienda',
      }
      await addBankConnection({
        user_id: user?.id || '',
        provider: 'open_finance',
        institution_id: selectedInstitution,
        institution_name: instMap[selectedInstitution] || 'Banco Aliado',
        institution_logo: null,
        consent_status: 'active',
        consent_scopes: ['accounts.read', 'balances.read', 'transactions.read'],
        consent_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        last_synced_at: new Date().toISOString(),
        sync_status: 'success',
        sync_error: null,
      })
      setShowConnectModal(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCSVPreview = () => {
    if (!csvContent.trim()) return
    const preview = CSVBankProvider.parseStatement(csvContent, {
      accountId: selectedAccountId || (bankAccounts[0]?.id ?? 'acc-default'),
      userId: user?.id || 'usr-guest',
    })
    setCsvPreview(preview)
  }

  const handleCSVImport = async () => {
    const accId = selectedAccountId || bankAccounts[0]?.id
    if (!accId || !csvContent.trim()) return

    setIsSubmitting(true)
    try {
      const result = await importCSVStatement(accId, csvContent)
      setCsvSuccessMsg(
        `Importación exitosa: ${result.importedCount} movimientos incorporados, ${result.duplicatesSkipped} duplicados omitidos.`
      )
      setCsvContent('')
      setCsvPreview(null)
      setTimeout(() => {
        setShowCSVModal(false)
        setCsvSuccessMsg(null)
      }, 2500)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReconcile = (accountId: string) => {
    const report = reconcileAccount(accountId)
    setActiveReconciliation(report)
  }

  // Filtered transactions
  const filteredTransactions = bankTransactions.filter((tx) => {
    const matchesSearch =
      tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.clean_merchant && tx.clean_merchant.toLowerCase().includes(searchQuery.toLowerCase())) ||
      tx.category.toLowerCase().includes(searchQuery.toLowerCase())

    if (!matchesSearch) return false

    if (selectedFilter === 'all') return true
    if (selectedFilter === 'transfer') return tx.is_internal_transfer || tx.transaction_type === 'transfer'
    return tx.transaction_type === selectedFilter
  })

  return (
    <div className="space-y-6">
      {/* Header Banner & Security Guarantee */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/30 border border-blue-500/20 backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Banking & Open Finance</h1>
            <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-blue-500/20 text-blue-600 border border-blue-500/30">
              Decreto 0368 / SFC 2026
            </span>
            <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700 border border-emerald-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> FAPI 2.0 Read-Only
            </span>
          </div>
          <p className="text-sm text-slate-600 max-w-2xl">
            Integración determinista de cuentas bancarias y extractos. Zero contraseñas guardadas, deduplicación de transferencias internas y conciliación automática con nóminas laborales.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCSVModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-white/[0.1] text-slate-900 border border-white/[0.1] transition-all text-sm font-medium"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Importar Extracto CSV
          </button>
          <button
            onClick={() => setShowConnectModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Conectar Banco
          </button>
        </div>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-white/80 border border-slate-200 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>SALDO TOTAL EN BANCOS</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {formatCurrency(totalBankBalance)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {bankAccounts.filter((a) => a.is_active).length} cuentas activas sincronizadas
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white/80 border border-slate-200 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>INGRESOS REALES (CASH IN)</span>
            <span className="text-emerald-600 font-mono text-xs">+Ingresos</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 tracking-tight">
            +{formatCurrency(bankingCashFlow?.total_cash_in ?? 0)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Excluye transferencias entre cuentas propias
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white/80 border border-slate-200 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>EGRESOS REALES (CASH OUT)</span>
            <span className="text-red-600 font-mono text-xs">-Gastos</span>
          </div>
          <div className="text-2xl font-bold text-red-600 tracking-tight">
            -{formatCurrency(bankingCashFlow?.total_cash_out ?? 0)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gastos y pagos directos confirmados
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white/80 border border-slate-200 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>TRANSFERENCIAS INTERNAS</span>
            <ArrowRightLeft className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-600 tracking-tight">
            {formatCurrency(bankingCashFlow?.internal_transfers_volume ?? 0)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Identificadas y neutralizadas en cash flow
          </p>
        </div>
      </div>

      {/* Connected Accounts Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Cuentas y Conexiones Bancarias
          </h2>
          <span className="text-xs text-slate-500">
            {bankConnections.length} entidades vinculadas
          </span>
        </div>

        {bankAccounts.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center space-y-2">
            <Building2 className="w-10 h-10 text-slate-600 mx-auto mb-1" />
            <p className="text-sm font-bold text-slate-700">No tienes cuentas bancarias conectadas</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Conecta una cuenta o importa tus extractos oficiales en CSV para conciliar tus transacciones y detectar nóminas automáticamente.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={() => setShowConnectModal(true)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md"
              >
                Conectar Banco
              </button>
              <button
                onClick={() => setShowCSVModal(true)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-white/[0.1] text-slate-700 text-xs font-bold transition-all border border-slate-200"
              >
                Importar Extracto CSV
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bankAccounts.map((account) => {
            const conn = bankConnections.find((c) => c.id === account.connection_id)
            const isSyncingThis = isSyncing === account.connection_id

            return (
              <div
                key={account.id}
                className="p-5 rounded-2xl bg-gradient-to-b from-[#121626]/90 to-[#0d0f1a]/90 border border-slate-200 hover:border-blue-500/30 transition-all space-y-4 shadow-lg shadow-black/20"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/20">
                      {account.institution_name}
                    </span>
                    <h3 className="font-semibold text-slate-900 text-base leading-tight">
                      {account.account_name}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      No. {account.masked_account_number} ·{' '}
                      {account.account_type === 'savings'
                        ? 'Cuenta de Ahorros'
                        : account.account_type === 'digital_wallet'
                        ? 'Billetera Digital'
                        : 'Cuenta Corriente'}
                    </p>
                  </div>

                  <span
                    className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                      conn?.consent_status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-red-600 border border-rose-500/20'
                    }`}
                  >
                    {conn?.consent_status === 'active' ? 'Conectado' : 'Revocado'}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-end justify-between">
                  <div>
                    <span className="text-[11px] text-slate-500 font-medium">Saldo Disponible</span>
                    <div className="text-xl font-bold text-slate-900">
                      {formatCurrency(account.available_balance)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleReconcile(account.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-white/[0.1] text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
                      title="Conciliar movimientos vs extracto"
                    >
                      Conciliar
                    </button>
                    {account.connection_id && (
                      <button
                        onClick={() => handleSync(account.connection_id!)}
                        disabled={isSyncingThis}
                        className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 border border-blue-500/20 transition-colors disabled:opacity-50"
                        title="Sincronizar saldo y transacciones"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncingThis ? 'animate-spin' : ''}`} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                  <span>Última sincronización:</span>
                  <span>
                    {account.last_synced_at
                      ? new Date(account.last_synced_at).toLocaleString('es-CO', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Pendiente'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
        )}
      </div>

      {/* Reconciliation Report Modal / Section if active */}
      {activeReconciliation && (
        <div className="p-6 rounded-2xl bg-[#111422] border border-blue-500/30 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="font-semibold text-slate-900 text-base">
                Reporte de Conciliación Determinista — {activeReconciliation.account_name}
              </h3>
            </div>
            <button
              onClick={() => setActiveReconciliation(null)}
              className="text-xs text-slate-500 hover:text-slate-900 px-2 py-1 rounded bg-slate-100"
            >
              Cerrar Reporte
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500">Saldo Bancario Reportado</span>
              <div className="text-lg font-bold text-slate-900">
                {formatCurrency(activeReconciliation.reported_bank_balance)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500">Saldo Calculado por Transacciones</span>
              <div className="text-lg font-bold text-slate-900">
                {formatCurrency(activeReconciliation.calculated_ledger_balance)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500">Discrepancia Neta</span>
              <div
                className={`text-lg font-bold ${
                  activeReconciliation.status === 'balanced'
                    ? 'text-emerald-600'
                    : 'text-amber-600'
                }`}
              >
                {activeReconciliation.status === 'balanced'
                  ? 'Sin discrepancia ($0)'
                  : formatCurrency(activeReconciliation.discrepancy)}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200 flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0 text-blue-600" />
            <span>
              <strong>Regla de oro NEXUS:</strong> Los datos bancarios nunca se alteran automáticamente sin confirmación explícita del usuario.
            </span>
          </div>
        </div>
      )}

      {/* Transactions Ledger Table */}
      <div className="p-6 rounded-2xl bg-white/80 border border-slate-200 backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900">Libro Canónico de Movimientos</h2>
            <p className="text-xs text-slate-500">
              Transacciones unificadas y enriquecidas con detección de comercios colombianos
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por comercio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-900 text-xs placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Filter pills */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-medium">
              <button
                onClick={() => setSelectedFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  selectedFilter === 'all'
                    ? 'bg-blue-600 text-slate-900'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setSelectedFilter('income')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  selectedFilter === 'income'
                    ? 'bg-emerald-600 text-slate-900'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Ingresos
              </button>
              <button
                onClick={() => setSelectedFilter('expense')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  selectedFilter === 'expense'
                    ? 'bg-rose-600 text-slate-900'
                    : 'text-slate-500 hover:text-white'
                }`}
              >
                Gastos
              </button>
              <button
                onClick={() => setSelectedFilter('transfer')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  selectedFilter === 'transfer'
                    ? 'bg-amber-600 text-white'
                    : 'text-slate-500 hover:text-white'
                }`}
              >
                Transferencias
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-xs font-medium">
                <th className="pb-3 font-medium">Fecha</th>
                <th className="pb-3 font-medium">Comercio / Descripción</th>
                <th className="pb-3 font-medium">Categoría</th>
                <th className="pb-3 font-medium">Tipo & Conciliación</th>
                <th className="pb-3 font-medium text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                    No se encontraron transacciones con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 font-mono text-xs text-slate-500">{tx.date}</td>
                    <td className="py-3">
                      <div className="font-medium text-slate-900">{tx.clean_merchant || tx.description}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">{tx.description}</div>
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 text-xs rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                        {tx.category}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1.5">
                        {tx.is_internal_transfer ? (
                          <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-50 text-amber-600 border border-amber-500/20 flex items-center gap-1">
                            <ArrowRightLeft className="w-2.5 h-2.5" /> Transferencia Interna
                          </span>
                        ) : tx.linked_income_id ? (
                          <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-50 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" /> Nómina Conciliada
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 capitalize">{tx.transaction_type}</span>
                        )}
                      </div>
                    </td>
                    <td
                      className={`py-3 text-right font-mono font-medium ${
                        tx.is_internal_transfer
                          ? 'text-amber-600'
                          : tx.transaction_type === 'income'
                          ? 'text-emerald-600'
                          : 'text-red-600'
                      }`}
                    >
                      {tx.transaction_type === 'income' ? '+' : '-'}
                      {formatCurrency(tx.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Connect Bank Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#0f121f] border border-white/[0.1] space-y-5 shadow-2xl">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Conectar Entidad Bancaria
              </h3>
              <p className="text-xs text-slate-500">
                Flujo seguro Open Finance conforme a estándares SFC y Decreto 0368 de 2026.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-blue-600">
                <Lock className="w-3.5 h-3.5" /> Principio de Privacidad Absoluta
              </div>
              <p>
                NEXUS nunca te pedirá tu clave de internet, PIN, OTP o contraseña. Serás redirigido mediante OAuth 2.0 PKCE a la autenticación oficial de tu banco emisor.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600">Selecciona tu institución</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'bancolombia', name: 'Bancolombia' },
                  { id: 'nequi', name: 'Nequi' },
                  { id: 'nu', name: 'Nu Colombia' },
                  { id: 'davivienda', name: 'Davivienda' },
                ].map((inst) => (
                  <button
                    key={inst.id}
                    type="button"
                    onClick={() => setSelectedInstitution(inst.id)}
                    className={`p-3 rounded-xl border text-left text-xs font-medium transition-all ${
                      selectedInstitution === inst.id
                        ? 'bg-blue-600/20 border-blue-500 text-white'
                        : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {inst.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-medium text-slate-600">Permisos solicitados (Solo Lectura)</span>
              <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside">
                <li>Consulta de saldos de cuentas</li>
                <li>Historial de movimientos y transacciones</li>
                <li>Identificación de transferencias internas</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConnectModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-white/[0.1] text-xs font-medium text-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConnectBank}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Iniciando conexión...' : 'Autorizar en Pasarela Bancaria'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showCSVModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
          <div className="w-full max-w-xl p-6 rounded-2xl bg-[#0f121f] border border-white/[0.1] space-y-5 shadow-2xl">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                Importar Extracto Bancario (CSV)
              </h3>
              <p className="text-xs text-slate-500">
                Pega el contenido o columnas de tu extracto de Bancolombia, Nequi, Nu o Davivienda.
              </p>
            </div>

            {csvSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 text-xs flex items-center gap-2">
                <Check className="w-4 h-4" /> {csvSuccessMsg}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600">Cuenta de destino</label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-500"
              >
                {bankAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id} className="bg-[#0f121f] text-slate-900">
                    {acc.institution_name} — {acc.account_name} ({acc.masked_account_number})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-600">Contenido CSV / Extracto</label>
                <label className="cursor-pointer text-[11px] text-emerald-600 hover:text-emerald-600 transition-colors flex items-center gap-1 font-medium">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Cargar archivo .csv</span>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const reader = new FileReader()
                      reader.onload = (event) => {
                        const content = (event.target?.result as string) || ''
                        setCsvContent(content)
                        if (content.trim()) {
                          const preview = CSVBankProvider.parseStatement(content, {
                            accountId: selectedAccountId || (bankAccounts[0]?.id ?? 'acc-default'),
                            userId: 'usr-kevin-001',
                          })
                          setCsvPreview(preview)
                        }
                      }
                      reader.readAsText(file)
                    }}
                  />
                </label>
              </div>
              <textarea
                rows={5}
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                placeholder="Fecha,Descripción,Valor&#10;2026-09-15,PAGO NOMINA SHUFFLER,2100000&#10;2026-09-18,ALMACENES EXITO,-185000"
                className="w-full p-3 font-mono text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-700 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {csvPreview && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-3">
                <div className="font-semibold text-slate-900 flex items-center justify-between border-b border-slate-200 pb-2">
                  <span>Filas válidas: <strong className="text-slate-900">{csvPreview.valid_rows}</strong></span>
                  <span className="text-emerald-600 font-mono">Entidad: {csvPreview.institution_suggested}</span>
                  {csvPreview.potential_duplicates > 0 && (
                    <span className="text-amber-600 text-[11px] flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {csvPreview.potential_duplicates} duplicados prevenidos
                    </span>
                  )}
                </div>

                {csvPreview.sample_transactions.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[11px] text-slate-500 font-medium">Muestra de movimientos detectados:</p>
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px]">
                      {csvPreview.sample_transactions.slice(0, 4).map((tx, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/20 border border-slate-100">
                          <div className="truncate max-w-[240px]">
                            <span className="text-slate-500 mr-2">{tx.date}</span>
                            <span className="text-slate-700 font-sans">{tx.clean_merchant || tx.description}</span>
                          </div>
                          <span className={tx.transaction_type === 'income' ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                            {tx.transaction_type === 'income' ? '+' : '-'}{formatCurrency(tx.amount ?? 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-[10px] text-slate-500 pt-1">
                  Columnas identificadas: {csvPreview.detected_columns.join(', ')}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleCSVPreview}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-white/[0.1] text-xs font-medium text-slate-600 transition-colors"
              >
                Previsualizar
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCSVModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-white/[0.1] text-xs font-medium text-slate-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCSVImport}
                  disabled={isSubmitting || !csvContent.trim()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Importando...' : 'Confirmar Importación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



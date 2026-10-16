'use client'

import React, { useState, useMemo } from 'react'
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
  FileUp,
  XCircle,
  HelpCircle,
} from 'lucide-react'
import { CSVBankProvider } from '@/lib/banking/providers/csv-bank-provider'
import type { BankReconciliationReport, BankConnectionState, DataProvenance } from '@/types/banking'
import { DocumentImportModal } from '@/components/ui/DocumentImportModal'
import { getInstitutionCatalog, getInstitutionById, hasOpenFinanceCredentials } from '@/lib/banking/institution-catalog'

function getProvenanceBadge(provenance?: DataProvenance) {
  switch (provenance) {
    case 'OPEN_FINANCE':
      return { label: 'LIVE · OPEN FINANCE', className: 'bg-blue-50 border-blue-200 text-blue-700' }
    case 'PDF':
      return { label: 'IMPORTADO — PDF', className: 'bg-purple-50 border-purple-200 text-purple-700' }
    case 'IMAGE':
      return { label: 'IMPORTADO — IMAGEN', className: 'bg-indigo-50 border-indigo-200 text-indigo-700' }
    case 'CSV':
      return { label: 'IMPORTADO — CSV', className: 'bg-emerald-50 border-emerald-200 text-emerald-700' }
    case 'WALLET':
      return { label: 'ON-CHAIN · WALLET', className: 'bg-amber-50 border-amber-200 text-amber-700' }
    case 'AI':
      return { label: 'PROCESADO CON IA', className: 'bg-pink-50 border-pink-200 text-pink-700' }
    default:
      return { label: 'MANUAL', className: 'bg-slate-100 border-slate-200 text-slate-600' }
  }
}

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
    isDemoMode,
  } = useFinancialStore()

  const [isSyncing, setIsSyncing] = useState<string | null>(null)
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [showCSVModal, setShowCSVModal] = useState(false)
  const [showDocModal, setShowDocModal] = useState(false)
  const [selectedInstitutionId, setSelectedInstitutionId] = useState('falabella')
  const [csvContent, setCsvContent] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [csvPreview, setCsvPreview] = useState<ReturnType<typeof CSVBankProvider.parseStatement> | null>(null)
  const [csvSuccessMsg, setCsvSuccessMsg] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)

  // Reconciliation state
  const [activeReconciliation, setActiveReconciliation] = useState<BankReconciliationReport | null>(null)

  // Transaction filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all')

  const catalog = useMemo(() => getInstitutionCatalog(), [])
  const selectedInstitution = useMemo(
    () => catalog.find((i) => i.id === selectedInstitutionId) || catalog[0],
    [catalog, selectedInstitutionId]
  )

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
    setConnectError(null)

    // Si la institución no está disponible para conexión automática en vivo
    if (selectedInstitution.availability_status === 'UNAVAILABLE') {
      setConnectError(
        selectedInstitution.unavailability_reason ||
          'Esta institución todavía no está disponible para conexión automática.'
      )
      return
    }

    setIsSubmitting(true)
    try {
      await addBankConnection({
        user_id: user?.id || '',
        provider: 'open_finance',
        institution_id: selectedInstitution.id,
        institution_name: selectedInstitution.name,
        institution_logo: null,
        consent_status: 'active',
        consent_scopes: ['accounts.read', 'balances.read', 'transactions.read'],
        consent_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        last_synced_at: new Date().toISOString(),
        sync_status: 'syncing',
        connection_state: 'CONNECTING',
        data_provenance: 'OPEN_FINANCE',
        sync_error: null,
      })
      setShowConnectModal(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al conectar'
      setConnectError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCSVPreview = () => {
    if (!csvContent.trim()) return
    const preview = CSVBankProvider.parseStatement(csvContent, {
      accountId: selectedAccountId || (bankAccounts[0]?.id ?? 'acc-default'),
      userId: user?.id || '',
      institutionHint: selectedInstitution?.name,
    })
    setCsvPreview(preview)
  }

  const handleCSVImport = async () => {
    const accId = selectedAccountId || bankAccounts[0]?.id
    if (!accId || !csvContent.trim()) return

    setIsSubmitting(true)
    try {
      const result = await importCSVStatement(accId, csvContent, selectedInstitution?.name)
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
      <div
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs"
      >
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Banking & Open Finance</h1>
            <span
              className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200"
            >
              Decreto 0368 / SFC 2026
            </span>
            <span
              className="px-2.5 py-0.5 text-xs font-semibold rounded-full flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200"
            >
              <ShieldCheck className="w-3 h-3" /> FAPI 2.0 Read-Only
            </span>
            <span
              className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                isDemoMode
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {isDemoMode ? 'DATOS DE DEMOSTRACIÓN' : 'DATOS REALES'}
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            Integración determinista de cuentas bancarias y extractos. Zero contraseñas guardadas, deduplicación de transferencias internas y conciliación automática con nóminas laborales.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowDocModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100"
          >
            <FileUp className="w-4 h-4" />
            Escanear Extracto (PDF/Foto)
          </button>
          <button
            onClick={() => setShowCSVModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Importar CSV
          </button>
          <button
            onClick={() => setShowConnectModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all text-xs font-semibold"
          >
            <Plus className="w-4 h-4" />
            + Conectar Cuenta
          </button>
        </div>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1.5">
            <span>LIQUIDEZ TOTAL EN BANCOS</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight tabular-nums">
            {formatCurrency(totalBankBalance)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {bankAccounts.filter((a) => a.is_active).length} cuentas activas registradas
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1.5">
            <span>INGRESOS REALES (CASH IN)</span>
            <span className="text-emerald-600 font-mono text-[11px] font-semibold">+Entradas</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 tracking-tight tabular-nums">
            +{formatCurrency(bankingCashFlow?.total_cash_in ?? 0)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Excluye transferencias entre cuentas propias
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1.5">
            <span>EGRESOS REALES (CASH OUT)</span>
            <span className="text-red-600 font-mono text-[11px] font-semibold">-Salidas</span>
          </div>
          <div className="text-2xl font-bold text-red-600 tracking-tight tabular-nums">
            -{formatCurrency(bankingCashFlow?.total_cash_out ?? 0)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Gastos y pagos directos confirmados
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1.5">
            <span>TRANSFERENCIAS INTERNAS</span>
            <ArrowRightLeft className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-600 tracking-tight tabular-nums">
            {formatCurrency(bankingCashFlow?.internal_transfers_volume ?? 0)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Neutralizadas en flujo de caja (sin doble conteo)
          </p>
        </div>
      </div>

      {/* Connected Accounts Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            Mis Cuentas Bancarias
          </h2>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setSelectedInstitutionId('falabella')
                setShowConnectModal(true)
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Conectar banco
            </button>
            <span className="text-xs text-slate-400">
              {bankAccounts.length} {bankAccounts.length === 1 ? 'cuenta' : 'cuentas'} en cartera
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Banco Falabella — Banco Principal del Usuario */}
          {!bankAccounts.some((a) => a.institution_name.toLowerCase().includes('falabella')) && (
            <div className="p-5 rounded-2xl bg-white border border-slate-200 border-dashed hover:border-blue-400 transition-all space-y-4 shadow-xs">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Banco Falabella Colombia
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border bg-slate-100 border-slate-200 text-slate-600">
                      Banco Principal
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base leading-tight">
                    Cuenta de Ahorros
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    No. Sin conectar · Ahorros
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full border bg-slate-100 text-slate-700 border-slate-200">
                    No conectado
                  </span>
                  <span className="px-2 py-0.5 text-[9px] font-semibold rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                    Conexión automática no disponible
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Conexión directa AISP no configurada bajo Decreto 0368 de 2026. Importa tu extracto oficial (PDF, Foto o CSV) para consultar tus saldos y movimientos reales sin intermediarios ni contraseñas.
              </p>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowDocModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <FileUp className="w-3.5 h-3.5" />
                    Importar extracto (PDF / Foto)
                  </button>
                  <button
                    onClick={() => setShowCSVModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all border border-slate-200 flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    CSV
                  </button>
                </div>

                <button
                  onClick={() => {
                    setSelectedInstitutionId('falabella')
                    setShowConnectModal(true)
                  }}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-all border border-blue-200 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Conectar banco
                </button>
              </div>
            </div>
          )}

          {/* Cuentas Bancarias Registradas */}
          {bankAccounts.map((account) => {
            const conn = bankConnections.find((c) => c.id === account.connection_id)
            const isSyncingThis = isSyncing === account.connection_id
            const provenance = account.data_provenance || conn?.data_provenance || 'MANUAL'
            const provBadge = getProvenanceBadge(provenance)
            const connectionState = account.connection_state || conn?.connection_state || 'CONNECTED'

            return (
              <div
                key={account.id}
                className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 transition-all space-y-4 shadow-xs"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                        {account.institution_name}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border ${provBadge.className}`}
                      >
                        {provBadge.label}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-base leading-tight">
                      {account.account_name}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      No. {account.masked_account_number} ·{' '}
                      {account.account_type === 'savings'
                        ? 'Ahorros'
                        : account.account_type === 'digital_wallet'
                        ? 'Billetera Digital'
                        : 'Corriente'}
                    </p>
                  </div>

                  <span
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                      connectionState === 'SYNCED' || connectionState === 'CONNECTED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : connectionState === 'UNAVAILABLE'
                        ? 'bg-slate-100 text-slate-600 border-slate-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {connectionState}
                  </span>
                </div>

                  <div className="pt-2 border-t border-slate-100 flex items-end justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 font-medium">Saldo Disponible</span>
                      <div className="text-xl font-bold text-slate-900 tabular-nums">
                        {formatCurrency(account.available_balance)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleReconcile(account.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 transition-colors"
                        title="Conciliar movimientos vs extracto"
                      >
                        Conciliar
                      </button>
                      {account.connection_id && provenance === 'OPEN_FINANCE' && (
                        <button
                          onClick={() => handleSync(account.connection_id!)}
                          disabled={isSyncingThis}
                          className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors disabled:opacity-50"
                          title="Sincronizar saldo y transacciones"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isSyncingThis ? 'animate-spin' : ''}`} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-50">
                    <span>Última sincronización:</span>
                    <span className="font-medium text-slate-600">
                      {account.last_synced_at
                        ? new Date(account.last_synced_at).toLocaleString('es-CO', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Manual'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
      </div>

      {/* Reconciliation Report Modal / Section if active */}
      {activeReconciliation && (
        <div className="p-6 rounded-2xl bg-white border border-blue-200 shadow-sm space-y-4">
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

          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0 text-blue-600" />
            <span>
              <strong>Regla de oro NEXUS:</strong> Los datos bancarios nunca se alteran automáticamente sin confirmación explícita del usuario.
            </span>
          </div>
        </div>
      )}

      {/* Transactions Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Movimientos Bancarios</h2>
            <p className="text-xs text-slate-400">
              {filteredTransactions.length} de {bankTransactions.length} transacciones registradas
            </p>
          </div>

          {/* Filters & Search */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar comercio o concepto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs">
              <button
                onClick={() => setSelectedFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  selectedFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setSelectedFilter('income')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  selectedFilter === 'income'
                    ? 'bg-emerald-50 text-emerald-700 shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Ingresos
              </button>
              <button
                onClick={() => setSelectedFilter('expense')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  selectedFilter === 'expense'
                    ? 'bg-rose-50 text-rose-700 shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Gastos
              </button>
              <button
                onClick={() => setSelectedFilter('transfer')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  selectedFilter === 'transfer'
                    ? 'bg-amber-50 text-amber-700 shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Transferencias
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-xs font-semibold bg-slate-50/50">
                <th className="py-3 px-4 font-semibold">Fecha</th>
                <th className="py-3 px-4 font-semibold">Comercio / Detalle</th>
                <th className="py-3 px-4 font-semibold">Origen</th>
                <th className="py-3 px-4 font-semibold">Categoría</th>
                <th className="py-3 px-4 font-semibold">Tipo & Conciliación</th>
                <th className="py-3 px-4 font-semibold text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 text-xs">
                    No se encontraron transacciones registradas.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const txProvenance = tx.data_provenance || 'MANUAL'
                  const txProvBadge = getProvenanceBadge(txProvenance)
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-slate-500">{tx.date}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 text-xs">{tx.clean_merchant || tx.description}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{tx.description}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${txProvBadge.className}`}
                        >
                          {txProvBadge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 text-xs rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                          {tx.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {tx.is_internal_transfer ? (
                            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-300 flex items-center gap-1">
                              <ArrowRightLeft className="w-2.5 h-2.5" /> Transferencia Interna (Neutralizada)
                            </span>
                          ) : tx.linked_income_id ? (
                            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" /> Nómina Conciliada
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500 capitalize">{tx.transaction_type}</span>
                          )}
                        </div>
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono font-bold text-xs ${
                          tx.is_internal_transfer
                            ? 'text-amber-600'
                            : tx.transaction_type === 'income'
                            ? 'text-emerald-600'
                            : 'text-red-600'
                        }`}
                      >
                        {tx.transaction_type === 'income' ? '+' : tx.is_internal_transfer ? '±' : '-'}
                        {formatCurrency(tx.amount)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Connect Bank Modal with Realistic Catalog */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-white border border-slate-200 space-y-5 shadow-2xl">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Conectar Entidad Bancaria
              </h3>
              <p className="text-xs text-slate-500">
                Catálogo regulado conforme a estándares SFC y Decreto 0368 de 2026.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-blue-700">
                <Lock className="w-3.5 h-3.5" /> Principio de Privacidad Absoluta
              </div>
              <p className="text-[11px] leading-relaxed">
                NEXUS nunca te pedirá tu clave de internet, PIN, OTP o contraseña. En conexiones automáticas oficiales serás redirigido mediante OAuth 2.0 PKCE al portal bancario.
              </p>
            </div>

            {connectError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" />
                <span>{connectError}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Selecciona tu institución</label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {catalog.map((inst) => {
                  const isSelected = selectedInstitutionId === inst.id
                  return (
                    <button
                      key={inst.id}
                      type="button"
                      onClick={() => {
                        setSelectedInstitutionId(inst.id)
                        setConnectError(null)
                      }}
                      className={`p-3 rounded-xl border text-left text-xs transition-all ${
                        isSelected
                          ? 'bg-blue-50 border-blue-500 text-blue-800 font-semibold shadow-xs ring-1 ring-blue-500'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{inst.name}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                            inst.availability_status === 'AVAILABLE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {inst.availability_status === 'AVAILABLE' ? 'API' : 'CSV'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 capitalize">
                        {inst.category === 'digital_wallet' ? 'Billetera' : 'Banco'}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Institution Status Inspection Banner */}
            {selectedInstitution.availability_status === 'UNAVAILABLE' ? (
              <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Conexión automática no disponible para esta institución</span>
                </div>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  {selectedInstitution.unavailability_reason}
                </p>
                <div className="pt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowConnectModal(false)
                      setShowCSVModal(true)
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Importar extracto CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowConnectModal(false)
                      setShowDocModal(true)
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-xs"
                  >
                    <FileUp className="w-3.5 h-3.5" />
                    <span>Escanear PDF / Foto</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Conexión Oficial Disponible
                </div>
                <p className="text-[11px]">
                  Flujo OAuth 2.0 PKCE autorizado bajo {selectedInstitution.regulatory_framework}.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConnectModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-600 transition-colors"
              >
                Cerrar
              </button>
              {selectedInstitution.availability_status === 'AVAILABLE' && (
                <button
                  type="button"
                  onClick={handleConnectBank}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-md transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Iniciando conexión...' : 'Autorizar en Pasarela Bancaria'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showCSVModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="w-full max-w-xl p-6 rounded-3xl bg-white border border-slate-200 space-y-5 shadow-2xl">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                Importar Extracto Bancario (CSV)
              </h3>
              <p className="text-xs text-slate-500">
                Pega el contenido o selecciona el archivo CSV de tu banco (Bancolombia, Nequi, Nu, Davivienda, etc.).
              </p>
            </div>

            {csvSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                <Check className="w-4 h-4" /> {csvSuccessMsg}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Entidad bancaria o cuenta destino</label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-500"
              >
                {bankAccounts.length === 0 ? (
                  <option value="acc-primary">Crear o asociar como cuenta primaria ({selectedInstitution.name})</option>
                ) : (
                  bankAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id} className="bg-white text-slate-900">
                      {acc.institution_name} — {acc.account_name} ({acc.masked_account_number})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">Contenido CSV / Extracto</label>
                <label className="cursor-pointer text-[11px] text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1 font-semibold">
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
                            userId: user?.id || '',
                            institutionHint: selectedInstitution?.name,
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
                placeholder="Fecha,Descripción,Valor&#10;2026-10-01,TRANSFERENCIA NEQUI,500000&#10;2026-10-02,SUPERMERCADO EXITO,-120000"
                className="w-full p-3 font-mono text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {csvPreview && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-3">
                <div className="font-semibold text-slate-900 flex items-center justify-between border-b border-slate-200 pb-2">
                  <span>Filas válidas detectadas: <strong className="text-slate-900">{csvPreview.valid_rows}</strong></span>
                  <span className="text-emerald-600 font-mono">Entidad sugerida: {csvPreview.institution_suggested}</span>
                </div>

                {csvPreview.sample_transactions.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[11px] text-slate-500 font-medium">Muestra de movimientos normalizados:</p>
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px]">
                      {csvPreview.sample_transactions.slice(0, 4).map((tx, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 shadow-xs">
                          <div className="truncate max-w-[240px]">
                            <span className="text-slate-400 mr-2">{tx.date}</span>
                            <span className="text-slate-800 font-sans font-medium">{tx.clean_merchant || tx.description}</span>
                          </div>
                          <span className={tx.transaction_type === 'income' ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>
                            {tx.transaction_type === 'income' ? '+' : '-'}{formatCurrency(tx.amount ?? 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCSVPreview}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
              >
                Previsualizar
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCSVModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCSVImport}
                  disabled={isSubmitting || !csvContent.trim()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white shadow-md transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Importando...' : 'Confirmar Importación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Intelligence (Photo & PDF Statement) Modal */}
      <DocumentImportModal
        isOpen={showDocModal}
        onClose={() => setShowDocModal(false)}
      />
    </div>
  )
}

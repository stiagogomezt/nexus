'use client'

/**
 * NEXUS Finance — Document Intelligence Import Modal
 * ==================================================
 * Allows users to upload bank statement photos (JPG, PNG) or PDFs.
 * Displays mandatory structured preview, accounting reconciliation,
 * duplicate warnings, and inline editing before confirming write to DAL.
 */

import { useState, useRef } from 'react'
import { useDocumentIntelligenceStore } from '@/store/document-intelligence'
import { useFinancialStore } from '@/store/financial'
import { formatCurrency } from '@/lib/utils'
import { KNOWN_CATEGORIES } from '@/types/ai-entry'
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
  Edit2,
  Loader2,
  ShieldCheck,
  Building2,
  Calendar,
  Wallet,
  TrendingDown,
  TrendingUp,
  ArrowRightLeft,
  Camera,
  Check,
} from 'lucide-react'

export function DocumentImportModal({
  isOpen,
  onClose,
  defaultAccountId,
}: {
  isOpen: boolean
  onClose: () => void
  defaultAccountId?: string
}) {
  const { user, accounts, currency } = useFinancialStore()
  const {
    uploadState,
    statement,
    selectedAccountId,
    error,
    lastResult,
    setSelectedAccountId,
    parseDocument,
    editTransaction,
    toggleTransactionSelection,
    confirmImport,
    reset,
    clearError,
  } = useDocumentIntelligenceStore()

  const [isEditingTable, setIsEditingTable] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    clearError()
    await parseDocument(file, selectedAccountId || defaultAccountId, undefined, user?.id)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleConfirm = async () => {
    const ok = await confirmImport(undefined, user?.id)
    if (ok) {
      setTimeout(() => {
        handleClose()
      }, 2500)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden relative">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100/70 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Importación de Extractos con IA
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Multimodal · Foto & PDF
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Sube una fotografía, captura o archivo PDF de tu extracto bancario para lectura y conciliación automática.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
              <button onClick={clearError} className="font-bold text-rose-700 hover:text-rose-900">✕</button>
            </div>
          )}

          {/* Success State */}
          {uploadState === 'success' && lastResult && (
            <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <h3 className="text-base font-bold text-emerald-900">
                ¡Extracto Importado con Éxito!
              </h3>
              <p className="text-xs text-emerald-700 max-w-md mx-auto">
                Se registraron <strong>{lastResult.importedCount}</strong> transacciones en tu libro bancario.
                {lastResult.duplicatesSkipped > 0 && ` (${lastResult.duplicatesSkipped} duplicados omitidos automáticamente).`}
              </p>
              <p className="text-[11px] text-emerald-600">
                Tu flujo libre, balance y Gemelo Digital han sido recalculados.
              </p>
            </div>
          )}

          {/* Upload Dropzone (When idle or parsing) */}
          {(uploadState === 'idle' || uploadState === 'parsing') && (
            <div className="space-y-4">
              <div
                onClick={() => uploadState !== 'parsing' && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer ${
                  uploadState === 'parsing'
                    ? 'border-blue-400 bg-blue-50/40 cursor-wait'
                    : 'border-slate-300 hover:border-blue-500 hover:bg-slate-50/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={uploadState === 'parsing'}
                />

                {uploadState === 'parsing' ? (
                  <div className="space-y-3 py-6">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        Analizando documento con Gemini Multimodal...
                      </p>
                      <p className="text-xs text-slate-500">
                        Extrayendo transacciones, conciliando saldos y verificando duplicados
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 py-4">
                    <div className="flex justify-center gap-3 text-slate-400">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-sm">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm">
                        <Camera className="w-6 h-6" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        Haz clic para seleccionar o arrastra una foto / PDF
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Formatos soportados: JPG, PNG, capturas de pantalla y extractos PDF
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 pt-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                      <span>Procesamiento efímero seguro · Nunca almacenamos el archivo original</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Target account selection */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <Wallet className="w-4 h-4 text-slate-500" />
                  <span className="font-semibold">Vincular a cuenta en NEXUS:</span>
                </div>
                <select
                  value={selectedAccountId || defaultAccountId || ''}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Detectar automáticamente o cuenta principal</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatCurrency(acc.current_balance, currency)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Statement Preview Stage (Mandatory Preview Before Save) */}
          {statement && uploadState === 'previewing' && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
              
              {/* Statement Overview Card */}
              <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 font-bold shadow-sm">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">
                          {statement.institution_name}
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700 uppercase">
                          {statement.account_type}
                        </span>
                        <span className="text-xs font-mono text-slate-500">
                          {statement.masked_account_number}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Período: {statement.statement_period.start} al {statement.statement_period.end}</span>
                      </div>
                    </div>
                  </div>

                  {/* Accounting Reconciliation Badge */}
                  <div>
                    {statement.reconciliation.status === 'balanced' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold shadow-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> CONCILIADO
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold shadow-sm" title={`Diferencia de ${formatCurrency(statement.reconciliation.discrepancy, currency)}`}>
                        <AlertTriangle className="w-4 h-4 text-amber-600" /> DISCREPANCIA ({formatCurrency(statement.reconciliation.discrepancy, currency)})
                      </span>
                    )}
                  </div>
                </div>

                {/* Balance Reconciliation Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200/60 text-xs">
                  <div>
                    <span className="text-slate-500 block">Saldo Inicial:</span>
                    <strong className="text-slate-800 font-bold text-sm">
                      {formatCurrency(statement.opening_balance, currency)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Entradas (+) / Salidas (-):</span>
                    <span className="text-emerald-600 font-bold">
                      +{formatCurrency(statement.reconciliation.inflows_total, currency)}
                    </span>{' '}
                    <span className="text-rose-600 font-bold">
                      -{formatCurrency(statement.reconciliation.outflows_total, currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Saldo Calculado:</span>
                    <strong className="text-slate-800 font-bold text-sm">
                      {formatCurrency(statement.reconciliation.calculated_balance, currency)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Saldo Final Reportado:</span>
                    <strong className="text-slate-900 font-bold text-sm">
                      {formatCurrency(statement.closing_balance, currency)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Summary Stats Pill */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs px-1">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600">
                    Total movimientos: <strong>{statement.summary.total_found}</strong>
                  </span>
                  <span>·</span>
                  <span className="text-emerald-700 font-medium">
                    Nuevos: <strong>{statement.summary.new_count}</strong>
                  </span>
                  {statement.summary.duplicate_count > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-amber-700 font-medium">
                        Posibles duplicados: <strong>{statement.summary.duplicate_count}</strong>
                      </span>
                    </>
                  )}
                  {statement.summary.manual_review_count > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-rose-700 font-medium">
                        Revisión manual: <strong>{statement.summary.manual_review_count}</strong>
                      </span>
                    </>
                  )}
                </div>

                <button
                  onClick={() => setIsEditingTable(!isEditingTable)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  {isEditingTable ? 'Finalizar edición' : 'Editar transacciones'}
                </button>
              </div>

              {/* Transaction List Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold w-8 text-center">Importar</th>
                      <th className="py-2.5 px-3 font-semibold">Fecha</th>
                      <th className="py-2.5 px-3 font-semibold">Descripción / Comercio</th>
                      <th className="py-2.5 px-3 font-semibold">Tipo</th>
                      <th className="py-2.5 px-3 font-semibold">Categoría</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Monto</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Confianza</th>
                      <th className="py-2.5 px-3 font-semibold">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {statement.transactions.map((tx, idx) => {
                      const isSelected = tx.selected_for_import !== false
                      const isInflow = tx.transaction_type === 'inflow'
                      const isTransfer = tx.transaction_type === 'transfer'

                      return (
                        <tr
                          key={idx}
                          className={`hover:bg-slate-50/60 transition-colors ${
                            tx.is_duplicate ? 'bg-amber-50/20' : ''
                          }`}
                        >
                          <td className="py-2 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleTransactionSelection(idx)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap text-slate-600">
                            {isEditingTable ? (
                              <input
                                type="date"
                                value={tx.date}
                                onChange={(e) => editTransaction(idx, { date: e.target.value })}
                                className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-800"
                              />
                            ) : (
                              tx.date
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {isEditingTable ? (
                              <input
                                type="text"
                                value={tx.description}
                                onChange={(e) => editTransaction(idx, { description: e.target.value })}
                                className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-800"
                              />
                            ) : (
                              <div>
                                <span className="font-semibold text-slate-900 block truncate max-w-xs">
                                  {tx.description}
                                </span>
                                {tx.merchant_name && tx.merchant_name !== tx.description && (
                                  <span className="text-[10px] text-slate-500 block">
                                    {tx.merchant_name}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {isInflow ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                <TrendingUp className="w-2.5 h-2.5" /> Ingreso
                              </span>
                            ) : isTransfer ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                                <ArrowRightLeft className="w-2.5 h-2.5" /> Traslado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                                <TrendingDown className="w-2.5 h-2.5" /> Gasto
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {isEditingTable ? (
                              <select
                                value={tx.category}
                                onChange={(e) => editTransaction(idx, { category: e.target.value })}
                                className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[11px] text-slate-800"
                              >
                                {KNOWN_CATEGORIES.map((cat) => (
                                  <option key={cat} value={cat}>
                                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium">
                                {tx.category}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-black tabular-nums whitespace-nowrap">
                            <span className={isInflow ? 'text-emerald-600' : 'text-slate-900'}>
                              {isInflow ? '+' : '-'}
                              {formatCurrency(tx.amount, currency)}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center text-slate-500">
                            {Math.round(tx.confidence * 100)}%
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            {tx.is_duplicate ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                Duplicado
                              </span>
                            ) : tx.needs_manual_review ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                                Revisar
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Nuevo
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 text-xs font-bold transition-colors"
          >
            Cancelar
          </button>

          {statement && (uploadState === 'previewing' || uploadState === 'confirming') && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => reset()}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-white text-xs font-bold transition-colors"
              >
                Subir otro archivo
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={uploadState === 'confirming'}
                className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-blue-600/20"
              >
                {uploadState === 'confirming' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Importando en DAL...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar Importación</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

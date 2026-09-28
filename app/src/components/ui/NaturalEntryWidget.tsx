'use client'

/**
 * NEXUS Finance — Natural Financial Entry Widget
 * =====================================================
 * Allows users to register expenses, incomes, and internal transfers
 * using natural Spanish sentences.
 *
 * Strict Security & Execution Guarantee:
 * INTERPRETAR → VALIDAR → MOSTRAR PREVIEW → CONFIRMAR / EDITAR / CANCELAR → GUARDAR (DAL) → RECALCULAR
 *
 * Gemini or local parser NEVER directly writes to Supabase.
 * User must explicitly click "Confirmar" after previewing the parsed operations.
 */

import { useState } from 'react'
import { useAIEntryStore } from '@/store/ai-entry'
import { useFinancialStore } from '@/store/financial'
import { formatCurrency } from '@/lib/utils'
import { KNOWN_CATEGORIES, type KnownCategory } from '@/types/ai-entry'
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit2,
  X,
  TrendingDown,
  TrendingUp,
  ArrowRightLeft,
  Calendar,
  Wallet,
  Tag,
  Loader2,
  ShieldCheck,
} from 'lucide-react'

const QUICK_EXAMPLES = [
  'Hoy gasté 13.000 en almuerzo, 4.000 en galletas y 5.000 en un jugo',
  'Hoy gané 150.000 de Shuffler',
  'Hoy gasté 100.000 y gané 250.000',
  'Pasé 200.000 de Bancolombia a Nequi',
  'Ayer pagué 90.000 del gimnasio',
]

export function NaturalEntryWidget({ className = '' }: { className?: string }) {
  const { user, accounts, currency } = useFinancialStore()
  const {
    inputText,
    isInterpreting,
    isConfirming,
    pendingIntent,
    validation,
    error,
    lastSuccess,
    setInputText,
    interpret,
    editOperation,
    removeOperation,
    confirm,
    cancel,
    clearSuccess,
  } = useAIEntryStore()

  const [isEditing, setIsEditing] = useState(false)

  const handleInterpret = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!inputText.trim() || isInterpreting) return

    clearSuccess()
    await interpret(inputText, undefined, user?.id)
  }

  const handleSelectExample = (ex: string) => {
    setInputText(ex)
    clearSuccess()
  }

  const handleConfirm = async () => {
    if (!pendingIntent || isConfirming) return
    const ok = await confirm(undefined, user?.id)
    if (ok) {
      setIsEditing(false)
    }
  }

  return (
    <div
      className={`bg-white rounded-3xl border border-slate-200/80 p-5 lg:p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden ${className}`}
    >
      {/* Decorative subtle background gradient */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-blue-50/60 via-emerald-50/30 to-transparent pointer-events-none -mr-20 -mt-20 rounded-full blur-2xl" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm lg:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Registrar Movimiento con Lenguaje Natural
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 hidden sm:inline-flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-blue-600" /> Preview Requerido
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Escribe en español cotidiano tus gastos, ingresos o transferencias y NEXUS los interpretará.
            </p>
          </div>
        </div>

        {pendingIntent && (
          <button
            onClick={() => cancel()}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 self-start sm:self-center transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Cancelar
          </button>
        )}
      </div>

      {/* Success Notification */}
      {lastSuccess && (
        <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold">
                {lastSuccess.count} {lastSuccess.count === 1 ? 'movimiento guardado' : 'movimientos guardados'} exitosamente.
              </span>
              <p className="text-[11px] text-emerald-700">
                Tu flujo libre, categorías y Gemelo Digital han sido recalculados automáticamente por el Financial Engine.
              </p>
            </div>
          </div>
          <button
            onClick={clearSuccess}
            className="text-emerald-700 hover:text-emerald-900 font-bold text-xs p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Input Form (When no pending intent or ready for new entry) */}
      {!pendingIntent && (
        <div className="space-y-3 relative z-10">
          <form onSubmit={handleInterpret} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ej: Hoy gasté 13.000 en almuerzo, 4.000 en galletas y 5.000 en un jugo..."
                className="w-full h-11 px-4 text-xs lg:text-sm bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 placeholder-slate-400 transition-all shadow-inner"
                disabled={isInterpreting}
              />
            </div>
            <button
              type="submit"
              disabled={!inputText.trim() || isInterpreting}
              className="h-11 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs lg:text-sm font-bold flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20 shrink-0"
            >
              {isInterpreting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Interpretando...</span>
                </>
              ) : (
                <>
                  <span>Interpretar</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Examples */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[11px] font-semibold text-slate-500">Ejemplos:</span>
            {QUICK_EXAMPLES.map((ex, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectExample(ex)}
                className="text-[11px] text-slate-600 hover:text-blue-600 bg-slate-100/80 hover:bg-blue-50 border border-slate-200/60 hover:border-blue-200 px-2.5 py-1 rounded-xl transition-all"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pending Intent Preview & Confirmation Screen */}
      {pendingIntent && (
        <div className="space-y-4 pt-2 relative z-10 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                Interpretación & Vista Previa
              </span>
              <span className="text-xs text-slate-600">
                {pendingIntent.operations.length} {pendingIntent.operations.length === 1 ? 'operación detectada' : 'operaciones detectadas'}
              </span>
            </div>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs font-semibold text-slate-600 hover:text-blue-600 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100"
            >
              <Edit2 className="w-3 h-3" />
              {isEditing ? 'Bloquear edición' : 'Editar campos'}
            </button>
          </div>

          {/* Line items list */}
          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {pendingIntent.operations.map((op, index) => {
              const isExpense = op.type === 'EXPENSE'
              const isIncome = op.type === 'INCOME'
              const isTransfer = op.type === 'INTERNAL_TRANSFER'

              return (
                <div
                  key={index}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isExpense
                      ? 'bg-rose-50/40 border-rose-200/80'
                      : isIncome
                      ? 'bg-emerald-50/40 border-emerald-200/80'
                      : 'bg-blue-50/40 border-blue-200/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isExpense && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                          <TrendingDown className="w-3 h-3 text-rose-600" /> Gasto
                        </span>
                      )}
                      {isIncome && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <TrendingUp className="w-3 h-3 text-emerald-600" /> Ingreso
                        </span>
                      )}
                      {isTransfer && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                          <ArrowRightLeft className="w-3 h-3 text-blue-600" /> Transferencia
                        </span>
                      )}

                      {/* Description */}
                      {isEditing ? (
                        <input
                          type="text"
                          value={op.description}
                          onChange={(e) => editOperation(index, { description: e.target.value })}
                          className="text-xs font-semibold bg-white border border-slate-300 rounded px-2 py-0.5 text-slate-900"
                        />
                      ) : (
                        <span className="text-xs font-bold text-slate-900">{op.description}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Amount */}
                      {isEditing ? (
                        <input
                          type="number"
                          value={op.amount}
                          onChange={(e) => editOperation(index, { amount: Number(e.target.value) })}
                          className="w-24 text-xs font-bold text-right bg-white border border-slate-300 rounded px-2 py-0.5 text-slate-900"
                        />
                      ) : (
                        <span
                          className={`text-sm font-black tabular-nums ${
                            isExpense
                              ? 'text-rose-600'
                              : isIncome
                              ? 'text-emerald-600'
                              : 'text-blue-600'
                          }`}
                        >
                          {isExpense ? '-' : isIncome ? '+' : ''}
                          {formatCurrency(op.amount, currency)}
                        </span>
                      )}

                      {/* Delete Line Item */}
                      <button
                        onClick={() => removeOperation(index)}
                        title="Eliminar este movimiento"
                        className="text-slate-500 hover:text-rose-600 p-1 rounded-lg hover:bg-white transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Metadata fields (Category, Account, Date) */}
                  <div className="mt-2.5 pt-2 border-t border-slate-200/50 flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                    {/* Category (for Expense) */}
                    {isExpense && (
                      <div className="flex items-center gap-1.5">
                        <Tag className="w-3 h-3 text-slate-500" />
                        <span className="text-slate-500 font-medium">Categoría:</span>
                        {isEditing ? (
                          <select
                            value={op.category_name}
                            onChange={(e) => editOperation(index, { category_name: e.target.value })}
                            className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[11px] text-slate-800"
                          >
                            {KNOWN_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat.charAt(0).toUpperCase() + cat.slice(1)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="font-semibold text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                            {op.category_name}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Source (for Income) */}
                    {isIncome && (
                      <div className="flex items-center gap-1.5">
                        <Tag className="w-3 h-3 text-slate-500" />
                        <span className="text-slate-500 font-medium">Fuente:</span>
                        {isEditing ? (
                          <input
                            type="text"
                            value={op.source}
                            onChange={(e) => editOperation(index, { source: e.target.value })}
                            className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[11px] text-slate-800"
                          />
                        ) : (
                          <span className="font-semibold text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                            {op.source || 'Otros'}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Account selection */}
                    {isTransfer ? (
                      <div className="flex items-center gap-1.5">
                        <Wallet className="w-3 h-3 text-slate-500" />
                        <span className="text-slate-500 font-medium">Cuentas:</span>
                        <span className="font-semibold text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                          {op.from_account_name || 'Origen'} → {op.to_account_name || 'Destino'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Wallet className="w-3 h-3 text-slate-500" />
                        <span className="text-slate-500 font-medium">Cuenta:</span>
                        {accounts.length > 0 ? (
                          <select
                            value={('account_id' in op && op.account_id) || ''}
                            onChange={(e) => {
                              const accId = e.target.value || null
                              const acc = accounts.find((a) => a.id === accId)
                              editOperation(index, {
                                account_id: accId,
                                account_name: acc?.name,
                              } as any)
                            }}
                            className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[11px] text-slate-800"
                          >
                            <option value="">Seleccionar cuenta...</option>
                            {accounts.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name} ({formatCurrency(a.current_balance, currency)})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-slate-500 italic">Sin cuentas registradas</span>
                        )}
                      </div>
                    )}

                    {/* Date */}
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span className="text-slate-500 font-medium">Fecha:</span>
                      {isEditing ? (
                        <input
                          type="date"
                          value={op.date}
                          onChange={(e) => editOperation(index, { date: e.target.value })}
                          className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[11px] text-slate-800"
                        />
                      ) : (
                        <span className="font-semibold text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                          {op.date}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Totals Summary */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4">
              {pendingIntent.total_income > 0 && (
                <div>
                  <span className="text-slate-500">Total Ingresos:</span>{' '}
                  <strong className="text-emerald-600 font-bold">
                    +{formatCurrency(pendingIntent.total_income, currency)}
                  </strong>
                </div>
              )}
              {pendingIntent.total_expense > 0 && (
                <div>
                  <span className="text-slate-500">Total Gastos:</span>{' '}
                  <strong className="text-rose-600 font-bold">
                    -{formatCurrency(pendingIntent.total_expense, currency)}
                  </strong>
                </div>
              )}
              <div>
                <span className="text-slate-500">Impacto Neto:</span>{' '}
                <strong
                  className={`font-black ${
                    pendingIntent.net_change >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {pendingIntent.net_change >= 0 ? '+' : ''}
                  {formatCurrency(pendingIntent.net_change, currency)}
                </strong>
              </div>
            </div>

            {/* Confirmation Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancel}
                disabled={isConfirming}
                className="px-3.5 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-bold text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={Boolean(isConfirming || (validation && !validation.valid))}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20"
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Guardando en DAL...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirmar y Guardar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useFinancialStore } from '@/store/financial'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import {
  exportUserDataAsJSON,
  exportModuleAsCSV,
  triggerDownload,
  type ExportableModule,
} from '@/lib/export'
import {
  Settings,
  Database,
  Shield,
  Zap,
  Download,
  FileSpreadsheet,
  FileCode,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import type { Currency } from '@/types'

export function SettingsPage() {
  const { currency, setCurrency, user } = useFinancialStore()
  const [exporting, setExporting] = useState<string | null>(null)
  const [exportSuccess, setExportSuccess] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  const isConfigured = isSupabaseConfigured()

  const handleExportJSON = async () => {
    if (!user) {
      setExportError('Debes iniciar sesión para exportar tus datos.')
      return
    }

    setExporting('json')
    setExportError(null)
    setExportSuccess(null)
    try {
      const jsonContent = await exportUserDataAsJSON(user.id)
      const filename = `nexus_finance_${user.id}_${new Date().toISOString().slice(0, 10)}.json`
      triggerDownload(filename, jsonContent, 'application/json')
      setExportSuccess('Archivo JSON exportado exitosamente.')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al exportar JSON'
      setExportError(msg)
    } finally {
      setExporting(null)
    }
  }

  const handleExportCSV = async (module: ExportableModule, label: string) => {
    if (!user) {
      setExportError('Debes iniciar sesión para exportar tus datos.')
      return
    }

    setExporting(module)
    setExportError(null)
    setExportSuccess(null)
    try {
      const csvContent = await exportModuleAsCSV(user.id, module)
      const filename = `nexus_${module}_${user.id}_${new Date().toISOString().slice(0, 10)}.csv`
      triggerDownload(filename, csvContent, 'text/csv')
      setExportSuccess(`CSV de ${label} exportado exitosamente.`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Error al exportar ${label}`
      setExportError(msg)
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="space-y-6 pb-12 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Configuración</h2>
        <p className="text-xs text-slate-500">
          Perfil, moneda base, conexiones, exportación y preferencias del sistema
        </p>
      </div>

      {/* Currency */}
      <div className="glass-panel p-6 rounded-3xl space-y-4">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">Preferencias Generales</h3>
        </div>
        <div>
          <label className="label-field">Moneda Base</label>
          <select
            className="select-field max-w-xs"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
          >
            <option value="COP">COP — Peso Colombiano</option>
            <option value="USD">USD — Dólar Americano</option>
            <option value="EUR">EUR — Euro</option>
          </select>
          <p className="text-[11px] text-slate-500 mt-1.5">
            Todos los valores se mostrarán en esta moneda
          </p>
        </div>
      </div>

      {/* Export Panel (FASE F) */}
      <div className="glass-panel p-6 rounded-3xl space-y-4">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900">Exportación de Datos Financieros</h3>
        </div>
        <p className="text-xs text-slate-500">
          Exporta tu información financiera en formatos abiertos. La exportación respeta estrictamente tu cuenta de usuario.
        </p>

        {exportSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {exportSuccess}
          </div>
        )}

        {exportError && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-red-600 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            {exportError}
          </div>
        )}

        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <div>
              <p className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-blue-600" /> Paquete Completo (JSON)
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Incluye resumen métrico, ingresos, gastos, presupuestos, metas, deudas y balance
              </p>
            </div>
            <button
              onClick={handleExportJSON}
              disabled={exporting !== null}
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              {exporting === 'json' ? 'Exportando...' : 'Descargar JSON'}
            </button>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Exportar Tablas en CSV
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { key: 'incomes', label: 'Ingresos' },
                { key: 'expenses', label: 'Gastos' },
                { key: 'budgets', label: 'Presupuestos' },
                { key: 'goals', label: 'Metas' },
                { key: 'debts', label: 'Deudas' },
                { key: 'assets', label: 'Activos' },
                { key: 'liabilities', label: 'Pasivos' },
                { key: 'accounts', label: 'Cuentas' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  disabled={exporting !== null}
                  onClick={() => handleExportCSV(key as ExportableModule, label)}
                  className="p-2 text-xs rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-all text-left flex items-center justify-between"
                >
                  <span>{label}</span>
                  <Download className="w-3 h-3 text-slate-500" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Income Profile */}
      <div className="glass-panel p-6 rounded-3xl space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900">Perfil de Ingresos</h3>
        </div>
        <div className="space-y-2">
          <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/25 text-xs">
            <p className="text-blue-600 font-bold">Trabajo Principal · Shuffler</p>
            <p className="text-slate-500 mt-0.5">Salario base + recargos nocturnos + bonos + horas extras</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/25 text-xs">
            <p className="text-amber-600 font-bold">Side Job · Pizza Hut</p>
            <p className="text-slate-500 mt-0.5">Pago por horas + recargos dominicales</p>
          </div>
          <p className="text-[11px] text-slate-600">Editar perfil de ingresos disponible en la próxima versión</p>
        </div>
      </div>

      {/* Supabase Status */}
      <div className="glass-panel p-6 rounded-3xl space-y-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-600" />
          <h3 className="text-sm font-bold text-slate-900">Conexión a Base de Datos</h3>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Estado</span>
            {isConfigured ? (
              <span className="flex items-center gap-1.5 font-semibold text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Supabase Conectado
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-semibold text-amber-600">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Modo Local Seguro (sin Supabase)
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            {isConfigured
              ? 'Conectado a la nube PostgreSQL con políticas RLS de aislamiento estricto por usuario.'
              : 'Para conectar tu proyecto Supabase Cloud: agrega NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en app/.env.local'}
          </p>
        </div>
      </div>

      {/* Security */}
      <div className="glass-panel p-6 rounded-3xl space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-red-600" />
          <h3 className="text-sm font-bold text-slate-900">Seguridad y Privacidad</h3>
        </div>
        <div className="space-y-2 text-xs text-slate-500">
          <p>🔒 <strong className="text-slate-700">Seed phrases y claves privadas NUNCA se almacenan.</strong></p>
          <p>🛡️ RLS (Row Level Security) habilitado en Supabase — cada usuario solo accede a sus propios datos.</p>
          <p>🔑 Las credenciales se leen exclusivamente desde variables de entorno y nunca se imprimen en logs.</p>
        </div>
      </div>

      {/* Version */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500 space-y-0.5">
        <p><span className="text-slate-500 font-semibold">NEXUS Finance</span> · v1.1.0 Core Consolidado</p>
        <p>Financial Engine v1.1 · Data Access Layer · Export Engine (CSV/JSON)</p>
        <p>Next.js 15 · TypeScript · Tailwind CSS · Supabase · Zustand</p>
      </div>
    </div>
  )
}


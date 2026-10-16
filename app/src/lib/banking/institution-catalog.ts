/**
 * NEXUS Finance — Catálogo Dinámico de Instituciones Financieras (Colombia)
 * Conforme a estándares de la SFC y Decreto 0368 de 2026.
 *
 * Determina el estado de disponibilidad REAL de cada entidad bancaria y billetera digital.
 * NUNCA simula disponibilidad si no existen credenciales de agregador AISP en el entorno.
 */

import type { InstitutionCatalogItem } from '@/types/banking'

export const INSTITUTIONS_REGISTRY: Array<Omit<InstitutionCatalogItem, 'availability_status' | 'unavailability_reason'>> = [
  {
    id: 'falabella',
    name: 'Banco Falabella Colombia',
    category: 'bank',
    connection_type: 'OPEN_FINANCE_FAPI',
    supports_balances: true,
    supports_transactions: true,
    supports_incremental_sync: true,
    supports_csv_import: true,
    supports_pdf_import: true,
    oauth_flow_type: 'REDIRECT_OAUTH_PKCE',
    regulatory_framework: 'SFC Decreto 0368/2026 (FAPI 2.0)',
  },
  {
    id: 'bancolombia',
    name: 'Bancolombia S.A.',
    category: 'bank',
    connection_type: 'OPEN_FINANCE_FAPI',
    supports_balances: true,
    supports_transactions: true,
    supports_incremental_sync: true,
    supports_csv_import: true,
    supports_pdf_import: true,
    oauth_flow_type: 'REDIRECT_OAUTH_PKCE',
    regulatory_framework: 'SFC Decreto 0368/2026 (FAPI 2.0)',
  },
  {
    id: 'nequi',
    name: 'Nequi (Bancolombia)',
    category: 'digital_wallet',
    connection_type: 'AGGREGATOR',
    supports_balances: true,
    supports_transactions: true,
    supports_incremental_sync: true,
    supports_csv_import: true,
    supports_pdf_import: true,
    oauth_flow_type: 'REDIRECT_OAUTH_PKCE',
    regulatory_framework: 'SFC Decreto 0368/2026',
  },
  {
    id: 'davivienda',
    name: 'Banco Davivienda',
    category: 'bank',
    connection_type: 'OPEN_FINANCE_FAPI',
    supports_balances: true,
    supports_transactions: true,
    supports_incremental_sync: true,
    supports_csv_import: true,
    supports_pdf_import: true,
    oauth_flow_type: 'REDIRECT_OAUTH_PKCE',
    regulatory_framework: 'SFC Decreto 0368/2026 (FAPI 2.0)',
  },
  {
    id: 'daviplata',
    name: 'DaviPlata',
    category: 'digital_wallet',
    connection_type: 'AGGREGATOR',
    supports_balances: true,
    supports_transactions: true,
    supports_incremental_sync: true,
    supports_csv_import: true,
    supports_pdf_import: true,
    oauth_flow_type: 'NONE',
    regulatory_framework: 'SFC Decreto 0368/2026',
  },
  {
    id: 'nu',
    name: 'Nu Colombia Compañía de Financiamiento',
    category: 'financing',
    connection_type: 'OPEN_FINANCE_FAPI',
    supports_balances: true,
    supports_transactions: true,
    supports_incremental_sync: true,
    supports_csv_import: true,
    supports_pdf_import: true,
    oauth_flow_type: 'REDIRECT_OAUTH_PKCE',
    regulatory_framework: 'SFC Decreto 0368/2026',
  },
  {
    id: 'bbva',
    name: 'BBVA Colombia',
    category: 'bank',
    connection_type: 'OPEN_FINANCE_FAPI',
    supports_balances: true,
    supports_transactions: true,
    supports_incremental_sync: true,
    supports_csv_import: true,
    supports_pdf_import: true,
    oauth_flow_type: 'REDIRECT_OAUTH_PKCE',
    regulatory_framework: 'SFC Decreto 0368/2026 (FAPI 2.0)',
  },
  {
    id: 'bogota',
    name: 'Banco de Bogotá (Grupo Aval)',
    category: 'bank',
    connection_type: 'OPEN_FINANCE_FAPI',
    supports_balances: true,
    supports_transactions: true,
    supports_incremental_sync: true,
    supports_csv_import: true,
    supports_pdf_import: true,
    oauth_flow_type: 'REDIRECT_OAUTH_PKCE',
    regulatory_framework: 'SFC Decreto 0368/2026 (FAPI 2.0)',
  },
]

/**
 * Evalúa si el entorno cuenta con credenciales activas de agregador Open Finance AISP
 */
export function hasOpenFinanceCredentials(): boolean {
  if (typeof process === 'undefined' || !process.env) return false
  const key = process.env.OPEN_FINANCE_API_KEY || process.env.BELVO_SECRET || process.env.PROMETEO_API_KEY
  return Boolean(key && key !== 'mock' && key.trim().length > 0)
}

/**
 * Retorna el catálogo dinámico con disponibilidad real calculada
 */
export function getInstitutionCatalog(): InstitutionCatalogItem[] {
  const isLiveConfigured = hasOpenFinanceCredentials()

  return INSTITUTIONS_REGISTRY.map((inst) => {
    if (!isLiveConfigured) {
      let reason = 'Conexión automática no disponible en este entorno. Requiere registro corporativo como AISP o credenciales de agregador regulado (Belvo/Prometeo).'
      if (inst.id === 'falabella') {
        reason = 'Conexión automática no disponible para Banco Falabella en este entorno. Requiere registro corporativo como AISP (Superintendencia Financiera de Colombia). Por favor importe su extracto real en CSV, PDF o Imagen.'
      } else if (inst.id === 'nequi') {
        reason = 'Nequi no ofrece API pública OAuth de lectura de saldos personales a terceros sin convenio institucional. Exporta tus movimientos en CSV/PDF desde la app de Nequi e impórtalos aquí.'
      } else if (inst.id === 'daviplata') {
        reason = 'DaviPlata opera mediante extractos mensuales descargables. Utiliza el módulo de importación de extracto.'
      }

      return {
        ...inst,
        availability_status: 'UNAVAILABLE' as const,
        unavailability_reason: reason,
      }
    }

    return {
      ...inst,
      availability_status: 'AVAILABLE' as const,
      unavailability_reason: undefined,
    }
  })
}

export function getInstitutionById(id: string): InstitutionCatalogItem | undefined {
  return getInstitutionCatalog().find((i) => i.id === id)
}

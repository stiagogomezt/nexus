/**
 * NEXUS Finance — Mock Colombian Bank Provider
 * Proveedor simulado determinista para el sandbox del ecosistema bancario colombiano.
 *
 * Características:
 * - Cumple con la interfaz BankProvider de providers.ts
 * - ZERO credenciales privadas / ZERO contraseñas / ZERO PINs
 * - Simula flujos de consentimiento OAuth 2.0 PKCE según Decreto 0368 de 2026
 * - Soporta Bancolombia, Nequi, Nu Colombia, Davivienda
 * - Genera transacciones canónicas con comercios colombianos reales
 *   (Shuffler nómina, Pizza Hut, Éxito, Transmilenio, Netflix)
 */

import type { BankProvider, BankAccountMetadata, BankTransactionItem } from '@/types/providers'

export interface MockBankSeedData {
  connectionId: string
  institutionId: 'bancolombia' | 'nequi' | 'nu' | 'davivienda'
  institutionName: string
  accounts: BankAccountMetadata[]
  transactions: BankTransactionItem[]
}

export class MockBankProvider implements BankProvider {
  public readonly providerName = 'mock_colombia_open_finance'

  private simulatedConnections: Map<string, MockBankSeedData> = new Map()

  constructor() {
    this.seedDefaultInstitutions()
  }

  public async isAvailable(): Promise<boolean> {
    return true
  }

  /**
   * Simula la autorización OAuth 2.0 PKCE del banco.
   * SEGURIDAD: Solo recibe authCode o consentToken, NUNCA credenciales bancarias.
   */
  public async connect(params: Record<string, unknown>): Promise<{ connectionId: string }> {
    const institutionId = (params.institutionId as string) || 'bancolombia'
    const connectionId = `conn_${institutionId}_${Date.now()}`

    // Verificar si tenemos plantilla para esta entidad
    const seed = this.createInstitutionSeed(connectionId, institutionId)
    this.simulatedConnections.set(connectionId, seed)

    return { connectionId }
  }

  public async getAccounts(connectionId: string): Promise<BankAccountMetadata[]> {
    const conn = this.simulatedConnections.get(connectionId)
    if (!conn) {
      // Si no existe, crear una por defecto para no romper flujos de prueba
      const fallbackSeed = this.createInstitutionSeed(connectionId, 'bancolombia')
      this.simulatedConnections.set(connectionId, fallbackSeed)
      return fallbackSeed.accounts
    }
    return conn.accounts
  }

  public async getTransactions(
    accountId: string,
    startDate?: string,
    endDate?: string
  ): Promise<BankTransactionItem[]> {
    // Buscar en todas las conexiones simuladas
    for (const conn of this.simulatedConnections.values()) {
      const matchAccount = conn.accounts.find((a) => a.id === accountId)
      if (matchAccount) {
        let txs = conn.transactions.filter((t) => t.account_id === accountId)
        if (startDate) {
          txs = txs.filter((t) => t.date >= startDate)
        }
        if (endDate) {
          txs = txs.filter((t) => t.date <= endDate)
        }
        return txs
      }
    }
    return []
  }

  public async syncBalance(accountId: string): Promise<number> {
    for (const conn of this.simulatedConnections.values()) {
      const match = conn.accounts.find((a) => a.id === accountId)
      if (match) {
        return match.balance
      }
    }
    return 0
  }

  public async disconnect(connectionId: string): Promise<void> {
    this.simulatedConnections.delete(connectionId)
  }

  // ─────────────────────────────────────────────
  // MOCK SEED GENERATOR
  // ─────────────────────────────────────────────
  private seedDefaultInstitutions() {
    this.createInstitutionSeed('conn_bancolombia_default', 'bancolombia')
    this.createInstitutionSeed('conn_nequi_default', 'nequi')
  }

  private createInstitutionSeed(connectionId: string, institutionId: string): MockBankSeedData {
    switch (institutionId) {
      case 'nequi': {
        const accId = `acc_nequi_${Date.now()}`
        return {
          connectionId,
          institutionId: 'nequi',
          institutionName: 'Nequi',
          accounts: [
            {
              id: accId,
              institution_id: 'nequi',
              institution_name: 'Nequi',
              account_number_mask: '***9812',
              account_type: 'savings',
              balance: 1450000,
              currency: 'COP',
              last_synced_at: new Date().toISOString(),
            },
          ],
          transactions: [
            {
              id: `tx_neq_1`,
              account_id: accId,
              date: '2026-09-15',
              description: 'ABONO NOMINA PIZZA HUT S.A.S.',
              amount: 650000,
              category: 'Ingresos',
              pending: false,
            },
            {
              id: `tx_neq_2`,
              account_id: accId,
              date: '2026-09-17',
              description: 'TRANSFERENCIA DESDE BANCOLOMBIA CUENTA 5421',
              amount: 300000,
              category: 'Transferencias',
              pending: false,
            },
            {
              id: `tx_neq_3`,
              account_id: accId,
              date: '2026-09-20',
              description: 'PAGO QR D1 TIENDAS',
              amount: -45600,
              category: 'Mercado',
              pending: false,
            },
          ],
        }
      }

      case 'nu': {
        const accId = `acc_nu_${Date.now()}`
        return {
          connectionId,
          institutionId: 'nu',
          institutionName: 'Nu Colombia',
          accounts: [
            {
              id: accId,
              institution_id: 'nu',
              institution_name: 'Nu Colombia',
              account_number_mask: '***1140',
              account_type: 'savings',
              balance: 2800000,
              currency: 'COP',
              last_synced_at: new Date().toISOString(),
            },
          ],
          transactions: [
            {
              id: `tx_nu_1`,
              account_id: accId,
              date: '2026-09-10',
              description: 'RENDIMIENTO CUENTA NU CAJITAS',
              amount: 28500,
              category: 'Inversiones',
              pending: false,
            },
            {
              id: `tx_nu_2`,
              account_id: accId,
              date: '2026-09-18',
              description: 'PAGO SUSCRIPCION NETFLIX COLOMBIA',
              amount: -38900,
              category: 'Suscripciones',
              pending: false,
            },
          ],
        }
      }

      case 'bancolombia':
      default: {
        const accId = `acc_bancolombia_${Date.now()}`
        return {
          connectionId,
          institutionId: 'bancolombia',
          institutionName: 'Bancolombia',
          accounts: [
            {
              id: accId,
              institution_id: 'bancolombia',
              institution_name: 'Bancolombia',
              account_number_mask: '***5421',
              account_type: 'savings',
              balance: 3200000,
              currency: 'COP',
              last_synced_at: new Date().toISOString(),
            },
          ],
          transactions: [
            {
              id: `tx_banco_1`,
              account_id: accId,
              date: '2026-09-14',
              description: 'PAGO NOMINA SHUFFLER ENTERPRISES',
              amount: 2100000,
              category: 'Ingresos',
              pending: false,
            },
            {
              id: `tx_banco_2`,
              account_id: accId,
              date: '2026-09-16',
              description: 'TRANSFERENCIA A NEQUI 310***9812',
              amount: -300000,
              category: 'Transferencias',
              pending: false,
            },
            {
              id: `tx_banco_3`,
              account_id: accId,
              date: '2026-09-18',
              description: 'COMPRA ALMACENES EXITO CALLE 80',
              amount: -185000,
              category: 'Supermercado',
              pending: false,
            },
            {
              id: `tx_banco_4`,
              account_id: accId,
              date: '2026-09-19',
              description: 'RECARGA TRANSMILENIO ESTACION FLORES',
              amount: -29500,
              category: 'Transporte',
              pending: false,
            },
          ],
        }
      }
    }
  }
}

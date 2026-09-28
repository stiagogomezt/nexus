/**
 * NEXUS Finance — CSV / Excel Bank Statement Provider
 * Paso 10: Fallback robusto para importar extractos bancarios de entidades colombianas
 * (Bancolombia, Davivienda, Nequi, Nu, Banco de Bogotá, etc.)
 *
 * Capacidades:
 * 1. Detección automática de delimitadores (, ; \t |)
 * 2. Detección heurística de columnas (Fecha, Descripción/Detalle, Débito/Crédito/Valor)
 * 3. Normalización de formatos de moneda colombiana ($ 1.250.000,00 ó -45.000)
 * 4. Normalización automática de comercios y categorías
 * 5. Prevención de sobreescritura y detección de duplicados
 */

import type { BankTransaction, CSVParsePreview, BankTransactionType } from '@/types/banking'
import { BankDataNormalizer } from '../bank-data-normalizer'

export interface CSVParseOptions {
  accountId: string
  userId: string
  institutionHint?: string
  currency?: string
}

export class CSVBankProvider {
  /**
   * Analiza el contenido de un archivo CSV y genera una vista previa estructurada
   */
  public static parseStatement(csvContent: string, options: CSVParseOptions): CSVParsePreview {
    if (!csvContent || csvContent.trim().length === 0) {
      return {
        institution_suggested: options.institutionHint || 'Desconocido',
        detected_columns: [],
        total_rows: 0,
        valid_rows: 0,
        potential_duplicates: 0,
        sample_transactions: [],
      }
    }

    const lines = csvContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)

    if (lines.length < 2) {
      return {
        institution_suggested: options.institutionHint || 'Desconocido',
        detected_columns: [],
        total_rows: lines.length,
        valid_rows: 0,
        potential_duplicates: 0,
        sample_transactions: [],
      }
    }

    // Detectar delimitador inspeccionando la primera fila con múltiples tokens
    const delimiter = this.detectDelimiter(lines[0])
    const headers = this.parseCSVLine(lines[0], delimiter).map((h) => h.toLowerCase().trim())

    // Identificar índices de columnas
    const colIndices = this.identifyColumns(headers)

    // Detectar entidad sugerida
    const institutionSuggested = this.detectInstitutionFromText(csvContent, options.institutionHint)

    const parsedTransactions: BankTransaction[] = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      const cols = this.parseCSVLine(line, delimiter)

      if (cols.length === 0 || cols.every((c) => c.trim() === '')) continue

      const rawDate = colIndices.date >= 0 ? cols[colIndices.date] : ''
      const rawDesc = colIndices.description >= 0 ? cols[colIndices.description] : 'Transacción'

      let rawAmount = 0
      let txType: BankTransactionType = 'expense'

      // Si tiene columnas separadas de débito y crédito
      if (colIndices.debit >= 0 && colIndices.credit >= 0) {
        const debitVal = this.parseAmount(cols[colIndices.debit])
        const creditVal = this.parseAmount(cols[colIndices.credit])

        if (creditVal > 0) {
          rawAmount = creditVal
          txType = 'income'
        } else if (debitVal > 0) {
          rawAmount = debitVal
          txType = 'expense'
        }
      } else if (colIndices.amount >= 0) {
        const val = this.parseAmount(cols[colIndices.amount])
        rawAmount = Math.abs(val)
        if (colIndices.type >= 0) {
          const typeStr = cols[colIndices.type].toLowerCase()
          if (typeStr.includes('abono') || typeStr.includes('crédito') || typeStr.includes('ingreso')) {
            txType = 'income'
          } else if (typeStr.includes('transfer')) {
            txType = 'transfer'
          } else {
            txType = val >= 0 ? 'income' : 'expense'
          }
        } else {
          txType = val >= 0 ? 'income' : 'expense'
        }
      }

      if (rawAmount === 0 && !rawDate) {
        continue
      }

      // Normalizar usando BankDataNormalizer
      const normalized = BankDataNormalizer.normalizeRawTransaction({
        date: rawDate,
        description: rawDesc,
        amount: txType === 'expense' ? -rawAmount : rawAmount,
        currency: options.currency || 'COP',
        accountId: options.accountId,
        userId: options.userId,
        source: 'csv',
      })

      parsedTransactions.push(normalized)
    }

    return {
      institution_suggested: institutionSuggested,
      detected_columns: headers,
      total_rows: lines.length - 1,
      valid_rows: parsedTransactions.length,
      potential_duplicates: 0, // Se validará contra la base de datos
      sample_transactions: parsedTransactions.slice(0, 10),
    }
  }

  /**
   * Convierte y retorna todas las transacciones normalizadas listas para almacenar
   */
  public static extractAllTransactions(csvContent: string, options: CSVParseOptions): BankTransaction[] {
    const preview = this.parseStatement(csvContent, options)
    // Procesar todas las filas
    const delimiter = this.detectDelimiter(csvContent.split(/\r?\n/)[0] || ',')
    const lines = csvContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)

    if (lines.length < 2) return []

    const headers = this.parseCSVLine(lines[0], delimiter).map((h) => h.toLowerCase().trim())
    const colIndices = this.identifyColumns(headers)

    const transactions: BankTransaction[] = []

    for (let i = 1; i < lines.length; i++) {
      const cols = this.parseCSVLine(lines[i], delimiter)
      if (cols.length === 0 || cols.every((c) => c.trim() === '')) continue

      const rawDate = colIndices.date >= 0 ? cols[colIndices.date] : ''
      const rawDesc = colIndices.description >= 0 ? cols[colIndices.description] : 'Transacción'

      let rawAmount = 0
      let txType: BankTransactionType = 'expense'

      if (colIndices.debit >= 0 && colIndices.credit >= 0) {
        const debitVal = this.parseAmount(cols[colIndices.debit])
        const creditVal = this.parseAmount(cols[colIndices.credit])
        if (creditVal > 0) {
          rawAmount = creditVal
          txType = 'income'
        } else if (debitVal > 0) {
          rawAmount = debitVal
          txType = 'expense'
        }
      } else if (colIndices.amount >= 0) {
        const val = this.parseAmount(cols[colIndices.amount])
        rawAmount = Math.abs(val)
        txType = val >= 0 ? 'income' : 'expense'
      }

      if (rawAmount === 0 && !rawDate) continue

      transactions.push(
        BankDataNormalizer.normalizeRawTransaction({
          date: rawDate,
          description: rawDesc,
          amount: txType === 'expense' ? -rawAmount : rawAmount,
          currency: options.currency || 'COP',
          accountId: options.accountId,
          userId: options.userId,
          source: 'csv',
        })
      )
    }

    return transactions
  }

  // ─────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────
  private static detectDelimiter(headerLine: string): string {
    const delimiters = [',', ';', '\t', '|']
    let bestDelim = ','
    let maxCount = 0

    for (const d of delimiters) {
      const count = (headerLine.match(new RegExp(`\\${d}`, 'g')) || []).length
      if (count > maxCount) {
        maxCount = count
        bestDelim = d
      }
    }
    return bestDelim
  }

  private static parseCSVLine(line: string, delimiter: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ''))
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim().replace(/^"|"$/g, ''))
    return result
  }

  private static identifyColumns(headers: string[]): {
    date: number
    description: number
    amount: number
    debit: number
    credit: number
    type: number
  } {
    let date = -1
    let description = -1
    let amount = -1
    let debit = -1
    let credit = -1
    let type = -1

    for (let i = 0; i < headers.length; i++) {
      const h = headers[i]
      if (date === -1 && (h.includes('fecha') || h.includes('date') || h.includes('fec'))) {
        date = i
      } else if (
        description === -1 &&
        (h.includes('descrip') ||
          h.includes('detalle') ||
          h.includes('concepto') ||
          h.includes('movimiento') ||
          h.includes('comercio'))
      ) {
        description = i
      } else if (debit === -1 && (h.includes('débito') || h.includes('debito') || h.includes('cargo') || h.includes('salida'))) {
        debit = i
      } else if (credit === -1 && (h.includes('crédito') || h.includes('credito') || h.includes('abono') || h.includes('entrada'))) {
        credit = i
      } else if (amount === -1 && (h.includes('monto') || h.includes('valor') || h.includes('amount') || h.includes('importe'))) {
        amount = i
      } else if (type === -1 && (h.includes('tipo') || h.includes('type') || h.includes('naturaleza'))) {
        type = i
      }
    }

    // Fallbacks si no se encontró por nombre estándar
    if (date === -1) date = 0
    if (description === -1) description = headers.length > 1 ? 1 : 0
    if (amount === -1 && debit === -1 && credit === -1) {
      amount = headers.length > 2 ? 2 : 1
    }

    return { date, description, amount, debit, credit, type }
  }

  private static parseAmount(valStr?: string): number {
    if (!valStr) return 0

    // Limpiar símbolos de moneda y espacios
    let clean = valStr.replace(/[$€COP\s]/gi, '').trim()
    if (!clean) return 0

    const isNegative = clean.startsWith('-') || (clean.startsWith('(') && clean.endsWith(')'))
    clean = clean.replace(/[()\-+]/g, '')

    // Manejar separadores decimales/miles latinos (1.250.000,50 o 1,250,000.50)
    if (clean.includes('.') && clean.includes(',')) {
      if (clean.indexOf('.') < clean.indexOf(',')) {
        // Formato colombiano estándar: 1.250.000,50
        clean = clean.replace(/\./g, '').replace(',', '.')
      } else {
        // Formato anglosajón: 1,250,000.50
        clean = clean.replace(/,/g, '')
      }
    } else if (clean.includes(',')) {
      // Puede ser coma decimal (1500,50) o miles (1,500)
      const parts = clean.split(',')
      if (parts[parts.length - 1].length === 2) {
        clean = clean.replace(',', '.')
      } else {
        clean = clean.replace(/,/g, '')
      }
    } else if (clean.includes('.') && !clean.includes(',')) {
      // Formato miles colombiano con puntos (185.000 o 2.100.000)
      const parts = clean.split('.')
      if (parts[parts.length - 1].length === 3) {
        clean = clean.replace(/\./g, '')
      }
    }

    const parsed = parseFloat(clean)
    if (isNaN(parsed)) return 0
    return isNegative ? -parsed : parsed
  }

  private static detectInstitutionFromText(content: string, defaultName?: string): string {
    const lower = content.toLowerCase()
    if (lower.includes('bancolombia')) return 'Bancolombia'
    if (lower.includes('nequi')) return 'Nequi'
    if (lower.includes('davivienda')) return 'Davivienda'
    if (lower.includes('nu colombia') || lower.includes('nubank')) return 'Nu Colombia'
    if (lower.includes('banco de bogota') || lower.includes('bogota')) return 'Banco de Bogotá'
    return defaultName || 'Extracto Bancario'
  }
}

/**
 * NEXUS Finance — Natural Language Amount Parser
 * =====================================================
 * Converts Spanish natural language amount expressions into integer COP.
 *
 * Supported formats:
 *   "13.000"       → 13000
 *   "13000"        → 13000
 *   "13k"          → 13000
 *   "$13.000"      → 13000
 *   "13 mil"       → 13000
 *   "1.5 millones" → 1500000
 *   "1.500.000"    → 1500000
 *   "850 mil"      → 850000
 *   "2.5 millones" → 2500000
 *
 * IMPORTANT: Always returns an integer. No floats for monetary operations.
 */

export function parseAmount(raw: string): number | null {
  if (!raw) return null

  let s = raw
    .trim()
    .toLowerCase()
    .replace(/[$,]/g, '')  // strip $ and commas
    .replace(/\s+/g, ' ')

  // "1.5 millones" / "1,5 millones"
  const millonesMatch = s.match(/^([\d]+(?:[.,]\d+)?)\s*millon(?:es)?$/)
  if (millonesMatch) {
    const factor = parseFloat(millonesMatch[1].replace(',', '.'))
    return Math.round(factor * 1_000_000)
  }

  // "850 mil" / "13 mil"
  const milMatch = s.match(/^([\d]+(?:[.,]\d+)?)\s*mil$/)
  if (milMatch) {
    const factor = parseFloat(milMatch[1].replace(',', '.'))
    return Math.round(factor * 1_000)
  }

  // "13k" / "850k"
  const kMatch = s.match(/^([\d]+(?:[.,]\d+)?)k$/)
  if (kMatch) {
    const factor = parseFloat(kMatch[1].replace(',', '.'))
    return Math.round(factor * 1_000)
  }

  // Plain number with period-as-thousand separator (Colombian style): "13.000" "1.500.000"
  // Pattern: has digits with dots where each group is exactly 3 digits after the dot
  // Distinguish from decimal: if all dot-separated groups after first have exactly 3 digits → thousand separator
  const parts = s.split('.')
  if (parts.length > 1) {
    const allGroupsAreThousands = parts.slice(1).every((p) => /^\d{3}$/.test(p))
    if (allGroupsAreThousands) {
      const joined = parts.join('')
      const n = parseInt(joined, 10)
      if (!isNaN(n)) return n
    }
    // Decimal number (e.g. "13.5") — round to integer
    const n = parseFloat(s)
    if (!isNaN(n)) return Math.round(n)
  }

  // Plain integer: "13000"
  const n = parseInt(s, 10)
  if (!isNaN(n)) return n

  return null
}

/**
 * Parse multiple amounts from a phrase like "13.000 y 5.000 y 4.000"
 */
export function parseAmountsFromText(text: string): number[] {
  const amountPattern =
    /\$?\d+(?:[.,]\d{1,3})*(?:\s*(?:mil(?:lones?)?|k))?(?!\d)/gi

  const matches = text.match(amountPattern) || []
  return matches
    .map((m) => parseAmount(m))
    .filter((n): n is number => n !== null && n > 0)
}

/**
 * Normalise a date phrase in Spanish to ISO YYYY-MM-DD.
 * Supports: hoy, ayer, anteayer, "el lunes", "el 20 de septiembre", etc.
 */
export function parseDate(phrase: string, referenceDate = new Date()): string {
  const p = phrase.trim().toLowerCase()
  const ref = new Date(referenceDate)
  ref.setHours(0, 0, 0, 0)

  const isoRef = ref.toISOString().split('T')[0]

  if (/^hoy$/.test(p)) return isoRef

  if (/^ayer$/.test(p)) {
    ref.setDate(ref.getDate() - 1)
    return ref.toISOString().split('T')[0]
  }

  if (/^anteayer$/.test(p)) {
    ref.setDate(ref.getDate() - 2)
    return ref.toISOString().split('T')[0]
  }

  // Day names: lunes, martes, miércoles, jueves, viernes, sábado, domingo
  const dayNames: Record<string, number> = {
    domingo: 0, lunes: 1, martes: 2, 'miercoles': 3, miércoles: 3,
    jueves: 4, viernes: 5, sabado: 6, sábado: 6,
  }
  const dayMatch = p.match(/^(?:el\s+)?(\w+)$/)
  if (dayMatch && dayNames[dayMatch[1]] !== undefined) {
    const target = dayNames[dayMatch[1]]
    const current = ref.getDay()
    let diff = current - target
    if (diff <= 0) diff += 7
    ref.setDate(ref.getDate() - diff)
    return ref.toISOString().split('T')[0]
  }

  // "el 20 de septiembre" / "el 20 de septiembre de 2026"
  const MONTHS: Record<string, number> = {
    enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
    julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
  }
  const fullDateMatch = p.match(/^(?:el\s+)?(\d{1,2})\s+de\s+(\w+)(?:\s+de\s+(\d{4}))?$/)
  if (fullDateMatch) {
    const day = parseInt(fullDateMatch[1], 10)
    const month = MONTHS[fullDateMatch[2]]
    const year = fullDateMatch[3] ? parseInt(fullDateMatch[3], 10) : ref.getFullYear()
    if (month) {
      const d = new Date(year, month - 1, day)
      return d.toISOString().split('T')[0]
    }
  }

  // ISO date passthrough "2026-09-27"
  if (/^\d{4}-\d{2}-\d{2}$/.test(p)) return p

  // Fallback: today
  return isoRef
}

// ─────────────────────────────────────────────────────────────
// CATEGORY CLASSIFIER
// ─────────────────────────────────────────────────────────────

/** Maps Spanish keywords to NEXUS categories */
const CATEGORY_MAP: Array<{ keywords: RegExp; category: string; confidence: 'HIGH' | 'MEDIUM' }> = [
  { keywords: /almuez|almuerzo|desayuno|cena|comida|mercado|supermercado|galleta|jugo|snack|fritanga|hamburgues|pizza|domino|rappi|ifood|mcdonald|kfc|restaurante|cafe|cafeteria|empanada|arepa|tamale|agua|refresco|gaseosa/i, category: 'alimentacion', confidence: 'HIGH' },
  { keywords: /arriendo|alquiler|casa|apartamento|cuarto|habitacion|administracion|servicios del hogar|gas natural|acueducto|energia|epm|codensa|aseo|vigilancia|condominios?/i, category: 'vivienda', confidence: 'HIGH' },
  { keywords: /taxi|uber|cabify|bus|metro|transmilenio|gasolina|parqueadero|peaje|tren|bicicleta|moto|carro|autobus|pasaje|transporte/i, category: 'transporte', confidence: 'HIGH' },
  { keywords: /colegio|universidad|curso|libro|matricula|tutor|clases|escuela|educacion|english|ingles|idioma/i, category: 'educacion', confidence: 'HIGH' },
  { keywords: /tigo|claro|movistar|wom|internet|celular|telefono|plan datos|tv cable|une|edatel|luz|agua|gas|servicios publicos/i, category: 'servicios', confidence: 'HIGH' },
  { keywords: /spotify|netflix|prime|disney|hbo|max|youtube premium|apple music|paramount|crunchyroll|suscripci|membresia|plan mensual|renovacion/i, category: 'suscripciones', confidence: 'HIGH' },
  { keywords: /microsoft|adobe|software|laptop|computador|pc|celular|telefonos|tablet|auricular|cargador|usb|tecnologia|electronico|gaming|consola|teclado|mouse/i, category: 'tecnologia', confidence: 'HIGH' },
  { keywords: /cine|concierto|evento|bar|discoteca|fiesta|trago|cerveza|licor|rumba|teatro|entretenimiento|juego|videojuego/i, category: 'entretenimiento', confidence: 'HIGH' },
  { keywords: /ropa|zapato|accesorio|bolso|vestido|pantalon|camisa|tienda|falabella|exito|h&m|zara|compra|shopping/i, category: 'compras', confidence: 'HIGH' },
  { keywords: /medico|farmacia|drogueria|medicamento|pastilla|doctor|hospital|clinica|odontolog|dentista|optometria|lentes|gym|gimnasio|salud|ejercicio/i, category: 'salud', confidence: 'HIGH' },
]

export interface CategoryClassification {
  category: string
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
}

export function classifyCategory(description: string): CategoryClassification {
  const text = description.toLowerCase()
  for (const rule of CATEGORY_MAP) {
    if (rule.keywords.test(text)) {
      return { category: rule.category, confidence: rule.confidence }
    }
  }
  return { category: 'otros', confidence: 'LOW' }
}

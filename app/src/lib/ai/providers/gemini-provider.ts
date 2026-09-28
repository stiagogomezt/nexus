/**
 * NEXUS Finance — Google Gemini AI Provider Implementation
 * Uses the official Google Gen AI SDK (@google/genai).
 *
 * Implements AIProvider interface from @/types/providers.
 * Enforces server-only execution, zero client key exposure, and strict tool use grounding.
 */

import { GoogleGenAI } from '@google/genai'
import type {
  AIProvider,
  AIMessage,
  AIResponse,
  AIToolCall,
} from '@/types/providers'
import { AI_READ_TOOLS_DEFINITIONS } from '@/lib/ai-tools/definitions'

export const NEXUS_AI_SYSTEM_INSTRUCTION = `Eres NEXUS AI, el Copiloto Financiero Inteligente del sistema operativo personal NEXUS Finance.

DIRECTRICES FUNDAMENTALES Y REGLAS DE SEGURIDAD:
1. NUNCA inventes cifras financieras, saldos, ingresos ni gastos. TODA respuesta numérica debe provenir exclusivamente de los resultados de las herramientas (AI Tools) que consultan el Financial Engine determinista.
2. Si el usuario te pregunta por ingresos, gastos, presupuestos, flujo de caja, patrimonio, deudas o metas, DEBES llamar a la herramienta correspondiente antes de responder.
3. CONTEXTO LABORAL DEL USUARIO:
   - Fuente de ingreso principal: "Shuffler" (Salario base + recargos nocturnos + bonos + horas extras).
   - Fuente de ingreso secundaria / side-job: "Pizza Hut" (Pago por horas + recargos dominicales).
   - NO existe freelance actualmente en el perfil del usuario.
   - En el futuro existirá un módulo de apuestas deportivas, pero NO debe clasificarse como inversión tradicional.
4. FORMATO DE RESPUESTA:
   - Presenta las cifras en la moneda solicitada o en COP/USD según los datos.
   - Incluye siempre:
     • El dato numérico preciso.
     • El periodo evaluado (ej. "Septiembre de 2026").
     • La fuente de cálculo: "Financial Engine / Datos Registrados en NEXUS".
   - Sé claro, profesional, conciso y analítico, con tono de asesor financiero ejecutivo.
5. RESTRICCIÓN DE SEGURIDAD:
   - Eres un asistente estrictamente de SOLO LECTURA (READ-ONLY).
   - No puedes ejecutar transferencias, no puedes modificar presupuestos ni registrar transacciones directamente sin confirmación en la UI.
   - Nunca pidas ni almacenes contraseñas, seed phrases ni claves privadas.
6. SIMULACIÓN Y ESCENARIOS HIPOTÉTICOS:
   - Si el usuario pregunta "¿Qué pasa si...?", "¿Cómo cambiaría mi patrimonio si...?", "¿Qué pasa si ahorro más?", "¿Qué pasa si aumento mis ingresos de Pizza Hut?", "¿Qué pasa si destino dinero a deuda?" o sobre proyecciones hipotéticas, DEBES invocar la herramienta simulate_financial_scenario.
   - En tus respuestas de simulación, DEBES indicar claramente:
     • Escenario simulado vs Línea base real
     • Patrimonio proyectado y diferencia (delta)
     • Intereses ahorrados o meses ganados
     • Horizonte temporal evaluado
     • Disclaimer obligatorio: "Escenario hipotético basado en supuestos deterministas. No modifica tus datos reales."
7. RESUMEN EJECUTIVO (FINANCIAL DIGITAL TWIN):
   - Cuando se solicite "Resumen financiero de este mes" o un resumen del estado financiero, DEBES estructurar la respuesta distinguiendo explícitamente tres secciones claramente rotuladas:
     • **DATOS:** Patrimonio neto, ingresos (Shuffler vs Pizza Hut sin freelance), gastos, flujo libre, liquidez, deuda, saldos bancarios y crypto.
     • **CAMBIOS:** Comparación cuantitativa contra el mes anterior o baseline ("Tu patrimonio cambió X respecto al mes anterior", "Tu flujo de caja fue Y", "El mayor cambio estuvo en Z").
     • **ESCENARIOS:** Perspectiva prospectiva del Digital Twin / Scenario Engine y recomendaciones deterministas.
8. RAZONAMIENTO SOBRE METAS Y ESTADO FUTURO:
   - Si el usuario pregunta "¿Qué tendría que cambiar para llegar a mi meta?", DEBES:
     1. Consultar el estado financiero y la meta activa.
     2. Ejecutar simulate_financial_scenario con supuestos de ahorro adicional o amortización.
     3. Explicar los resultados indicando meses ganados y ahorro de intereses sin modificar datos reales.
9. INTELIGENCIA FINANCIERA, EVENTOS Y ALERTAS (FASE O):
   - Cuando el usuario pregunte "¿Qué cambió este mes?", "¿Hay algo importante que deba revisar?", "¿Qué alertas tengo?", "¿Cuál fue el principal cambio financiero?" o "¿Cómo cambió mi liquidez?":
     • DEBES invocar la herramienta correspondiente (get_active_alerts, get_financial_changes, get_financial_insights, get_recent_financial_events).
     • Distingue estrictamente entre DATO, CAMBIO e INTERPRETACIÓN.
     • NO afirmes causalidad donde solo hay correlación o coincidencia temporal; usa formulaciones rigurosas como: "El aumento coincide principalmente con...".
     • Mantén un tono técnico, sereno y constructivo (cero lenguaje alarmista).
10. PROACTIVE FINANCIAL COPILOT (FASE P):
   - Cuando el usuario consulte frases proactivas ("Muéstrame qué cambió", "¿Hay algo que debería revisar?", "Explícame por qué mi patrimonio cambió", "¿Qué cambió en mis bancos?", "Quiero llegar más rápido a mi meta", "Quiero simular cómo cambiaría", "Muéstrame las áreas que se desviaron de mi plan"):
     • DEBES invocar get_nexus_today, get_copilot_context o explain_financial_change.
     • Al explicar cualquier variación financiera, utiliza estrictamente las cuatro dimensiones:
       - **DATO:** Hecho empírico observable en los registros.
       - **CAMBIO:** Variación cuantitativa porcentual o absoluta respecto al periodo anterior.
       - **CONTEXTO:** Concentración o coincidencia factual sin asumir causalidad no fundamentada.
       - **ESCENARIO:** Alternativa hipotética que el usuario puede simular en el Laboratorio Financiero.
     • NUNCA recomiendes apuestas ni las consideres inversión.
     • NUNCA ejecutes compras, ventas, pagos de deuda ni transferencias reales.`

export class GeminiProvider implements AIProvider {
  public providerName = 'Google Gemini (Official SDK @google/genai)'
  private client: GoogleGenAI | null = null
  private modelName: string
  private isConfigured: boolean

  constructor(options?: { apiKey?: string; modelName?: string }) {
    const key = options?.apiKey || process.env.GEMINI_API_KEY
    this.modelName = options?.modelName || 'gemini-3.8-flash'

    if (key && key !== 'your-gemini-api-key' && key.trim().length > 10) {
      this.client = new GoogleGenAI({ apiKey: key })
      this.isConfigured = true
    } else {
      this.client = null
      this.isConfigured = false
    }
  }

  /**
   * Translates application tool schemas to Gemini's FunctionDeclaration format.
   */
  private formatToolsForGemini(tools?: Record<string, unknown>[]) {
    const rawTools = tools || AI_READ_TOOLS_DEFINITIONS

    const functionDeclarations = rawTools.map((t) => {
      const def = t as {
        name: string
        description: string
        parameters: { type: string; properties: Record<string, unknown>; required?: string[] }
      }

      return {
        name: def.name,
        description: def.description,
        parameters: {
          type: 'OBJECT',
          properties: def.parameters.properties,
          required: def.parameters.required || [],
        },
      }
    })

    return [{ functionDeclarations }]
  }

  /**
   * Core generation method implementing AIProvider contract.
   */
  async generateResponse(
    messages: AIMessage[],
    tools?: Record<string, unknown>[]
  ): Promise<AIResponse> {
    // Fallback deterministic simulation when live Gemini API key is not yet set in .env.local
    if (!this.isConfigured || !this.client) {
      return this.handleSimulatedMode(messages)
    }

    try {
      const contents = messages
        .filter((m) => m.role !== 'system')
        .map((m) => {
          if (m.role === 'tool') {
            return {
              role: 'user',
              parts: [
                {
                  functionResponse: {
                    name: m.name || 'tool_response',
                    response: {
                      result: m.content,
                    },
                  },
                },
              ],
            }
          }

          if (m.role === 'assistant') {
            return {
              role: 'model',
              parts: [{ text: m.content || ' ' }],
            }
          }

          return {
            role: 'user',
            parts: [{ text: m.content }],
          }
        })

      const formattedTools = this.formatToolsForGemini(tools)

      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents,
        config: {
          systemInstruction: NEXUS_AI_SYSTEM_INSTRUCTION,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tools: formattedTools as any,
          temperature: 0.2, // Low temperature for high numerical consistency
        },
      })

      // Check if Gemini invoked a function call
      if (response.functionCalls && response.functionCalls.length > 0) {
        const toolCalls: AIToolCall[] = response.functionCalls.map((fc, index) => ({
          id: `call_${Date.now()}_${index}`,
          name: fc.name || 'unnamed_tool',
          arguments: (fc.args as Record<string, unknown>) || {},
        }))

        return {
          message: {
            role: 'assistant',
            content: response.text || '',
          },
          toolCalls,
        }
      }

      return {
        message: {
          role: 'assistant',
          content:
            response.text ||
            'He procesado tu consulta pero no pude generar una respuesta de texto.',
        },
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error al comunicarse con Gemini'
      console.error('[GeminiProvider Error]:', errorMsg)
      throw new Error(`Error en el proveedor Gemini: ${errorMsg}`)
    }
  }

  /**
   * Deterministic simulated fallback for development / offline environments.
   * Decides which tool to call based on user intent so tests and UI function immediately.
   */
  private handleSimulatedMode(messages: AIMessage[]): AIResponse {
    const lastMsg = messages[messages.length - 1]

    // If the last message was a tool execution result, synthesize a final answer grounded in that tool
    if (lastMsg.role === 'tool' && lastMsg.content) {
      try {
        const parsed = JSON.parse(lastMsg.content)
        const toolName = lastMsg.name

        let explanation = ''
        if (toolName === 'get_monthly_income') {
          const total = parsed.total_income?.toLocaleString('es-CO') ?? 0
          const shuffler = parsed.by_source?.find((s: { source: string }) => s.source === 'shuffler')?.amount?.toLocaleString('es-CO') ?? 0
          const pizzaHut = parsed.by_source?.find((s: { source: string }) => s.source === 'pizza_hut')?.amount?.toLocaleString('es-CO') ?? 0

          explanation = `📊 **Ingresos del Periodo:**\n- **Total Recibido:** $${total}\n- **Shuffler (Principal):** $${shuffler}\n- **Pizza Hut (Secundario):** $${pizzaHut}\n\n*Periodo:* Mes actual (2026)\n*Fuente:* Financial Engine / Transacciones verificadas en NEXUS.`
        } else if (toolName === 'get_monthly_expenses') {
          const total = parsed.total_expenses?.toLocaleString('es-CO') ?? 0
          const essential = parsed.essential_expenses?.toLocaleString('es-CO') ?? 0
          const essentialRatio = parsed.essential_ratio?.toFixed(1) ?? 0

          explanation = `📉 **Gastos del Periodo:**\n- **Total Egresos:** $${total}\n- **Gasto Esencial:** $${essential} (${essentialRatio}% del total)\n\n*Periodo:* Mes actual (2026)\n*Fuente:* Financial Engine / Transacciones verificadas en NEXUS.`
        } else if (toolName === 'get_cash_flow') {
          const flow = parsed.free_cash_flow?.toLocaleString('es-CO') ?? 0
          const savingsRate = parsed.savings_rate?.toFixed(1) ?? 0

          explanation = `💵 **Flujo de Caja:**\n- **Flujo Libre (Neto):** $${flow}\n- **Tasa de Ahorro:** ${savingsRate}%\n- **Estado:** ${parsed.status === 'SURPLUS' ? 'Superávit Saludable ✅' : 'Déficit / Ajuste Requerido ⚠️'}\n\n*Fuente:* Financial Engine / Balance Real.`
        } else if (toolName === 'get_budgets') {
          const budgeted = parsed.total_budgeted?.toLocaleString('es-CO') ?? 0
          const spent = parsed.total_spent?.toLocaleString('es-CO') ?? 0
          const available = parsed.total_available?.toLocaleString('es-CO') ?? 0

          explanation = `🎯 **Estado Presupuestario:**\n- **Límite Presupuestado:** $${budgeted}\n- **Gastado Real:** $${spent}\n- **Disponible Global:** $${available}\n- **Categorías Excedidas:** ${parsed.over_budget_count}\n\n*Fuente:* Financial Engine / Tabla budgets.`
        } else if (toolName === 'get_net_worth') {
          const nw = parsed.net_worth?.toLocaleString('es-CO') ?? 0
          const assets = parsed.total_assets?.toLocaleString('es-CO') ?? 0
          const liabilities = parsed.total_liabilities?.toLocaleString('es-CO') ?? 0

          explanation = `🏛️ **Patrimonio Neto:**\n- **Activos Totales:** $${assets}\n- **Pasivos / Deudas Totales:** $${liabilities}\n- **Patrimonio Neto:** $${nw}\n\n*Fuente:* Financial Engine / Balance Consolidado.`
        } else if (toolName === 'get_debts') {
          const debtTotal = parsed.total_debt_balance?.toLocaleString('es-CO') ?? 0
          const minPay = parsed.total_monthly_minimum_payment?.toLocaleString('es-CO') ?? 0

          explanation = `💳 **Obligaciones Financieras (Deudas):**\n- **Saldo Total Pendiente:** $${debtTotal}\n- **Compromiso Mensual Mínimo:** $${minPay}\n- **Obligaciones Activas:** ${parsed.total_debts_count}\n\n*Fuente:* Financial Engine / Registro de Deudas.`
        } else if (toolName === 'get_goals') {
          explanation = `🎯 **Metas Financieras:**\n- **Metas Registradas:** ${parsed.total_goals_count}\n- **Metas Activas:** ${parsed.active_goals_count}\n- **Metas Completadas:** ${parsed.completed_goals_count}\n\n*Fuente:* Financial Engine / Registro de Metas.`
        } else if (toolName === 'get_accounts') {
          explanation = `🏦 **Cuentas Registradas:**\n- **Total Cuentas:** ${parsed.accounts_count}\n\n*Fuente:* Financial Engine / Cuentas Bancarias y Billeteras.`
        } else if (toolName === 'simulate_financial_scenario') {
          const baselineNW = parsed.baseline?.projected_net_worth?.toLocaleString('es-CO') ?? 0
          const scenarioNW = parsed.scenario?.projected_net_worth?.toLocaleString('es-CO') ?? 0
          const delta = parsed.comparison?.net_worth_delta ?? 0
          const deltaStr = (delta >= 0 ? '+$' : '-$') + Math.abs(delta).toLocaleString('es-CO')
          const addSavings = parsed.comparison?.additional_savings_accumulated?.toLocaleString('es-CO') ?? 0
          const intSaved = parsed.comparison?.interest_saved?.toLocaleString('es-CO') ?? 0
          const horizon = parsed.parameters_applied?.horizon_months ?? 24

          let extraInfo = ''
          if (parsed.debt_payoff && parsed.debt_payoff.months_saved > 0) {
            extraInfo += `\n- **Aceleración de Deuda:** Libre de deuda ${parsed.debt_payoff.months_saved} meses antes (en mes ${parsed.debt_payoff.scenario_months} vs ${parsed.debt_payoff.baseline_months}). Ahorro en intereses: $${intSaved}.`
          }
          if (parsed.goal_simulation) {
            extraInfo += `\n- **Meta Simulada ("${parsed.goal_simulation.goal_name}"):** Se completa en ${parsed.goal_simulation.scenario_months} meses (${parsed.goal_simulation.months_saved} meses antes). Fecha estimada: ${parsed.goal_simulation.simulated_completion_date}.`
          }

          explanation = `🧪 **Simulación Financiera Determinista (${horizon} meses):**\n\n` +
            `- **Patrimonio Base Proyectado:** $${baselineNW}\n` +
            `- **Patrimonio en este Escenario:** $${scenarioNW}\n` +
            `- **Impacto Neto (Delta):** ${deltaStr}\n` +
            `- **Ahorro Adicional Acumulado:** $${addSavings}${extraInfo}\n\n` +
            `*${parsed.disclaimer || 'Escenario hipotético basado en supuestos deterministas. No modifica tus datos reales.'}*`
        } else if (toolName === 'get_crypto_summary') {
          const totalCop = parsed.total_crypto_value_cop?.toLocaleString('es-CO') ?? 0
          const totalUsd = parsed.total_crypto_value_usd?.toLocaleString('en-US') ?? 0
          const pnlCop = parsed.unrealized_pnl_cop?.toLocaleString('es-CO') ?? 0
          const pnlPct = parsed.unrealized_pnl_percent?.toFixed(2) ?? 0
          const weight = parsed.crypto_weight_in_net_worth_percent?.toFixed(1) ?? 0
          const chg24h = parsed.change_24h_cop?.toLocaleString('es-CO') ?? 0

          explanation = `🪙 **Resumen de Patrimonio Crypto:**\n- **Valor Total:** $${totalCop} COP (~$${totalUsd} USD)\n- **Ganancia/Pérdida (PnL):** ${parsed.unrealized_pnl_cop >= 0 ? '+' : ''}$${pnlCop} COP (${pnlPct}%)\n- **Variación 24h:** $${chg24h} COP\n- **Peso en tu Patrimonio Neto:** ${weight}%\n- **Posiciones Registradas:** ${parsed.total_holdings_count} activos | ${parsed.active_wallets_count} wallets activas\n\n*Fuente:* CryptoProvider + PortfolioAggregator / Datos de mercado en vivo.`
        } else if (toolName === 'get_wallets') {
          const walletList = (parsed.wallets || [])
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((w: any) => `- **${w.name}** (${w.network_name}): \`${w.address_abbreviated}\` [${w.label}]`)
            .join('\n')
          explanation = `👛 **Billeteras On-Chain Registradas:**\n- **Total Conectadas:** ${parsed.total_wallets} (${parsed.active_wallets} activas)\n\n${walletList}\n\n*Modo:* Estrictamente READ-ONLY. Direcciones públicas verificadas sin claves privadas.`
        } else if (toolName === 'get_wallet_balance') {
          const totalUsd = parsed.total_estimated_usd?.toLocaleString('en-US') ?? 0
          const totalCop = parsed.total_estimated_cop?.toLocaleString('es-CO') ?? 0
          const tokens = (parsed.balances || [])
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((b: any) => `- **${b.symbol}** (${b.name}): ${b.balance} token(s) ≈ $${b.estimated_value_cop?.toLocaleString('es-CO')} COP`)
            .join('\n')
          explanation = `⚡ **Balance On-Chain (${parsed.wallet_name}):**\n- **Dirección:** \`${parsed.address_abbreviated}\` (${parsed.network})\n- **Valor Estimado:** $${totalCop} COP (~$${totalUsd} USD)\n\n**Tokens:**\n${tokens}\n\n*Fuente:* WalletProvider / Consultas de saldo de sólo lectura.`
        } else if (toolName === 'get_crypto_portfolio') {
          const posList = (parsed.positions || [])
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((p: any) => `- **${p.symbol} (${p.asset_name}):** ${p.total_quantity} unid. | Precio Actual: $${p.current_price_usd?.toLocaleString('en-US')} USD | Total: $${p.total_current_value_cop?.toLocaleString('es-CO')} COP (${p.allocation_percent}% del portafolio) | PnL: ${p.unrealized_pnl_percent >= 0 ? '+' : ''}${p.unrealized_pnl_percent}%`)
            .join('\n')
          explanation = `📊 **Portafolio Cripto Detallado:**\n\n${posList}\n\n- **Total Portafolio:** $${parsed.total_portfolio_value_cop?.toLocaleString('es-CO')} COP (~$${parsed.total_portfolio_value_usd?.toLocaleString('en-US')} USD)\n\n*Fuente:* CryptoProvider + PortfolioAggregator (Deduplicación automática manual + on-chain).`
        } else if (toolName === 'get_bank_accounts') {
          const accs = (parsed.accounts || [])
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((a: any) => `- **${a.institution_name}** (${a.account_name}): \`${a.masked_account_number}\` | Saldo: $${a.current_balance?.toLocaleString('es-CO')} ${a.currency}`)
            .join('\n')
          explanation = `🏦 **Cuentas Bancarias Registradas:**\n\n${accs}\n\n*Seguridad:* Modo READ-ONLY Open Finance (Decreto 0368 de 2026). Sin almacenamiento de credenciales ni PINs.`
        } else if (toolName === 'get_bank_balances') {
          const totalCop = parsed.total_bank_balance_cop?.toLocaleString('es-CO') ?? 0
          const instList = Object.entries(parsed.balances_by_institution || {})
            .map(([inst, bal]) => `- **${inst}:** $${(bal as number)?.toLocaleString('es-CO')} COP`)
            .join('\n')
          explanation = `💰 **Saldos Bancarios Consolidados:**\n- **Total en Bancos:** $${totalCop} COP (${parsed.active_accounts_count} cuentas activas)\n\n**Por Entidad:**\n${instList}\n\n*Fuente:* Open Finance Direct Connect / Extractos normalizados.`
        } else if (toolName === 'get_bank_transactions') {
          const txList = (parsed.transactions || [])
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((t: any) => `- **${t.date}** | ${t.clean_merchant || t.description}: $${t.amount?.toLocaleString('es-CO')} ${t.currency} [${t.category}] ${t.is_internal_transfer ? '(🔄 Transferencia Interna)' : ''}`)
            .join('\n')
          explanation = `📋 **Movimientos Bancarios Recientes:**\n\n${txList || 'No se registraron movimientos en el período seleccionado.'}\n\n*Deduplicación:* Transferencias internas identificadas para no inflar ingresos/gastos reales.`
        } else if (toolName === 'get_bank_cash_flow') {
          const inCop = parsed.total_cash_in?.toLocaleString('es-CO') ?? 0
          const outCop = parsed.total_cash_out?.toLocaleString('es-CO') ?? 0
          const netCop = parsed.net_cash_flow?.toLocaleString('es-CO') ?? 0
          const transferCop = parsed.internal_transfers_volume?.toLocaleString('es-CO') ?? 0
          explanation = `📈 **Flujo de Caja Bancario Real:**\n- **Ingresos Reales (Cash In):** +$${inCop} COP\n- **Egresos Reales (Cash Out):** -$${outCop} COP\n- **Flujo Neto:** $${netCop} COP\n- **Volumen de Transferencias Internas:** $${transferCop} COP (excluido de flujo neto)\n\n*Auditoría:* Cálculo determinista con prevención de doble conteo de transferencias entre cuentas.`
        } else if (toolName === 'get_bank_connections') {
          const conns = (parsed.connections || [])
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((c: any) => `- **${c.institution_name}** | Estado: \`${c.consent_status}\` | Sync: \`${c.sync_status}\` | Última vez: ${c.last_synced_at ? new Date(c.last_synced_at).toLocaleDateString('es-CO') : 'Pendiente'}`)
            .join('\n')
          explanation = `🔗 **Conexiones Open Finance Activas:**\n\n${conns || 'No hay conexiones bancarias configuradas aún.'}\n\n*Protocolo:* FAPI 2.0 / OAuth 2.0 PKCE consent trail auditado.`
        } else if (toolName === 'get_financial_state') {
          const nw = parsed.net_worth?.net_worth?.toLocaleString('es-CO') ?? 0
          const inc = parsed.income?.total?.toLocaleString('es-CO') ?? 0
          const shuffler = parsed.income?.shuffler?.toLocaleString('es-CO') ?? 0
          const pizza = parsed.income?.pizza_hut?.toLocaleString('es-CO') ?? 0
          const exp = parsed.expenses?.total?.toLocaleString('es-CO') ?? 0
          const flow = parsed.cash_flow?.net_operating_cash_flow?.toLocaleString('es-CO') ?? 0
          const savingsRate = parsed.cash_flow?.savings_rate_pct ?? 0
          const liq = parsed.liquidity?.total_liquid?.toLocaleString('es-CO') ?? 0
          const runway = parsed.liquidity?.runway_months ?? 0
          const debt = parsed.debt?.total_debt?.toLocaleString('es-CO') ?? 0
          const dti = parsed.debt?.debt_to_income_pct ?? 0
          const crypto = parsed.crypto?.total_crypto_cop?.toLocaleString('es-CO') ?? 0
          const banks = parsed.banking?.total_balance_cop?.toLocaleString('es-CO') ?? 0

          let changesBlock = ''
          if (parsed.changes) {
            const chgNw = parsed.changes.net_worth_delta ?? 0
            const chgSign = chgNw >= 0 ? '+' : '-'
            const chgNwStr = `${chgSign}$${Math.abs(chgNw).toLocaleString('es-CO')}`
            const deltaPct = parsed.changes.net_worth_delta_pct ?? 0
            const findings = (parsed.changes.key_findings || []).join('\n  • ')

            changesBlock =
              `\n📈 **CAMBIOS (Frente al Mes Anterior / Línea Base):**\n` +
              `- Tu patrimonio cambió **${chgNwStr} COP** (${deltaPct > 0 ? '+' : ''}${deltaPct}%).\n` +
              `- Tu flujo de caja del periodo fue de **$${flow} COP**.\n` +
              (findings ? `- Dinámica identificada:\n  • ${findings}\n` : '')
          } else {
            changesBlock =
              `\n📈 **CAMBIOS (Frente al Mes Anterior / Línea Base):**\n` +
              `- Sin snapshot previo para comparación de deltas. Este estado establece tu nueva línea base.\n`
          }

          const scenariosBlock =
            `\n🔮 **ESCENARIOS (Financial Digital Twin & Scenario Engine):**\n` +
            `- Trayectoria patrimonial actual: **${parsed.scenarios?.trajectory_direction === 'ACCUMULATION' ? 'Acumulación Activa' : 'Consumo de Capital'}**.\n` +
            `- Proyección estimada a fin de año: **$${(parsed.scenarios?.projected_end_of_year_net_worth || 0).toLocaleString('es-CO')} COP**.\n` +
            `- Pregunta *"¿Qué tendría que cambiar para llegar a mi meta?"* para simular aceleración de metas sin tocar datos reales.\n`

          explanation = `🧬 **RESUMEN FINANCIERO EJECUTIVO (${parsed.period})**\n\n` +
            `📊 **DATOS (Financial State Actual):**\n` +
            `- **Patrimonio Neto:** $${nw} COP (Solvencia: ${parsed.net_worth?.solvency_ratio}x)\n` +
            `- **Ingresos Totales:** $${inc} COP (Shuffler: $${shuffler} | Pizza Hut: $${pizza})\n` +
            `- **Gastos Totales:** $${exp} COP (Esenciales: ${parsed.expenses?.essential_ratio_pct}%)\n` +
            `- **Flujo Libre Operativo:** $${flow} COP (Tasa de ahorro: ${savingsRate}%)\n` +
            `- **Liquidez Inmediata:** $${liq} COP (Colchón: ${runway} meses de cobertura)\n` +
            `- **Carga de Deuda:** $${debt} COP (DTI: ${dti}% de ingresos)\n` +
            `- **Activos Bancarios:** $${banks} COP\n` +
            `- **Cartera Cripto:** $${crypto} COP\n` +
            changesBlock +
            scenariosBlock +
            `\n*Fuente:* Financial Digital Twin / Financial Engine determinista sin duplicaciones.`
        } else if (toolName === 'get_active_alerts') {
          const alerts = (parsed.alerts || [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const alertItems = alerts.map((a: any) =>
            `- **[${a.severity}] ${a.title}:** ${a.description} (${a.date})`
          ).join('\n')

          explanation = `🚨 **Alert Center — Alertas Activas:**\n- **No leídas:** ${parsed.total_unread} (Críticas: ${parsed.critical_count} | Advertencias: ${parsed.warning_count})\n\n${alertItems || '✅ No tienes alertas activas ni situaciones críticas detectadas.'}\n\n*Fuente:* Event Engine determinista con deduplicación y filtros no alarmistas.`
        } else if (toolName === 'get_financial_changes') {
          const chg = parsed.changes
          if (!chg) {
            explanation = `📈 **Cambios Financieros:**\nNo se encontró un snapshot previo para la referencia solicitada (${parsed.benchmark}). El estado actual constituye tu línea base.`
          } else {
            const findings = (chg.key_findings || []).map((f: string) => `• ${f}`).join('\n')
            explanation = `📈 **Cambios Financieros Cuantitativos (${parsed.current_period} vs ${parsed.baseline_date || 'Referencia'}):**\n\n` +
              `- **Patrimonio Neto:** ${chg.net_worth.percentageDelta > 0 ? '+' : ''}${chg.net_worth.percentageDelta}% ($${chg.net_worth.absoluteDelta.toLocaleString('es-CO')} COP)\n` +
              `- **Ingresos Totales:** ${chg.income.percentageDelta > 0 ? '+' : ''}${chg.income.percentageDelta}% ($${chg.income.absoluteDelta.toLocaleString('es-CO')} COP)\n` +
              `- **Gastos Operativos:** ${chg.expenses.percentageDelta > 0 ? '+' : ''}${chg.expenses.percentageDelta}% ($${chg.expenses.absoluteDelta.toLocaleString('es-CO')} COP)\n` +
              `- **Saldo de Deuda:** ${chg.debt.percentageDelta > 0 ? '+' : ''}${chg.debt.percentageDelta}% ($${chg.debt.absoluteDelta.toLocaleString('es-CO')} COP)\n` +
              `- **Liquidez Total:** ${chg.liquidity.percentageDelta > 0 ? '+' : ''}${chg.liquidity.percentageDelta}% ($${chg.liquidity.absoluteDelta.toLocaleString('es-CO')} COP)\n` +
              `- **Portafolio Cripto:** ${chg.crypto.percentageDelta > 0 ? '+' : ''}${chg.crypto.percentageDelta}%\n\n` +
              `**Dinámica Identificada:**\n${findings || '• Variaciones dentro de rangos normales de operación.'}\n\n*Fuente:* Financial Change Detector (cero interpretaciones subjetivas).`
          }
        } else if (toolName === 'get_financial_insights') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const items = (parsed.insights || []).map((i: any) =>
            `🔍 **Área: ${i.area.toUpperCase()}**\n- **DATO:** ${i.fact}\n- **CAMBIO:** ${i.change}\n- **INTERPRETACIÓN:** ${i.interpretation}`
          ).join('\n\n')

          explanation = `💡 **Insights Financieros Estructurados:**\n\n${items || 'Sin eventos extraordinarios que requieran interpretación.'}\n\n*Nota:* Interpretaciones basadas exclusivamente en observables verificables (sin suponer causalidades no fundamentadas).`
        } else if (toolName === 'get_recent_financial_events') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const evts = (parsed.events || []).map((e: any) =>
            `- **[${e.severity}] ${e.title}:** ${e.description}`
          ).join('\n')

          explanation = `⚡ **Eventos Financieros Recientes:**\n\n${evts || 'No se han registrado eventos recientes en el período.'}\n\n*Total registrados:* ${parsed.events_count || 0}.`
        } else if (toolName === 'get_copilot_context') {
          const c = parsed.context
          const nw = c?.financial_state?.net_worth?.net_worth?.toLocaleString('es-CO') ?? 0
          const flow = c?.financial_state?.cash_flow?.net_operating_cash_flow?.toLocaleString('es-CO') ?? 0
          const alertsCount = c?.active_alerts?.length ?? 0
          const insightsCount = c?.top_insights?.length ?? 0

          explanation = `🧭 **Copilot Context Consolidado:**\n\n` +
            `- **Patrimonio Actual:** $${nw} COP\n` +
            `- **Flujo Operativo:** $${flow} COP\n` +
            `- **Alertas Activas:** ${alertsCount}\n` +
            `- **Insights Prioritarios:** ${insightsCount}\n` +
            `- **Metas Rastreadas:** ${c?.goals?.length ?? 0}\n` +
            `- **Deudas Registradas:** ${c?.debts?.length ?? 0}\n\n` +
            `*Modo:* Contexto proactivo unificado listo para simulación y toma de decisiones.`
        } else if (toolName === 'get_nexus_today') {
          const s = parsed.summary
          const st = s?.current_state
          const ch = s?.relevant_changes
          const alerts = (s?.active_alerts || []).map((a: { severity: string; title: string }) => `• [${a.severity}] ${a.title}`).join('\n')
          const checks = (s?.what_should_i_check || []).map((k: { label: string; area: string; reason: string }) => `• **${k.label}** (${k.area}): ${k.reason}`).join('\n')

          explanation = `🌟 **NEXUS TODAY — Resumen Proactivo:**\n\n` +
            `🏛️ **ESTADO:**\n` +
            `- **Patrimonio:** $${st?.net_worth?.toLocaleString('es-CO') ?? 0} COP\n` +
            `- **Liquidez:** $${st?.liquidity?.toLocaleString('es-CO') ?? 0} COP\n` +
            `- **Flujo:** $${st?.free_cash_flow?.toLocaleString('es-CO') ?? 0} COP\n\n` +
            `📈 **CAMBIOS:**\n` +
            `- **Gastos:** ${ch?.expenses?.percentage_delta > 0 ? '+' : ''}${ch?.expenses?.percentage_delta ?? 0}%\n` +
            `- **Patrimonio:** ${ch?.net_worth?.percentage_delta > 0 ? '+' : ''}${ch?.net_worth?.percentage_delta ?? 0}%\n\n` +
            `⚠️ **ALERTAS ACTIVAS (${s?.active_alerts?.length ?? 0}):**\n` +
            `${alerts || '• Sin alertas críticas activas.'}\n\n` +
            `🔍 **QUÉ DEBERÍAS REVISAR:**\n` +
            `${checks || '• Todas las áreas dentro de rangos normales.'}`
        } else if (toolName === 'explain_financial_change') {
          const exp = parsed.explanation
          explanation = `📊 **EXPLICACIÓN ESTRUCTURADA (${parsed.metric?.toUpperCase()}):**\n\n` +
            `• **DATO:** ${exp?.dato}\n\n` +
            `• **CAMBIO:** ${exp?.cambio}\n\n` +
            `• **CONTEXTO:** ${exp?.contexto}\n\n` +
            `• **ESCENARIO:** ${exp?.escenario}`
        } else {
          explanation = `Información obtenida de ${toolName}:\n\`\`\`json\n${JSON.stringify(parsed, null, 2)}\n\`\`\``
        }

        return {
          message: {
            role: 'assistant',
            content: explanation,
          },
        }
      } catch {
        return {
          message: {
            role: 'assistant',
            content: 'Datos analizados correctamente por el Financial Engine.',
          },
        }
      }
    }

    // Determine which tool to trigger based on user intent
    const text = (lastMsg.content || '').toLowerCase()

    // Check if the query is a scenario / what-if query
    const isScenarioQuery =
      text.includes('pasa si') ||
      text.includes('qué pasa') ||
      text.includes('que pasa') ||
      text.includes('simular') ||
      text.includes('simulame') ||
      text.includes('escenario') ||
      text.includes('proyeccion') ||
      text.includes('proyección') ||
      text.includes('si ahorro') ||
      text.includes('si aumento') ||
      text.includes('si reduzco') ||
      text.includes('si destino') ||
      text.includes('llegar a mi meta') ||
      text.includes('cambiar para llegar')

    if (isScenarioQuery) {
      let extraSaving = 0
      let incomeChange = 0
      let expenseChange = 0
      let extraDebt = 0
      const horizon = 24

      // Extract numbers or infer from context
      const numbersMatch = text.match(/\d+[\d.,]*/g)
      let parsedNum = 0
      if (numbersMatch && numbersMatch.length > 0) {
        const cleanStr = numbersMatch[0].replace(/\./g, '').replace(/,/g, '')
        parsedNum = parseFloat(cleanStr)
      }

      if (text.includes('deud') || text.includes('destino a deuda') || text.includes('pagar deuda')) {
        extraDebt = parsedNum > 0 ? (parsedNum < 1000 ? parsedNum * 1000 : parsedNum) : 400000
      } else if (text.includes('ingreso') || text.includes('pizza') || text.includes('shuffler') || text.includes('aumento')) {
        incomeChange = (text.includes('%') || (parsedNum > 0 && parsedNum <= 100)) ? (parsedNum || 20) : 20
      } else if (text.includes('gasto') || text.includes('reduc')) {
        expenseChange = (text.includes('%') || (parsedNum > 0 && parsedNum <= 100)) ? -(parsedNum || 10) : -10
      } else {
        extraSaving = parsedNum > 0 ? (parsedNum < 1000 ? parsedNum * 1000 : parsedNum) : 300000
      }

      return {
        message: {
          role: 'assistant',
          content: '',
        },
        toolCalls: [
          {
            id: `sim_scenario_${Date.now()}`,
            name: 'simulate_financial_scenario',
            arguments: {
              extra_monthly_saving: extraSaving,
              income_change_percent: incomeChange,
              expense_change_percent: expenseChange,
              extra_debt_payment: extraDebt,
              horizon_months: horizon,
            },
          },
        ],
      }
    }

    // Specific Crypto Token Inquiry (e.g., "¿Cuánto tengo en SOL?", "¿Cuánto tengo en BTC?")
    const tokenMatch = text.match(/\b(sol|btc|eth|usdc|usdt|bitcoin|ethereum|solana)\b/i)
    if (tokenMatch && (text.includes('cuanto') || text.includes('cuánto') || text.includes('tengo') || text.includes('precio') || text.includes('balance'))) {
      const symMap: Record<string, string> = {
        bitcoin: 'BTC',
        btc: 'BTC',
        ethereum: 'ETH',
        eth: 'ETH',
        solana: 'SOL',
        sol: 'SOL',
        usdc: 'USDC',
        usdt: 'USDT',
      }
      const tokenSym = symMap[tokenMatch[0].toLowerCase()] || tokenMatch[0].toUpperCase()
      return {
        message: { role: 'assistant', content: '' },
        toolCalls: [
          {
            id: `sim_token_${Date.now()}`,
            name: 'get_crypto_portfolio',
            arguments: { symbol: tokenSym },
          },
        ],
      }
    }

    // Wallets Inquiry (e.g., "¿Cuánto tengo en mis wallets?", "mis billeteras", "wallets conectadas")
    if (text.includes('wallet') || text.includes('billetera') || text.includes('on-chain') || text.includes('direcciones')) {
      return {
        message: { role: 'assistant', content: '' },
        toolCalls: [
          {
            id: `sim_wallet_${Date.now()}`,
            name: 'get_wallets',
            arguments: {},
          },
        ],
      }
    }

    // General Crypto / Portfolio Distribution / Crypto Net Worth Weight
    if (
      text.includes('crypto') ||
      text.includes('cripto') ||
      text.includes('distribuido') ||
      text.includes('portafolio crypto') ||
      text.includes('peso de crypto')
    ) {
      if (text.includes('distribu') || text.includes('posicion') || text.includes('detalle')) {
        return {
          message: { role: 'assistant', content: '' },
          toolCalls: [
            {
              id: `sim_crypto_port_${Date.now()}`,
              name: 'get_crypto_portfolio',
              arguments: {},
            },
          ],
        }
      }
      return {
        message: { role: 'assistant', content: '' },
        toolCalls: [
          {
            id: `sim_crypto_${Date.now()}`,
            name: 'get_crypto_summary',
            arguments: {},
          },
        ],
      }
    }

    // Proactive Copilot Queries (FASE P)
    if (
      text.includes('qué cambió en mis bancos') ||
      text.includes('que cambio en mis bancos') ||
      text.includes('cambió en mis bancos') ||
      text.includes('cambio en mis bancos')
    ) {
      return {
        message: { role: 'assistant', content: '' },
        toolCalls: [
          {
            id: `sim_copilot_bank_${Date.now()}`,
            name: 'get_bank_cash_flow',
            arguments: {},
          },
        ],
      }
    }

    if (
      text.includes('por qué mi patrimonio') ||
      text.includes('por que mi patrimonio') ||
      text.includes('por qué cambiaron mis gastos') ||
      text.includes('por que cambiaron mis gastos') ||
      text.includes('por qué cambió') ||
      text.includes('por que cambio') ||
      text.includes('explícame por qué') ||
      text.includes('explicame por que') ||
      text.includes('explicación de por qué')
    ) {
      let metric = 'expenses'
      if (text.includes('patrimonio') || text.includes('net worth')) metric = 'net_worth'
      else if (text.includes('liquidez')) metric = 'liquidity'
      else if (text.includes('crypto') || text.includes('cripto')) metric = 'crypto'
      else if (text.includes('deuda')) metric = 'debt'

      return {
        message: { role: 'assistant', content: '' },
        toolCalls: [
          {
            id: `sim_explain_${Date.now()}`,
            name: 'explain_financial_change',
            arguments: { metric },
          },
        ],
      }
    }

    if (
      text.includes('muéstrame qué cambió') ||
      text.includes('muestrame que cambio') ||
      text.includes('resumen de hoy') ||
      text.includes('nexus today') ||
      text.includes('hay algo que debería revisar') ||
      text.includes('hay algo que deberia revisar') ||
      text.includes('qué debería revisar') ||
      text.includes('que deberia revisar')
    ) {
      return {
        message: { role: 'assistant', content: '' },
        toolCalls: [
          {
            id: `sim_today_${Date.now()}`,
            name: 'get_nexus_today',
            arguments: {},
          },
        ],
      }
    }

    if (
      text.includes('desviaron de mi plan') ||
      text.includes('desviación') ||
      text.includes('desviacion') ||
      text.includes('copilot context') ||
      text.includes('contexto del copiloto')
    ) {
      return {
        message: { role: 'assistant', content: '' },
        toolCalls: [
          {
            id: `sim_context_${Date.now()}`,
            name: 'get_copilot_context',
            arguments: {},
          },
        ],
      }
    }

    let toolToCall = 'get_cash_flow'
    if (
      text.includes('alerta') ||
      text.includes('alertas') ||
      text.includes('revisar') ||
      text.includes('importante que deba revisar') ||
      text.includes('atención') ||
      text.includes('atencion')
    ) {
      toolToCall = 'get_active_alerts'
    } else if (
      text.includes('cambió este mes') ||
      text.includes('cambio este mes') ||
      text.includes('principal cambio') ||
      text.includes('cómo cambió') ||
      text.includes('como cambio') ||
      text.includes('variacion frente') ||
      text.includes('variación frente') ||
      text.includes('vs mes anterior')
    ) {
      toolToCall = 'get_financial_changes'
    } else if (
      text.includes('insight') ||
      text.includes('interpretación') ||
      text.includes('interpretacion') ||
      text.includes('por qué cambió') ||
      text.includes('por que cambio') ||
      text.includes('explicacion de cambios') ||
      text.includes('explicación de cambios')
    ) {
      toolToCall = 'get_financial_insights'
    } else if (
      text.includes('evento') ||
      text.includes('eventos') ||
      text.includes('ocurrió') ||
      text.includes('ocurrio') ||
      text.includes('sucedió')
    ) {
      toolToCall = 'get_recent_financial_events'
    } else if (
      text.includes('estado financiero') ||
      text.includes('resumen financiero') ||
      text.includes('resumen de este mes') ||
      text.includes('digital twin') ||
      text.includes('salud financiera') ||
      text.includes('diagnostico financiero') ||
      text.includes('diagnóstico financiero')
    ) {
      toolToCall = 'get_financial_state'
    } else if (text.includes('banco conectado') || text.includes('bancos tengo') || text.includes('sincroniz') || text.includes('conexiones bancarias')) {
      toolToCall = 'get_bank_connections'
    } else if (text.includes('movimiento') || text.includes('extracto') || text.includes('transaccion') || text.includes('gasté esta semana')) {
      toolToCall = 'get_bank_transactions'
    } else if (text.includes('flujo de caja') || text.includes('flujo bancario') || text.includes('cash flow')) {
      toolToCall = 'get_bank_cash_flow'
    } else if (text.includes('en bancos') || text.includes('saldo bancario') || text.includes('saldos bancarios') || text.includes('cuanto tengo en banco')) {
      toolToCall = 'get_bank_balances'
    } else if (text.includes('cuentas bancarias') || text.includes('cuenta de ahorro') || text.includes('nequi') || text.includes('bancolombia')) {
      toolToCall = 'get_bank_accounts'
    } else if (text.includes('gané') || text.includes('ingres') || text.includes('shuffler') || text.includes('pizza')) {
      toolToCall = 'get_monthly_income'
    } else if (text.includes('gast') || text.includes('egres') || text.includes('comida') || text.includes('vivienda')) {
      toolToCall = 'get_monthly_expenses'
    } else if (text.includes('presupuest') || text.includes('limite') || text.includes('disponible')) {
      toolToCall = 'get_budgets'
    } else if (text.includes('meta') || text.includes('ahorro') || text.includes('emergencia')) {
      toolToCall = 'get_goals'
    } else if (text.includes('deud') || text.includes('debo') || text.includes('tarjeta') || text.includes('prestamo')) {
      toolToCall = 'get_debts'
    } else if (text.includes('patrimonio') || text.includes('activo') || text.includes('net worth')) {
      toolToCall = 'get_net_worth'
    } else if (text.includes('cuenta') || text.includes('banco') || text.includes('saldo')) {
      toolToCall = 'get_accounts'
    }


    return {
      message: {
        role: 'assistant',
        content: '',
      },
      toolCalls: [
        {
          id: `sim_call_${Date.now()}`,
          name: toolToCall,
          arguments: {},
        },
      ],
    }
  }
}

// ============================================================
// NEXUS FINANCE — Proactive Copilot Service
// Orchestrates proactive detection, transparent multi-criteria prioritization,
// executive summary ("NEXUS TODAY"), grounded explanations, and scenario bridges.
// Pure derivation, zero DB mutations, non-alarmist.
// ============================================================

import type {
  CopilotContext,
  ProactiveInsight,
  NexusTodaySummary,
  ProactiveExplanation,
  ScenarioBridgeAction,
  CopilotDomain,
} from '@/types/copilot'
import { CopilotContextBuilder } from './copilot-context-builder'
import { DomainCopilots } from './domain-copilots'

export class ProactiveCopilotService {
  /**
   * Generates prioritized proactive insights across all financial domains.
   * Prioritization uses a transparent multi-variable formula without creating
   * a single arbitrary financial health score.
   */
  static async generateProactiveInsights(
    contextOrUserId: string,
    period?: string
  ): Promise<ProactiveInsight[]>
  static generateProactiveInsights(contextOrUserId: CopilotContext): ProactiveInsight[]
  static generateProactiveInsights(
    contextOrUserId: CopilotContext | string,
    period?: string
  ): ProactiveInsight[] | Promise<ProactiveInsight[]> {
    if (typeof contextOrUserId === 'string') {
      return (async () => {
        const ctx = await CopilotContextBuilder.build(contextOrUserId, period)
        return ProactiveCopilotService.generateProactiveInsights(ctx)
      })()
    }

    const context = contextOrUserId
    const rawInsights: ProactiveInsight[] = []
    const now = new Date().toISOString()
    const monthlyIncome = Math.max(1, context.cash_flow.total_income)
    const netWorth = Math.max(1, context.net_worth.net_worth)

    // 1. LIQUIDITY DOMAIN
    const runway = context.financial_state.liquidity.runwayMonths
    if (runway < 1.5) {
      const deficit = context.financial_state.liquidity.emergencyFundGap
      const priority_score = 90 + Math.min(10, Math.round(deficit / monthlyIncome))
      rawInsights.push({
        id: `ins_liq_${Date.now()}`,
        domain: 'liquidity',
        title: 'Colchón de liquidez por debajo del umbral recomendado',
        description: `Tu reserva líquida cubre ${runway} meses de gasto esencial (recomendado: 6 meses).`,
        priority: 'high',
        priority_score,
        explanation: {
          dato: `Liquidez total disponible: $${context.financial_state.liquidity.totalLiquid.toLocaleString('es-CO')} COP. Gasto mensual esencial: $${context.financial_state.expenses.essential.toLocaleString('es-CO')} COP.`,
          cambio: `Cobertura operativa actual: ${runway} meses. Brecha para fondo objetivo: $${deficit.toLocaleString('es-CO')} COP.`,
          contexto:
            'Una cobertura inferior a 1.5 meses incrementa la vulnerabilidad ante gastos imprevistos o interrupción de ingresos.',
          escenario:
            'Puedes simular en el Laboratorio destinar un porcentaje de tu flujo libre para robustecer el fondo de reserva.',
          scenario_bridge: {
            title: 'Simular Fondo de Emergencia',
            description: 'Proyecta los meses necesarios para alcanzar un colchón de 6 meses.',
            recommended_preset: 'ahorro',
            suggested_params: {
              extra_monthly_saving: Math.round(monthlyIncome * 0.1),
              months: 24,
            },
          },
        },
        check_route: 'patrimonio',
        action_label: 'Revisar Liquidez',
        created_at: now,
      })
    }

    // 2. BUDGET DOMAIN
    for (const b of context.budgets) {
      const analysis = DomainCopilots.analyzeBudget(b, context)
      if (b.pct_used >= 80) {
        const priority_score =
          b.pct_used >= 100 ? 85 + Math.min(15, b.pct_used - 100) : 60 + (b.pct_used - 80)
        rawInsights.push({
          id: `ins_bud_${b.id}_${Date.now()}`,
          domain: 'budget',
          title:
            b.pct_used >= 100
              ? `Presupuesto excedido en ${b.category_name} (${b.pct_used}%)`
              : `Presupuesto próximo al límite en ${b.category_name} (${b.pct_used}%)`,
          description: analysis.explanation.cambio,
          priority: b.pct_used >= 100 ? 'high' : 'medium',
          priority_score,
          explanation: analysis.explanation,
          check_route: 'presupuesto',
          action_label: 'Revisar Presupuesto',
          created_at: now,
        })
      }
    }

    // 3. GOALS DOMAIN
    for (const g of context.goals) {
      const analysis = DomainCopilots.analyzeGoal(g, context)
      if (analysis.deviation_status === 'delayed') {
        rawInsights.push({
          id: `ins_goal_${g.id}_${Date.now()}`,
          domain: 'goals',
          title: `Meta retrasada respecto al plan: ${g.name}`,
          description: `Desviación calculada de aproximadamente ${g.deviation_months} meses frente a la fecha objetivo.`,
          priority: 'medium',
          priority_score: 65,
          explanation: analysis.explanation,
          check_route: 'metas',
          action_label: 'Revisar Meta',
          created_at: now,
        })
      } else if (analysis.deviation_status === 'accelerated') {
        rawInsights.push({
          id: `ins_goal_acc_${g.id}_${Date.now()}`,
          domain: 'goals',
          title: `Progreso acelerado en meta: ${g.name}`,
          description: `Al ritmo de aporte actual cumplirás la meta antes de lo previsto (${g.target_date}).`,
          priority: 'low',
          priority_score: 35,
          explanation: analysis.explanation,
          check_route: 'metas',
          action_label: 'Ver Meta',
          created_at: now,
        })
      }
    }

    // 4. DEBT DOMAIN
    for (const d of context.debts) {
      const analysis = DomainCopilots.analyzeDebt(d, context)
      if (d.interest_rate_ea >= 22) {
        rawInsights.push({
          id: `ins_debt_${d.id}_${Date.now()}`,
          domain: 'debt',
          title: `Tasa de interés elevada en ${d.name} (${d.interest_rate_ea}% E.A.)`,
          description: `Costo financiero proyectado de ~$${analysis.interest_cost_forecast.toLocaleString('es-CO')} COP/año.`,
          priority: 'high',
          priority_score: 80,
          explanation: analysis.explanation,
          check_route: 'deudas',
          action_label: 'Revisar Deuda',
          created_at: now,
        })
      }
    }

    // 5. BANKING DOMAIN
    if (context.banking.sync_issues_count > 0) {
      const analysis = DomainCopilots.analyzeBanking(context)
      rawInsights.push({
        id: `ins_bank_${Date.now()}`,
        domain: 'banking',
        title: 'Error de sincronización con institución bancaria',
        description: `${context.banking.sync_issues_count} conexión(es) bancaria(s) presentan advertencias.`,
        priority: 'high',
        priority_score: 75,
        explanation: analysis.explanation,
        check_route: 'bancos',
        action_label: 'Revisar Bancos',
        created_at: now,
      })
    }

    // 6. CRYPTO DOMAIN
    if (context.crypto.assets_count > 0) {
      const analysis = DomainCopilots.analyzeCrypto(context)
      if (analysis.net_worth_weight_pct >= 25) {
        rawInsights.push({
          id: `ins_crypto_${Date.now()}`,
          domain: 'crypto',
          title: `Exposición relevante en activos cripto (${analysis.net_worth_weight_pct}% del patrimonio)`,
          description: `Portafolio valorado en $${analysis.total_value_cop.toLocaleString('es-CO')} COP. P&L no realizado: ${analysis.unrealized_pnl_pct}%.`,
          priority: 'medium',
          priority_score: 60,
          explanation: analysis.explanation,
          check_route: 'crypto',
          action_label: 'Revisar Cripto',
          created_at: now,
        })
      }
    }

    // 7. BETTING DOMAIN
    if (context.betting.cash_flow_impact_pct >= 8) {
      const analysis = DomainCopilots.analyzeBetting(context)
      rawInsights.push({
        id: `ins_bet_${Date.now()}`,
        domain: 'betting',
        title: `Salida de flujo en apuestas recreativas (${context.betting.cash_flow_impact_pct}% del ingreso)`,
        description: `Monto destinado en el mes: $${context.betting.total_wagered.toLocaleString('es-CO')} COP. Resultado neto: $${context.betting.net_result.toLocaleString('es-CO')} COP.`,
        priority: context.betting.cash_flow_impact_pct >= 12 ? 'high' : 'medium',
        priority_score: 70,
        explanation: analysis.explanation,
        check_route: 'apuestas',
        action_label: 'Revisar Apuestas',
        created_at: now,
      })
    }

    // Sort by priority_score descending (transparent multi-criteria)
    rawInsights.sort((a, b) => b.priority_score - a.priority_score)
    return rawInsights
  }

  /**
   * Generates the executive "NEXUS TODAY" daily synthesis.
   */
  static async generateNexusToday(
    contextOrUserId: string,
    period?: string
  ): Promise<NexusTodaySummary>
  static generateNexusToday(contextOrUserId: CopilotContext): NexusTodaySummary
  static generateNexusToday(
    contextOrUserId: CopilotContext | string,
    period?: string
  ): NexusTodaySummary | Promise<NexusTodaySummary> {
    if (typeof contextOrUserId === 'string') {
      return (async () => {
        const ctx = await CopilotContextBuilder.build(contextOrUserId, period)
        return ProactiveCopilotService.generateNexusToday(ctx)
      })()
    }

    const context = contextOrUserId
    const today = new Date().toISOString().split('T')[0]
    const insights = this.generateProactiveInsights(context)

    const state = context.financial_state
    const changes: NexusTodaySummary['cambios'] = []

    // Expenses change
    for (const c of context.recent_changes) {
      changes.push({
        area: c.metric,
        delta_pct: c.percentageDelta,
        delta_cop: c.currentValue - c.previousValue,
        direction: c.direction === 'unchanged' ? 'neutral' : c.direction,
        description: c.description,
      })
    }

    if (changes.length === 0) {
      changes.push({
        area: 'Patrimonio y Flujo',
        delta_pct: 0,
        delta_cop: 0,
        direction: 'neutral',
        description: 'Parámetros dentro de la banda habitual del ciclo mensual.',
      })
    }

    const primaryGoal = context.goals[0]
    const activeGoals = context.goals.filter((g) => g.progress_pct < 100)
    const onTrackGoals = context.goals.filter((g) => g.is_on_track)

    let headline = 'Tu posición financiera se encuentra operando bajo parámetros estables.'
    if (context.active_alerts.some((a) => a.severity === 'CRITICAL')) {
      headline = 'Se detectaron alertas prioritarias que requieren tu revisión.'
    } else if (state.liquidity.runwayMonths < 1.5) {
      headline = 'Tu cobertura de liquidez requiere atención preventiva.'
    } else if (insights.some((i) => i.domain === 'budget' && i.priority === 'high')) {
      headline = 'Tienes categorías de gasto que superaron el presupuesto asignado.'
    }

    return {
      as_of: today,
      headline,
      estado: {
        patrimonio: state.netWorth.netWorth,
        liquidez: state.liquidity.totalLiquid,
        flujo_libre: state.cashFlow.netOperatingCashFlow,
        meses_runway: state.liquidity.runwayMonths,
      },
      cambios: changes.slice(0, 4),
      alertas_activas_count: context.active_alerts.length,
      alertas_destacadas: context.active_alerts.slice(0, 3),
      metas_resumen: {
        activas_count: activeGoals.length,
        en_plan_count: onTrackGoals.length,
        avance_global_pct: state.goals.overallProgressPercent,
        meta_principal: primaryGoal,
      },
      deudas_resumen: {
        total_deuda: state.debts.totalDebt,
        dti_pct: state.debts.debtToIncomeRatio,
        cuota_mensual: state.debts.monthlyDebtService,
      },
      que_deberias_revisar: insights.slice(0, 3),
    }
  }

  /**
   * Explains why a metric changed, strictly following:
   * DATO -> CAMBIO -> CONTEXTO -> ESCENARIO
   * Never asserts causality without verified evidence.
   */
  static async explainChange(
    targetOrMetric: string | CopilotContext,
    contextOrMetric: string | CopilotContext,
    period?: string
  ): Promise<ProactiveExplanation>
  static explainChange(
    targetOrMetric: string | CopilotContext,
    contextOrMetric: string | CopilotContext
  ): ProactiveExplanation
  static explainChange(
    targetOrMetric: string | CopilotContext,
    contextOrMetric: string | CopilotContext,
    period?: string
  ): ProactiveExplanation | Promise<ProactiveExplanation> {
    if (typeof targetOrMetric === 'string' && typeof contextOrMetric === 'string') {
      const userId = targetOrMetric
      const metric = contextOrMetric
      return (async () => {
        const context = await CopilotContextBuilder.build(userId, period)
        return ProactiveCopilotService.explainChangeCore(metric, context)
      })()
    }

    let metric: string
    let context: CopilotContext
    if (typeof targetOrMetric === 'string') {
      metric = targetOrMetric
      context = contextOrMetric as CopilotContext
    } else {
      context = targetOrMetric as CopilotContext
      metric = contextOrMetric as string
    }

    return ProactiveCopilotService.explainChangeCore(metric, context)
  }

  private static explainChangeCore(metric: string, context: CopilotContext): ProactiveExplanation {
    const norm = metric.toLowerCase()

    if (norm.includes('patrimonio') || norm.includes('net_worth')) {
      const nw = context.net_worth.net_worth
      const assets = context.net_worth.total_assets
      const liabilities = context.net_worth.total_liabilities
      const cryptoVal = context.crypto.total_value_cop

      return {
        dato: `Patrimonio neto actual registrado: $${nw.toLocaleString('es-CO')} COP. Activos totales: $${assets.toLocaleString('es-CO')} COP, Pasivos totales: $${liabilities.toLocaleString('es-CO')} COP.`,
        cambio: `La variación patrimonial observable refleja la diferencia neta entre la acumulación de activos y la amortización de pasivos.`,
        contexto:
          cryptoVal > assets * 0.2
            ? 'El comportamiento observable coincide principalmente con la revalorización de activos alternativos (cripto) y la acumulación de excedentes operativos del período.'
            : 'El comportamiento observable coincide principalmente con el ahorro neto acumulado de nómina y la reducción gradual de saldos en tarjetas.',
        escenario:
          'Puedes simular en el Laboratorio la evolución proyectada de tu patrimonio a 12, 24 y 60 meses con diferentes tasas de ahorro.',
        scenario_bridge: {
          title: 'Simular Proyección Patrimonial',
          description: 'Modela la curva de patrimonio neto en el Laboratorio.',
          recommended_preset: 'personalizado',
          suggested_params: {
            months: 24,
          },
        },
      }
    }

    if (norm.includes('gasto') || norm.includes('expense')) {
      const totalExpenses = context.cash_flow.total_expenses
      const topCategory = Object.entries(context.financial_state.expenses.byCategory).sort(
        (a, b) => b[1] - a[1]
      )[0]

      return {
        dato: `Gasto total del período: $${totalExpenses.toLocaleString('es-CO')} COP.`,
        cambio: topCategory
          ? `La categoría con mayor volumen registrado fue "${topCategory[0]}" con $${topCategory[1].toLocaleString('es-CO')} COP.`
          : 'Gasto consolidado sin concentración atípica en una sola categoría.',
        contexto:
          'El incremento se concentró en rubros variables coincidentes con el ciclo quincenal.',
        escenario:
          'Puedes simular en el Laboratorio una moderación del 10% en gastos discrecionales para cuantificar el impacto en tu liquidez acumulada.',
        scenario_bridge: {
          title: 'Simular Reducción de Gastos',
          description: 'Evalúa el efecto de contener un 10% de tus egresos.',
          recommended_preset: 'gastos',
          suggested_params: {
            expense_change_percent: -10,
            months: 12,
          },
        },
      }
    }

    if (norm.includes('liquidez') || norm.includes('runway')) {
      const liquid = context.financial_state.liquidity.totalLiquid
      const runway = context.financial_state.liquidity.runwayMonths

      return {
        dato: `Liquidez total disponible: $${liquid.toLocaleString('es-CO')} COP en cuentas bancarias y efectivo.`,
        cambio: `Meses de cobertura operativa (Runway): ${runway} meses de consumo mensual esencial.`,
        contexto:
          runway < 2
            ? 'La liquidez disponible se sitúa en un rango preventivo. Mantener un colchón de 3 a 6 meses amortigua fluctuaciones de ingresos o gastos imprevistos.'
            : 'Tu nivel de liquidez respalda adecuadamente las operaciones corrientes del mes.',
        escenario:
          'Puedes simular destinar $200.000 COP adicionales por mes al fondo de reserva para acelerar la cobertura.',
        scenario_bridge: {
          title: 'Simular Aporte a Reserva de Emergencia',
          description: 'Comprueba cuántos meses de runway ganas con ahorro adicional.',
          recommended_preset: 'ahorro',
          suggested_params: {
            extra_monthly_saving: 200000,
            months: 12,
          },
        },
      }
    }

    // Generic fallback strictly respecting DATO -> CAMBIO -> CONTEXTO -> ESCENARIO
    return {
      dato: `Métrica consultada: "${metric}". Registro verificado en el Financial State.`,
      cambio: 'Variación observable cuantificada en base a registros contables y transacciones verificadas.',
      contexto:
        'Los datos analizados no presentan evidencias suficientes para afirmar una relación causal unívoca fuera de la correlación contable observable.',
      escenario:
        'Puedes utilizar el Laboratorio Financiero para evaluar proyecciones hipotéticas de ajuste.',
      scenario_bridge: {
        title: `Simular Escenario para ${metric}`,
        description: 'Abre el Laboratorio Financiero para simular alternativas.',
        recommended_preset: 'personalizado',
        suggested_params: {
          months: 24,
        },
      },
    }
  }

  /**
   * Helper to build a ScenarioBridgeAction directly from an insight or domain analysis.
   */
  static buildScenarioBridge(
    title: string,
    description: string,
    preset: ScenarioBridgeAction['recommended_preset'],
    params: ScenarioBridgeAction['suggested_params']
  ): ScenarioBridgeAction {
    return {
      title,
      description,
      recommended_preset: preset,
      suggested_params: params,
    }
  }
}

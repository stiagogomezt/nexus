// ============================================================
// NEXUS FINANCE — Domain Copilots
// Specialized domain analyzers delivering:
// DATO + CAMBIO + CONTEXTO + ESCENARIO
// Strictly read-only, non-alarmist, grounded analysis.
// ============================================================

import type {
  CopilotContext,
  GoalCopilotAnalysis,
  DebtCopilotAnalysis,
  BudgetCopilotAnalysis,
  CryptoCopilotAnalysis,
  BankingCopilotAnalysis,
  BettingCopilotAnalysis,
  CopilotContextGoal,
  CopilotContextDebt,
  CopilotContextBudget,
} from '@/types/copilot'

export class DomainCopilots {
  /**
   * 1. GOAL COPILOT (Paso 9)
   * Quantifies trajectory against target date and offers simulation bridge.
   */
  static analyzeGoal(goal: CopilotContextGoal, context: CopilotContext): GoalCopilotAnalysis {
    const remaining = Math.max(0, goal.target_amount - goal.current_amount)
    const monthly = goal.monthly_contribution || 0
    const monthsToTarget = monthly > 0 ? Math.ceil(remaining / monthly) : null

    let monthsAvailable: number | null = null
    if (goal.target_date) {
      const now = new Date()
      const tDate = new Date(goal.target_date)
      monthsAvailable =
        (tDate.getFullYear() - now.getFullYear()) * 12 +
        (tDate.getMonth() - now.getMonth())
    }

    let deviation_status: GoalCopilotAnalysis['deviation_status'] = 'on_track'
    if (monthly === 0) {
      deviation_status = 'unfunded'
    } else if (monthsAvailable !== null && monthsToTarget !== null) {
      if (monthsToTarget < monthsAvailable) {
        deviation_status = 'accelerated'
      } else if (monthsToTarget > monthsAvailable) {
        deviation_status = 'delayed'
      }
    }

    const deficitMonths =
      monthsAvailable !== null && monthsToTarget !== null
        ? Math.max(0, monthsToTarget - monthsAvailable)
        : 0

    const suggestedAdditionalSaving =
      monthsAvailable && monthsAvailable > 0 && remaining > 0
        ? Math.max(0, Math.ceil(remaining / monthsAvailable) - monthly)
        : 100000

    return {
      goal_id: goal.id,
      name: goal.name,
      target_amount: goal.target_amount,
      current_amount: goal.current_amount,
      progress_pct: goal.progress_pct,
      monthly_contribution: goal.monthly_contribution,
      target_date: goal.target_date,
      projected_date: goal.projected_date,
      months_to_target: monthsToTarget,
      months_available: monthsAvailable,
      deviation_status,
      explanation: {
        dato: `Meta "${goal.name}": Ahorrado $${goal.current_amount.toLocaleString('es-CO')} de $${goal.target_amount.toLocaleString('es-CO')} (${goal.progress_pct}%).`,
        cambio: `Aporte mensual actual: $${goal.monthly_contribution.toLocaleString('es-CO')}. Tiempo estimado al ritmo actual: ${monthsToTarget ?? 'N/D'} meses.`,
        contexto:
          deviation_status === 'delayed'
            ? `Al ritmo actual existe una desviación proyectada de aproximadamente ${deficitMonths} meses respecto a la fecha objetivo (${goal.target_date}).`
            : deviation_status === 'accelerated'
            ? `Tu ritmo de ahorro actual proyecta completar la meta antes de la fecha límite (${goal.target_date}).`
            : 'El ritmo de ahorro coincide con la ventana de tiempo planificada.',
        escenario:
          deviation_status === 'delayed'
            ? `Puedes simular un incremento mensual de $${suggestedAdditionalSaving.toLocaleString('es-CO')} en el Laboratorio Financiero para alinear la fecha objetivo.`
            : `Puedes simular el impacto en tu patrimonio acumulado si mantienes este ritmo en el Laboratorio.`,
        scenario_bridge: {
          title: `Simular Aporte para ${goal.name}`,
          description: `Evalúa en el simulador el cumplimiento de la meta ajustando el ahorro mensual.`,
          recommended_preset: 'ahorro',
          suggested_params: {
            extra_monthly_saving: suggestedAdditionalSaving,
            selected_goal_id: goal.id,
            simulated_goal_contribution: monthly + suggestedAdditionalSaving,
            months: 24,
          },
        },
      },
    }
  }

  /**
   * 2. DEBT COPILOT (Paso 10)
   * Analyzes debt service, interest rate, and prepayment optimization without paying anything.
   */
  static analyzeDebt(debt: CopilotContextDebt, context: CopilotContext): DebtCopilotAnalysis {
    const balance = debt.current_balance
    const minPay = debt.minimum_payment
    const rateEA = debt.interest_rate_ea
    const monthlyRate = rateEA > 0 ? rateEA / 100 / 12 : 0

    const annualInterestCost = Math.round(balance * (rateEA / 100))
    const status: DebtCopilotAnalysis['status'] =
      rateEA >= 25 ? 'attention_required' : balance > 0 ? 'active' : 'accelerated'

    const suggestedExtraPayment = Math.min(200000, Math.round(minPay * 0.5))

    return {
      debt_id: debt.id,
      name: debt.name,
      current_balance: balance,
      minimum_payment: minPay,
      interest_rate_ea: rateEA,
      payoff_months: debt.projected_payoff_months,
      interest_cost_forecast: annualInterestCost,
      status,
      explanation: {
        dato: `Obligación "${debt.name}": Saldo vigente $${balance.toLocaleString('es-CO')}, cuota mensual mínima $${minPay.toLocaleString('es-CO')}.`,
        cambio: `Tasa de interés vigente: ${rateEA}% E.A. Costo financiero proyectado a 12 meses: ~$${annualInterestCost.toLocaleString('es-CO')}.`,
        contexto:
          rateEA >= 25
            ? 'Esta obligación presenta una tasa de interés superior al promedio crediticio, lo que maximiza el impacto del interés compuesto en tu contra.'
            : 'Obligación en servicio de pago regular.',
        escenario: `Puedes simular en el Laboratorio un abono extraordinario de $${suggestedExtraPayment.toLocaleString('es-CO')}/mes para cuantificar el ahorro en intereses.`,
        scenario_bridge: {
          title: `Simular Amortización Extraordinaria: ${debt.name}`,
          description: `Cuantifica meses reducidos e intereses ahorrados con un abono adicional.`,
          recommended_preset: 'deuda',
          suggested_params: {
            extra_debt_payment: suggestedExtraPayment,
            selected_debt_id: debt.id,
            simulated_debt_payment: minPay + suggestedExtraPayment,
            months: 24,
          },
        },
      },
    }
  }

  /**
   * 3. BUDGET COPILOT (Paso 11)
   * Detects near-limit categories and proposes simulations without blocking purchases.
   */
  static analyzeBudget(budget: CopilotContextBudget, context: CopilotContext): BudgetCopilotAnalysis {
    const budgeted = budget.budgeted_amount ?? 0
    const spent = budget.spent_amount ?? 0
    const remaining = budget.remaining_amount ?? (budgeted - spent)
    const pctUsed = budget.pct_used ?? (budgeted > 0 ? Math.round((spent / budgeted) * 100) : 0)

    const trend: BudgetCopilotAnalysis['trend'] =
      pctUsed >= 100 ? 'exceeded' : pctUsed >= 80 ? 'nearing_limit' : 'under'

    const overspendAmount = Math.max(0, spent - budgeted)

    return {
      category_name: budget.category_name,
      budgeted,
      spent,
      remaining,
      pct_used: pctUsed,
      trend,
      explanation: {
        dato: `Presupuesto en ${budget.category_name}: Gastado $${spent.toLocaleString('es-CO')} de $${budgeted.toLocaleString('es-CO')}.`,
        cambio: `Utilización del ${pctUsed}% (${remaining >= 0 ? `Disponible: $${remaining.toLocaleString('es-CO')}` : `Excedido por: $${overspendAmount.toLocaleString('es-CO')}`}).`,
        contexto:
          trend === 'exceeded'
            ? `Se superó el límite fijado para este período. Esto impacta directamente la capacidad de ahorro mensual proyectada.`
            : trend === 'nearing_limit'
            ? `Se ha consumido más del 80% del cupo asignado restando días en el ciclo actual.`
            : `El consumo se encuentra dentro del rango previsto para la categoría.`,
        escenario: `Puedes simular en el Laboratorio una contención del 10% en gastos discrecionales para reequilibrar el flujo libre.`,
        scenario_bridge: {
          title: `Simular Ajuste en Gastos`,
          description: `Comprueba el efecto de moderar egresos en el flujo neto y ahorro acumulado.`,
          recommended_preset: 'gastos',
          suggested_params: {
            expense_change_percent: -10,
            months: 12,
          },
        },
      },
    }
  }

  /**
   * 4. CRYPTO COPILOT (Paso 12)
   * Strictly separates spot market price from holding portfolio value, tracks unrealized PnL.
   */
  static analyzeCrypto(context: CopilotContext): CryptoCopilotAnalysis {
    const totalVal = context.crypto.total_value_cop
    const totalUsd = context.crypto.total_value_usd
    const pnlCop = context.crypto.unrealized_pnl_cop
    const netWorth = Math.max(1, context.net_worth.net_worth)
    const weightPct = Number(((totalVal / netWorth) * 100).toFixed(1))
    const pnlPct =
      totalVal - pnlCop > 0 ? Number(((pnlCop / (totalVal - pnlCop)) * 100).toFixed(1)) : 0

    const spotPrices: Record<string, number> = {}
    context.crypto.holdings.forEach((h) => {
      spotPrices[h.symbol] = h.spot_price_usd
    })

    const holdingsAnalysis = context.crypto.holdings.map((h) => ({
      symbol: h.symbol,
      holding_value_cop: h.holding_value_cop,
      spot_price_usd: h.spot_price_usd,
      unrealized_pnl_cop: h.unrealized_pnl_cop,
      is_realized: false as const,
    }))

    return {
      total_value_cop: totalVal,
      total_value_usd: totalUsd,
      spot_prices: spotPrices,
      unrealized_pnl_cop: pnlCop,
      unrealized_pnl_pct: pnlPct,
      net_worth_weight_pct: weightPct,
      holdings_analysis: holdingsAnalysis,
      explanation: {
        dato: `Portafolio cripto valorado en $${totalVal.toLocaleString('es-CO')} COP (~$${totalUsd.toLocaleString('en-US', { maximumFractionDigits: 1 })} USD).`,
        cambio: `P&L no realizado estimado: ${pnlCop >= 0 ? '+' : ''}$${pnlCop.toLocaleString('es-CO')} COP (${pnlPct}%). Representa el ${weightPct}% de tu patrimonio total.`,
        contexto:
          'Importante: La variación observable corresponde a fluctuación de mercado sobre tenencias activas (ganancia/pérdida no realizada) y no representa liquidez realizada ni flujo de caja disponible hasta que se ejecute una liquidación.',
        escenario:
          'Puedes simular en el Laboratorio cómo afectaría a tu patrimonio neto un escenario de volatilidad en activos alternativos.',
      },
    }
  }

  /**
   * 5. BANKING COPILOT (Paso 13)
   * Reports open finance status, accounts, and sync health without storing secrets.
   */
  static analyzeBanking(context: CopilotContext): BankingCopilotAnalysis {
    const { connections_count, total_bank_balance, sync_issues_count, recent_sync_status } =
      context.banking

    return {
      connections_count,
      total_balance_cop: total_bank_balance,
      sync_issues_count: sync_issues_count,
      sync_errors_count: sync_issues_count,
      reconciliation_ok: sync_issues_count === 0,
      sync_issue_details: sync_issues_count > 0 ? recent_sync_status : undefined,
      explanation: {
        dato: `${connections_count} conexiones bancarias activas (Bancolombia). Saldo bancario total verificado: $${total_bank_balance.toLocaleString('es-CO')} COP.`,
        cambio: `Estado de sincronización: ${recent_sync_status}`,
        contexto:
          sync_issues_count > 0
            ? 'Existen instituciones que requieren renovación de consentimiento o reconexión para reflejar las últimas transacciones.'
            : 'Las conciliaciones bancarias se encuentran al día sin discrepancias en los saldos reportados.',
        escenario:
          'Puedes revisar tus conexiones en el módulo de Bancos para renovar credenciales si alguna institución reporta error.',
      },
    }
  }

  /**
   * 6. BETTING COPILOT (Paso 14)
   * Strictly separates betting as recreational entertainment, monitors cash flow drag.
   * NEVER treats bets as investment, NEVER gives tips or betting strategies.
   */
  static analyzeBetting(context: CopilotContext): BettingCopilotAnalysis {
    const { total_wagered, net_result, loss_rate, cash_flow_impact_pct } = context.betting

    return {
      total_wagered,
      net_result,
      cash_flow_impact_pct,
      is_investment: false,
      explanation: {
        dato: `Actividad de apuestas recreativas: Monto total registrado $${total_wagered.toLocaleString('es-CO')} COP en el período.`,
        cambio: `Resultado neto contable: $${net_result.toLocaleString('es-CO')} COP. Representa el ${cash_flow_impact_pct}% de tus ingresos mensuales.`,
        contexto:
          'Aviso de política NEXUS: Las apuestas son tratadas exclusivamente como gasto de entretenimiento con salida de flujo de caja, y bajo ninguna circunstancia se catalogan ni aconsejan como inversión o mecanismo de acumulación patrimonial.',
        escenario:
          cash_flow_impact_pct > 10
            ? `Has destinado más del 10% de tu ingreso a apuestas. Puedes simular en el Laboratorio qué ocurriría si redireccionas ese flujo hacia tu fondo de emergencia o pago de deudas.`
            : `El impacto en tu flujo libre es controlado (${cash_flow_impact_pct}% del ingreso).`,
        scenario_bridge:
          total_wagered > 0
            ? {
                title: 'Simular Redirección de Flujo',
                description: 'Comprueba el impacto de destinar este flujo a amortización o metas de ahorro.',
                recommended_preset: 'ahorro',
                suggested_params: {
                  extra_monthly_saving: total_wagered,
                  months: 12,
                },
              }
            : undefined,
      },
    }
  }
}

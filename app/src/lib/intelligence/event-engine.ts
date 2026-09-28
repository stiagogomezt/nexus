// ============================================================
// NEXUS FINANCE — Financial Intelligence: Event Engine
// Evaluates Financial State + Previous Snapshot + Real Live Data
// Detects quantitative, deterministic financial events.
// Strictly READ + DETECT + ANALYZE (No automated execution).
// ============================================================

import type { FinancialState, FinancialSnapshot, MetricDelta } from '@/types/digital-twin'
import type {
  FinancialEvent,
  FinancialEventType,
  EventCategory,
  AlertSeverity,
  IntelligenceThresholds,
} from '@/types/intelligence'
import { DEFAULT_INTELLIGENCE_THRESHOLDS } from '@/types/intelligence'
import type { Budget, Goal, Debt } from '@/types'
import type { CryptoHolding } from '@/types/crypto'
import type { BankConnection } from '@/types/banking'

export interface EventEngineContext {
  budgets?: Budget[]
  goals?: Goal[]
  debts?: Debt[]
  cryptoHoldings?: CryptoHolding[]
  bankConnections?: BankConnection[]
}

export class EventEngine {
  /**
   * Scans a FinancialState (optionally against a baseline snapshot and live entities)
   * and deterministically produces all identified financial events.
   */
  static detectEvents(
    currentState: FinancialState,
    baselineSnapshot?: FinancialSnapshot | null,
    thresholds: IntelligenceThresholds = DEFAULT_INTELLIGENCE_THRESHOLDS,
    context?: EventEngineContext
  ): FinancialEvent[] {
    const events: FinancialEvent[] = []
    const now = new Date().toISOString()
    const userId = currentState.identity.userId || 'usr-kevin-001'

    // ────────────────────────────────────────────────────────
    // 1. INCOME CHANGE
    // ────────────────────────────────────────────────────────
    if (baselineSnapshot && baselineSnapshot.monthly_income > 0) {
      const prev = baselineSnapshot.monthly_income
      const curr = currentState.income.total
      const deltaAmt = curr - prev
      const deltaPct = Number(((deltaAmt / prev) * 100).toFixed(1))

      if (Math.abs(deltaPct) >= thresholds.incomeChangePct) {
        const isIncrease = deltaPct > 0
        events.push({
          id: `evt_inc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          user_id: userId,
          type: 'INCOME_CHANGE',
          category: 'income',
          severity: isIncrease ? 'INFO' : 'WARNING',
          title: isIncrease ? 'Incremento en ingresos del período' : 'Disminución en ingresos del período',
          description: isIncrease
            ? `Tus ingresos mensuales aumentaron un ${deltaPct}% ($${curr.toLocaleString('es-CO')} vs $${prev.toLocaleString('es-CO')}).`
            : `Tus ingresos mensuales se redujeron un ${Math.abs(deltaPct)}% ($${curr.toLocaleString('es-CO')} vs $${prev.toLocaleString('es-CO')}).`,
          metric: 'monthly_income',
          current_value: curr,
          previous_value: prev,
          delta: this.toMetricDelta(curr, prev),
          source: 'engine:income',
          timestamp: now,
          metadata: {
            shuffler: currentState.income.shuffler,
            pizzaHut: currentState.income.pizzaHut,
          },
        })
      }
    }

    // ────────────────────────────────────────────────────────
    // 2. EXPENSE CHANGE & ANOMALIES
    // ────────────────────────────────────────────────────────
    if (baselineSnapshot && baselineSnapshot.monthly_expenses > 0) {
      const prev = baselineSnapshot.monthly_expenses
      const curr = currentState.expenses.total
      const deltaAmt = curr - prev
      const deltaPct = Number(((deltaAmt / prev) * 100).toFixed(1))

      if (deltaPct >= thresholds.expenseIncreasePct) {
        events.push({
          id: `evt_exp_chg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          user_id: userId,
          type: 'EXPENSE_CHANGE',
          category: 'expense',
          severity: deltaPct >= 40 ? 'CRITICAL' : 'WARNING',
          title: 'Incremento significativo en gastos totales',
          description: `Tus gastos mensuales aumentaron un ${deltaPct}% respecto al período de referencia ($${curr.toLocaleString('es-CO')} vs $${prev.toLocaleString('es-CO')}).`,
          metric: 'monthly_expenses',
          current_value: curr,
          previous_value: prev,
          delta: this.toMetricDelta(curr, prev),
          source: 'engine:expenses',
          timestamp: now,
        })
      }
    }

    // Category expense anomaly
    const monthlyIncome = Math.max(1, currentState.income.total)
    for (const [category, amount] of Object.entries(currentState.expenses.byCategory)) {
      if (amount > monthlyIncome * 0.45 && amount > 500000) {
        events.push({
          id: `evt_exp_anom_${category}_${Date.now()}`,
          user_id: userId,
          type: 'EXPENSE_ANOMALY',
          category: 'expense',
          severity: 'WARNING',
          title: `Gasto concentrado en ${category}`,
          description: `El rubro "${category}" absorbió $${amount.toLocaleString('es-CO')}, lo cual representa el ${((amount / monthlyIncome) * 100).toFixed(0)}% del ingreso mensual.`,
          metric: `expense_category:${category}`,
          current_value: amount,
          previous_value: monthlyIncome * 0.2,
          delta: this.toMetricDelta(amount, monthlyIncome * 0.2),
          source: 'engine:expenses:anomaly',
          timestamp: now,
          metadata: { category, amount },
        })
      }
    }

    // ────────────────────────────────────────────────────────
    // 3. BUDGET THRESHOLD (80%, 90%, 100%, sobrepresupuesto)
    // ────────────────────────────────────────────────────────
    if (context?.budgets && context.budgets.length > 0) {
      for (const budget of context.budgets) {
        const spent = currentState.expenses.byCategory[budget.category_name] || 0
        const budgetLimit = budget.budgeted_amount ?? (budget as any).amount ?? 0
        if (budgetLimit > 0) {
          const ratio = spent / budgetLimit
          const pct = Math.round(ratio * 100)

          if (pct >= thresholds.budgetCriticalPct) {
            events.push({
              id: `evt_bud_${budget.id}_100_${Date.now()}`,
              user_id: userId,
              type: 'BUDGET_THRESHOLD',
              category: 'budget',
              severity: pct > 110 ? 'CRITICAL' : 'WARNING',
              title: `Presupuesto excedido en ${budget.category_name}`,
              description: `Has utilizado el ${pct}% del presupuesto asignado a ${budget.category_name} ($${spent.toLocaleString('es-CO')} de $${budgetLimit.toLocaleString('es-CO')}).`,
              metric: `budget_usage:${budget.category_name}`,
              current_value: spent,
              previous_value: budgetLimit,
              delta: this.toMetricDelta(spent, budgetLimit),
              source: 'engine:budgets',
              timestamp: now,
              metadata: { budgetId: budget.id, category: budget.category_name, pct },
            })
          } else if (pct >= thresholds.budgetWarningPct) {
            events.push({
              id: `evt_bud_${budget.id}_80_${Date.now()}`,
              user_id: userId,
              type: 'BUDGET_THRESHOLD',
              category: 'budget',
              severity: 'INFO',
              title: `Umbral de presupuesto alcanzado en ${budget.category_name}`,
              description: `Has alcanzado el ${pct}% del presupuesto de ${budget.category_name} ($${spent.toLocaleString('es-CO')} de $${budgetLimit.toLocaleString('es-CO')}).`,
              metric: `budget_usage:${budget.category_name}`,
              current_value: spent,
              previous_value: budgetLimit,
              delta: this.toMetricDelta(spent, budgetLimit),
              source: 'engine:budgets',
              timestamp: now,
              metadata: { budgetId: budget.id, category: budget.category_name, pct },
            })
          }
        }
      }
    }

    // ────────────────────────────────────────────────────────
    // 4. DEBT CHANGE
    // ────────────────────────────────────────────────────────
    if (baselineSnapshot && (baselineSnapshot.total_debt || 0) > 0) {
      const prevDebt = baselineSnapshot.total_debt || 0
      const currDebt = currentState.debts.totalDebt
      const deltaAmt = currDebt - prevDebt
      const deltaPct = Number(((deltaAmt / prevDebt) * 100).toFixed(1))

      if (deltaPct >= thresholds.debtIncreasePct) {
        events.push({
          id: `evt_debt_inc_${Date.now()}`,
          user_id: userId,
          type: 'DEBT_CHANGE',
          category: 'debt',
          severity: deltaPct >= 25 ? 'CRITICAL' : 'WARNING',
          title: 'Incremento en el saldo total de deuda',
          description: `Tu saldo de endeudamiento creció un ${deltaPct}% frente a la referencia ($${currDebt.toLocaleString('es-CO')} vs $${prevDebt.toLocaleString('es-CO')}).`,
          metric: 'total_debt',
          current_value: currDebt,
          previous_value: prevDebt,
          delta: this.toMetricDelta(currDebt, prevDebt),
          source: 'engine:debts',
          timestamp: now,
        })
      } else if (deltaPct <= -10) {
        events.push({
          id: `evt_debt_dec_${Date.now()}`,
          user_id: userId,
          type: 'DEBT_CHANGE',
          category: 'debt',
          severity: 'INFO',
          title: 'Amortización exitosa de pasivos',
          description: `Redujiste tu saldo de deuda un ${Math.abs(deltaPct)}% ($${currDebt.toLocaleString('es-CO')} vs $${prevDebt.toLocaleString('es-CO')}).`,
          metric: 'total_debt',
          current_value: currDebt,
          previous_value: prevDebt,
          delta: this.toMetricDelta(currDebt, prevDebt),
          source: 'engine:debts',
          timestamp: now,
        })
      }
    }

    // ────────────────────────────────────────────────────────
    // 5. GOAL DELAY & ACCELERATION
    // ────────────────────────────────────────────────────────
    if (context?.goals && context.goals.length > 0) {
      for (const goal of context.goals) {
        if (goal.status === 'active' && goal.target_amount > 0) {
          const progressPct = (goal.current_amount / goal.target_amount) * 100
          const targetDate = goal.target_date ? new Date(goal.target_date) : null

          if (targetDate) {
            const monthsLeft = Math.max(1, (targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30.4))
            const amountLeft = goal.target_amount - goal.current_amount
            const requiredMonthlySaving = amountLeft / monthsLeft
            const actualMonthlySaving = currentState.savings.monthlySavings

            if (requiredMonthlySaving > actualMonthlySaving * 1.15 && amountLeft > 0) {
              events.push({
                id: `evt_goal_delay_${goal.id}_${Date.now()}`,
                user_id: userId,
                type: 'GOAL_DELAY',
                category: 'goal',
                severity: 'WARNING',
                title: `Aporte inferior al plan para: ${goal.name}`,
                description: `Para alcanzar la meta de $${goal.target_amount.toLocaleString('es-CO')} en la fecha estimada, se requiere un aporte mensual de $${Math.round(requiredMonthlySaving).toLocaleString('es-CO')} frente al ahorro actual de $${Math.round(actualMonthlySaving).toLocaleString('es-CO')}.`,
                metric: `goal_progress:${goal.name}`,
                current_value: goal.current_amount,
                previous_value: goal.target_amount,
                delta: this.toMetricDelta(goal.current_amount, goal.target_amount),
                source: 'engine:goals',
                timestamp: now,
                metadata: { goalId: goal.id, goalName: goal.name, progressPct: Math.round(progressPct) },
              })
            } else if (actualMonthlySaving >= requiredMonthlySaving * 1.25 || (progressPct >= 75 && monthsLeft > 4)) {
              events.push({
                id: `evt_goal_acc_${goal.id}_${Date.now()}`,
                user_id: userId,
                type: 'GOAL_ACCELERATION',
                category: 'goal',
                severity: 'INFO',
                title: `Progreso acelerado en meta: ${goal.name}`,
                description: `Tu ritmo de ahorro mensual ($${Math.round(actualMonthlySaving).toLocaleString('es-CO')}) supera el aporte mensual requerido ($${Math.round(requiredMonthlySaving).toLocaleString('es-CO')}) para completar "${goal.name}".`,
                metric: `goal_progress:${goal.name}`,
                current_value: goal.current_amount,
                previous_value: goal.target_amount,
                delta: this.toMetricDelta(goal.current_amount, goal.target_amount),
                source: 'engine:goals',
                timestamp: now,
                metadata: { goalId: goal.id, goalName: goal.name, progressPct: Math.round(progressPct) },
              })
            }
          }
        }
      }
    }

    // ────────────────────────────────────────────────────────
    // 6. LIQUIDITY DROP & INCREASE
    // ────────────────────────────────────────────────────────
    if (currentState.liquidity.runwayMonths < thresholds.liquidityCriticalMonths && currentState.expenses.total > 0) {
      events.push({
        id: `evt_liq_drop_crit_${Date.now()}`,
        user_id: userId,
        type: 'LIQUIDITY_DROP',
        category: 'liquidity',
        severity: 'CRITICAL',
        title: 'Colchón de liquidez en zona crítica',
        description: `La liquidez disponible ($${currentState.liquidity.totalLiquid.toLocaleString('es-CO')}) cubre solo ${currentState.liquidity.runwayMonths} meses de gastos (umbral recomendado: ${thresholds.liquidityCriticalMonths} meses).`,
        metric: 'runway_months',
        current_value: currentState.liquidity.runwayMonths,
        previous_value: thresholds.liquidityCriticalMonths,
        delta: this.toMetricDelta(currentState.liquidity.runwayMonths, thresholds.liquidityCriticalMonths),
        source: 'engine:liquidity',
        timestamp: now,
      })
    } else if (baselineSnapshot && (baselineSnapshot.liquid_assets || 0) > 0) {
      const prevLiq = baselineSnapshot.liquid_assets || 0
      const currLiq = currentState.liquidity.totalLiquid
      const deltaPct = ((currLiq - prevLiq) / prevLiq) * 100

      if (deltaPct <= -thresholds.liquidityDropPct) {
        events.push({
          id: `evt_liq_drop_${Date.now()}`,
          user_id: userId,
          type: 'LIQUIDITY_DROP',
          category: 'liquidity',
          severity: 'WARNING',
          title: 'Caída relevante en reservas líquidas',
          description: `Tu efectivo y saldos bancarios disponibles disminuyeron un ${Math.abs(Math.round(deltaPct))}% ($${currLiq.toLocaleString('es-CO')} vs $${prevLiq.toLocaleString('es-CO')}).`,
          metric: 'liquid_assets',
          current_value: currLiq,
          previous_value: prevLiq,
          delta: this.toMetricDelta(currLiq, prevLiq),
          source: 'engine:liquidity',
          timestamp: now,
        })
      } else if (deltaPct >= 20) {
        events.push({
          id: `evt_liq_inc_${Date.now()}`,
          user_id: userId,
          type: 'LIQUIDITY_INCREASE',
          category: 'liquidity',
          severity: 'INFO',
          title: 'Fortalecimiento de reservas líquidas',
          description: `Tu liquidez total creció un ${Math.round(deltaPct)}% ($${currLiq.toLocaleString('es-CO')} vs $${prevLiq.toLocaleString('es-CO')}), ampliando el margen de cobertura.`,
          metric: 'liquid_assets',
          current_value: currLiq,
          previous_value: prevLiq,
          delta: this.toMetricDelta(currLiq, prevLiq),
          source: 'engine:liquidity',
          timestamp: now,
        })
      }
    }

    // ────────────────────────────────────────────────────────
    // 7. NET WORTH CHANGE
    // ────────────────────────────────────────────────────────
    if (baselineSnapshot && baselineSnapshot.net_worth > 0) {
      const prevNw = baselineSnapshot.net_worth
      const currNw = currentState.netWorth.netWorth
      const deltaAmt = currNw - prevNw
      const deltaPct = Number(((deltaAmt / prevNw) * 100).toFixed(1))

      if (Math.abs(deltaPct) >= thresholds.netWorthChangePct) {
        const isPositive = deltaPct > 0
        events.push({
          id: `evt_nw_${Date.now()}`,
          user_id: userId,
          type: 'NET_WORTH_CHANGE',
          category: 'net_worth',
          severity: isPositive ? 'INFO' : 'CRITICAL',
          title: isPositive ? 'Crecimiento patrimonial relevante' : 'Contracción notable en patrimonio neto',
          description: isPositive
            ? `Tu patrimonio neto se incrementó un ${deltaPct}% ($${currNw.toLocaleString('es-CO')} vs $${prevNw.toLocaleString('es-CO')}).`
            : `Tu patrimonio neto se redujo un ${Math.abs(deltaPct)}% ($${currNw.toLocaleString('es-CO')} vs $${prevNw.toLocaleString('es-CO')}).`,
          metric: 'net_worth',
          current_value: currNw,
          previous_value: prevNw,
          delta: this.toMetricDelta(currNw, prevNw),
          source: 'engine:net_worth',
          timestamp: now,
        })
      }
    }

    // ────────────────────────────────────────────────────────
    // 8. CRYPTO CHANGE (Precio de mercado vs Tenencia)
    // ────────────────────────────────────────────────────────
    if (baselineSnapshot && (baselineSnapshot.crypto_assets || 0) > 0) {
      const prevCrypto = baselineSnapshot.crypto_assets || 0
      const currCrypto = currentState.crypto.totalCryptoCop
      const deltaAmt = currCrypto - prevCrypto
      const deltaPct = Number(((deltaAmt / prevCrypto) * 100).toFixed(1))

      if (Math.abs(deltaPct) >= thresholds.cryptoChangePct) {
        events.push({
          id: `evt_crypto_${Date.now()}`,
          user_id: userId,
          type: 'CRYPTO_CHANGE',
          category: 'crypto',
          severity: deltaPct < -20 ? 'WARNING' : 'INFO',
          title: deltaPct > 0 ? 'Revalorización de tenencias cripto' : 'Ajuste de mercado en portafolio cripto',
          description: `La valoración de tu portafolio cripto en COP varió un ${deltaPct}% ($${currCrypto.toLocaleString('es-CO')} vs $${prevCrypto.toLocaleString('es-CO')}). Nota: esta fluctuación corresponde a valoración de mercado no realizada.`,
          metric: 'crypto_assets_cop',
          current_value: currCrypto,
          previous_value: prevCrypto,
          delta: this.toMetricDelta(currCrypto, prevCrypto),
          source: 'engine:crypto',
          timestamp: now,
          metadata: {
            totalCryptoUsd: currentState.crypto.totalCryptoUsd,
            holdingsCount: currentState.crypto.holdingsCount,
          },
        })
      }
    }

    // ────────────────────────────────────────────────────────
    // 9. BETTING CHANGE (Estricto: No Inversión, Impacto en Cash Flow)
    // ────────────────────────────────────────────────────────
    if (currentState.betting.totalStaked > 0) {
      if (currentState.betting.cashFlowImpactPercent >= thresholds.bettingExposurePct) {
        const severity: AlertSeverity =
          currentState.betting.cashFlowImpactPercent >= 20 ? 'CRITICAL' : 'WARNING'
        events.push({
          id: `evt_bet_exp_${Date.now()}`,
          user_id: userId,
          type: 'BETTING_CHANGE',
          category: 'betting',
          severity,
          title: 'Exposición cuantificada en apuestas deportivas',
          description: `Has destinado $${currentState.betting.totalStaked.toLocaleString('es-CO')} a apuestas este mes (${currentState.betting.cashFlowImpactPercent}% de tu ingreso). Resultado neto registrado: $${currentState.betting.netProfit.toLocaleString('es-CO')}.`,
          metric: 'betting_staked',
          current_value: currentState.betting.totalStaked,
          previous_value: monthlyIncome * 0.05,
          delta: this.toMetricDelta(currentState.betting.totalStaked, monthlyIncome * 0.05),
          source: 'engine:betting',
          timestamp: now,
          metadata: {
            netProfit: currentState.betting.netProfit,
            roiPercent: currentState.betting.roiPercent,
            isInvestment: false,
          },
        })
      }
    }

    // ────────────────────────────────────────────────────────
    // 10. BANK SYNC & RECONCILIATION SIGNALS
    // ────────────────────────────────────────────────────────
    if (context?.bankConnections && context.bankConnections.length > 0) {
      for (const conn of context.bankConnections) {
        if (conn.sync_status === 'failed' || conn.consent_status === 'error' || (conn as any).status === 'error') {
          events.push({
            id: `evt_bank_err_${conn.id}_${Date.now()}`,
            user_id: userId,
            type: 'BANK_SYNC_ERROR',
            category: 'banking',
            severity: 'WARNING',
            title: `Error de sincronización con ${conn.institution_name}`,
            description: `No fue posible actualizar los saldos de ${conn.institution_name}: ${conn.sync_error || (conn as any).error_message || 'Servidor bancario no disponible temporalmente'}.`,
            metric: `bank_sync:${conn.institution_name}`,
            current_value: 0,
            previous_value: 1,
            source: 'engine:banking:sync',
            timestamp: now,
            metadata: { connectionId: conn.id, institution: conn.institution_name },
          })
        }
      }
    }

    return events
  }

  private static toMetricDelta(current: number, previous: number): MetricDelta {
    const absoluteDelta = current - previous
    const percentageDelta = previous !== 0 ? Number(((absoluteDelta / Math.abs(previous)) * 100).toFixed(1)) : 0
    let direction: 'increase' | 'decrease' | 'unchanged' = 'unchanged'
    if (absoluteDelta > 0.01) direction = 'increase'
    else if (absoluteDelta < -0.01) direction = 'decrease'

    return {
      current,
      previous,
      absoluteDelta,
      percentageDelta,
      direction,
    }
  }
}

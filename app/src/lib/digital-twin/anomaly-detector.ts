// ============================================================
// NEXUS FINANCE — Digital Twin: Financial Anomaly Detector
// Evaluates pattern-breaking signals across income, expenses,
// liquidity, debt, crypto and betting.
// Strictly DETECT -> RECORD -> SHOW (No automated execution).
// ============================================================

import type {
  FinancialState,
  FinancialSnapshot,
  FinancialAnomaly,
  AnomalySeverity,
} from '../../types/digital-twin'

export class FinancialAnomalyDetector {
  /**
   * Scans a FinancialState (optionally compared against a baseline snapshot)
   * and returns all identified anomalies.
   */
  static detectAnomalies(
    state: FinancialState,
    baseline?: FinancialSnapshot | null
  ): FinancialAnomaly[] {
    const anomalies: FinancialAnomaly[] = []
    const now = new Date().toISOString()

    // 1. Unusual Single Category Expense Spike
    const monthlyIncome = Math.max(1, state.income.total)
    for (const [category, amount] of Object.entries(state.expenses.byCategory)) {
      if (amount > monthlyIncome * 0.45 && amount > 500000) {
        anomalies.push({
          id: `anom_exp_${category}_${Date.now()}`,
          type: 'unusual_expense',
          severity: 'high',
          title: `Gasto inusualmente alto en ${category}`,
          description: `El rubro "${category}" ($${amount.toLocaleString('es-CO')}) representa el ${(
            (amount / monthlyIncome) *
            100
          ).toFixed(0)}% de tus ingresos del mes.`,
          detectedValue: amount,
          baselineValue: monthlyIncome * 0.2,
          timestamp: now,
        })
      }
    }

    // 2. High Betting Exposure (Betting > 10% of monthly income)
    if (state.betting.totalStaked > monthlyIncome * 0.1 && state.betting.totalStaked > 100000) {
      const severity: AnomalySeverity =
        state.betting.totalStaked > monthlyIncome * 0.25 ? 'critical' : 'high'
      anomalies.push({
        id: `anom_bet_${Date.now()}`,
        type: 'betting_exposure',
        severity,
        title: 'Exposición elevada en apuestas',
        description: `Has apostado $${state.betting.totalStaked.toLocaleString('es-CO')}, lo cual equivale al ${state.betting.cashFlowImpactPercent}% de tu ingreso mensual (P&L neto: $${state.betting.netProfit.toLocaleString('es-CO')}).`,
        detectedValue: state.betting.totalStaked,
        baselineValue: monthlyIncome * 0.05,
        timestamp: now,
      })
    }

    // 3. Liquidity Runway Depletion (< 1.5 months)
    if (state.liquidity.runwayMonths < 1.5 && state.expenses.total > 0) {
      const severity: AnomalySeverity = state.liquidity.runwayMonths < 0.8 ? 'critical' : 'high'
      anomalies.push({
        id: `anom_liq_${Date.now()}`,
        type: 'liquidity_drop',
        severity,
        title: 'Colchón de liquidez en nivel crítico',
        description: `Tu liquidez total ($${state.liquidity.totalLiquid.toLocaleString('es-CO')}) cubre solo ${state.liquidity.runwayMonths} meses de gastos esenciales.`,
        detectedValue: state.liquidity.runwayMonths,
        baselineValue: 3.0,
        timestamp: now,
      })
    }

    // Baseline comparisons (when historical snapshot is present)
    if (baseline) {
      // 4. Abnormal Debt Increase (> 20% spike)
      const prevDebt = baseline.total_debt || 0
      if (prevDebt > 0 && state.debts.totalDebt > prevDebt * 1.2) {
        const increasePct = Math.round(((state.debts.totalDebt - prevDebt) / prevDebt) * 100)
        anomalies.push({
          id: `anom_debt_${Date.now()}`,
          type: 'debt_spike',
          severity: increasePct > 40 ? 'critical' : 'medium',
          title: 'Incremento anormal de endeudamiento',
          description: `Tu deuda total aumentó un ${increasePct}% respecto al período anterior ($${state.debts.totalDebt.toLocaleString('es-CO')} vs $${prevDebt.toLocaleString('es-CO')}).`,
          detectedValue: state.debts.totalDebt,
          baselineValue: prevDebt,
          timestamp: now,
        })
      }

      // 5. Significant Net Worth Drop (> 15% drop)
      const prevNetWorth = baseline.net_worth
      if (prevNetWorth > 0 && state.netWorth.netWorth < prevNetWorth * 0.85) {
        const dropPct = Math.round(((prevNetWorth - state.netWorth.netWorth) / prevNetWorth) * 100)
        anomalies.push({
          id: `anom_nw_${Date.now()}`,
          type: 'net_worth_drop',
          severity: dropPct > 25 ? 'critical' : 'high',
          title: 'Caída pronunciada en el patrimonio neto',
          description: `Tu patrimonio neto se redujo un ${dropPct}% frente al cierre previo ($${state.netWorth.netWorth.toLocaleString('es-CO')} vs $${prevNetWorth.toLocaleString('es-CO')}).`,
          detectedValue: state.netWorth.netWorth,
          baselineValue: prevNetWorth,
          timestamp: now,
        })
      }

      // 6. Abrupt Income Drop (> 25% drop)
      const prevIncome = baseline.monthly_income
      if (prevIncome > 0 && state.income.total < prevIncome * 0.75) {
        const dropPct = Math.round(((prevIncome - state.income.total) / prevIncome) * 100)
        anomalies.push({
          id: `anom_inc_${Date.now()}`,
          type: 'unusual_income',
          severity: 'medium',
          title: 'Disminución notable en ingresos del período',
          description: `Los ingresos registrados son ${dropPct}% inferiores al período de referencia ($${state.income.total.toLocaleString('es-CO')} vs $${prevIncome.toLocaleString('es-CO')}).`,
          detectedValue: state.income.total,
          baselineValue: prevIncome,
          timestamp: now,
        })
      }

      // 7. Crypto Drawdown (> 25% drop)
      const prevCrypto = baseline.crypto_assets || 0
      if (prevCrypto > 0 && state.crypto.totalCryptoCop < prevCrypto * 0.75) {
        const dropPct = Math.round(
          ((prevCrypto - state.crypto.totalCryptoCop) / prevCrypto) * 100
        )
        anomalies.push({
          id: `anom_crypto_${Date.now()}`,
          type: 'crypto_volatility',
          severity: 'medium',
          title: 'Corrección importante en cartera cripto',
          description: `La valoración de tu portafolio cripto retrocedió un ${dropPct}% en COP frente a la referencia.`,
          detectedValue: state.crypto.totalCryptoCop,
          baselineValue: prevCrypto,
          timestamp: now,
        })
      }
    }

    return anomalies
  }
}

// ============================================================
// NEXUS FINANCE — Digital Twin: Master Orchestrator Service
// Unifies Financial State + Historical Snapshots + Scenario Engine
// Primary context provider for NEXUS AI and Scenario Lab.
// ============================================================

import type { UserFinancialBundle } from '../dal'
import * as dal from '../dal'
import type {
  FinancialState,
  FinancialSnapshot,
  FinancialDigitalTwin,
} from '../../types/digital-twin'
import type { UserProfile } from '../../types'
import { buildFinancialState } from './financial-state-builder'
import { FinancialAnomalyDetector } from './anomaly-detector'
import { FinancialTimelineEngine } from './timeline-engine'
import { simulateAdvancedScenario } from '../financial-engine'

export class DigitalTwinService {
  /**
   * Constructs the complete Financial Digital Twin for a user in a single pass.
   * Leverages cached/passed bundle when available to avoid duplicate database fetches.
   */
  static async getDigitalTwin(
    userId: string,
    existingBundle?: UserFinancialBundle,
    userProfile?: Partial<UserProfile> | null
  ): Promise<FinancialDigitalTwin> {
    const bundle = existingBundle || (await dal.loadAllUserData(userId))
    const currentState = buildFinancialState(bundle, userProfile)
    const snapshots = bundle.snapshots || (await dal.getFinancialSnapshots(userId))

    // Compare with the most recent baseline snapshot (if available)
    const baselineSnapshot = snapshots.length > 0 ? snapshots[0] : null
    const anomalies = FinancialAnomalyDetector.detectAnomalies(currentState, baselineSnapshot)
    const projectedTrajectory = FinancialTimelineEngine.generateTimeline(currentState, snapshots)

    // Synthesize holistic health rating
    const healthSummary = this.evaluateOverallHealth(currentState)
    const recommendations = this.generateStrategicRecommendations(currentState, anomalies)

    return {
      snapshotDate: currentState.period,
      asOf: currentState.asOfDate,
      currentState,
      historicalTrajectory: snapshots,
      projectedTrajectory,
      healthSummary,
      anomalies,
      recommendations,
    }
  }

  /**
   * Persists a point-in-time FinancialSnapshot derived from the current financial state.
   */
  static async takeSnapshot(
    userId: string,
    customDate?: string,
    existingBundle?: UserFinancialBundle
  ): Promise<FinancialSnapshot> {
    const bundle = existingBundle || (await dal.loadAllUserData(userId))
    const state = buildFinancialState(bundle)
    const snapshotDate = customDate || new Date().toISOString().split('T')[0]

    return dal.saveFinancialSnapshot(userId, {
      snapshot_date: snapshotDate,
      total_assets: state.assets.totalAssets,
      total_liabilities: state.liabilities.totalLiabilities,
      net_worth: state.netWorth.netWorth,
      monthly_income: state.income.total,
      monthly_expenses: state.expenses.total,
      free_cash_flow: state.cashFlow.netOperatingCashFlow,
      savings_rate_pct: state.cashFlow.savingsRate,
      liquid_assets: state.liquidity.totalLiquid,
      crypto_assets: state.crypto.totalCryptoCop,
      bank_assets: state.banking.totalBalanceCop,
      investments_value: state.investments.currentValue,
      total_debt: state.debts.totalDebt,
      state_payload: {
        income: state.income,
        expenses: state.expenses,
        cashFlow: state.cashFlow,
        liquidity: state.liquidity,
        debts: state.debts,
        netWorth: state.netWorth,
      },
    })
  }

  /**
   * Answers the strategic question: "¿Qué tendría que cambiar para llegar a mi meta?"
   * by combining Financial State with the deterministic Scenario Engine.
   */
  static async simulateGoalPath(
    userId: string,
    goalId: string,
    extraMonthlySaving: number = 300000
  ) {
    const bundle = await dal.loadAllUserData(userId)
    const state = buildFinancialState(bundle)
    const targetGoal = bundle.goals.find((g) => g.id === goalId) || bundle.goals[0]

    if (!targetGoal) {
      throw new Error(`Meta con ID ${goalId} no encontrada.`)
    }

    const scenarioResult = simulateAdvancedScenario(
      {
        monthly_income: state.income.total,
        monthly_expenses: state.expenses.total,
        current_net_worth: state.netWorth.netWorth,
        current_total_debt: state.debts.totalDebt,
        debts: bundle.debts,
        goals: bundle.goals,
      },
      {
        name: `Aceleración de meta: ${targetGoal.name}`,
        preset_type: 'ahorro',
        income_change_percent: 0,
        expense_change_percent: 0,
        extra_monthly_saving: extraMonthlySaving,
        extra_debt_payment: 0,
        investment_return_percent: 7,
        inflation_percent: 4.5,
        months: 36,
        selected_goal_id: targetGoal.id,
      }
    )

    return {
      goal: targetGoal,
      stateSummary: {
        netWorth: state.netWorth.netWorth,
        monthlyIncome: state.income.total,
        freeCashFlow: state.cashFlow.netOperatingCashFlow,
        savingsRate: state.cashFlow.savingsRate,
      },
      simulation: scenarioResult.goal_simulation,
      netWorthDelta: scenarioResult.net_worth_delta,
      interestSaved: scenarioResult.interest_saved,
    }
  }

  private static evaluateOverallHealth(state: FinancialState): {
    status: 'OPTIMAL' | 'STABLE' | 'ATTENTION' | 'CRITICAL'
    headline: string
    indicators: FinancialState['healthIndicators']
  } {
    const inds = state.healthIndicators
    const statuses = [
      inds.liquidityRunway.status,
      inds.savingsRate.status,
      inds.debtToIncome.status,
      inds.solvencyRatio.status,
      inds.cashFlowMargin.status,
    ]

    const criticalCount = statuses.filter((s) => s === 'critical').length
    const fairCount = statuses.filter((s) => s === 'fair').length
    const excellentCount = statuses.filter((s) => s === 'excellent').length

    let status: 'OPTIMAL' | 'STABLE' | 'ATTENTION' | 'CRITICAL' = 'STABLE'
    let headline = 'Estructura financiera balanceada y en control operativo.'

    if (criticalCount > 0) {
      status = 'CRITICAL'
      headline = 'Se detectaron vulnerabilidades críticas en liquidez o carga de deuda.'
    } else if (fairCount >= 2) {
      status = 'ATTENTION'
      headline = 'Monitorea el flujo libre y prioriza la cobertura de tu fondo de emergencia.'
    } else if (excellentCount >= 3) {
      status = 'OPTIMAL'
      headline = 'Posición financiera sólida con alto margen de acumulación patrimonial.'
    }

    return {
      status,
      headline,
      indicators: inds,
    }
  }

  private static generateStrategicRecommendations(
    state: FinancialState,
    anomalies: Array<{ title: string; description: string }>
  ): string[] {
    const recs: string[] = []

    if (state.liquidity.runwayMonths < 3) {
      recs.push(
        `Fortalecer liquidez: Destina al menos el 50% de tu flujo libre a cubrir los $${state.liquidity.emergencyFundGap.toLocaleString('es-CO')} faltantes para tu fondo de 6 meses.`
      )
    }

    if (state.debts.debtToIncomeRatio > 35) {
      recs.push(
        `Optimización de pasivos: La carga de deuda absorbe el ${state.debts.debtToIncomeRatio}% de tus ingresos. Evalúa amortizaciones extraordinarias mediante método avalancha.`
      )
    }

    if (state.income.pizzaHut > 0 && state.income.shuffler > 0) {
      recs.push(
        `Estrategia de doble ingreso: El trabajo secundario (Pizza Hut: $${state.income.pizzaHut.toLocaleString('es-CO')}) representa el ${Math.round((state.income.pizzaHut / state.income.total) * 100)}% de tu ingreso total. Asignarlo íntegramente a ahorro acelera metas.`
      )
    }

    if (state.betting.cashFlowImpactPercent > 5) {
      recs.push(
        `Control de apuestas: El dinero apostado representa el ${state.betting.cashFlowImpactPercent}% de tus ingresos. Mantén un presupuesto estricto independiente del capital operativo.`
      )
    }

    if (recs.length === 0) {
      recs.push(
        'Mantén la disciplina de registro y verifica que las transferencias entre cuentas bancarias se mantengan neutralizadas.'
      )
    }

    return recs
  }
}

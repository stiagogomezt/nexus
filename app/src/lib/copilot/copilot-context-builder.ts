// ============================================================
// NEXUS FINANCE — Proactive Copilot: Context Builder
// Derives comprehensive, grounded CopilotContext from FinancialState
// Pure calculation, zero DB mutations, zero duplicate storage.
// ============================================================

import type { FinancialState, FinancialSnapshot } from '@/types/digital-twin'
import type { FinancialAlert, IntelligenceInsight } from '@/types/intelligence'
import type {
  CopilotContext,
  CopilotContextGoal,
  CopilotContextDebt,
  CopilotContextBudget,
  CopilotContextCryptoHolding,
  FinancialChangeItem,
} from '@/types/copilot'
import type { Budget, Goal, Debt, BettingTransaction } from '@/types'
import type { CryptoHolding } from '@/types/crypto'
import type { BankConnection } from '@/types/banking'
import { FinancialChangeDetector } from '@/lib/digital-twin/change-detector'
import { buildFinancialState } from '@/lib/digital-twin/financial-state-builder'
import { EventEngine } from '@/lib/intelligence/event-engine'
import { AlertCenter } from '@/lib/intelligence/alert-center'
import { IntelligenceEngine } from '@/lib/intelligence/intelligence-engine'
import * as dal from '@/lib/dal'

export interface CopilotContextInput {
  state: FinancialState
  baseline?: FinancialSnapshot | null
  alerts?: FinancialAlert[]
  insights?: IntelligenceInsight[]
  rawBudgets?: Budget[]
  rawGoals?: Goal[]
  rawDebts?: Debt[]
  rawCryptoHoldings?: CryptoHolding[]
  rawBankConnections?: BankConnection[]
  rawBets?: BettingTransaction[]
}

export class CopilotContextBuilder {
  /**
   * Constructs a unified, strictly grounded CopilotContext.
   * Can be called with either a pre-computed CopilotContextInput object
   * or a userId string (loads data from DAL and builds state automatically).
   */
  static async build(userId: string, period?: string): Promise<CopilotContext>
  static build(input: CopilotContextInput): CopilotContext
  static build(
    inputOrUserId: CopilotContextInput | string,
    period?: string
  ): CopilotContext | Promise<CopilotContext> {
    if (typeof inputOrUserId === 'string') {
      return (async () => {
        const userId = inputOrUserId
        const bundle = await dal.loadAllUserData(userId)
        let parsedPeriod: { month?: number; year?: number } | undefined
        if (period && period.includes('-')) {
          const [y, m] = period.split('-').map(Number)
          parsedPeriod = { year: y, month: m }
        }
        const state = buildFinancialState(bundle, { id: userId }, parsedPeriod)
        const snapshots = await dal.getFinancialSnapshots(userId)
        const baseline = snapshots.length > 0 ? snapshots[0] : null
        const events = EventEngine.detectEvents(state, baseline, undefined, {
          budgets: bundle.budgets,
          goals: bundle.goals,
          debts: bundle.debts,
          cryptoHoldings: bundle.cryptoHoldings,
          bankConnections: bundle.bankConnections,
        })
        const alerts = await AlertCenter.syncAlerts(userId, events)
        const insights = IntelligenceEngine.generateInsights(state, baseline, events)

        return CopilotContextBuilder.buildFromInput({
          state,
          baseline,
          alerts,
          insights,
          rawBudgets: bundle.budgets,
          rawGoals: bundle.goals,
          rawDebts: bundle.debts,
          rawCryptoHoldings: bundle.cryptoHoldings,
          rawBankConnections: bundle.bankConnections,
          rawBets: [],
        })
      })()
    }

    return CopilotContextBuilder.buildFromInput(inputOrUserId)
  }

  private static buildFromInput(input: CopilotContextInput): CopilotContext {
    const {
      state,
      baseline,
      alerts = [],
      insights = [],
      rawBudgets = [],
      rawGoals = [],
      rawDebts = [],
      rawCryptoHoldings = [],
      rawBankConnections = [],
      rawBets = [],
    } = input

    const userId = state.identity.userId || 'usr-kevin-001'
    const now = new Date()

    // 1. Changes calculation
    let recent_changes: FinancialChangeItem[] = []
    if (baseline) {
      const changes = FinancialChangeDetector.compareStateWithSnapshot(state, baseline)
      const metricMap: Array<{ metric: string; label: string; delta: typeof changes.income }> = [
        { metric: 'expenses', label: 'Gastos', delta: changes.expenses },
        { metric: 'net_worth', label: 'Patrimonio Neto', delta: changes.netWorth },
        { metric: 'income', label: 'Ingresos', delta: changes.income },
        { metric: 'debt', label: 'Deudas', delta: changes.debt },
        { metric: 'liquidity', label: 'Liquidez', delta: changes.liquidity },
        { metric: 'crypto', label: 'Criptoactivos', delta: changes.crypto },
      ]
      recent_changes = metricMap.map((m) => ({
        metric: m.metric,
        label: m.label,
        currentValue: m.delta.current,
        previousValue: m.delta.previous,
        percentageDelta: m.delta.percentageDelta,
        absoluteDelta: m.delta.absoluteDelta,
        direction: m.delta.direction,
        description: `${m.label}: ${m.delta.percentageDelta > 0 ? '+' : ''}${m.delta.percentageDelta}% ($${Math.abs(m.delta.absoluteDelta).toLocaleString('es-CO')} COP)`,
      }))
    }

    // 2. Goals domain mapping & trajectory
    const goals: CopilotContextGoal[] = rawGoals.map((g) => {
      const remaining = Math.max(0, g.target_amount - g.current_amount)
      const monthly = g.monthly_contribution || 0
      const monthsNeeded = monthly > 0 ? Math.ceil(remaining / monthly) : 999

      let projected_date: string | null = null
      if (monthly > 0 && monthsNeeded < 999) {
        const pDate = new Date()
        pDate.setMonth(pDate.getMonth() + monthsNeeded)
        projected_date = pDate.toISOString().split('T')[0]
      }

      let deviation_months = 0
      let is_on_track = true
      if (g.target_date) {
        const tDate = new Date(g.target_date)
        const monthsAvailable =
          (tDate.getFullYear() - now.getFullYear()) * 12 +
          (tDate.getMonth() - now.getMonth())
        deviation_months = monthsNeeded - monthsAvailable
        is_on_track = deviation_months <= 0
      }

      const progress_pct =
        g.target_amount > 0
          ? Math.min(100, Math.round((g.current_amount / g.target_amount) * 100))
          : 0

      return {
        id: g.id,
        name: g.name,
        target_amount: g.target_amount,
        current_amount: g.current_amount,
        monthly_contribution: g.monthly_contribution,
        target_date: g.target_date,
        projected_date,
        progress_pct,
        is_on_track,
        deviation_months,
        suggested_action: !is_on_track
          ? `Aumentar aporte mensual para compensar desvío de ${deviation_months} meses.`
          : 'Mantener aporte programado.',
        scenario_preset: 'ahorro',
      }
    })

    // 3. Debts domain mapping
    const debts: CopilotContextDebt[] = rawDebts.map((d) => {
      const balance = d.current_balance
      const minPay = d.minimum_payment
      const rateEA = d.interest_rate_ea
      const monthlyRate = rateEA > 0 ? rateEA / 100 / 12 : 0

      let projected_payoff_months: number | null = null
      if (minPay > 0 && balance > 0) {
        if (monthlyRate > 0 && minPay > balance * monthlyRate) {
          projected_payoff_months = Math.ceil(
            -Math.log(1 - (balance * monthlyRate) / minPay) / Math.log(1 + monthlyRate)
          )
        } else if (monthlyRate === 0) {
          projected_payoff_months = Math.ceil(balance / minPay)
        }
      }

      return {
        id: d.id,
        name: d.name,
        current_balance: balance,
        minimum_payment: minPay,
        interest_rate_ea: rateEA,
        debt_type: d.debt_type,
        projected_payoff_months,
        suggested_action:
          rateEA >= 25
            ? 'Priorizar amortización extraordinaria para reducir costo por intereses.'
            : 'Continuar servicio de deuda en cuotas programadas.',
        scenario_preset: 'deuda',
      }
    })

    // 4. Budgets domain mapping
    const budgets: CopilotContextBudget[] = rawBudgets.map((b) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const budgeted = b.budgeted_amount ?? (b as any).amount ?? 0
      const spent = state.expenses.byCategory[b.category_name] || 0
      const remaining = budgeted - spent
      const pct_used = budgeted > 0 ? Math.round((spent / budgeted) * 100) : 0
      const status: CopilotContextBudget['status'] =
        pct_used >= 100 ? 'critical' : pct_used >= 80 ? 'warning' : 'normal'

      return {
        id: b.id,
        category_name: b.category_name,
        budgeted_amount: budgeted,
        spent_amount: spent,
        remaining_amount: remaining,
        pct_used,
        status,
        suggested_action:
          status === 'critical'
            ? `Pausar gastos discrecionales en ${b.category_name} por superación de cupo.`
            : status === 'warning'
            ? `Monitorear egresos en ${b.category_name} (cupo utilizado al ${pct_used}%).`
            : 'Gasto dentro del límite presupuestado.',
      }
    })

    // 5. Crypto holdings mapping
    const totalNetWorth = Math.max(1, state.netWorth.netWorth)
    let computedCryptoTotalCop = 0
    let computedCryptoTotalUsd = 0
    let computedCryptoPnlCop = 0

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cryptoHoldings: CopilotContextCryptoHolding[] = rawCryptoHoldings.map((c: any) => {
      const quantity = c.quantity ?? c.total_quantity ?? 0
      const spotPriceUsd = c.spot_price_usd ?? c.current_price_usd ?? c.purchase_price_usd ?? 0
      const holdingValueCop =
        c.holding_value_cop ??
        c.current_value_cop ??
        (c.purchase_price_cop ? c.purchase_price_cop * quantity : 0)
      const pnlCop = c.unrealized_pnl_cop ?? 0
      const pnlPct =
        c.unrealized_pnl_percent ??
        (holdingValueCop - pnlCop > 0 ? Number(((pnlCop / (holdingValueCop - pnlCop)) * 100).toFixed(1)) : 0)
      const pctNw = Number(((holdingValueCop / totalNetWorth) * 100).toFixed(1))

      computedCryptoTotalCop += holdingValueCop
      computedCryptoTotalUsd += spotPriceUsd * quantity
      computedCryptoPnlCop += pnlCop

      return {
        symbol: c.symbol,
        name: c.asset ?? c.asset_name ?? c.symbol,
        quantity,
        holding_value_cop: holdingValueCop,
        spot_price_usd: spotPriceUsd,
        unrealized_pnl_cop: pnlCop,
        unrealized_pnl_pct: pnlPct,
        pct_of_net_worth: pctNw,
      }
    })

    const finalCryptoTotalCop =
      computedCryptoTotalCop > 0 ? computedCryptoTotalCop : state.crypto.totalCryptoCop
    const finalCryptoTotalUsd =
      computedCryptoTotalUsd > 0 ? computedCryptoTotalUsd : state.crypto.totalCryptoUsd
    const finalCryptoPnlCop =
      computedCryptoPnlCop !== 0 ? computedCryptoPnlCop : state.crypto.unrealizedPnlCop

    // 6. Banking summary
    const syncErrors = rawBankConnections.filter(
      (c) => c.sync_status === 'failed' || c.consent_status === 'error'
    ).length
    const recentSyncStatus =
      syncErrors > 0
        ? `Advertencia: ${syncErrors} conexión(es) bancaria(s) con error de sincronización.`
        : 'Sincronización bancaria en línea y actualizada.'

    // 7. Betting summary (Strictly non-investment)
    const totalWagered = rawBets.reduce((sum, b) => sum + (b.stake_amount || 0), 0)
    const totalReturned = rawBets.reduce((sum, b) => sum + (b.return_amount || 0), 0)
    const netResult = totalReturned - totalWagered
    const totalIncome = Math.max(1, state.income.total)
    const cashFlowImpactPct = Number(((totalWagered / totalIncome) * 100).toFixed(1))
    const lossCount = rawBets.filter((b) => b.result === 'lost').length
    const lossRate = rawBets.length > 0 ? Number(((lossCount / rawBets.length) * 100).toFixed(1)) : 0

    return {
      as_of: new Date().toISOString(),
      user_id: userId,
      financial_state: state,
      recent_changes,
      active_alerts: alerts.filter((a) => a.status === 'UNREAD'),
      top_insights: insights.slice(0, 5),
      goals,
      debts,
      budgets,
      cash_flow: {
        total_income: state.cashFlow.totalIncome,
        total_expenses: state.cashFlow.totalExpenses,
        net_cash_flow: state.cashFlow.netOperatingCashFlow,
        savings_rate: state.cashFlow.savingsRate,
      },
      net_worth: {
        total_assets: state.netWorth.totalAssets,
        total_liabilities: state.netWorth.totalLiabilities,
        net_worth: state.netWorth.netWorth,
      },
      crypto: {
        total_value_cop: finalCryptoTotalCop,
        total_value_usd: finalCryptoTotalUsd,
        unrealized_pnl_cop: finalCryptoPnlCop,
        assets_count: cryptoHoldings.length,
        holdings: cryptoHoldings,
      },
      banking: {
        connections_count: rawBankConnections.length,
        accounts_count: state.banking.connectedAccountsCount,
        total_bank_balance: state.banking.totalBalanceCop,
        sync_issues_count: syncErrors,
        recent_sync_status: recentSyncStatus,
      },
      betting: {
        total_wagered: totalWagered,
        net_result: netResult,
        loss_rate: lossRate,
        is_investment: false,
        cash_flow_impact_pct: cashFlowImpactPct,
      },
      investments: {
        total_value: state.investments.currentValue,
        count: state.investments.assetCount,
      },
    }
  }
}

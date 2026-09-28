/**
 * NEXUS Finance — AI Tools Module Entrypoint
 */

import * as readTools from './read-tools'
export { AI_READ_TOOLS_DEFINITIONS, type ToolDefinition } from './definitions'
export * from './read-tools'

export type AllowedToolName =
  | 'get_monthly_income'
  | 'get_monthly_expenses'
  | 'get_cash_flow'
  | 'get_budgets'
  | 'get_goals'
  | 'get_debts'
  | 'get_net_worth'
  | 'get_accounts'
  | 'get_investments'
  | 'get_crypto'
  | 'get_crypto_summary'
  | 'get_wallets'
  | 'get_wallet_balance'
  | 'get_crypto_portfolio'
  | 'get_betting'
  | 'simulate_financial_scenario'
  | 'get_bank_accounts'
  | 'get_bank_balances'
  | 'get_bank_transactions'
  | 'get_bank_cash_flow'
  | 'get_bank_connections'
  | 'get_financial_state'
  | 'get_recent_financial_events'
  | 'get_active_alerts'
  | 'get_financial_insights'
  | 'get_financial_changes'
  | 'get_copilot_context'
  | 'get_nexus_today'
  | 'explain_financial_change'

/**
 * Secure dispatcher that executes only registered READ-ONLY tools with isolated user scope.
 */
export async function executeAITool(
  toolName: string,
  args: Record<string, unknown>,
  userOrContext: string | { userId?: string }
): Promise<{ success: boolean; data?: any; error?: string }> {
  const userId =
    typeof userOrContext === 'string'
      ? userOrContext
      : userOrContext && typeof userOrContext === 'object'
      ? userOrContext.userId || ''
      : ''

  if (!userId) {
    return { success: false, error: 'Unauthorized: missing user context' }
  }

  const ctx = { userId }

  try {
    switch (toolName as AllowedToolName) {
      case 'get_monthly_income':
        return {
          success: true,
          data: await readTools.get_monthly_income(ctx, args as { month?: number; year?: number }),
        }

      case 'get_monthly_expenses':
        return {
          success: true,
          data: await readTools.get_monthly_expenses(
            ctx,
            args as { month?: number; year?: number; category?: string }
          ),
        }

      case 'get_cash_flow':
        return {
          success: true,
          data: await readTools.get_cash_flow(ctx, args as { month?: number; year?: number }),
        }

      case 'get_budgets':
        return {
          success: true,
          data: await readTools.get_budgets(ctx, args as { month?: number; year?: number }),
        }

      case 'get_goals':
        return { success: true, data: await readTools.get_goals(ctx) }

      case 'get_debts':
        return { success: true, data: await readTools.get_debts(ctx) }

      case 'get_net_worth':
        return { success: true, data: await readTools.get_net_worth(ctx) }

      case 'get_accounts':
        return { success: true, data: await readTools.get_accounts(ctx) }

      case 'get_investments':
        return { success: true, data: await readTools.get_investments(ctx) }

      case 'get_crypto':
      case 'get_crypto_summary':
        return { success: true, data: await readTools.get_crypto_summary(ctx) }

      case 'get_wallets':
        return { success: true, data: await readTools.get_wallets(ctx) }

      case 'get_wallet_balance':
        return {
          success: true,
          data: await readTools.get_wallet_balance(
            ctx,
            args as { wallet_id?: string; address?: string }
          ),
        }

      case 'get_crypto_portfolio':
        return {
          success: true,
          data: await readTools.get_crypto_portfolio(
            ctx,
            args as { symbol?: string }
          ),
        }

      case 'get_betting':
        return { success: true, data: await readTools.get_betting(ctx) }

      case 'simulate_financial_scenario':
        return {
          success: true,
          data: await readTools.simulate_financial_scenario(ctx, args as Parameters<typeof readTools.simulate_financial_scenario>[1]),
        }

      case 'get_bank_accounts':
        return { success: true, data: await readTools.get_bank_accounts(ctx) }

      case 'get_bank_balances':
        return { success: true, data: await readTools.get_bank_balances(ctx) }

      case 'get_bank_transactions':
        return {
          success: true,
          data: await readTools.get_bank_transactions(
            ctx,
            args as Parameters<typeof readTools.get_bank_transactions>[1]
          ),
        }

      case 'get_bank_cash_flow':
        return {
          success: true,
          data: await readTools.get_bank_cash_flow(
            ctx,
            args as Parameters<typeof readTools.get_bank_cash_flow>[1]
          ),
        }

      case 'get_bank_connections':
        return { success: true, data: await readTools.get_bank_connections(ctx) }

      case 'get_financial_state':
        return {
          success: true,
          data: await readTools.get_financial_state(
            ctx,
            args as { month?: number; year?: number }
          ),
        }

      case 'get_recent_financial_events':
        return {
          success: true,
          data: await readTools.get_recent_financial_events(
            ctx,
            args as Parameters<typeof readTools.get_recent_financial_events>[1]
          ),
        }

      case 'get_active_alerts':
        return {
          success: true,
          data: await readTools.get_active_alerts(
            ctx,
            args as Parameters<typeof readTools.get_active_alerts>[1]
          ),
        }

      case 'get_financial_insights':
        return {
          success: true,
          data: await readTools.get_financial_insights(
            ctx,
            args as Parameters<typeof readTools.get_financial_insights>[1]
          ),
        }

      case 'get_financial_changes':
        return {
          success: true,
          data: await readTools.get_financial_changes(
            ctx,
            args as Parameters<typeof readTools.get_financial_changes>[1]
          ),
        }

      case 'get_copilot_context':
        return {
          success: true,
          data: await readTools.get_copilot_context(
            ctx,
            args as Parameters<typeof readTools.get_copilot_context>[1]
          ),
        }

      case 'get_nexus_today':
        return {
          success: true,
          data: await readTools.get_nexus_today(
            ctx,
            args as Parameters<typeof readTools.get_nexus_today>[1]
          ),
        }

      case 'explain_financial_change':
        return {
          success: true,
          data: await readTools.explain_financial_change(
            ctx,
            args as Parameters<typeof readTools.explain_financial_change>[1]
          ),
        }

      default:
        return {
          success: false,
          error: `Tool "${toolName}" is not registered or is not permitted in the READ-ONLY phase.`,
        }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown execution error in tool'
    return { success: false, error: message }
  }
}

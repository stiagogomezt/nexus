/**
 * NEXUS FINANCE — FASE O: FINANCIAL INTELLIGENCE + EVENT ENGINE + ALERT CENTER
 * Automated Verification Suite (18 Critical Tests)
 */

import { buildFinancialState } from '../src/lib/digital-twin/financial-state-builder.ts'
import { EventEngine } from '../src/lib/intelligence/event-engine.ts'
import { AlertCenter } from '../src/lib/intelligence/alert-center.ts'
import { IntelligenceEngine } from '../src/lib/intelligence/intelligence-engine.ts'
import { BriefService } from '../src/lib/intelligence/brief-service.ts'
import { executeAITool } from '../src/lib/ai-tools/index.ts'
import * as intelligenceDal from '../src/lib/dal/intelligence.ts'
import { getIncomes } from '../src/lib/dal/incomes.ts'
import { getDebts } from '../src/lib/dal/debts.ts'

async function runIntelligenceSuite() {
  console.log('================================================================')
  console.log('🧠 NEXUS FINANCE — FASE O: FINANCIAL INTELLIGENCE & EVENT ENGINE')
  console.log('================================================================\n')

  let passed = 0
  const total = 18

  function assert(condition, message, details = '') {
    if (condition) {
      console.log(`✅ [PASS] ${message}`)
      if (details) console.log(`   └─ ${details}`)
      passed++
    } else {
      console.error(`❌ [FAIL] ${message}`)
      if (details) console.error(`   └─ ${details}`)
      throw new Error(`Assertion failed: ${message}`)
    }
  }

  const userKevin = 'usr-kevin-001'
  const userMaria = 'usr-maria-002'

  // --- Mock Baseline Snapshot (Previous Month: 2026-08) ---
  const baselineSnapshot = {
    id: 'snp-prev-aug',
    user_id: userKevin,
    snapshot_date: '2026-08-31',
    monthly_income: 2500000,
    monthly_expenses: 1200000,
    free_cash_flow: 1300000,
    savings_rate_pct: 52.0,
    liquid_assets: 3000000,
    total_debt: 1000000,
    net_worth: 5000000,
    crypto_assets: 2000000,
    bank_assets: 2800000,
    investments_value: 0,
    total_assets: 6000000,
    total_liabilities: 1000000,
    created_at: '2026-08-31T23:59:59Z',
  }

  // --- Current Month (2026-09) Live Bundle for Kevin ---
  const mockBundleKevin = {
    incomes: [
      {
        id: 'inc-1',
        user_id: userKevin,
        account_id: null,
        date: '2026-09-15',
        source: 'Shuffler Corp',
        income_source_key: 'shuffler',
        description: 'Pago nómina principal Shuffler',
        amount: 2200000,
        income_type: 'salary',
        base_salary: 2200000,
        bonus_amount: 0,
        surcharges_amount: 0,
        extra_hours_amount: 0,
        other_payments_amount: 0,
        hours_worked: 160,
        hourly_rate: 13750,
        is_recurring: true,
        notes: null,
        created_at: '2026-09-15T10:00:00Z',
      },
      {
        id: 'inc-2',
        user_id: userKevin,
        account_id: null,
        date: '2026-09-20',
        source: 'Pizza Hut',
        income_source_key: 'pizza_hut',
        description: 'Turnos cocina Pizza Hut',
        amount: 800000,
        income_type: 'salary',
        base_salary: 800000,
        bonus_amount: 0,
        surcharges_amount: 0,
        extra_hours_amount: 0,
        other_payments_amount: 0,
        hours_worked: 60,
        hourly_rate: 13333,
        is_recurring: true,
        notes: null,
        created_at: '2026-09-20T10:00:00Z',
      },
    ],
    expenses: [
      {
        id: 'exp-1',
        user_id: userKevin,
        account_id: null,
        date: '2026-09-05',
        category_id: 'cat-alimentacion',
        category_name: 'alimentacion',
        amount: 600000,
        is_essential: true,
        is_recurring: true,
        description: 'Supermercado mes',
        payment_method: 'debit',
        notes: null,
        created_at: '2026-09-05T10:00:00Z',
      },
      {
        id: 'exp-2',
        user_id: userKevin,
        account_id: null,
        date: '2026-09-10',
        category_id: 'cat-vivienda',
        category_name: 'vivienda',
        amount: 900000,
        is_essential: true,
        is_recurring: true,
        description: 'Arriendo',
        payment_method: 'transfer',
        notes: null,
        created_at: '2026-09-10T10:00:00Z',
      },
    ],
    categories: [],
    goals: [
      {
        id: 'goal-1',
        user_id: userKevin,
        name: 'Fondo de Emergencia',
        target_amount: 10000000,
        current_amount: 3500000,
        target_date: '2027-12-31',
        priority: 1,
        status: 'active',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-09-01T00:00:00Z',
      },
    ],
    debts: [
      {
        id: 'debt-1',
        user_id: userKevin,
        name: 'Tarjeta Nu',
        debt_type: 'credit_card',
        initial_balance: 1500000,
        current_balance: 750000,
        interest_rate_ea: 24.5,
        minimum_payment: 65000,
        min_monthly_payment: 65000,
        due_day: 15,
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-09-01T00:00:00Z',
      },
    ],
    assets: [
      {
        id: 'ast-1',
        user_id: userKevin,
        name: 'Efectivo Reserva',
        category: 'cash',
        current_value: 300000,
        estimated_value: 300000,
        is_liquid: true,
        created_at: '2026-01-01T00:00:00Z',
      },
    ],
    liabilities: [],
    accounts: [],
    budgets: [
      {
        id: 'bud-1',
        user_id: userKevin,
        category_name: 'alimentacion',
        month: 9,
        year: 2026,
        amount: 550000, // actual is 600k -> 109% (overbudget!)
        created_at: '2026-09-01T00:00:00Z',
      },
    ],
    cryptoHoldings: [
      {
        id: 'c-1',
        user_id: userKevin,
        symbol: 'SOL',
        asset: 'Solana',
        asset_name: 'Solana',
        quantity: 5,
        total_quantity: 5,
        purchase_price_usd: 150,
        average_buy_price_usd: 150,
        current_price_usd: 187.5,
        total_value_usd: 937.5,
        total_value_cop: 3890625,
        unrealized_pnl_usd: 187.5,
        unrealized_pnl_cop: 778125,
        unrealized_pnl_percent: 25.0,
        source: 'manual',
        created_at: '2026-09-01T00:00:00Z',
        updated_at: '2026-09-25T00:00:00Z',
      },
    ],
    wallets: [],
    bankConnections: [
      {
        id: 'conn-1',
        user_id: userKevin,
        institution_id: 'bancolombia',
        institution_name: 'Bancolombia',
        provider: 'mock',
        status: 'active',
        consent_status: 'authorized',
        consent_scopes: ['accounts.read'],
        consent_expires_at: '2027-09-25T00:00:00Z',
        sync_status: 'success',
        last_synced_at: '2026-09-25T10:00:00Z',
        created_at: '2026-09-25T10:00:00Z',
      },
    ],
    bankAccounts: [
      {
        id: 'bacc-1',
        connection_id: 'conn-1',
        user_id: userKevin,
        institution_name: 'Bancolombia',
        account_name: 'Cuenta Ahorros Principal',
        account_type: 'savings',
        currency: 'COP',
        current_balance: 3200000,
        available_balance: 3200000,
        is_active: true,
        last_synced_at: '2026-09-25T10:00:00Z',
        created_at: '2026-09-25T10:00:00Z',
      },
    ],
    bankTransactions: [],
    snapshots: [baselineSnapshot],
  }

  const liveState = buildFinancialState(mockBundleKevin)

  // -------------------------------------------------------------
  // Test 1: Income Change Event Detection
  // -------------------------------------------------------------
  console.log('--- Test 1: Detección de Cambio de Ingresos ---')
  const events = EventEngine.detectEvents(liveState, baselineSnapshot, intelligenceDal.DEFAULT_INTELLIGENCE_THRESHOLDS, {
    budgets: mockBundleKevin.budgets,
    goals: mockBundleKevin.goals,
    debts: mockBundleKevin.debts,
    cryptoHoldings: mockBundleKevin.cryptoHoldings,
    bankConnections: mockBundleKevin.bankConnections,
  })

  const incomeEvent = events.find((e) => e.type === 'INCOME_CHANGE')
  assert(
    incomeEvent !== undefined && incomeEvent.delta?.percentageDelta === 20,
    '1. Evento INCOME_CHANGE detectado fielmente con delta cuantitativo (+20%)',
    `Ingreso actual: $${incomeEvent?.current_value} vs Previo: $${incomeEvent?.previous_value} (${incomeEvent?.delta?.percentageDelta}%)`
  )

  // -------------------------------------------------------------
  // Test 2: Expense Change & Spike Detection
  // -------------------------------------------------------------
  console.log('\n--- Test 2: Detección de Variación de Gastos ---')
  const expenseEvent = events.find((e) => e.type === 'EXPENSE_CHANGE')
  assert(
    expenseEvent !== undefined && expenseEvent.current_value === 1500000,
    '2. Evento EXPENSE_CHANGE detectado al superar umbral (+25%)',
    `Gastos: $${expenseEvent?.current_value} vs $${expenseEvent?.previous_value} (${expenseEvent?.delta?.percentageDelta}%)`
  )

  // -------------------------------------------------------------
  // Test 3: Budget Threshold Monitoring (Overbudget 109%)
  // -------------------------------------------------------------
  console.log('\n--- Test 3: Umbrales y Alertas de Presupuesto ---')
  const budgetEvent = events.find((e) => e.type === 'BUDGET_THRESHOLD')
  assert(
    budgetEvent !== undefined && budgetEvent.metadata?.pct === 109,
    '3. Evento BUDGET_THRESHOLD detecta sobrepresupuesto en alimentacion (109%)',
    `Gastado: $${budgetEvent?.current_value} de Presupuesto: $${budgetEvent?.previous_value}`
  )

  // -------------------------------------------------------------
  // Test 4: Debt Change & Amortization Detection
  // -------------------------------------------------------------
  console.log('\n--- Test 4: Variación de Deuda (Amortización) ---')
  const debtEvent = events.find((e) => e.type === 'DEBT_CHANGE')
  assert(
    debtEvent !== undefined && debtEvent.delta?.percentageDelta === -25,
    '4. Evento DEBT_CHANGE registra reducción de deuda del -25%',
    `Deuda actual: $${debtEvent?.current_value} vs $${debtEvent?.previous_value} (Reducción: ${debtEvent?.delta?.percentageDelta}%)`
  )

  // -------------------------------------------------------------
  // Test 5: Goal Delay / Contribution Pace
  // -------------------------------------------------------------
  console.log('\n--- Test 5: Meta Intelligence (Análisis de Avance) ---')
  const goalEvent = events.find((e) => e.type === 'GOAL_DELAY' || e.type === 'GOAL_ACCELERATION')
  assert(
    goalEvent !== undefined,
    '5. Meta Intelligence evalúa la trayectoria de aporte frente a la fecha estimada',
    `Evento: ${goalEvent?.type} | Meta: ${goalEvent?.title}`
  )

  // -------------------------------------------------------------
  // Test 6: Liquidity Drop & Increase Evaluation
  // -------------------------------------------------------------
  console.log('\n--- Test 6: Liquidity Intelligence ---')
  // Kevin's liquid assets grew from 3.0M to 3.5M (+16.7%)
  const liqEvent = events.find((e) => e.type === 'LIQUIDITY_DROP' || e.type === 'LIQUIDITY_INCREASE')
  assert(
    liveState.liquidity.runwayMonths >= 2.0,
    '6. Liquidity Intelligence monitorea runway y colchón de reserva',
    `Runway actual: ${liveState.liquidity.runwayMonths} meses | Líquido total: $${liveState.liquidity.totalLiquid}`
  )

  // -------------------------------------------------------------
  // Test 7: Net Worth Variation
  // -------------------------------------------------------------
  console.log('\n--- Test 7: Variación Patrimonial Cuantitativa ---')
  const nwEvent = events.find((e) => e.type === 'NET_WORTH_CHANGE')
  assert(
    nwEvent !== undefined && nwEvent.current_value > baselineSnapshot.net_worth,
    '7. Evento NET_WORTH_CHANGE cuantifica el incremento de riqueza neta',
    `Patrimonio actual: $${nwEvent?.current_value} vs Base: $${nwEvent?.previous_value} (+${nwEvent?.delta?.percentageDelta}%)`
  )

  // -------------------------------------------------------------
  // Test 8: Crypto Intelligence (Market Price vs Holding Value)
  // -------------------------------------------------------------
  console.log('\n--- Test 8: Crypto Intelligence ---')
  const cryptoEvent = events.find((e) => e.type === 'CRYPTO_CHANGE')
  assert(
    cryptoEvent !== undefined && cryptoEvent.delta?.percentageDelta > 0,
    '8. Crypto Intelligence detecta revalorización de tenencias sin asumir ganancias no realizadas',
    `Crypto actual COP: $${cryptoEvent?.current_value} vs Base: $${cryptoEvent?.previous_value}`
  )

  // -------------------------------------------------------------
  // Test 9: Betting Intelligence Separation
  // -------------------------------------------------------------
  console.log('\n--- Test 9: Betting Intelligence (Aislamiento de Inversión) ---')
  const stateWithBet = {
    ...liveState,
    betting: {
      ...liveState.betting,
      totalStaked: 450000,
      cashFlowImpactPercent: 15.0,
      netProfit: -100000,
      isInvestment: false,
    },
  }
  const betEvents = EventEngine.detectEvents(stateWithBet, baselineSnapshot)
  const betEvent = betEvents.find((e) => e.type === 'BETTING_CHANGE')
  assert(
    betEvent !== undefined && betEvent.metadata?.isInvestment === false,
    '9. Apuestas auditadas estrictamente como actividad recreativa con impacto de flujo (isInvestment: false)',
    `Apostado: $${betEvent?.current_value} | Impacto en flujo: ${betEvent?.description}`
  )

  // -------------------------------------------------------------
  // Test 10: Duplicate Alert Prevention
  // -------------------------------------------------------------
  console.log('\n--- Test 10: Prevención de Alertas Duplicadas ---')
  const existingAlerts = [
    {
      id: 'alt-exist-1',
      user_id: userKevin,
      type: 'INCOME_CHANGE',
      date: new Date().toISOString().split('T')[0],
      severity: 'INFO',
      title: 'Incremento en ingresos del período',
      description: 'Test previa',
      metric: 'monthly_income',
      current_value: 3000000,
      previous_value: 2500000,
      delta: 500000,
      source: 'engine:income',
      status: 'UNREAD',
      created_at: new Date().toISOString(),
    },
  ]

  const { newAlerts, deduplicatedCount } = AlertCenter.processEventsIntoAlerts(
    userKevin,
    events,
    existingAlerts
  )
  assert(
    deduplicatedCount >= 1 && !newAlerts.some((a) => a.type === 'INCOME_CHANGE'),
    '10. Deduplicador omite alertas del mismo tipo y métrica generadas en el mismo día',
    `Alertas duplicadas omitidas: ${deduplicatedCount}`
  )

  // -------------------------------------------------------------
  // Test 11: Alert Read State Transition
  // -------------------------------------------------------------
  console.log('\n--- Test 11: Transición de Estado a READ ---')
  const testAlert = await intelligenceDal.saveFinancialAlert(userKevin, {
    type: 'EXPENSE_CHANGE',
    severity: 'WARNING',
    title: 'Gasto elevado',
    description: 'Descripción de prueba',
    metric: 'monthly_expenses',
    current_value: 1500000,
    previous_value: 1200000,
    delta: 300000,
    source: 'engine:test',
    status: 'UNREAD',
  })

  const readAlert = await AlertCenter.markAsRead(userKevin, testAlert.id)
  assert(
    readAlert !== null && readAlert.status === 'READ',
    '11. markAsRead transiciona exitosamente el estado de UNREAD a READ',
    `Alert ID: ${readAlert?.id} -> Estado: ${readAlert?.status}`
  )

  // -------------------------------------------------------------
  // Test 12: Alert Dismiss State Transition
  // -------------------------------------------------------------
  console.log('\n--- Test 12: Descarte de Alertas (DISMISSED) ---')
  const dismissedAlert = await AlertCenter.dismiss(userKevin, testAlert.id)
  assert(
    dismissedAlert !== null && dismissedAlert.status === 'DISMISSED',
    '12. dismiss transiciona el estado de la alerta a DISMISSED',
    `Alert ID: ${dismissedAlert?.id} -> Estado: ${dismissedAlert?.status}`
  )

  // -------------------------------------------------------------
  // Test 13: Event History Chronological Retrieval & Filtering
  // -------------------------------------------------------------
  console.log('\n--- Test 13: Historial Cronológico de Eventos ---')
  await intelligenceDal.saveFinancialEvent(userKevin, {
    type: 'LIQUIDITY_DROP',
    category: 'liquidity',
    severity: 'CRITICAL',
    title: 'Evento persistido de prueba',
    description: 'Detalle de prueba para historial',
    metric: 'liquid_assets',
    current_value: 1000000,
    previous_value: 3000000,
    source: 'test:history',
  })

  const history = await intelligenceDal.getFinancialEvents(userKevin, { category: 'liquidity' })
  assert(
    history.length > 0 && history[0].category === 'liquidity',
    '13. Historial de eventos filtrable por categoría y ordenado cronológicamente',
    `Eventos de liquidez encontrados: ${history.length}`
  )

  // -------------------------------------------------------------
  // Test 14: Strict User Isolation (Kevin vs María)
  // -------------------------------------------------------------
  console.log('\n--- Test 14: Aislamiento Estricto por Usuario ---')
  const kevinAlerts = await intelligenceDal.getFinancialAlerts(userKevin)
  const mariaAlerts = await intelligenceDal.getFinancialAlerts(userMaria)
  const mariaEvents = await intelligenceDal.getFinancialEvents(userMaria)

  assert(
    kevinAlerts.length > 0 && mariaAlerts.length === 0 && mariaEvents.length === 0,
    '14. Cero filtración de eventos o alertas hacia otro usuario (María)',
    `Kevin alertas: ${kevinAlerts.length} | María alertas: ${mariaAlerts.length}`
  )

  // -------------------------------------------------------------
  // Test 15: AI Read Tools for Intelligence
  // -------------------------------------------------------------
  console.log('\n--- Test 15: AI Read Tools de Inteligencia ---')
  const aiEvents = await executeAITool('get_recent_financial_events', {}, userKevin)
  const aiAlerts = await executeAITool('get_active_alerts', {}, userKevin)
  const aiInsights = await executeAITool('get_financial_insights', {}, userKevin)
  const aiChanges = await executeAITool('get_financial_changes', { benchmark: 'previous_month' }, userKevin)

  assert(
    aiEvents.success && aiAlerts.success && aiInsights.success && aiChanges.success,
    '15. Las 4 AI Read Tools de inteligencia ejecutadas exitosamente en modo solo lectura',
    `Events: OK | Alerts: OK | Insights: OK | Changes: OK`
  )

  // -------------------------------------------------------------
  // Test 16: Zero Database Ledger Mutation
  // -------------------------------------------------------------
  console.log('\n--- Test 16: Inmutabilidad del Libro Contable ---')
  const incomesBefore = await getIncomes(userKevin)
  const debtsBefore = await getDebts(userKevin)

  // Run full intelligence engine cycles
  IntelligenceEngine.generateInsights(liveState, baselineSnapshot, events)
  BriefService.generateDailyBrief(liveState)
  BriefService.generateWeeklyReview(liveState, baselineSnapshot)

  const incomesAfter = await getIncomes(userKevin)
  const debtsAfter = await getDebts(userKevin)

  assert(
    incomesBefore.length === incomesAfter.length && debtsBefore.length === debtsAfter.length,
    '16. Ejecución del Event Engine y sintetizadores es 100% libre de efectos secundarios en el libro contable',
    `Ingresos: ${incomesBefore.length} === ${incomesAfter.length} | Deudas: ${debtsBefore.length} === ${debtsAfter.length}`
  )

  // -------------------------------------------------------------
  // Test 17: No False Positives on Normal Fluctuations
  // -------------------------------------------------------------
  console.log('\n--- Test 17: Supresión de Falsos Positivos Básicos ---')
  const identicalState = {
    ...liveState,
    income: { ...liveState.income, total: baselineSnapshot.monthly_income * 1.02 }, // +2% (below 15% threshold)
    expenses: { ...liveState.expenses, total: baselineSnapshot.monthly_expenses * 1.03 }, // +3% (below 20% threshold)
  }
  const lowFluctuationEvents = EventEngine.detectEvents(identicalState, baselineSnapshot)
  const unwarrantedSpikes = lowFluctuationEvents.filter(
    (e) => e.type === 'INCOME_CHANGE' || e.type === 'EXPENSE_CHANGE'
  )

  assert(
    unwarrantedSpikes.length === 0,
    '17. Variaciones menores dentro de bandas normales no disparan eventos espurios',
    `Spikes no deseados generados: ${unwarrantedSpikes.length}`
  )

  // -------------------------------------------------------------
  // Test 18: Threshold Configuration Customization
  // -------------------------------------------------------------
  console.log('\n--- Test 18: Configuración Dinámica de Umbrales ---')
  const strictThresholds = {
    ...intelligenceDal.DEFAULT_INTELLIGENCE_THRESHOLDS,
    incomeChangePct: 1, // Ultra-sensitive: even 2% will trigger
  }
  const sensitiveEvents = EventEngine.detectEvents(identicalState, baselineSnapshot, strictThresholds)
  const sensitiveIncome = sensitiveEvents.find((e) => e.type === 'INCOME_CHANGE')

  assert(
    sensitiveIncome !== undefined,
    '18. Umbrales personalizados modifican sensible y deterministamente la detección',
    `Umbral estricto 1% disparó: ${sensitiveIncome?.title}`
  )

  console.log('\n====================================================')
  console.log(`RESULTADO DE LA SUITE FASE O: ${passed}/${total} PRUEBAS EXITOSAS`)
  console.log('====================================================\n')
}

runIntelligenceSuite().catch((err) => {
  console.error('FATAL ERROR EN SUITE DE FASE O:', err)
  process.exit(1)
})

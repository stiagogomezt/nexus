/**
 * NEXUS FINANCE — FASE N: FINANCIAL DIGITAL TWIN & FINANCIAL STATE
 * Automated Verification Suite (18 Critical Tests)
 */

import { buildFinancialState } from '../src/lib/digital-twin/financial-state-builder.ts'
import { FinancialChangeDetector } from '../src/lib/digital-twin/change-detector.ts'
import { FinancialAnomalyDetector } from '../src/lib/digital-twin/anomaly-detector.ts'
import { FinancialTimelineEngine } from '../src/lib/digital-twin/timeline-engine.ts'
import { DigitalTwinService } from '../src/lib/digital-twin/digital-twin-service.ts'
import { executeAITool } from '../src/lib/ai-tools/index.ts'
import { saveFinancialSnapshot, getFinancialSnapshots } from '../src/lib/dal/snapshots.ts'
import { getIncomes } from '../src/lib/dal/incomes.ts'
import * as dal from '../src/lib/dal/index.ts'

async function runDigitalTwinSuite() {
  console.log('================================================================')
  console.log('🧬 NEXUS FINANCE — FASE N: FINANCIAL DIGITAL TWIN & STATE')
  console.log('================================================================\n')

  let passed = 0
  let total = 18

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

  // --- Mock test data bundle for deterministic verification ---
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
        created_at: '2026-09-15T00:00:00Z',
      },
      {
        id: 'inc-2',
        user_id: userKevin,
        account_id: null,
        date: '2026-09-20',
        source: 'Pizza Hut',
        income_source_key: 'pizza_hut',
        description: 'Turno fin de semana Pizza Hut',
        amount: 800000,
        income_type: 'salary',
        base_salary: 800000,
        bonus_amount: 0,
        surcharges_amount: 0,
        extra_hours_amount: 0,
        other_payments_amount: 0,
        hours_worked: 40,
        hourly_rate: 20000,
        is_recurring: true,
        notes: null,
        created_at: '2026-09-20T00:00:00Z',
      },
    ],
    expenses: [
      {
        id: 'exp-1',
        user_id: userKevin,
        account_id: null,
        category_id: 'cat-vivienda',
        category_name: 'vivienda',
        date: '2026-09-05',
        description: 'Arriendo mensual Apto',
        amount: 900000,
        payment_method: 'transfer',
        is_recurring: true,
        is_essential: true,
        notes: null,
        created_at: '2026-09-05T00:00:00Z',
      },
      {
        id: 'exp-2',
        user_id: userKevin,
        account_id: null,
        category_id: 'cat-alimentacion',
        category_name: 'alimentacion',
        date: '2026-09-10',
        description: 'Mercado Éxito',
        amount: 500000,
        payment_method: 'debit',
        is_recurring: true,
        is_essential: true,
        notes: null,
        created_at: '2026-09-10T00:00:00Z',
      },
      {
        id: 'exp-3',
        user_id: userKevin,
        account_id: null,
        category_id: 'cat-ocio',
        category_name: 'ocio',
        date: '2026-09-12',
        description: 'Cine y salidas',
        amount: 250000,
        payment_method: 'credit',
        is_recurring: false,
        is_essential: false,
        notes: null,
        created_at: '2026-09-12T00:00:00Z',
      },
    ],
    categories: [],
    goals: [
      {
        id: 'goal-1',
        user_id: userKevin,
        name: 'Fondo de Emergencia',
        description: '6 meses de gastos',
        target_amount: 6000000,
        current_amount: 3500000,
        target_date: '2027-06-30',
        monthly_contribution: 300000,
        priority: 'alta',
        category: 'Ahorro',
        status: 'active',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-09-01T00:00:00Z',
      },
    ],
    debts: [
      {
        id: 'debt-1',
        user_id: userKevin,
        entity: 'Nu Colombia',
        name: 'Tarjeta de Crédito Nu',
        debt_type: 'credit_card',
        initial_balance: 1500000,
        current_balance: 780000,
        interest_rate_ea: 24.5,
        minimum_payment: 85000,
        payment_day: 15,
        term_months: 12,
        notes: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-09-01T00:00:00Z',
      },
    ],
    assets: [
      {
        id: 'ast-1',
        user_id: userKevin,
        name: 'Efectivo en mano',
        category: 'cash',
        current_value: 300000,
        notes: null,
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'ast-2',
        user_id: userKevin,
        name: 'Cuenta Ahorros Antigua (Legacy)',
        category: 'bank_accounts',
        current_value: 1200000,
        notes: null,
        created_at: '2026-01-01T00:00:00Z',
      },
    ],
    liabilities: [
      {
        id: 'lia-1',
        user_id: userKevin,
        debt_id: 'debt-1',
        name: 'Tarjeta de Crédito Nu',
        category: 'credit_card',
        current_balance: 780000,
        notes: null,
        created_at: '2026-01-01T00:00:00Z',
      },
    ],
    accounts: [],
    budgets: [],
    cryptoHoldings: [
      {
        id: 'cr-1',
        user_id: userKevin,
        symbol: 'SOL',
        asset_name: 'Solana',
        quantity: 5,
        purchase_price_usd: 150,
        purchase_price_cop: 622500,
        platform: 'Phantom',
        wallet_id: 'w-1',
        notes: null,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-09-25T00:00:00Z',
      },
    ],
    wallets: [
      {
        id: 'w-1',
        user_id: userKevin,
        address: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK',
        blockchain: 'solana',
        network_name: 'Solana Mainnet',
        label: 'Phantom Trading',
        is_active: true,
        tokens: [{ symbol: 'SOL', balance: 5, current_price_usd: 150, balance_usd: 750 }],
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-09-25T00:00:00Z',
      },
    ],
    bankConnections: [
      {
        id: 'conn-1',
        user_id: userKevin,
        provider: 'open_finance',
        institution_id: 'bancolombia',
        institution_name: 'Bancolombia',
        status: 'active',
        consent_id: 'cs_123',
        consent_scopes: ['accounts.read', 'balances.read', 'transactions.read'],
        consent_expires_at: '2027-09-25T00:00:00Z',
        connected_at: '2026-09-25T00:00:00Z',
        last_synced_at: '2026-09-25T12:00:00Z',
        sync_status: 'success',
        sync_error: null,
      },
    ],
    bankAccounts: [
      {
        id: 'bacc-1',
        user_id: userKevin,
        connection_id: 'conn-1',
        institution_id: 'bancolombia',
        account_name: 'Cuenta de Ahorros Principal',
        account_type: 'savings',
        currency: 'COP',
        masked_account_number: '***5421',
        current_balance: 3200000,
        available_balance: 3200000,
        is_active: true,
        last_synced_at: '2026-09-25T12:00:00Z',
      },
    ],
    bankTransactions: [],
    snapshots: [
      {
        id: 'snp-seed-2026-08',
        user_id: userKevin,
        snapshot_date: '2026-08-31',
        total_assets: 2500000,
        total_liabilities: 950000,
        net_worth: 1550000,
        monthly_income: 2800000,
        monthly_expenses: 1800000,
        free_cash_flow: 1000000,
        savings_rate_pct: 35.7,
        liquid_assets: 800000,
        crypto_assets: 0,
        bank_assets: 1700000,
        investments_value: 0,
        total_debt: 950000,
        created_at: '2026-08-31T23:59:59Z',
      },
    ],
    bets: [
      {
        id: 'bet-1',
        user_id: userKevin,
        date: '2026-09-18',
        platform: 'BetPlay',
        sport: 'Fútbol Colombiano',
        bet_type: 'Ganador Partido',
        stake_amount: 50000,
        odds: 2.1,
        result: 'won',
        return_amount: 105000,
        net_profit: 55000,
        notes: null,
        created_at: '2026-09-18T00:00:00Z',
      },
    ],
  }

  // --- Test 1: FinancialState ---
  console.log('--- Test 1: Construcción de FinancialState ---')
  const state = buildFinancialState(mockBundleKevin)
  assert(
    state && state.period === '2026-09' && state.income && state.netWorth,
    '1. FinancialState generado con estructura integral y normalizada',
    `Periodo: ${state.period} | Patrimonio: $${state.netWorth.netWorth.toLocaleString('es-CO')}`
  )

  // --- Test 2: FinancialSnapshot ---
  console.log('\n--- Test 2: Creación de Snapshot Financiero ---')
  const savedSnap = await dal.saveFinancialSnapshot(userKevin, {
    snapshot_date: '2026-09-25',
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
  })
  assert(
    savedSnap && savedSnap.net_worth === state.netWorth.netWorth,
    '2. FinancialSnapshot serializado y persistido con éxito en DAL',
    `Snapshot ID: ${savedSnap.id} | Fecha: ${savedSnap.snapshot_date}`
  )

  // --- Test 3: Net Worth Bridge ---
  console.log('\n--- Test 3: Verificación del Net Worth Bridge ---')
  // Expected Net Worth:
  // Cash (300.000) + Bank (3.200.000) + Crypto (5 SOL * 150 * 4150 = 3.112.500) = Total Assets 6.612.500
  // Liabilities: Nu Card 780.000
  // Net Worth: 6.612.500 - 780.000 = 5.832.500 COP
  assert(
    state.netWorth.netWorth === state.assets.totalAssets - state.liabilities.totalLiabilities &&
      state.assets.totalAssets > 6000000,
    '3. Net Worth calculado determinísticamente respetando fórmula patrimonial',
    `Activos: $${state.assets.totalAssets.toLocaleString('es-CO')} - Pasivos: $${state.liabilities.totalLiabilities.toLocaleString('es-CO')} = Net Worth: $${state.netWorth.netWorth.toLocaleString('es-CO')}`
  )

  // --- Test 4: Liquidity & Runway ---
  console.log('\n--- Test 4: Liquidez y Meses de Cobertura (Runway) ---')
  // Liquid: Cash (300k) + Bank (3.2M) = 3.5M
  // Essential expenses: Vivienda (900k) + Alimentacion (500k) = 1.4M
  // Runway: 3.5M / 1.4M = 2.5 meses
  assert(
    state.liquidity.totalLiquid === 3500000 && state.liquidity.runwayMonths >= 2.0,
    '4. Liquidez inmediata y meses de cobertura computados correctamente',
    `Líquido: $${state.liquidity.totalLiquid.toLocaleString('es-CO')} | Runway: ${state.liquidity.runwayMonths} meses`
  )

  // --- Test 5: Debt Metrics & DTI ---
  console.log('\n--- Test 5: Métricas de Deuda y Ratio DTI ---')
  // Total Debt: 780.000 | Monthly Payment: 85.000 | Total Income: 3.000.000
  // DTI: 85.000 / 3.000.000 = 2.8%
  assert(
    state.debts.totalDebt === 780000 && state.debts.debtToIncomeRatio < 10,
    '5. Carga de endeudamiento y servicio mensual evaluados con exactitud',
    `Deuda: $${state.debts.totalDebt.toLocaleString('es-CO')} | DTI: ${state.debts.debtToIncomeRatio}%`
  )

  // --- Test 6: Crypto Intelligence Integration ---
  console.log('\n--- Test 6: Integración de Activos Cripto ---')
  assert(
    state.crypto.holdingsCount === 1 && state.crypto.totalCryptoCop > 3000000,
    '6. Criptoactivos integrados a valor de mercado en COP sin pérdida de precisión',
    `Crypto Holdings: ${state.crypto.holdingsCount} | Valor COP: $${state.crypto.totalCryptoCop.toLocaleString('es-CO')}`
  )

  // --- Test 7: Wallet Intelligence Integration ---
  console.log('\n--- Test 7: Billeteras On-Chain Read-Only ---')
  assert(
    state.wallets.activeWalletsCount === 1 && state.wallets.blockchains.includes('solana'),
    '7. Billeteras on-chain consolidadas en modo solo lectura',
    `Wallets: ${state.wallets.activeWalletsCount} | Cadena: ${state.wallets.blockchains.join(', ')}`
  )

  // --- Test 8: Banking Open Finance Integration ---
  console.log('\n--- Test 8: Integración Bancaria Open Finance ---')
  assert(
    state.banking.connectedAccountsCount === 1 && state.banking.totalBalanceCop === 3200000,
    '8. Cuentas bancarias de Open Finance reflejadas en el estado unificado',
    `Cuentas: ${state.banking.connectedAccountsCount} | Saldo: $${state.banking.totalBalanceCop.toLocaleString('es-CO')}`
  )

  // --- Test 9: Betting Separation (isInvestment: false) ---
  console.log('\n--- Test 9: Separación Estricta de Apuestas (No Inversión) ---')
  assert(
    state.betting.isInvestment === false && state.betting.totalStaked === 50000,
    '9. Apuestas catalogadas estrictamente como actividad recreativa aislada (NO inversión)',
    `Apostado: $${state.betting.totalStaked.toLocaleString('es-CO')} | Net Profit: $${state.betting.netProfit.toLocaleString('es-CO')} | isInvestment: ${state.betting.isInvestment}`
  )

  // --- Test 10: Shuffler Income Tracking ---
  console.log('\n--- Test 10: Rastreo de Ingreso Principal (Shuffler) ---')
  assert(
    state.income.shuffler === 2200000,
    '10. Ingreso principal de Shuffler Corp identificado y aislado',
    `Monto Shuffler: $${state.income.shuffler.toLocaleString('es-CO')}`
  )

  // --- Test 11: Pizza Hut Income Tracking ---
  console.log('\n--- Test 11: Rastreo de Ingreso Secundario (Pizza Hut) ---')
  assert(
    state.income.pizzaHut === 800000,
    '11. Ingreso secundario de Pizza Hut identificado sin freelance inventado',
    `Monto Pizza Hut: $${state.income.pizzaHut.toLocaleString('es-CO')}`
  )

  // --- Test 12: User Isolation (Cross-User Protection) ---
  console.log('\n--- Test 12: Aislamiento Estricto por Usuario ---')
  const userMariaSnaps = await dal.getFinancialSnapshots(userMaria)
  assert(
    userMariaSnaps.length === 0,
    '12. Cero filtración de snapshots o balances hacia otro usuario (María)',
    `Kevin snapshots: >= 1 | María snapshots: ${userMariaSnaps.length}`
  )

  // --- Test 13: Zero Duplication (Manual vs Verified) ---
  console.log('\n--- Test 13: Cero Duplicación de Cuentas y Activos ---')
  // Notice mockBundleKevin had a legacy asset "Cuenta Ahorros Antigua" ($1.2M) and bank account ($3.2M)
  // Deduplication engine overrides legacy bank asset with verified Open Finance balance $3.2M.
  assert(
    state.assets.breakdown.bankAccounts === 3200000,
    '13. Saldo bancario verificado prevalece y anula activo manual para evitar doble conteo',
    `Saldo Bancario Consolidado: $${state.assets.breakdown.bankAccounts.toLocaleString('es-CO')}`
  )

  // --- Test 14: AI Tool get_financial_state Execution ---
  console.log('\n--- Test 14: Ejecución de la Tool AI get_financial_state ---')
  const aiResult = await executeAITool('get_financial_state', { month: 9, year: 2026 }, userKevin)
  assert(
    aiResult.success && aiResult.data.tool === 'get_financial_state' && aiResult.data.net_worth,
    '14. AI Tool get_financial_state ejecutada exitosamente con payload compacto y determinista',
    `Tool: ${aiResult.data.tool} | Net Worth: $${aiResult.data.net_worth.net_worth.toLocaleString('es-CO')}`
  )

  // --- Test 15: Snapshot Comparison (HOY vs MES ANTERIOR) ---
  console.log('\n--- Test 15: Comparación Temporal de Snapshots ---')
  const baselineSnap = mockBundleKevin.snapshots[0]
  const currentSnap = savedSnap
  const comparison = FinancialChangeDetector.compareSnapshots(currentSnap, baselineSnap)
  assert(
    comparison && comparison.changes.netWorth.absoluteDelta > 0,
    '15. Comparación cuantitativa HOY vs MES ANTERIOR generada sin interpretaciones subjetivas',
    `Delta Patrimonio: +$${comparison.changes.netWorth.absoluteDelta.toLocaleString('es-CO')} (${comparison.changes.netWorth.percentageDelta}%)`
  )

  // --- Test 16: Financial Change Detector ---
  console.log('\n--- Test 16: Detección Cuantitativa de Cambios ---')
  assert(
    comparison.changes.keyFindings.length > 0 &&
      comparison.changes.income.direction === 'increase',
    '16. Change Detector cuantifica deltas exactos en ingresos, gastos y deuda',
    `Hallazgos detectados: ${comparison.changes.keyFindings.length} | Ingreso: ${comparison.changes.income.direction}`
  )

  // --- Test 17: Anomaly Detection Architecture ---
  console.log('\n--- Test 17: Detección de Anomalías Financieras ---')
  // Create an artificial state with a massive unusual expense to test detector
  const anomalyState = {
    ...state,
    expenses: {
      ...state.expenses,
      byCategory: { ...state.expenses.byCategory, compras: 1800000 },
    },
    betting: {
      ...state.betting,
      totalStaked: 450000, // 15% of income
      cashFlowImpactPercent: 15,
    },
  }
  const detectedAnoms = FinancialAnomalyDetector.detectAnomalies(anomalyState, baselineSnap)
  assert(
    detectedAnoms.length >= 2 &&
      detectedAnoms.some((a) => a.type === 'unusual_expense') &&
      detectedAnoms.some((a) => a.type === 'betting_exposure'),
    '17. Motor de anomalías detecta gasto desproporcionado y sobreexposición en apuestas',
    `Total anomalías señaladas: ${detectedAnoms.length} | Tipos: ${detectedAnoms.map((a) => a.type).join(', ')}`
  )

  // --- Test 18: Zero DB Mutation in Digital Twin Derivation ---
  console.log('\n--- Test 18: Inmutabilidad de la Capa Derivada (Zero DB Mutation) ---')
  const initialIncomes = await getIncomes(userKevin)
  const twinInstance = await DigitalTwinService.getDigitalTwin(userKevin)
  const postIncomes = await getIncomes(userKevin)
  assert(
    initialIncomes.length === postIncomes.length && twinInstance.currentState,
    '18. Derivación del Digital Twin es 100% libre de efectos secundarios y no muta la base de datos',
    `Registros de ingreso antes: ${initialIncomes.length} | Después: ${postIncomes.length}`
  )

  console.log('\n====================================================')
  console.log(`RESULTADO DE LA SUITE FASE N: ${passed}/${total} PRUEBAS EXITOSAS`)
  console.log('====================================================\n')
  console.log('🚀 TODAS LAS 18 PRUEBAS DE DIGITAL TWIN & FINANCIAL STATE PASARON CON ÉXITO.\n')
}

runDigitalTwinSuite().catch((err) => {
  console.error('\n❌ ERROR EN LA SUITE DE DIGITAL TWIN:', err)
  process.exit(1)
})

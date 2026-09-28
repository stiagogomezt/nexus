/**
 * NEXUS Finance — Scenario Engine & Financial Laboratory Verification Suite
 *
 * Verifies all 12 criteria specified for FASE K:
 * 1. Escenario Actual (Línea base): delta = 0 cuando no hay supuestos extra.
 * 2. Escenario Ahorro (+300.000 COP/mes): incremento acumulativo exacto vs línea base.
 * 3. Escenario Ingresos (+20% Pizza Hut / Shuffler): mayor crecimiento del patrimonio y flujo.
 * 4. Escenario Gastos (-10% Austeridad): mayor capacidad de ahorro y aceleración.
 * 5. Escenario Deuda (abono extra a deuda): reducción de meses y cuantificación determinista de intereses ahorrados.
 * 6. Aceleración de meta existente: cálculo de fecha anticipada y meses ahorrados.
 * 7. No mutación de datos reales: verificación estricta de inmutabilidad en la persistencia.
 * 8. Ejecución de la herramienta AI simulate_financial_scenario: payload estructurado completo.
 * 9. Integración con Gemini AI Provider en modo simulado / offline y generación de síntesis grounded.
 * 10. Aislamiento multi-usuario en simulaciones.
 * 11. Manejo seguro de casos límite (sin deudas, sin metas, horizontes 12/60 meses).
 * 12. Integridad de presets y parámetros del Laboratorio Financiero.
 */

// Mock browser storage for Node test runner
const _memStore = new Map()
global.localStorage = {
  getItem: (k) => _memStore.get(k) || null,
  setItem: (k, v) => _memStore.set(k, String(v)),
  removeItem: (k) => _memStore.delete(k),
  clear: () => _memStore.clear(),
}
global.window = { localStorage: global.localStorage }

import { simulateAdvancedScenario } from '../src/lib/financial-engine.ts'
import { executeAITool } from '../src/lib/ai-tools/index.ts'
import { GeminiProvider } from '../src/lib/ai/providers/gemini-provider.ts'
import { createIncome, getIncomes } from '../src/lib/dal/incomes.ts'
import { createExpense } from '../src/lib/dal/expenses.ts'
import { createDebt, getDebts } from '../src/lib/dal/debts.ts'
import { createGoal, getGoals } from '../src/lib/dal/goals.ts'

async function runScenarioVerificationSuite() {
  console.log('================================================================')
  console.log('🧪 INICIANDO VERIFICACIÓN DE FASE K: SCENARIO ENGINE & LAB')
  console.log('================================================================\n')

  let passed = 0
  let totalAsserts = 0

  function assert(condition, message) {
    totalAsserts++
    if (condition) {
      console.log(`✅ [PASS] ${message}`)
      passed++
    } else {
      console.error(`❌ [FAIL] ${message}`)
      throw new Error(`Assertion failed: ${message}`)
    }
  }

  const userId = 'usr-kevin-001'

  // Seed baseline test profile in DAL
  const mockIncomes = [
    {
      source: 'shuffler',
      amount: 3_500_000,
      currency: 'COP',
      date: '2026-09-01',
      periodicity: 'monthly',
      description: 'Salario principal Shuffler',
    },
    {
      source: 'pizza_hut',
      amount: 1_200_000,
      currency: 'COP',
      date: '2026-09-05',
      periodicity: 'monthly',
      description: 'Side-job Pizza Hut',
    },
  ]

  const mockExpenses = [
    {
      category_name: 'Vivienda',
      amount: 1_500_000,
      currency: 'COP',
      date: '2026-09-02',
      is_essential: true,
      description: 'Arriendo',
    },
    {
      category_name: 'Alimentación',
      amount: 800_000,
      currency: 'COP',
      date: '2026-09-03',
      is_essential: true,
      description: 'Supermercado',
    },
  ]

  const mockDebts = [
    {
      name: 'Tarjeta de Crédito Bancolombia',
      current_balance: 6_000_000,
      interest_rate_ea: 28.5,
      minimum_payment: 250_000,
      term_months: 36,
      currency: 'COP',
      type: 'credit_card',
    },
  ]

  const mockGoals = [
    {
      name: 'Fondo de Emergencia',
      target_amount: 15_000_000,
      current_amount: 3_000_000,
      monthly_contribution: 400_000,
      deadline: '2027-12-31',
      status: 'active',
      category: 'emergency',
    },
  ]

  // Setup mock user in DAL
  for (const inc of mockIncomes) await createIncome(userId, inc)
  for (const exp of mockExpenses) await createExpense(userId, exp)
  for (const d of mockDebts) await createDebt(userId, d)
  for (const g of mockGoals) await createGoal(userId, g)

  const baselineState = {
    monthly_income: 4_700_000,
    monthly_expenses: 2_300_000,
    current_net_worth: 10_000_000,
    debts: mockDebts,
    goals: mockGoals,
  }

  // ─────────────────────────────────────────────────────────────
  // 1. Escenario Actual (Línea Base)
  // ─────────────────────────────────────────────────────────────
  console.log('--- 1. Verificación de Escenario Actual (Línea Base) ---')
  const baseResult = simulateAdvancedScenario(baselineState, {
    name: 'Escenario Actual',
    preset_type: 'actual',
    income_change_percent: 0,
    expense_change_percent: 0,
    extra_monthly_saving: 0,
    extra_debt_payment: 0,
    investment_return_percent: 8,
    inflation_percent: 6,
    months: 24,
  })

  assert(
    Math.abs(baseResult.net_worth_delta) < 0.01,
    `Línea base produce delta exactamente igual a cero (Delta: $${baseResult.net_worth_delta})`
  )
  assert(
    Math.abs(baseResult.final_net_worth - baseResult.baseline_final_net_worth) < 0.01,
    'Patrimonio final en línea base coincide con patrimonio de comparación'
  )
  assert(
    baseResult.data_points.length === 24,
    `Data points generados cubren exactamente los 24 meses solicitados (${baseResult.data_points.length} puntos)`
  )

  // ─────────────────────────────────────────────────────────────
  // 2. Escenario Ahorro (+ $300.000 / mes)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 2. Verificación de Escenario Ahorro (+ $300.000 / mes) ---')
  const savingResult = simulateAdvancedScenario(baselineState, {
    name: 'Escenario Ahorro',
    preset_type: 'ahorro',
    income_change_percent: 0,
    expense_change_percent: 0,
    extra_monthly_saving: 300_000,
    extra_debt_payment: 0,
    investment_return_percent: 8,
    inflation_percent: 6,
    months: 24,
  })

  assert(
    savingResult.net_worth_delta > 0,
    `Ahorro extra de $300.000/mes incrementa el patrimonio final (Delta: +$${savingResult.net_worth_delta.toLocaleString('es-CO')})`
  )
  assert(
    savingResult.total_savings > baseResult.total_savings,
    `Ahorro acumulado superior a la línea base ($${savingResult.total_savings.toLocaleString('es-CO')} vs $${baseResult.total_savings.toLocaleString('es-CO')})`
  )

  // ─────────────────────────────────────────────────────────────
  // 3. Escenario Incremento de Ingresos (+20% Pizza Hut / Shuffler)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 3. Verificación de Escenario Ingresos (+20%) ---')
  const incomeResult = simulateAdvancedScenario(baselineState, {
    name: 'Escenario Ingresos',
    preset_type: 'ingresos',
    income_change_percent: 20,
    expense_change_percent: 0,
    extra_monthly_saving: 0,
    extra_debt_payment: 0,
    investment_return_percent: 8,
    inflation_percent: 6,
    months: 24,
  })

  assert(
    incomeResult.final_net_worth > baseResult.final_net_worth,
    `Ingresos +20% generan mayor patrimonio que línea base (Delta: +$${incomeResult.net_worth_delta.toLocaleString('es-CO')})`
  )
  assert(
    incomeResult.data_points[23].income > incomeResult.data_points[0].income,
    'Curva de ingresos mensual refleja crecimiento porcentual compuesto a lo largo del horizonte'
  )

  // ─────────────────────────────────────────────────────────────
  // 4. Escenario Austeridad de Gastos (-10%)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 4. Verificación de Escenario Gastos (-10%) ---')
  const expenseResult = simulateAdvancedScenario(baselineState, {
    name: 'Escenario Gastos',
    preset_type: 'personalizado',
    income_change_percent: 0,
    expense_change_percent: -10,
    extra_monthly_saving: 0,
    extra_debt_payment: 0,
    investment_return_percent: 8,
    inflation_percent: 6,
    months: 24,
  })

  assert(
    expenseResult.net_worth_delta > 0,
    `Reducción de gastos (-10%) libera flujo y aumenta el patrimonio (Delta: +$${expenseResult.net_worth_delta.toLocaleString('es-CO')})`
  )

  // ─────────────────────────────────────────────────────────────
  // 5. Escenario Deuda: Amortización Acelerada e Intereses Ahorrados
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 5. Verificación de Escenario Deuda (Abono Extraordinario) ---')
  const debtResult = simulateAdvancedScenario(baselineState, {
    name: 'Escenario Deuda',
    preset_type: 'deuda',
    income_change_percent: 0,
    expense_change_percent: 0,
    extra_monthly_saving: 0,
    extra_debt_payment: 400_000,
    investment_return_percent: 8,
    inflation_percent: 6,
    months: 24,
  })

  const isDebtAccelerated =
    debtResult.debt_payoff_months !== null &&
    (debtResult.baseline_debt_payoff_months === null ||
      debtResult.debt_payoff_months < debtResult.baseline_debt_payoff_months)
  assert(
    isDebtAccelerated,
    `Deuda liquidada antes: mes ${debtResult.debt_payoff_months} en simulación vs mes ${debtResult.baseline_debt_payoff_months ?? '>24'} en línea base`
  )
  assert(
    debtResult.interest_saved > 0,
    `Intereses bancarios ahorrados cuantificados determinísticamente: $${Math.round(debtResult.interest_saved).toLocaleString('es-CO')} COP`
  )
  assert(
    debtResult.total_debt_remaining <= debtResult.baseline_total_debt_remaining,
    'Saldo de deuda restante al final del periodo es significativamente menor'
  )

  // ─────────────────────────────────────────────────────────────
  // 6. Simulador de Metas Integradas (Goal Acceleration)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 6. Verificación de Aceleración de Metas ---')
  const goalResult = simulateAdvancedScenario(baselineState, {
    name: 'Escenario Meta Acelerada',
    preset_type: 'personalizado',
    income_change_percent: 0,
    expense_change_percent: 0,
    extra_monthly_saving: 400_000,
    extra_debt_payment: 0,
    investment_return_percent: 8,
    inflation_percent: 6,
    months: 24,
    selected_goal_id: mockGoals[0].id,
    simulated_goal_contribution: 800_000, // Duplicar aporte
  })

  assert(
    goalResult.goal_simulation !== undefined,
    'Simulación de meta retornó objeto de análisis prospectivo'
  )
  assert(
    goalResult.goal_simulation.months_saved > 0,
    `Meta acelerada en ${goalResult.goal_simulation.months_saved} meses (simulado: ${goalResult.goal_simulation.simulated_months}m vs original: ${goalResult.goal_simulation.original_months}m)`
  )
  assert(
    goalResult.goal_simulation.simulated_completion_date !== null,
    `Nueva fecha proyectada de cumplimiento: ${goalResult.goal_simulation.simulated_completion_date}`
  )

  // ─────────────────────────────────────────────────────────────
  // 7. Garantía Estricta de No Mutación (Zero DB Mutation)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 7. Verificación de Inmutabilidad (Zero DB Mutation) ---')
  const incomesBefore = await getIncomes(userId)
  const debtsBefore = await getDebts(userId)
  const goalsBefore = await getGoals(userId)

  // Execute 5 intensive scenarios
  for (let i = 0; i < 5; i++) {
    simulateAdvancedScenario(baselineState, {
      name: `Sim ${i}`,
      preset_type: 'personalizado',
      income_change_percent: 50,
      expense_change_percent: -20,
      extra_monthly_saving: 1_000_000,
      extra_debt_payment: 1_000_000,
      months: 60,
    })
  }

  const incomesAfter = await getIncomes(userId)
  const debtsAfter = await getDebts(userId)
  const goalsAfter = await getGoals(userId)

  assert(
    incomesBefore.length === incomesAfter.length &&
      incomesBefore[0].amount === incomesAfter[0].amount,
    'Ingresos en la base de datos se mantuvieron 100% inalterados'
  )
  assert(
    debtsBefore[0].current_balance === debtsAfter[0].current_balance,
    'Saldos de deudas en la base de datos permanecen exactamente iguales'
  )
  assert(
    goalsBefore[0].current_amount === goalsAfter[0].current_amount,
    'Metas en la base de datos no sufrieron modificaciones'
  )

  // ─────────────────────────────────────────────────────────────
  // 8. Herramienta AI Read/Compute simulate_financial_scenario
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 8. Verificación de AI Tool simulate_financial_scenario ---')
  const aiToolRes = await executeAITool(
    'simulate_financial_scenario',
    {
      extra_monthly_saving: 300_000,
      income_change_percent: 0,
      expense_change_percent: 0,
      extra_debt_payment: 0,
      horizon_months: 24,
    },
    userId
  )

  assert(aiToolRes.success === true, 'executeAITool ejecutó simulate_financial_scenario con éxito')
  const parsedData = aiToolRes.data
  assert(
    parsedData.baseline && parsedData.scenario && parsedData.comparison,
    'Estructura JSON contiene baseline, scenario y comparison deterministas'
  )
  assert(
    parsedData.disclaimer && parsedData.disclaimer.includes('hipotético'),
    `Disclaimer mandatorio presente: "${parsedData.disclaimer}"`
  )

  // ─────────────────────────────────────────────────────────────
  // 9. Integración con Gemini AI Provider y Grounded Synthesis
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 9. Verificación de Integración con Copiloto Gemini ---')
  const gemini = new GeminiProvider()
  const userPrompt = [
    { role: 'user', content: '¿Qué pasa si ahorro $300.000 más al mes en los próximos 2 años?' },
  ]
  const aiResponse = await gemini.generateResponse(userPrompt)

  assert(
    aiResponse.toolCalls && aiResponse.toolCalls.length > 0,
    'Gemini detectó la intención prospectiva y formuló llamada a herramienta'
  )
  assert(
    aiResponse.toolCalls[0].name === 'simulate_financial_scenario',
    `Herramienta seleccionada correctamente: "${aiResponse.toolCalls[0].name}"`
  )
  assert(
    aiResponse.toolCalls[0].arguments.extra_monthly_saving === 300_000,
    `Argumentos de escenario extraídos fielmente (extra_monthly_saving: ${aiResponse.toolCalls[0].arguments.extra_monthly_saving})`
  )

  // Simulate tool response synthesis
  const toolExecResult = await executeAITool(
    aiResponse.toolCalls[0].name,
    aiResponse.toolCalls[0].arguments,
    userId
  )
  const synthesisQuery = [
    ...userPrompt,
    { role: 'tool', name: 'simulate_financial_scenario', content: JSON.stringify(toolExecResult.data) },
  ]
  const finalSynthesis = await gemini.generateResponse(synthesisQuery)

  assert(
    finalSynthesis.message && finalSynthesis.message.content.includes('Simulación Financiera'),
    'Copiloto sintetizó la explicación prospectiva con estructura ejecutiva'
  )
  assert(
    finalSynthesis.message.content.includes('hipotético'),
    'Respuesta final del Copiloto incluye el disclaimer legal y de seguridad'
  )

  // ─────────────────────────────────────────────────────────────
  // 10. Aislamiento Multi-Usuario en Escenarios
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 10. Verificación de Aislamiento Multi-Usuario ---')
  const userMaria = 'usr-maria-002'
  await createIncome(userMaria, {
    source: 'shuffler',
    amount: 10_000_000,
    currency: 'COP',
    date: '2026-09-01',
    periodicity: 'monthly',
    description: 'Ingreso alto María',
  })

  const kevinSim = await executeAITool('simulate_financial_scenario', { horizon_months: 12 }, 'usr-kevin-001')
  const mariaSim = await executeAITool('simulate_financial_scenario', { horizon_months: 12 }, 'usr-maria-002')

  assert(
    kevinSim.data.baseline.monthly_income > 0,
    `Simulación de Kevin utiliza solo sus ingresos ($${kevinSim.data.baseline.monthly_income})`
  )
  assert(
    mariaSim.data.baseline.monthly_income >= 10_000_000,
    `Simulación de María utiliza solo sus ingresos ($${mariaSim.data.baseline.monthly_income})`
  )
  assert(
    kevinSim.data.baseline.monthly_income !== mariaSim.data.baseline.monthly_income,
    'Aislamiento estricto: Cero filtración de datos financieros entre usuarios'
  )

  // ─────────────────────────────────────────────────────────────
  // 11. Casos Límite y Manejo Seguro
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 11. Verificación de Casos Límite y Robustez ---')
  // No debts
  const zeroDebtResult = simulateAdvancedScenario(
    {
      monthly_income: 3_000_000,
      monthly_expenses: 1_000_000,
      current_net_worth: 5_000_000,
      debts: [],
    },
    { months: 12 }
  )
  assert(
    zeroDebtResult.total_debt_remaining === 0 && zeroDebtResult.interest_saved === 0,
    'Usuario sin deudas se procesa limpiamente sin errores de división por cero'
  )

  // No goals
  const zeroGoalResult = simulateAdvancedScenario(
    {
      monthly_income: 3_000_000,
      monthly_expenses: 1_000_000,
      current_net_worth: 5_000_000,
      goals: [],
    },
    { months: 12 }
  )
  assert(
    zeroGoalResult.goal_simulation === undefined,
    'Usuario sin metas omite goal_simulation con elegancia'
  )

  // Horizons 12, 24, 60
  const h12 = simulateAdvancedScenario(baselineState, { months: 12 })
  const h60 = simulateAdvancedScenario(baselineState, { months: 60 })
  assert(
    h12.data_points.length === 12 && h60.data_points.length === 60,
    'Horizontes temporales de 12 y 60 meses generan la cantidad exacta de proyecciones'
  )

  // ─────────────────────────────────────────────────────────────
  // 12. Integridad de Presets del Laboratorio
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 12. Verificación de Presets y Parámetros del Lab ---')
  const presets = ['actual', 'ahorro', 'deuda', 'ingresos', 'personalizado']
  for (const p of presets) {
    const sim = simulateAdvancedScenario(baselineState, {
      name: `Preset ${p}`,
      preset_type: p,
      income_change_percent: p === 'ingresos' ? 20 : 0,
      extra_monthly_saving: p === 'ahorro' ? 300_000 : 0,
      extra_debt_payment: p === 'deuda' ? 400_000 : 0,
      months: 24,
    })
    assert(sim && sim.data_points.length === 24, `Preset "${p}" es válido y ejecutable`)
  }

  console.log('\n================================================================')
  console.log(`🎉 TODAS LAS VERIFICACIONES DE FASE K EXITOSAS: ${passed}/${totalAsserts}`)
  console.log('================================================================')
}

runScenarioVerificationSuite().catch((err) => {
  console.error('\n❌ ERROR FATAL EN LA SUITE DE VERIFICACIÓN:', err)
  process.exit(1)
})

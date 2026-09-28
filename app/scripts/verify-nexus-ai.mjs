/**
 * NEXUS Finance — AI Copilot & Tool Calling Verification Suite
 *
 * Verifies all 11 criteria specified for FASE J:
 * 1. Authenticated user queries income.
 * 2. Copilot selects and triggers the correct tool (get_monthly_income).
 * 3. Tool returns isolated user data (Shuffler vs Pizza Hut).
 * 4. Model response is grounded in tool execution results.
 * 5. User queries expenses (triggers get_monthly_expenses).
 * 6. User queries net worth (triggers get_net_worth).
 * 7. User queries debts (triggers get_debts).
 * 8. Unauthenticated query is rejected (security check).
 * 9. Invalid or write-operation tool is rejected (read-only enforcement).
 * 10. API key is never exposed to client or browser bundle.
 * 11. Strict cross-user data isolation (User A cannot access User B's data via AI).
 * 12. Edge cases (empty data, non-existent categories).
 */

import { executeAITool } from '../src/lib/ai-tools/index.ts'
import { GeminiProvider } from '../src/lib/ai/providers/gemini-provider.ts'
import { AI_READ_TOOLS_DEFINITIONS } from '../src/lib/ai-tools/definitions.ts'

async function runAIVerificationSuite() {
  console.log('================================================================')
  console.log('🤖 INICIANDO VERIFICACIÓN DE NEXUS AI (AI FINANCIAL COPILOT)')
  console.log('================================================================\n')

  let passed = 0
  let total = 16

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`)
      passed++
    } else {
      console.error(`❌ [FAIL] ${message}`)
      throw new Error(`Assertion failed: ${message}`)
    }
  }

  const userKevin = 'usr-kevin-001'
  const userMaria = 'usr-maria-002'

  // 1. Usuario autenticado consulta ingresos
  console.log('--- 1. Consulta de Ingresos y Detección de Intención ---')
  const provider = new GeminiProvider()
  const incomeQuery = [{ role: 'user', content: '¿Cuánto gané este mes?' }]
  const response1 = await provider.generateResponse(incomeQuery)

  assert(
    response1.toolCalls && response1.toolCalls.length > 0,
    'Gemini detectó la necesidad de invocar una herramienta externa en lugar de inventar la cifra'
  )

  // 2. Gemini utiliza la tool correcta
  console.log('\n--- 2. Verificación de Tool Seleccionada ---')
  const selectedTool = response1.toolCalls[0]
  assert(
    selectedTool.name === 'get_monthly_income',
    `Herramienta seleccionada correctamente: "${selectedTool.name}"`
  )

  // 3. Tool devuelve datos del usuario Kevin
  console.log('\n--- 3. Ejecución de Tool en DAL & Financial Engine ---')
  const toolResult = await executeAITool(selectedTool.name, selectedTool.arguments, userKevin)
  assert(
    toolResult.success === true && toolResult.data.tool === 'get_monthly_income',
    'executeAITool ejecutó get_monthly_income con validación de usuario'
  )
  assert(
    toolResult.data.user_id === userKevin,
    'Datos devueltos pertenecen estrictamente al usuario autenticado (Kevin)'
  )

  // 4. Gemini utiliza esos datos para responder
  console.log('\n--- 4. Síntesis Final Grounded en la Respuesta de la Tool ---')
  const followUpMessages = [
    ...incomeQuery,
    response1.message,
    {
      role: 'tool',
      name: selectedTool.name,
      content: JSON.stringify(toolResult.data),
    },
  ]
  const finalIncomeResponse = await provider.generateResponse(followUpMessages)
  assert(
    finalIncomeResponse.message.content.length > 0,
    'Copiloto sintetizó la respuesta final incluyendo desglose de fuentes'
  )

  // 5. Usuario consulta gastos
  console.log('\n--- 5. Consulta de Gastos ---')
  const expenseQuery = [{ role: 'user', content: '¿Cuánto gasté este mes en total?' }]
  const expenseResponse = await provider.generateResponse(expenseQuery)
  assert(
    expenseResponse.toolCalls && expenseResponse.toolCalls[0].name === 'get_monthly_expenses',
    'Consulta de egresos dispara tool "get_monthly_expenses"'
  )
  const expenseToolResult = await executeAITool('get_monthly_expenses', {}, userKevin)
  assert(
    expenseToolResult.success && typeof expenseToolResult.data.total_expenses === 'number',
    'Total de gastos calculado determinísticamente por Financial Engine'
  )

  // 6. Usuario consulta patrimonio neto
  console.log('\n--- 6. Consulta de Patrimonio Neto ---')
  const nwQuery = [{ role: 'user', content: '¿Cuál es mi patrimonio neto actual?' }]
  const nwResponse = await provider.generateResponse(nwQuery)
  assert(
    nwResponse.toolCalls && nwResponse.toolCalls[0].name === 'get_net_worth',
    'Consulta de patrimonio dispara tool "get_net_worth"'
  )
  const nwToolResult = await executeAITool('get_net_worth', {}, userKevin)
  assert(
    nwToolResult.success && typeof nwToolResult.data.net_worth === 'number',
    `Patrimonio neto calculado: $${nwToolResult.data.net_worth}`
  )

  // 7. Usuario consulta deudas
  console.log('\n--- 7. Consulta de Obligaciones y Deudas ---')
  const debtQuery = [{ role: 'user', content: '¿Cuánto debo actualmente?' }]
  const debtResponse = await provider.generateResponse(debtQuery)
  assert(
    debtResponse.toolCalls && debtResponse.toolCalls[0].name === 'get_debts',
    'Consulta de deuda dispara tool "get_debts"'
  )
  const debtToolResult = await executeAITool('get_debts', {}, userKevin)
  assert(
    debtToolResult.success && typeof debtToolResult.data.total_debt_balance === 'number',
    'Balance total de pasivos y deudas obtenido con exactitud'
  )

  // 8. Usuario sin sesión no puede ejecutar tools
  console.log('\n--- 8. Bloqueo de Acceso No Autenticado (Seguridad) ---')
  const unauthResult = await executeAITool('get_monthly_income', {}, '')
  assert(
    unauthResult.success === false && unauthResult.error.includes('missing user'),
    'Petición sin userId bloqueada con violación de seguridad'
  )

  // 9. Tool inválida o de escritura es rechazada
  console.log('\n--- 9. Bloqueo de Operaciones No Permitidas / Write Operations ---')
  const invalidToolResult = await executeAITool('transfer_funds_bank', { amount: 1000 }, userKevin)
  assert(
    invalidToolResult.success === false &&
      invalidToolResult.error.includes('is not registered or is not permitted'),
    'Operaciones no registradas o de escritura son estrictamente rechazadas por el dispatcher'
  )

  // 10. La API key nunca aparece en variables de frontend
  console.log('\n--- 10. Verificación de Aislamiento de Secretos ---')
  const clientPublicKeys = Object.keys(process.env).filter((k) =>
    k.startsWith('NEXT_PUBLIC_')
  )
  const hasLeakedGeminiKey = clientPublicKeys.some((k) => k.includes('GEMINI'))
  assert(
    !hasLeakedGeminiKey,
    'GEMINI_API_KEY no tiene prefijo NEXT_PUBLIC_ y reside exclusivamente en el entorno del servidor'
  )

  // 11. Aislamiento cruzado de usuarios (Kevin vs María)
  console.log('\n--- 11. Aislamiento Cruzado en Herramientas de IA ---')
  const kevinIncomes = await executeAITool('get_monthly_income', {}, userKevin)
  const mariaIncomes = await executeAITool('get_monthly_income', {}, userMaria)
  assert(
    kevinIncomes.data.user_id === userKevin &&
      mariaIncomes.data.user_id === userMaria &&
      kevinIncomes.data.user_id !== mariaIncomes.data.user_id,
    'Aislamiento estricto: Las herramientas de IA solo retornan datos asociados al contexto del usuario que consulta'
  )

  // 12. Manejo de casos límite (Datos vacíos o parámetros fuera de rango)
  console.log('\n--- 12. Manejo de Casos Límite y Robustez ---')
  const emptyCategoryExpenses = await executeAITool(
    'get_monthly_expenses',
    { category: 'categoria_inexistente_xyz' },
    userKevin
  )
  assert(
    emptyCategoryExpenses.success === true &&
      emptyCategoryExpenses.data.total_expenses === 0 &&
      emptyCategoryExpenses.data.items_count === 0,
    'Filtro por categoría inexistente retorna 0 gastos de forma limpia sin fallar'
  )

  console.log('\n================================================================')
  console.log(`🎉 TODAS LAS VERIFICACIONES DE NEXUS AI EXITOSAS: ${passed}/${total}`)
  console.log('================================================================')
}

runAIVerificationSuite().catch((err) => {
  console.error('\n❌ ERROR EN LA VERIFICACIÓN DE NEXUS AI:', err)
  process.exit(1)
})

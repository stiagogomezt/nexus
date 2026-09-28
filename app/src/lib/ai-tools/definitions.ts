/**
 * NEXUS Finance — AI Tool Definitions & Function Schemas
 * Standard schema format compatible with Gemini API and OpenAI Function Calling.
 */

export interface ToolDefinition {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
  type: 'READ_ONLY'
}

export const AI_READ_TOOLS_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'get_monthly_income',
    description:
      'Consulta los ingresos del usuario en un mes y año específicos, desglosados por fuente laboral (Shuffler, Pizza Hut, u otros) y montos totales calculados de manera determinista.',
    type: 'READ_ONLY',
    parameters: {
      type: 'object',
      properties: {
        month: {
          type: 'integer',
          description: 'Número de mes (1 para Enero, 12 para Diciembre). Opcional, por defecto mes actual.',
        },
        year: {
          type: 'integer',
          description: 'Año de cuatro dígitos (ej. 2026). Opcional, por defecto año actual.',
        },
      },
    },
  },
  {
    name: 'get_monthly_expenses',
    description:
      'Consulta los gastos del usuario en un mes y año específicos, clasificados por categoría y proporción esencial vs no esencial.',
    type: 'READ_ONLY',
    parameters: {
      type: 'object',
      properties: {
        month: {
          type: 'integer',
          description: 'Número de mes (1 al 12). Opcional.',
        },
        year: {
          type: 'integer',
          description: 'Año (ej. 2026). Opcional.',
        },
        category: {
          type: 'string',
          description: 'Nombre de la categoría a filtrar (ej. alimentacion, vivienda, transporte). Opcional.',
        },
      },
    },
  },
  {
    name: 'get_cash_flow',
    description:
      'Calcula el flujo de caja neto mensual (ingresos menos gastos reales) y la tasa de ahorro del periodo.',
    type: 'READ_ONLY',
    parameters: {
      type: 'object',
      properties: {
        month: {
          type: 'integer',
          description: 'Número de mes (1 al 12). Opcional.',
        },
        year: {
          type: 'integer',
          description: 'Año (ej. 2026). Opcional.',
        },
      },
    },
  },
  {
    name: 'get_budgets',
    description:
      'Obtiene el estado de los presupuestos configurados vs el gasto real ejecutado por categoría, indicando montos disponibles y alertas de sobregasto.',
    type: 'READ_ONLY',
    parameters: {
      type: 'object',
      properties: {
        month: {
          type: 'integer',
          description: 'Mes a evaluar (1 al 12). Opcional.',
        },
        year: {
          type: 'integer',
          description: 'Año a evaluar. Opcional.',
        },
      },
    },
  },
  {
    name: 'get_goals',
    description:
      'Obtiene las metas de ahorro o inversión del usuario, con porcentaje de progreso actual, monto acumulado y faltante.',
    type: 'READ_ONLY',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_debts',
    description:
      'Obtiene la lista de obligaciones crediticias y deudas pendientes, tasas de interés y pagos mínimos mensuales.',
    type: 'READ_ONLY',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_net_worth',
    description:
      'Calcula el patrimonio neto total del usuario (Total Activos - Total Pasivos y Deudas).',
    type: 'READ_ONLY',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_accounts',
    description:
      'Obtiene las cuentas bancarias o financieras registradas por el usuario y sus saldos actuales.',
    type: 'READ_ONLY',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'simulate_financial_scenario',
    description:
      'Simula escenarios financieros hipotéticos ("¿Qué pasa si ahorro más?", "¿Qué pasa si mis ingresos aumentan?", "¿Qué pasa si destino dinero a mi deuda?"). Calcula proyecciones patrimoniales, meses de liquidación de deuda e intereses ahorrados de forma determinista SIN modificar datos reales.',
    type: 'READ_ONLY',
    parameters: {
      type: 'object',
      properties: {
        extra_monthly_saving: {
          type: 'number',
          description: 'Aporte de ahorro mensual adicional en moneda local (ej. 300000). Opcional.',
        },
        income_change_percent: {
          type: 'number',
          description: 'Porcentaje de cambio en ingresos mensuales (ej. 10 para +10%, 20 para +20%). Opcional.',
        },
        expense_change_percent: {
          type: 'number',
          description: 'Porcentaje de cambio en gastos mensuales (ej. -10 para reducción del 10%). Opcional.',
        },
        extra_debt_payment: {
          type: 'number',
          description: 'Monto mensual adicional destinado exclusivamente a pago acelerado de deudas (ej. 400000). Opcional.',
        },
        horizon_months: {
          type: 'integer',
          description: 'Horizonte de proyección en meses (ej. 12, 24, 60). Opcional, por defecto 24.',
        },
        target_goal_name: {
          type: 'string',
          description: 'Nombre de la meta a evaluar (ej. Fondo de Emergencia). Opcional.',
        },
        simulated_goal_contribution: {
          type: 'number',
          description: 'Nuevo aporte mensual simulado para la meta. Opcional.',
        },
      },
    },
  },
  {
    name: 'get_crypto_summary',
    description:
      'Obtiene un resumen consolidado del patrimonio en criptomonedas del usuario (valor total en USD y COP, PnL no realizado, variación 24h, peso porcentual dentro del patrimonio neto total, conteo de posiciones y billeteras activas).',
    type: 'READ_ONLY',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_wallets',
    description:
      'Consulta la lista de billeteras públicas on-chain registradas por el usuario (red, blockchain EVM/Solana, dirección abreviada, etiqueta y estado). Es estrictamente de sólo lectura.',
    type: 'READ_ONLY',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_wallet_balance',
    description:
      'Obtiene el balance on-chain y desglose de tokens de una billetera pública específica mediante su ID o dirección, consultando saldos de sólo lectura en tiempo real sin requerir claves privadas.',
    type: 'READ_ONLY',
    parameters: {
      type: 'object',
      properties: {
        wallet_id: {
          type: 'string',
          description: 'ID de la billetera registrada. Opcional.',
        },
        address: {
          type: 'string',
          description: 'Dirección pública de la billetera. Opcional.',
        },
      },
    },
  },
  {
    name: 'get_crypto_portfolio',
    description:
      'Obtiene el desglose detallado de todas las posiciones de criptomonedas (BTC, ETH, SOL, USDC, etc.), precios de mercado actuales, precio de adquisición, cantidad total, valor en COP/USD, PnL no realizado y distribución porcentual del portafolio. Permite filtrar por un símbolo específico (ej. SOL, BTC).',
    type: 'READ_ONLY',
    parameters: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Símbolo del activo a consultar en mayúsculas (ej. "SOL", "BTC", "ETH"). Opcional.',
        },
      },
    },
  },
  {
    name: 'get_bank_accounts',
    description:
      'Consulta las cuentas bancarias registradas o sincronizadas del usuario (Bancolombia, Nequi, Nu Colombia, Davivienda, etc.), incluyendo nombre, entidad, tipo de cuenta, número enmascarado y saldo disponible. Estrictamente de sólo lectura.',
    type: 'READ_ONLY',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_bank_balances',
    description:
      'Obtiene un resumen consolidado de los saldos bancarios del usuario en COP, con desglose agrupado por institución financiera y por tipo de cuenta (ahorros, corriente, billetera digital).',
    type: 'READ_ONLY',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_bank_transactions',
    description:
      'Consulta el historial de movimientos y transacciones bancarias normalizadas del usuario. Permite filtrar opcionalmente por cuenta, rango de fechas y tipo (income, expense, transfer, adjustment). Identifica transferencias internas y comercios limpios.',
    type: 'READ_ONLY',
    parameters: {
      type: 'object',
      properties: {
        account_id: {
          type: 'string',
          description: 'ID de la cuenta bancaria específica. Opcional.',
        },
        startDate: {
          type: 'string',
          description: 'Fecha inicial en formato YYYY-MM-DD. Opcional.',
        },
        endDate: {
          type: 'string',
          description: 'Fecha final en formato YYYY-MM-DD. Opcional.',
        },
        transaction_type: {
          type: 'string',
          description: 'Tipo de transacción ("income", "expense", "transfer", "adjustment"). Opcional.',
        },
        limit: {
          type: 'integer',
          description: 'Número máximo de transacciones a retornar (por defecto 50). Opcional.',
        },
      },
    },
  },
  {
    name: 'get_bank_cash_flow',
    description:
      'Calcula el flujo de caja bancario real en un período determinado. Separa los ingresos y gastos reales del volumen de transferencias internas entre cuentas propias del usuario, evitando doble conteo.',
    type: 'READ_ONLY',
    parameters: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          description: 'Fecha inicial en formato YYYY-MM-DD. Opcional.',
        },
        endDate: {
          type: 'string',
          description: 'Fecha final en formato YYYY-MM-DD. Opcional.',
        },
      },
    },
  },
  {
    name: 'get_bank_connections',
    description:
      'Consulta las conexiones activas de Open Finance del usuario con entidades financieras colombianas, su estado de consentimiento, permisos/scopes otorgados y fecha de última sincronización.',
    type: 'READ_ONLY',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_financial_state',
    description:
      'Consulta el estado financiero consolidado y completo del usuario (Financial Digital Twin). Retorna un informe unificado con ingresos (Shuffler vs Pizza Hut), gastos, flujo de caja, liquidez y meses de cobertura, deudas, metas, criptoactivos, cuentas bancarias y patrimonio neto sin duplicación.',
    type: 'READ_ONLY',
    parameters: {
      type: 'object',
      properties: {
        month: {
          type: 'integer',
          description: 'Número de mes específico (1-12). Opcional, por defecto mes actual.',
        },
        year: {
          type: 'integer',
          description: 'Año específico (ej. 2026). Opcional, por defecto año actual.',
        },
      },
    },
  },
  {
    name: 'get_recent_financial_events',
    description:
      'Consulta los eventos financieros detectados recientemente para el usuario (cambios de ingresos, aumentos de gastos, anomalías, alertas de presupuesto, variaciones en deudas, cripto o liquidez).',
    type: 'READ_ONLY',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Categoría a filtrar: income, expense, debt, goal, liquidity, net_worth, crypto, investment, banking, budget, betting. Opcional.',
        },
        severity: {
          type: 'string',
          description: 'Severidad a filtrar: INFO, WARNING, CRITICAL. Opcional.',
        },
        limit: {
          type: 'integer',
          description: 'Número máximo de eventos a retornar (por defecto 20). Opcional.',
        },
      },
    },
  },
  {
    name: 'get_active_alerts',
    description:
      'Obtiene las alertas financieras activas o no leídas del Alert Center clasificadas por severidad (INFO, WARNING, CRITICAL) con valores cuantitativos y deltas.',
    type: 'READ_ONLY',
    parameters: {
      type: 'object',
      properties: {
        severity: {
          type: 'string',
          description: 'Filtrar por severidad: INFO, WARNING, CRITICAL. Opcional.',
        },
        status: {
          type: 'string',
          description: 'Filtrar por estado: UNREAD, READ, DISMISSED, ALL (por defecto UNREAD). Opcional.',
        },
      },
    },
  },
  {
    name: 'get_financial_insights',
    description:
      'Obtiene explicaciones e interpretaciones financieras estructuradas que diferencian estrictamente entre DATO factual, CAMBIO cuantitativo e INTERPRETACIÓN grounded sin falsas causalidades.',
    type: 'READ_ONLY',
    parameters: {
      type: 'object',
      properties: {
        area: {
          type: 'string',
          description: 'Área específica a consultar: net_worth, liquidity, income, crypto, betting, debt, goal, budget. Opcional.',
        },
      },
    },
  },
  {
    name: 'get_financial_changes',
    description:
      'Obtiene los cambios cuantitativos del usuario comparando el estado actual con el período anterior (mes anterior, 2 meses atrás, año anterior).',
    type: 'READ_ONLY',
    parameters: {
      type: 'object',
      properties: {
        benchmark: {
          type: 'string',
          description: 'Período de referencia: previous_month, two_months_ago, previous_year (por defecto previous_month). Opcional.',
        },
      },
    },
  },
  {
    name: 'get_copilot_context',
    description:
      'Obtiene el contexto proactivo integral del copiloto NEXUS (estado financiero, cambios, alertas activas, metas, deudas, presupuestos, cripto, bancos y apuestas).',
    type: 'READ_ONLY',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_nexus_today',
    description:
      'Obtiene el resumen ejecutivo "NEXUS TODAY" con estado actual (patrimonio, liquidez, flujo), cambios clave, alertas destacadas y qué debería revisar el usuario.',
    type: 'READ_ONLY',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'explain_financial_change',
    description:
      'Genera una explicación estructurada en formato DATO -> CAMBIO -> CONTEXTO -> ESCENARIO para una métrica o variación financiera sin asumir causalidad arbitraria.',
    type: 'READ_ONLY',
    parameters: {
      type: 'object',
      properties: {
        metric: {
          type: 'string',
          description: 'Métrica o concepto a explicar (ej. patrimonio, gastos, liquidez, deuda, metas).',
        },
      },
      required: ['metric'],
    },
  },
]



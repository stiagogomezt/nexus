# 💎 NEXUS Finance — Plataforma Maestra de Inteligencia y Gestión Financiera

**NEXUS Finance** es un sistema financiero personal integral de alta fidelidad, diseñado con arquitectura moderna en **Next.js 16 + TypeScript + Supabase**, Dark Mode fintech, glassmorphism, microanimaciones y tipografía avanzada. 

El sistema consolida en tiempo real:
- **Flujos Operativos:** Shuffler Corp (Nómina principal), Pizza Hut (Side job), Gastos por Categoría, Presupuestos y Metas.
- **Patrimonio y Balances:** Open Finance Colombia (Decreto 0368 de 2026 / FAPI 2.0), Extractos bancarios CSV, Portafolio Cripto (CoinMarketCap Live), Billeteras On-Chain (EVM / Solana modo Read-Only).
- **Inteligencia y Prospectiva:** Financial Digital Twin, Event Engine & Alert Center, Scenario Engine (Simulador de decisiones) y NEXUS AI (Copiloto proactivo impulsado por Google Gemini grounded en datos reales).

---

## 🏛️ Arquitectura del Sistema

```
nexus-finance/
├── app/                              # Next.js 16 + TypeScript + Tailwind CSS
│   ├── public/                       # Assets estáticos y logos institucionales
│   ├── scripts/                      # Suites de verificación automatizada (185 tests)
│   │   ├── verify-integration.mjs
│   │   ├── verify-nexus-ai.mjs
│   │   ├── verify-scenario-engine.mjs
│   │   ├── verify-crypto-intelligence.mjs
│   │   ├── verify-banking-intelligence.mjs
│   │   ├── verify-digital-twin.mjs
│   │   ├── verify-financial-intelligence.mjs
│   │   ├── verify-proactive-copilot.mjs
│   │   └── verify-production-readiness.mjs
│   ├── src/
│   │   ├── app/                      # Next.js App Router & API Routes
│   │   │   ├── api/ai/chat/route.ts  # Endpoint AI con Rate Limiting y Validación Bearer Token
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/               # Componentes UI organizados por dominio
│   │   │   ├── layout/               # Header (Indicador En Vivo vs Demo), Sidebar
│   │   │   ├── pages/                # Dashboard, Banking, Crypto, Wallets, Digital Twin, etc.
│   │   │   └── auth/                 # AuthModal (Login, Registro, Recuperación)
│   │   ├── lib/
│   │   │   ├── ai/                   # Adaptadores de IA (Gemini, Prompts, Herramientas)
│   │   │   ├── banking/              # Open Finance FAPI 2.0, CSV Parser, Deduplicador
│   │   │   ├── crypto/               # CoinMarketCap Provider, Validador, Portfolio Aggregator
│   │   │   ├── dal/                  # Data Access Layer con fallback a persistencia local
│   │   │   ├── digital-twin/         # Motor de estados financieros, Snapshots y Métricas
│   │   │   ├── intelligence/         # Event Engine, Detector de Cambios, Alert Center
│   │   │   ├── scenarios/            # Scenario Engine & Financial Laboratory
│   │   │   ├── supabase/             # Clientes cliente/servidor y sesión de usuario
│   │   │   └── wallets/              # Lector público on-chain (EVM y Solana)
│   │   ├── store/                    # Zustand stores (financial.ts, ai-chat.ts)
│   │   └── types/                    # Contratos de TypeScript estrictos
│   ├── .env.example                  # Plantilla documentada de variables de entorno
│   ├── package.json
│   └── tsconfig.json
├── supabase/
│   ├── migrations/                   # 7 migraciones incrementales no destructivas
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_performance_indexes.sql
│   │   ├── 003_crypto_wallets.sql
│   │   ├── 004_banking_intelligence.sql
│   │   ├── 005_digital_twin.sql
│   │   ├── 006_financial_intelligence.sql
│   │   └── 007_proactive_copilot.sql
│   └── seed.sql                      # Categorías iniciales y datos de prueba
├── ARCHITECTURE.md                   # Documentación detallada de arquitectura y flujo de datos
├── SECURITY.md                       # Auditoría de seguridad, modelo de amenazas y RLS
└── README.md
```

---

## ⚡ Requisitos Previos

- **Node.js**: v20.x o superior (desarrollado y probado en Node v24).
- **NPM**: v10.x o superior.
- **Cuenta en Supabase** (Opcional para modo local, requerido para nube persistente).
- **Google Gemini API Key** (Opcional para el copiloto conversacional).

---

## 🚀 Instalación y Puesta en Marcha

### 1. Clonar el repositorio y navegar a `app/`

```bash
cd app
npm install
```

### 2. Configurar Variables de Entorno

Copia la plantilla `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

Edita `.env.local`:

```env
# 1. Supabase Cloud (Públicas, protegidas por RLS)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key

# 2. Secretos de Servidor (NUNCA usar NEXT_PUBLIC_)
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
GEMINI_API_KEY=tu-gemini-api-key

# 3. Datos de Mercado Cripto y Web3 RPC (Opcionales)
COINMARKETCAP_API_KEY=tu-coinmarketcap-key
RPC_URL=https://eth.llamarpc.com
```

> 💡 **Modo Demo / Local:** Si no configuras Supabase inmediatamente, NEXUS funciona al 100% de manera determinista utilizando la capa DAL con persistencia local en tu navegador. El Header indicará claramente `[Modo Demo / Local]` frente a `[Supabase Cloud (En Vivo)]`.

---

## 🗄️ Despliegue en Supabase Cloud

Para inicializar tu base de datos en Supabase Cloud:

1. Ve a tu proyecto en [Supabase Console](https://supabase.com).
2. Dirígete a la sección **SQL Editor**.
3. Ejecuta ordenadamente las migraciones ubicadas en `supabase/migrations/`:
   - `001_initial_schema.sql`: Esquema base (profiles, categories, incomes, expenses, debts, goals, assets, liabilities) con RLS activado.
   - `002_performance_indexes.sql`: Índices compuestos sobre `user_id`, `date` y `category_id`.
   - `003_crypto_wallets.sql`: Modelos de criptoactivos y billeteras públicas on-chain.
   - `004_banking_intelligence.sql`: Conexiones bancarias, consentimientos FAPI 2.0 y transacciones bancarias.
   - `005_digital_twin.sql`: Snapshots multidimensionales del estado financiero y runway.
   - `006_financial_intelligence.sql`: Event Engine, auditoría de eventos y tabla de alertas.
   - `007_proactive_copilot.sql`: Preferencias de notificación y memoria contextual de copiloto.
4. (Opcional) Ejecuta `supabase/seed.sql` para poblar categorías colombianas predeterminadas.

---

## 🧪 Pruebas y Validación Automatizada

NEXUS cuenta con 9 suites de verificación automatizada que ejecutan **185 pruebas** con 100% de éxito:

```bash
# Suite de Preparación para Producción y Auditoría de Seguridad (Fase Q)
npx tsx scripts/verify-production-readiness.mjs

# Todas las suites de regresión
npx tsx scripts/verify-integration.mjs
npx tsx scripts/verify-nexus-ai.mjs
npx tsx scripts/verify-scenario-engine.mjs
npx tsx scripts/verify-crypto-intelligence.mjs
npx tsx scripts/verify-banking-intelligence.mjs
npx tsx scripts/verify-digital-twin.mjs
npx tsx scripts/verify-financial-intelligence.mjs
npx tsx scripts/verify-proactive-copilot.mjs

# Verificación de tipos TypeScript estricto
npx tsc --noEmit

# Compilación de producción
npm run build
```

---

## 🛡️ Principios Contables y de Seguridad

1. **Invariantes del Libro Contable:**
   - Todo ingreso aumenta efectivo operacional.
   - Todo gasto disminuye efectivo operacional.
   - Las transferencias internas entre cuentas propias (ej. Bancolombia a Nequi) son neutralizadas en el flujo de caja y no inflan artificialmente ingresos ni egresos.
   - El pago de deuda reduce el efectivo y disminuye los pasivos en la misma proporción, manteniendo el patrimonio neto neutro en el instante de pago.
   - La revalorización de criptoactivos se contabiliza como PnL no realizado y no como ingreso operativo distribuible.
   - Cero doble contabilización: cuando existen cuentas de Open Finance verificadas o billeteras on-chain, sustituyen automáticamente los registros manuales de la misma categoría.

2. **Seguridad y Privacidad Absoluta:**
   - **Zero Custodia Cripto:** Cero private keys, cero seed phrases, cero permisos de firma o envío de transacciones.
   - **Zero Credenciales Bancarias:** Cero contraseñas, PINs u OTPs. La integración opera exclusivamente mediante OAuth 2.0 PKCE / FAPI 2.0 con redirección a la pasarela bancaria.
   - **AI Segura:** NEXUS AI opera exclusivamente en modo `READ + COMPUTE + SIMULATION`. No tiene capacidad de mutar la base de datos ni ejecutar SQL.

---

## 📋 Checklist de Producción

Consulte [SECURITY.md](file:///c:/Users/kevin/.gemini/antigravity-ide/scratch/nexus-finance/SECURITY.md) y [ARCHITECTURE.md](file:///c:/Users/kevin/.gemini/antigravity-ide/scratch/nexus-finance/ARCHITECTURE.md) para el runbook completo de despliegue y hardening.

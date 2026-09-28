# 🏛️ NEXUS Finance — Arquitectura del Sistema

Este documento describe la arquitectura modular, los flujos de datos y los principios de diseño implementados en **NEXUS Finance**.

---

## 1. Diagrama de Flujo del Sistema

```mermaid
flowchart TD
    subgraph ClientLayer ["Cliente (Next.js 16 + React 19)"]
        UI["UI Components (Dashboard, Banking, Crypto, AI, Twin, Lab)"]
        Store["Zustand Store (financial.ts, ai-chat.ts)"]
    end

    subgraph IntelligenceLayer ["Capa de Inteligencia & Derivación"]
        Engine["Financial Engine (Net Worth, Cash Flow, DTI, Runway)"]
        Twin["Digital Twin (Snapshots, Métricas, Runway)"]
        EventEng["Event Engine & Alert Center (Detección de Cambios)"]
        Scenario["Scenario Engine & Financial Lab (Simulaciones Hipotéticas)"]
        Copilot["Proactive Copilot (Daily Brief, Insights, Bridges)"]
    end

    subgraph SecurityLayer ["Capa de Seguridad & Integración"]
        AIRoute["/api/ai/chat (Rate Limiter 25 req/min, Bearer Auth, Input Capping)"]
        AITools["AI Read Tools (8 Tools estrictamente Read-Only)"]
        OpenFinance["Open Finance Provider (OAuth 2.0 PKCE / FAPI 2.0)"]
        CSVParser["CSV Bank Parser (Deduplicación & Heurística Colombia)"]
        CryptoService["Crypto Service & CoinMarketCap Provider (Spot & Cache)"]
        WalletService["Wallet Service (EVM / Solana On-Chain Read-Only)"]
    end

    subgraph PersistenceLayer ["Capa de Persistencia"]
        DAL["Data Access Layer (DAL)"]
        Supabase["Supabase Cloud (PostgreSQL 15 + RLS Activo)"]
        LocalFallback["Persistencia Local Aislada (Demo / Offline Mode)"]
    end

    UI --> Store
    Store --> Engine
    Engine --> Twin
    Twin --> EventEng
    EventEng --> Copilot
    Copilot --> UI
    
    UI --> Scenario
    Scenario --> Engine
    
    UI --> AIRoute
    AIRoute --> AITools
    AITools --> DAL
    
    Store --> DAL
    DAL --> Supabase
    DAL -. Fallback .-> LocalFallback
    
    Store --> OpenFinance
    Store --> CSVParser
    Store --> CryptoService
    Store --> WalletService
```

---

## 2. Capa Contable (Financial Engine)

El motor financiero ([`financial-engine.ts`](file:///c:/Users/kevin/.gemini/antigravity-ide/scratch/nexus-finance/app/src/lib/financial-engine.ts)) es determinista, puro y sin dependencias de base de datos.

### 2.1 Ecuaciones e Invariantes Fundamentales:

1. **Patrimonio Neto (Net Worth):**
   $$\text{Net Worth} = \text{Total Activos} - \text{Total Pasivos}$$
   
2. **Deduplicación de Activos:**
   Cuando existen balances verificados provenientes de Open Finance o tenencias de criptoactivos en vivo, el motor financiero sustituye y descuenta automáticamente los activos legacy manuales categorizados en `bank_accounts` o `crypto`, previniendo la duplicación contable:
   $$\text{Activos Ajustados} = \text{Manuales} - \text{LegacyBancos} + \text{BancosOpenFinance} - \text{LegacyCrypto} + \text{CryptoLive}$$

3. **Flujo de Caja Real (Banking Cash Flow):**
   $$\text{Net Cash Flow} = \text{Ingresos Operativos} - \text{Gastos Reales}$$
   Las transferencias internas entre cuentas propias (ej. de cuenta de ahorros Bancolombia a cuenta Nequi) se identifican automáticamente mediante `is_internal_transfer = true` y son excluidas de los ingresos y egresos, registrándose exclusivamente en el volumen de transferencias internas:
   $$\text{Volumen Transferencias Internas} = \sum \text{Monto}_{\text{transferencias}}$$

4. **Pago de Deuda:**
   El pago de pasivos reduce el efectivo y disminuye los pasivos en la misma magnitud, manteniendo el patrimonio neto neutro en el instante de la transacción.

5. **Revalorización Cripto:**
   Las fluctuaciones de precio en criptoactivos se contabilizan como **Rendimiento No Realizado (PnL)** y nunca como ingreso operacional realizado.

---

## 3. Data Access Layer (DAL) & Modo Dual

El acceso a datos se centraliza en `src/lib/dal/`:
- **Modo Supabase Cloud:** Cuando las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` están configuradas, las operaciones se delegan a Supabase, donde **Row Level Security (RLS)** garantiza que cada consulta incluye `auth.uid() = user_id`.
- **Modo Demo / Local:** Si Supabase no está configurado o el cliente está offline, el DAL conmuta fluidamente a almacenamiento local en el navegador, manteniendo todas las funcionalidades intactas de manera aislada.

---

## 4. Arquitectura de Inteligencia Artificial (NEXUS AI)

El copiloto opera mediante un modelo de **Tres Pilares**:

1. **Grounded en Financial Engine:** El LLM (Google Gemini) nunca calcula métricas patrimoniales o de presupuesto en su contexto latente; está forzado mediante `tool_calls` a consultar las herramientas oficiales del Financial Engine.
2. **Herramientas de Solo Lectura:** El despachador de herramientas (`src/lib/ai-tools/`) solo expone 8 herramientas de lectura (`get_monthly_income`, `get_monthly_expenses`, `get_net_worth`, `get_debts`, `get_budgets`, `get_financial_state`, `simulate_financial_scenario`, `get_nexus_today`). Ninguna herramienta permite ejecutar INSERT, UPDATE, DELETE o consultas SQL arbitrarias.
3. **Seguridad y Rate Limiting:** La ruta `/api/ai/chat/route.ts` implementa:
   - Rate limiting in-memory por ventana deslizante (máximo 25 peticiones por minuto por IP/usuario con respuesta HTTP 429).
   - Verificación del token Bearer de Supabase (`supabase.auth.getUser`) para impedir la suplantación del `userId`.
   - Límites en la longitud de entrada (máximo 4.000 caracteres por mensaje y 20 turnos de historial).

---

## 5. Arquitectura Cripto & Web3

- **Modo Estrictamente Read-Only:** La aplicación solo almacena direcciones públicas (Ethereum/Solana) y nombres de plataformas. Cero llaves privadas, frases semilla o capacidades de firma/envío.
- **Resiliencia de Mercado:** `CryptoService` gestiona cotizaciones en vivo mediante `CoinMarketCapProvider` con caché spot de 5 minutos, caché histórica de 30 minutos y fallback determinista instantáneo ante respuestas 429 o caídas de red.

---

## 6. Arquitectura Bancaria & Open Finance

- **Conforme al Decreto 0368 de 2026:** Integración basada en estándares abiertos colombianos (FAPI 2.0 / OAuth 2.0 PKCE).
- **Zero Credenciales:** El sistema rechaza activamente cualquier intento de ingresar contraseñas bancarias o PINs.
- **Importación de Extractos CSV:** Soporte nativo para extractos de Bancolombia, Davivienda, Nu y Nequi, con normalización heurística de columnas, detección de moneda en formato colombiano (puntos de miles y comas de decimales), prevención de duplicados y confirmación obligatoria previa a la importación.

---

## 7. Entrada Financiera en Lenguaje Natural (FASE U)

La capa de entrada natural (`src/lib/ai-entry/`) permite ingresar movimientos complejos mediante lenguaje natural o voz, con validación determinista estricta:

1. **Protocolo Preview-First:** La IA (`gemini-3.8-flash`) analiza y descompone el texto en operaciones atómicas (ingresos, gastos, transferencias internas). La IA **nunca** escribe directamente en la base de datos ni en el DAL.
2. **Revisión Humana Obligatoria:** Las intenciones permanecen en un estado temporal `PendingIntent` en el cliente. El usuario puede editar montos, cambiar categorías, eliminar line-items o cancelar antes de la persistencia.
3. **Ejecución DAL con Invariantes:** Una vez confirmado por el usuario en `/api/ai/entry/confirm`, el ejecutor de escritura escribe los registros validados a través del DAL y dispara el recálculo reactivo en cadena del **Financial Engine**, **Digital Twin** y **Event Engine**.

---

## 8. Inteligencia de Documentos & Conciliación Contable (FASE V)

El módulo de Document Intelligence (`src/lib/documents/`) procesa extractos bancarios en formatos PDF y fotografías escaneadas:

1. **Extracción Multimodal Segura:** Procesamiento de imágenes y PDFs con visión computacional y modelos Gemini multimodal con normalización de caracteres, puntos de miles y comas decimales colombianas (`$1.500.000,50`).
2. **Detección de Huella Digital y Duplicados:** Cada movimiento genera un fingerprint determinista `sha256(date + abs(amount) + normalized_desc)` que previene la reimportación o doble conteo de transacciones existentes.
3. **Ecuación de Conciliación de Saldos:**
   $$\Delta \text{Calculada} = \text{Saldo Inicial} + \sum \text{Créditos (Inflows)} - \sum \text{Débitos (Outflows)}$$
   $$\text{Discrepancia} = |\Delta \text{Calculada} - \text{Saldo Final Reportado}|$$
   Si la discrepancia es cero, el extracto se certifica como **CONCILIADO**. Si existe diferencia, se reporta la alerta contable sin bloquear la edición manual del usuario.
4. **Protección de Privacidad (Zero-Retention):** Los buffers en memoria de documentos e imágenes son sobrescritos con ceros binarios (`buffer.fill(0)`) y desreferenciados de inmediato tras su procesamiento, garantizando cero retención de documentos bancarios confidenciales.

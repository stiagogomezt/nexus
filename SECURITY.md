# 🛡️ NEXUS Finance — Política de Seguridad & Auditoría

NEXUS Finance está diseñado bajo el principio de **Defensa en Profundidad (Defense in Depth)** y **Mínimo Privilegio (Least Privilege)** para la gestión y análisis de datos financieros personales.

---

## 1. Modelo de Amenazas y Límites de Confianza

| Vector de Amenaza | Riesgo Potencial | Mitigación Implementada |
| :--- | :--- | :--- |
| **Suplantación de Identidad** | Un usuario A intenta consultar datos de un usuario B modificando el `userId` en el cliente. | Verificación de token Bearer en `/api/ai/chat` mediante `supabase.auth.getUser()`. Si el ID solicitado difiere del usuario autenticado en el token JWT, se devuelve HTTP 403 Forbidden. En PostgreSQL, RLS valida `auth.uid() = user_id`. |
| **Ataques de Denegación de Servicio (DoS)** | Consumo abusivo de cuota de Gemini o saturación del servidor. | Rate Limiter in-memory con ventana deslizante (máximo 25 peticiones por minuto por IP/usuario) devolviendo HTTP 429 con cabecera `Retry-After`. |
| **Prompt Injection en IA** | Instrucciones maliciosas intentando que la IA ejecute código o mutaciones de datos. | La IA opera estrictamente a través de un despachador de **herramientas de solo lectura (Allowlist)**. No existe ninguna herramienta para ejecutar SQL o mutar la base de datos. Longitud de mensaje acotada a 4.000 caracteres. |
| **Fuga de Claves Privadas Cripto** | Riesgo de drenado de fondos o compromiso de activos on-chain. | **Zero Custodia:** El modelo de datos, la API y la UI solo manejan direcciones públicas (0x... y Base58). No existen campos para `privateKey`, `seedPhrase` ni métodos de firma o envío de transacciones. |
| **Compromiso de Credenciales Bancarias** | Exposición de contraseñas de portales bancarios o PINs. | **Zero Passwords:** Conexiones estructuradas bajo OAuth 2.0 PKCE / FAPI 2.0 (Decreto 0368 de 2026). La clase `OpenFinanceProvider` lanza una excepción de seguridad bloqueante si se detectan parámetros como `password`, `pin` u `otp`. |
| **Fuga de Secretos en el Frontend** | Exposición accidental de claves de API en el bundle del navegador. | `.gitignore` estricto que ignora `.env*` excepto `.env.example`. Ningún secreto de backend (Gemini, Supabase Service Role, CoinMarketCap) lleva el prefijo `NEXT_PUBLIC_`. |

---

## 2. Row Level Security (RLS) en Supabase

Todas las tablas multi-inquilino en `supabase/migrations/` tienen habilitado RLS:

```sql
-- Ejemplo de política aplicada a todas las tablas del sistema
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY incomes_user_policy ON public.incomes
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
```

Tablas protegidas con RLS:
1. `public.profiles`
2. `public.categories`
3. `public.incomes`
4. `public.expenses`
5. `public.debts`
6. `public.debt_payments`
7. `public.goals`
8. `public.goal_contributions`
9. `public.assets`
10. `public.liabilities`
11. `public.budgets`
12. `public.crypto_holdings`
13. `public.wallet_accounts`
14. `public.bank_connections`
15. `public.bank_accounts`
16. `public.bank_transactions`
17. `public.financial_snapshots`
18. `public.financial_events`
19. `public.financial_alerts`
20. `public.user_notification_preferences`
21. `public.ai_conversations`
22. `public.ai_messages`

---

## 3. Seguridad de las Herramientas de IA (AI Tools Allowlist)

El despachador `src/lib/ai-tools/` implementa una lista blanca explícita de 8 herramientas autorizadas:

1. `get_monthly_income` (Solo lectura de ingresos)
2. `get_monthly_expenses` (Solo lectura de egresos)
3. `get_net_worth` (Solo lectura de balance patrimonial)
4. `get_debts` (Solo lectura de obligaciones)
5. `get_budgets` (Solo lectura de presupuestos)
6. `get_financial_state` (Solo lectura de Digital Twin)
7. `simulate_financial_scenario` (Cálculo prospectivo en memoria, zero mutación en base de datos)
8. `get_nexus_today` (Solo lectura del resumen de copilot)

Cualquier intento de invocar herramientas no autorizadas o funciones con efecto secundario es rechazado automáticamente por el motor de validación.

---

## 4. Auditoría de Variables de Entorno

- **Variables Públicas Permitidas en Navegador:**
  - `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto Supabase (segura, operaciones protegidas por RLS).
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Llave pública anónima de Supabase (restringida a políticas RLS del usuario autenticado).

- **Secretos Restringidos al Entorno Servidor (NUNCA `NEXT_PUBLIC_`):**
  - `SUPABASE_SERVICE_ROLE_KEY`: Acceso administrativo para tareas de mantenimiento.
  - `GEMINI_API_KEY`: Utilizada exclusivamente en la ruta API `/api/ai/chat`.
  - `COINMARKETCAP_API_KEY`: Utilizada exclusivamente en el servidor para cotizaciones de mercado.
  - `OPEN_FINANCE_API_KEY` / `OPEN_FINANCE_API_SECRET`: Credenciales de integración bancaria FAPI 2.0.

---

## 5. Checklist de Seguridad para Producción

- [x] **Auth:** Sesión persistente y validación de tokens Bearer en rutas API.
- [x] **Supabase RLS:** Activado en las 22 tablas del esquema con políticas `auth.uid() = user_id`.
- [x] **Secretos:** Cero llaves privadas en variables `NEXT_PUBLIC_` ni en el repositorio Git.
- [x] **AI Security:** Rate limiter activo (25 req/min), verificación de usuario y prompts acotados.
- [x] **Crypto:** Modo 100% Read-Only, cero private keys o seed phrases.
- [x] **Banking:** Integración basada en consentimiento FAPI 2.0, cero contraseñas o PINs.
- [x] **Ledger:** Invariantes contables verificadas, deduplicación de activos y cero doble conteo.
- [x] **Offline:** Fallback determinista y resiliente ante caídas de red o fallos de API.
- [x] **Build:** Compilación Next.js de producción exitosa con 0 errores TypeScript.
- [x] **Tests:** 185 pruebas automatizadas pasando al 100% de manera determinista.

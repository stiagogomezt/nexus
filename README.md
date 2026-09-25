# 💎 NEXUS Finance — Aplicación Maestra de Finanzas Personales

**NEXUS Finance** es un sistema financiero personal integral de alta fidelidad, diseñado con estética fintech moderna (dark mode, glassmorphism, microanimaciones y tipografía avanzada) para controlar ingresos, gastos, deudas, metas, ahorro, inversiones y apuestas, proyectando el patrimonio del usuario.

---

## 👤 Perfil Financiero Configurado

La aplicación está modelada estrictamente sobre la estructura real de ingresos del usuario:

1. **Ingreso Principal — Shuffler:**
   - Salario base / quincenal
   - Bonos de desempeño y precisión
   - Recargos nocturnos y dominicales/festivos
   - Horas adicionales / extras
   - Otros pagos asociados

2. **Ingreso Secundario — Pizza Hut (Side Job):**
   - Horas trabajadas y tarifa por hora
   - Horas adicionales
   - Recargos por turno
   - Otros pagos

> ⚠️ **Nota:** No se incluye freelance como fuente de ingreso por defecto. El sistema permite añadir dinámicamente nuevas fuentes personalizadas en cualquier momento sin alterar la estructura base.

---

## 🏛️ Arquitectura del Sistema

```
nexus-finance/
├── frontend/                     # React 19 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/           # Sidebar, Header, MetricCard, Modal, Forms
│   │   ├── context/              # FinancialContext (estado reactivo), AuthContext
│   │   ├── lib/                  # Formatters (COP/USD), Supabase client
│   │   ├── pages/                # Dashboard, Incomes, Expenses, Goals, Debts, NetWorth, Previews
│   │   ├── types/                # Modelos y contratos de TypeScript
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── tailwind.config.js        # Paleta fintech: emerald, cyan, indigo, amber, debt rose
│   ├── package.json
│   └── .env.example
├── backend/                      # Python 3.13 + FastAPI + Pydantic
│   ├── app/
│   │   ├── core/                 # Configuración y variables de entorno
│   │   ├── models/               # Esquemas Pydantic para validación
│   │   ├── routers/              # Endpoints: /incomes, /expenses, /goals, /debts, /dashboard
│   │   └── main.py               # Servidor FastAPI con CORS y documentación OpenAPI
│   ├── requirements.txt
│   └── .env.example
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql # Esquema SQL PostgreSQL completo con Row Level Security (RLS)
│   └── seed.sql                  # Categorías base y datos de inicio
└── README.md
```

---

## 🚀 Puesta en Marcha

### 1. Frontend (Vite + React)

```bash
cd frontend
npm install
npm run dev
```

La aplicación abrirá por defecto en `http://localhost:5173`.
- **Modo Local Inmediato:** Funciona al 100% sin necesidad de configurar claves externas inmediatamente, permitiendo probar toda la reactividad, cálculos y formularios.
- **Sincronización Supabase Cloud:** Agrega tus credenciales en `frontend/.env` para conectar con tu proyecto Supabase.

### 2. Backend (FastAPI)

```bash
cd backend
python -m venv .venv
# En Windows PowerShell:
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Documentación interactiva disponible en `http://localhost:8000/docs`.

### 3. Base de Datos (Supabase / PostgreSQL)

1. En tu proyecto de [Supabase](https://supabase.com), dirígete al **SQL Editor**.
2. Copia y ejecuta el contenido de `supabase/migrations/001_initial_schema.sql`.
3. Ejecuta `supabase/seed.sql` para cargar las categorías iniciales.

---

## 📊 Módulos Construidos en la Fase 1

- [x] **Arquitectura y Estructura Modular**: Separación limpia frontend-backend-DB.
- [x] **Navegación Completa**: Sidebar colapsable con accesos a los 12 módulos y badges.
- [x] **Panel Maestro (Dashboard)**:
  - Ingresos del mes (desglosados en vivo entre Shuffler, Pizza Hut y otros).
  - Gastos del mes y porcentaje sobre el ingreso.
  - Flujo libre de caja (Ingresos - Gastos).
  - Deuda total pendiente y avance de amortización.
  - Patrimonio neto en tiempo real (Activos - Pasivos).
  - Ahorro líquido e Inversiones.
  - Betting Tracker (control independiente sin mezclar con gastos normales).
  - Gráfico interactivo de área: Ingresos vs Gastos mes a mes.
  - Gráfico donut: Distribución porcentual de gastos por categoría.
  - Barra de progreso de metas activas.
- [x] **Módulo de Ingresos**:
  - CRUD completo de ingresos.
  - Tarjetas específicas para Shuffler y Pizza Hut.
  - Desglose de horas trabajadas, tarifa, recargos y bonos.
  - Filtros y búsqueda en tiempo real.
- [x] **Módulo de Gastos**:
  - CRUD con categorías iniciales: vivienda, alimentación, transporte, servicios, tecnología, entretenimiento, compras, salud, educación, suscripciones, otros.
  - Identificación de gastos esenciales (base para el fondo de emergencia).
- [x] **Módulo de Metas**:
  - Cálculos automáticos de avance porcentual y faltante.
  - Proyección de tiempo estimado a ritmo actual de aporte mensual.
  - Cálculo del aporte mensual necesario para cumplir en la fecha límite fijada.
  - Modal interactivo de aportes de capital.
- [x] **Módulo de Deudas**:
  - Monitoreo de saldo inicial vs saldo actual.
  - Tasas de interés Efectivas Anuales (E.A. %).
  - Cuotas mínimas y días de corte.
  - Registro de pagos/abonos a capital.
- [x] **Cálculo de Patrimonio Neto**:
  - Activos (cuentas, ahorros, CDT, inversiones, vehículos) vs Pasivos (deudas).
  - Modal para agregar nuevos activos al patrimonio.
- [x] **Vistas Previas de Módulos Auxiliares**:
  - Presupuestos con límites y alertas visuales.
  - Fondo de emergencia (objetivos de 3, 6, 9 y 12 meses).
  - Seguimiento de Inversiones (solo registro y rendimiento, sin trading).
  - Betting Tracker aislado.

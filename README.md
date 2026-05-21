# SimplifyPOS — Frontend

Interfaz web para el sistema POS SimplifyPOS. Construida con React 19 + TypeScript + Vite. Diseñada para comerciantes colombianos que operan la app 8+ horas al día — velocidad y simplicidad primero.

[![CI](https://github.com/Admabaga/SimplifyPOS-Client/actions/workflows/ci.yml/badge.svg)](https://github.com/Admabaga/SimplifyPOS-Client/actions/workflows/ci.yml)

---

## Stack tecnológico

| Componente | Tecnología |
|---|---|
| Framework | React 19 |
| Lenguaje | TypeScript |
| Build | Vite |
| Routing | React Router v6 |
| Server state | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| HTTP client | Axios (con interceptor de refresh automático) |
| Estado global | Zustand |
| Búsqueda fuzzy | Fuse.js |
| Iconos | Lucide React |
| Gráficas | Recharts |
| Notificaciones | React Hot Toast |
| Linting | ESLint + TypeScript strict |
| Deploy | Render (auto-deploy desde main) |

---

## Estructura del proyecto

```
src/
├── features/               # Módulos por dominio de negocio
│   ├── accounts/           # Cuentas crédito + ventas + pagos
│   ├── admin/              # Panel master (gestión de tenants)
│   ├── auth/               # Login, 2FA
│   ├── billing/            # Facturación DIAN (empresa, resoluciones)
│   ├── caja/               # Apertura, cierre y cuadre de caja
│   ├── categories/         # Categorías de productos
│   ├── clients/            # Directorio de clientes fiscales
│   ├── expenses/           # Gastos operativos
│   ├── invoices/           # Historial de tickets emitidos
│   ├── master/             # Herramientas super-admin
│   ├── notifications/      # Centro de notificaciones
│   ├── onboarding/         # Wizard de configuración inicial
│   ├── payment-methods/    # Medios de pago
│   ├── products/           # Catálogo de productos
│   ├── reports/            # Dashboard de KPIs y reportes
│   ├── sales/              # Registro de ventas
│   └── suppliers/          # Proveedores
├── shared/
│   ├── api/
│   │   └── client.ts       # Axios instance + interceptor refresh token
│   ├── components/
│   │   ├── ui.tsx          # Design system (Button, Input, Modal, Table...)
│   │   ├── Layout.tsx      # Shell principal con sidebar
│   │   └── Sidebar.tsx     # Navegación lateral
│   └── lib/
│       └── apiError.ts     # Extractor de mensajes de error de la API
├── stores/
│   └── auth.ts             # Zustand store — usuario + token + permisos
└── routes/                 # Definición de rutas React Router
```

---

## Módulos principales

| Módulo | Ruta | Descripción |
|---|---|---|
| Dashboard | `/` | KPIs del día, ventas, saldo de caja |
| Cuentas | `/accounts` | Cuentas crédito — lista y detalle |
| Detalle cuenta | `/accounts/:id` | Agregar ventas, registrar pagos, emitir ticket |
| Productos | `/products` | CRUD de productos y precios |
| Caja | `/caja` | Abrir/cerrar caja, movimientos, cuadre |
| Reportes | `/reports` | Ventas del mes, gastos, audit log |
| Facturación | `/billing` | Config empresa + resoluciones DIAN |
| Clientes | `/clients` | Directorio fiscal |
| Gastos | `/expenses` | Registro de egresos |
| Medios de pago | `/payment-methods` | Configurar métodos aceptados |
| Roles | `/roles` | RBAC — gestionar roles y permisos |
| Usuarios | `/users` | Gestión de usuarios del tenant |

---

## Setup local

### Prerrequisitos

- Node.js 20+
- Backend SimplifyPOS corriendo en `localhost:8000`

### Pasos

```bash
# 1. Clonar
git clone https://github.com/Admabaga/SimplifyPOS-Client.git
cd SimplifyPOS-Client

# 2. Instalar dependencias
npm install

# 3. Variables de entorno
echo "VITE_API_URL=http://localhost:8000/api/v1" > .env.local

# 4. Arrancar en desarrollo
npm run dev
```

App disponible en: `http://localhost:5173`

---

## Variables de entorno

```env
# URL base de la API (sin trailing slash)
VITE_API_URL=http://localhost:8000/api/v1
```

En producción se configura en Render como variable de entorno.

---

## Scripts disponibles

```bash
npm run dev          # Servidor de desarrollo con HMR
npm run build        # Build de producción (tsc + vite build)
npm run preview      # Preview del build de producción
npm run lint         # ESLint
npm run check:types  # TypeScript sin emitir archivos
```

---

## Autenticación

- Login con email + password → access token en memoria + refresh token en cookie HttpOnly
- El interceptor de Axios renueva el access token automáticamente al recibir 401
- Los permisos del usuario se almacenan en Zustand y controlan qué secciones y acciones son visibles
- Soporte 2FA TOTP (Google Authenticator / Authy)

---

## Design system

El componente `shared/components/ui.tsx` centraliza todos los elementos visuales:

| Componente | Descripción |
|---|---|
| `Button` | Primario, secundario, ghost, danger. Con loading state. |
| `Input` | Con label, error y soporte para íconos |
| `Modal` | Con backdrop, Escape para cerrar, scroll interno |
| `ConfirmDialog` | Modal de confirmación con mensaje personalizable |
| `Table` | Tabla con cabeceras, filas vacías y skeleton loader |
| `Badge` | Etiquetas de estado con colores semánticos |
| `Spinner` | Indicador de carga |

Los colores de la marca se definen como CSS variables (`--t-primary`, etc.) en `index.css`.

---

## CI/CD

El pipeline de GitHub Actions corre en cada push a `main`:

1. **ESLint** — sin errores de lint
2. **TypeScript check** — `tsc --noEmit`
3. **Build** — `vite build` con URL placeholder
4. **Deploy to Render** — dispara deploy automático si los pasos anteriores pasan

---

## Wizard de onboarding

Al primer inicio de sesión de un admin, el sistema muestra un wizard de configuración de 5 pasos:

1. **Bienvenida** — resumen de lo que se va a configurar
2. **Datos del negocio** — razón social, NIT, dirección (para las facturas)
3. **Primer producto** — nombre y precio de venta
4. **Medios de pago** — revisión de los métodos activos
5. **Caja** — instrucciones para abrir la primera sesión

El wizard no vuelve a aparecer una vez completado o descartado (persiste en `localStorage` por usuario).

---

## Facturación DIAN

Desde el módulo de **Detalle de cuenta** se puede emitir un ticket en tres modalidades:

| Tipo | Descripción |
|---|---|
| Informal | Recibo sin numeración fiscal — idempotente |
| POS | Factura POS con resolución DIAN activa |
| Factura de venta | Factura electrónica completa (Art. 617 ET) |

El ticket incluye desglose de IVA por categoría, datos de la empresa y hash de integridad.
# Wed May 20 20:21:45 -05 2026

# SimplifyPOS — Frontend

Aplicación web del punto de venta SimplifyPOS. Es lo que ve el comerciante para vender, fiar, cuadrar caja y controlar su inventario, y lo que ve el operador de la plataforma para administrar toda la red de negocios.

**Estado al 11 de septiembre de 2026** — 20 módulos · 296 pruebas · TypeScript estricto sin errores.

---

## Empezar en tres minutos

```bash
npm install
npm run dev          # http://localhost:5173
```

Por defecto Vite hace proxy de `/api` hacia `http://localhost:8000`, así que basta con tener la API corriendo en ese puerto. No hace falta configurar nada más.

Si la API está en otro sitio, crear `.env.local` (no se commitea):

```bash
VITE_API_URL=http://127.0.0.1:8010/api/v1
```

> Ojo con esto: apuntar a otro origen activa CORS y **la cookie de refresh deja de viajar**, así que la sesión se pierde al recargar. Para desarrollo normal, mejor el proxy.

### Comandos

```bash
npm run dev            # servidor de desarrollo
npm run build          # verifica tipos y compila para producción
npm run lint           # ESLint
npm run check:types    # tsc --noEmit
npm test               # 296 pruebas (vitest)
npm run test:watch     # en modo watch
```

---

## Stack

| Componente | Elección | Por qué |
|---|---|---|
| Lenguaje | TypeScript estricto | |
| UI | React 19 | |
| Build | Vite 6 | |
| Rutas | React Router v6 | |
| Estado del servidor | TanStack Query v5 | Caché e invalidación por dominio, sin replicar datos a mano |
| Estado global | Zustand | Solo sesión y tenant activo; lo demás es del servidor |
| Formularios | React Hook Form + Zod | Validación compartida entre esquema y tipos |
| HTTP | Axios con interceptor de refresh | |
| Estilos | Tailwind CSS 4 | |
| Gráficas | Recharts | |
| Búsqueda | Fuse.js | Difusa, para el buscador de la venta rápida |
| Íconos | Lucide React | Trazo de línea, sin emojis |
| Pruebas | Vitest + Testing Library | |
| Publicación | Render, automático desde `main` | |

---

## Estructura

```
src/
├── features/          Un módulo por dominio de negocio
│   ├── accounts/      Cuentas de crédito (fiados) y venta rápida
│   ├── auth/          Login, perfil, passkeys, 2FA
│   ├── billing/       Empresa, resoluciones DIAN, tickets emitidos
│   ├── caja/          Apertura, movimientos, cierre y reporte Z
│   ├── master/        Consola del operador de la plataforma
│   ├── subscription/  Planes y suscripción (detrás de release)
│   └── …              products, sales, expenses, reports, clients…
├── routes/            Definición de rutas y guardas
├── shared/
│   ├── api/           Cliente Axios y APIs por dominio
│   ├── components/    Sistema de diseño (ui.tsx), Layout, Sidebar
│   ├── hooks/         useReleases, useIsDesktop, useBarcode…
│   └── lib/           Formateadores, manejo de errores, markdown seguro
├── stores/            Zustand: auth, master, theme
└── tests/             296 pruebas
```

Cada carpeta de `features/` es autónoma: sus componentes, su `api.ts` y sus tipos. Lo que se comparte sube a `shared/`.

---

## Releases — qué se dibuja y qué no

Las funcionalidades grandes viven detrás de un interruptor que administra el master. La web consulta `GET /releases` (endpoint público, porque el login y la página de planes también necesitan saberlo) y **solo mira la capa `web`**.

```tsx
import { useRelease } from '@/shared/hooks/useReleases'

const saasActivo = useRelease('suscripciones_saas')
if (!saasActivo) return null
```

Tres formas de esconder, según el caso:

| Qué | Cómo |
|---|---|
| Entrada del menú | Campo `release` en el ítem de `Sidebar.tsx` |
| Ruta completa | `<ReleaseRoute release="…" redirectTo="/login">` |
| Un bloque dentro de una pantalla | `useRelease(...)` y condicional |

**El hook responde `false` mientras la consulta está en vuelo.** Es deliberado: que un ítem del menú aparezca y desaparezca es peor que tarde un instante en aparecer.

> El punto de venta no depende de ningún release. Vender, cobrar e imprimir funcionan con todo apagado.

---

## Autenticación

- Login con correo y contraseña → **token de acceso en memoria** y refresh en cookie `HttpOnly`.
- El interceptor de Axios renueva el token al recibir un 401, y reintenta la petición original.
- Los permisos viven en Zustand y controlan qué se dibuja y qué no.
- Segundo factor: TOTP y passkeys (huella, Face ID, llave de seguridad).

**El token no se guarda en `localStorage`**, a propósito: ahí cualquier script inyectado puede leerlo. El costo es que recargar la página obliga a renovar contra el servidor; a cambio, un XSS deja de ser una sesión robada.

---

## Sistema de diseño

`shared/components/ui.tsx` centraliza los componentes: `Button`, `Input`, `Modal`, `ConfirmDialog`, `Table`, `Badge`, `Spinner`, `PageHeader`, `EmptyState`, `TabBar`, `Pagination`, entre otros.

Los colores de marca son variables CSS (`--t-primary`, `--t-sidebar-bg`…) definidas en `index.css`, con varios temas seleccionables.

### La consola del Master es su propio lenguaje

Las pantallas de `features/master/` **no usan el sistema de diseño general**. Tienen el suyo (`master/components/consola.tsx`): papel con retícula, rótulos en versalitas, cifras en la tipografía de titulares. Es deliberado — quien opera la plataforma pasa del panel de un cliente a la vista global muchas veces al día, y el cambio de contexto debe notarse sin leer el título.

Dos reglas de esas pantallas:

- **El color solo donde significa algo.** Pintar de verde lo que está bien enseña al ojo a ignorarlo, y entonces deja de servir para detectar la excepción.
- **Listas largas van en tabla, no en tarjetas.** Las tarjetas se ven bien con seis elementos y son imposibles de barrer con cincuenta.

---

## Pruebas

296 pruebas en 42 archivos. Qué se cubre:

- **Render con datos reales** de cada pantalla, no solo que monte.
- **Interacciones** de los flujos que mueven dinero: venta rápida, cobro, cierre de caja.
- **Lógica de hooks** por separado (`useQuickSale`, `useProductFilters`, `useReleases`).
- **Comportamiento condicionado por releases**: que lo apagado no se dibuje, y que lo encendido sí.

```bash
npm test                     # todo
npm test -- releases         # un archivo
```

Convención: cuando una prueba comprueba que algo **no** aparece, debe comprobar también que aparece cuando corresponde. Si no, puede estar pasando por la razón equivocada — nos pasó tres veces.

---

## CI/CD

GitHub Actions en cada push a `main`: ESLint → `tsc --noEmit` → `vite build` → despliegue en Render.

**Orden de despliegue:** la API va primero cuando la versión trae migraciones. Al revés, la web consulta endpoints que aún no existen; con los releases eso degrada a "todo apagado", que es el fallo seguro, pero conviene evitarlo.

---

## Asistente de IA

Dos paneles con Claude Haiku:

- **Asesor de negocio** (tablero del comerciante) — diagnóstico del mes, tres acciones concretas, alerta principal.
- **Inteligencia** (consola del Master) — estado del ecosistema y estrategia de crecimiento.

El análisis generado **se guarda en el navegador** y se vuelve a mostrar al entrar, sin volver a consultar la IA, hasta que se pida uno nuevo de forma explícita. Cada consulta cuesta tokens de Anthropic.

---

## Onboarding

Al primer ingreso de un admin aparece un asistente de cinco pasos: bienvenida, datos del negocio, primer producto, medios de pago y apertura de caja. No vuelve a aparecer una vez completado o descartado.

---

## Documentación

| Documento | Para qué |
|---|---|
| `Informe_SimplifyPOS_Tecnico_v6.pdf` | Arquitectura y decisiones, versión por versión |
| `Informe_SimplifyPOS_Producto_Comercial_v6.pdf` | Visión funcional y comercial |
| [`SimplifyPOS-API`](https://github.com/Admabaga/SimplifyPOS-API) | Backend: contrato DIAN, releases, modo seguro |

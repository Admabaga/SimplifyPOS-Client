// ─── Auth ────────────────────────────────────────────────────────────────────

export interface User {
  id: number
  email: string
  nombre: string
  role: string
  nit?: string | null
  permissions: string[]
  must_change_password: boolean
  totp_enabled?: boolean
  last_login?: string | null
}

export interface TokenResponse {
  access_token: string
  user_id: number
  email: string
  nombre: string
  role: string
  permissions: string[]
  must_change_password: boolean
}

// ─── Catalog ─────────────────────────────────────────────────────────────────

export interface Categoria {
  id: number
  nombre: string
  descripcion?: string | null
  iva: number          // tarifa IVA % (0, 5 o 19) — art. Estatuto Tributario
  codigo_ciiu?: string | null   // Código CIIU DIAN (actividad económica)
  created_at: string
}

export interface Proveedor {
  id: number
  nombre: string
  telefono?: string | null
  email?: string | null
  direccion?: string | null
  ciudad?: string | null
  created_at: string
}

export interface ProductoPrecio {
  id: number
  producto_id: number
  nombre: string
  precio: number
  cantidad: number
  activo: boolean
}

export interface Producto {
  id: number
  nombre: string
  codigo?: string | null
  codigo_interno?: string | null
  codigo_arancelario?: string | null  // Partida arancelaria DIAN (productos importados)
  descripcion?: string | null
  precio_ponderado: string
  stock_total: number
  categoria_id?: number | null
  activo: boolean
  created_at: string
  precios: ProductoPrecio[]
}

export interface MedioPago {
  id: number
  nombre: string
  descripcion?: string | null
  comision_porcentaje: string
  activo: boolean
  tipo: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA'
}

export interface Gasto {
  id: number
  descripcion: string
  monto: string
  fecha: string
  categoria?: string | null
  metodo_pago: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA'
  comprobante_path?: string | null
  sesion_caja_id?: number | null
  created_at: string
}

// ─── Operaciones ─────────────────────────────────────────────────────────────

export interface Compra {
  id: number
  producto_id: number
  cantidad_inicial: number
  cantidad_disponible: number
  precio_total: number
}

export interface Factura {
  id: number
  proveedor_id: number
  compras: Compra[]
  fecha_creacion: string
  total: number        // calculado en backend — suma de precio_total de compras
}

export interface Venta {
  id: number
  cuenta_id: number
  producto_id: number
  producto_precio_id: number
  cantidad_unidades: number
  precio_unitario: number
  precio_venta: number
  ganancia: number
  fecha_venta: string
  // Trazabilidad de caja
  vendido_por: number | null
  sesion_caja_id: number | null
  nombre_cajero: string | null
}

export interface Pago {
  id: number
  cuenta_id: number
  medio_pago_id: number
  nombre_medio_pago: string
  sub_total: number
  total: number
  descripcion?: string
  fecha_pago: string
}

// ─── Cliente ─────────────────────────────────────────────────────────────────

export interface Cliente {
  id: number
  admin_id: number | null
  tipo_doc: string | null
  documento: string | null
  nombre_fiscal: string
  direccion: string | null
  telefono: string | null
  email: string | null
  es_generico: boolean
  activo: boolean
  fecha_creacion: string
  label: string            // enriquecido por backend: "CC 1020... — Juan García"
}

export interface Cuenta {
  id: number
  nombre: string
  total: number
  esta_pagada: boolean
  valor_pendiente: number
  fecha_creacion: string
  ventas: Venta[]
  pagos: Pago[]
  // Datos fiscales del cliente asignado
  cliente_tipo_doc: string | null
  cliente_documento: string | null
  cliente_nombre_fiscal: string | null
  cliente_direccion: string | null
  cliente_telefono: string | null
  cliente_email: string | null
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export interface Rol {
  id: number
  name: string
  description?: string | null
  is_system: boolean
  permissions: string[]
}

export interface Usuario {
  id: number
  email: string
  nombre: string
  role_id: number
  role_name: string
  activo: boolean
  must_change_password: boolean
  created_at: string
}

export interface AuditEntry {
  id: number
  user_id: number
  user_email: string
  action: string
  resource: string
  resource_id?: string | null
  ip: string
  extra?: string | null
  created_at: string
}

// ─── Reportes ─────────────────────────────────────────────────────────────────

export interface ReporteMensual {
  year: number
  month: number
  // P&L (estado de resultados)
  total_ventas:   number   // Ingresos
  cogs:           number   // Costo de mercancía vendida
  ganancia_bruta: number   // Ingresos − COGS
  total_gastos:   number   // Gastos operativos
  ganancia_neta:  number   // Ganancia bruta − Gastos
  // Flujo de caja
  total_pagos:     number  // Pagos recibidos (cash in)
  total_compras:   number  // Compras a proveedores (cash out por inventario)
  flujo_caja_neto: number  // pagos − gastos − compras
  // Cuentas
  cuentas_abiertas:    number
  cuentas_pagadas:     number
  cuentas_por_cobrar:  number  // Saldo pendiente total de cuentas abiertas
  // Detalles
  top_productos: Array<{
    producto_id: number
    num_ventas: number
    unidades: number
    total: number
  }>
  ventas_por_dia: Array<{
    dia: string
    num_ventas: number
    total: number
    ganancia: number
  }>
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationParams {
  limit?: number
  offset?: number
}

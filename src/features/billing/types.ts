/**
 * Tipos de facturación legal Colombia.
 * Espejo de los schemas Pydantic del backend.
 */

export type TipoDocumento = 'INFORMAL' | 'POS' | 'FACTURA_VENTA'
export type RegimenIva = 'RESPONSABLE_IVA' | 'NO_RESPONSABLE_IVA'
export type RegimenTributario = 'ORDINARIO' | 'SIMPLE'
export type EstadoTicket = 'EMITIDA' | 'ANULADA'
export type TipoDocumentoCliente = 'CC' | 'NIT' | 'CE' | 'PA' | 'TI'

export interface EmpresaConfig {
  id: number
  admin_id: number
  razon_social: string
  nit: string
  digito_verificacion: string | null
  direccion: string
  ciudad: string
  departamento: string
  telefono: string
  email: string
  regimen_iva: RegimenIva
  regimen_tributario: RegimenTributario
  actividad_economica: string
  obligaciones: string
  leyenda_pie: string
  created_at: string
  updated_at: string
}

export type EmpresaConfigInput = Omit<EmpresaConfig, 'id' | 'admin_id' | 'created_at' | 'updated_at'>

export interface ResolucionDian {
  id: number
  admin_id: number
  tipo_documento: 'POS' | 'FACTURA_VENTA'
  numero_resolucion: string
  fecha_resolucion: string  // YYYY-MM-DD
  prefijo: string
  rango_desde: number
  rango_hasta: number
  consecutivo_actual: number
  fecha_vigencia_desde: string
  fecha_vigencia_hasta: string
  activa: boolean
  numeros_disponibles: number
  vigente: boolean
}

export interface ResolucionInput {
  tipo_documento: 'POS' | 'FACTURA_VENTA'
  numero_resolucion: string
  fecha_resolucion: string
  prefijo: string
  rango_desde: number
  rango_hasta: number
  fecha_vigencia_desde: string
  fecha_vigencia_hasta: string
  clave_tecnica?: string | null
}

export interface ClienteInput {
  tipo_doc?: TipoDocumentoCliente | null
  documento?: string | null
  nombre?: string | null
  direccion?: string | null
  telefono?: string | null
  email?: string | null
}

export interface EmitirTicketInput {
  tipo_documento: TipoDocumento
  cliente?: ClienteInput | null
  notas?: string
}

export interface TicketItem {
  id: number
  producto_id: number | null
  descripcion: string
  codigo_producto: string
  cantidad: number
  precio_unitario_con_iva: number
  precio_unitario_base: number
  tarifa_iva: number
  valor_iva_linea: number
  subtotal_linea: number
  total_linea: number
}

export interface Ticket {
  id: number
  admin_id: number
  cuenta_id: number
  tipo_documento: TipoDocumento
  resolucion_id: number | null
  numero: number | null
  numero_completo: string

  cliente_tipo_doc: TipoDocumentoCliente | null
  cliente_documento: string | null
  cliente_nombre: string | null
  cliente_direccion: string | null
  cliente_telefono: string | null
  cliente_email: string | null

  empresa_razon_social: string
  empresa_nit: string
  empresa_direccion: string
  empresa_telefono: string
  empresa_regimen_iva: RegimenIva

  resolucion_numero: string | null
  resolucion_fecha: string | null
  resolucion_rango_desde: number | null
  resolucion_rango_hasta: number | null
  resolucion_vigencia_hasta: string | null

  subtotal: number
  descuento: number
  base_gravable: number
  valor_iva: number
  total: number

  notas: string
  estado: EstadoTicket
  motivo_anulacion: string | null
  fecha_anulacion: string | null

  hash_integridad: string
  codigo_verificacion: string
  fecha_emision: string

  items: TicketItem[]
}

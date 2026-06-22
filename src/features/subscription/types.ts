export interface Plan {
  id: number
  codigo: string
  nombre: string
  descripcion: string
  precio_mensual: number
  precio_anual: number
  limite_documentos_mes: number | null
  precio_excedente: number
  max_usuarios: number | null
  features: string[]
  orden: number
}

export interface SubscriptionConfig {
  provider: 'mock' | 'wompi' | 'disabled'
  currency: string
  public_key: string
  acceptance_token: string | null
}

export interface Transaccion {
  id: number
  monto: number
  moneda: string
  concepto: string
  ciclo: string
  estado: string
  metodo: string | null
  mensaje: string
  created_at: string
  finalized_at: string | null
}

export type EstadoSuscripcion = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELED'

export interface SubscriptionMe {
  estado: EstadoSuscripcion
  ciclo: 'MENSUAL' | 'ANUAL'
  plan: Plan
  en_trial: boolean
  acceso_permitido: boolean
  trial_fin: string | null
  periodo_fin: string | null
  proximo_cobro: string | null
  documentos_usados: number
  documentos_limite: number | null
  documentos_restantes: number | null
  usuarios_actuales: number
  excedente_acumulado: number
  descuento_proximo_cobro: number
  cancel_at_period_end: boolean
  monto_proximo_cobro: number
  metodo_brand: string | null
  metodo_last4: string | null
  metodo_holder: string | null
  metodo_exp: string | null
  tiene_metodo_pago: boolean
  historial: Transaccion[]
}

export interface SignupPayload {
  email: string
  password: string
  nombre: string
  empresa_nombre: string
  nit: string
  plan_codigo: string
  ciclo: 'MENSUAL' | 'ANUAL'
  card_token?: string
  card_brand?: string
  card_last4?: string
  card_holder?: string
  card_exp?: string
}

export interface SignupResponse {
  access_token: string
  user_id: number
  email: string
  nombre: string
  role: string
  permissions: string[]
  plan_codigo: string
  estado_suscripcion: string
  trial_fin: string | null
}

/** Formatea un valor en pesos colombianos sin decimales. */
export function formatCOP(value: number): string {
  return value.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  })
}

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { Check, Sparkles, ArrowRight, Loader2 } from 'lucide-react'
import { subscriptionApi } from './api'
import { formatCOP, type Plan } from './types'
import IconChart from '@/assets/IconChart.png'

const FEATURE_LABELS: Record<string, string> = {
  pos: 'Punto de venta completo',
  inventario: 'Inventario y control de stock',
  caja: 'Apertura y cierre de caja',
  cuentas: 'Cuentas por cobrar',
  reportes_basicos: 'Reportes básicos',
  comprobante_pos: 'Comprobante POS',
  dian_electronica: 'Factura electrónica DIAN',
  crm_clientes: 'Clientes / CRM',
  gastos: 'Control de gastos',
  reportes_avanzados: 'Reportes avanzados',
  ai_advisor: 'Asesor inteligente con IA',
  multi_sucursal: 'Multi-sucursal',
  soporte_prioritario: 'Soporte prioritario',
}

type Ciclo = 'MENSUAL' | 'ANUAL'

export default function PlansPage() {
  const navigate = useNavigate()
  const [ciclo, setCiclo] = useState<Ciclo>('MENSUAL')
  const { data: planes, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: subscriptionApi.getPlans,
  })

  const popular = 'PRO'

  const precioMensualEquivalente = (p: Plan) =>
    ciclo === 'ANUAL' ? Math.round(p.precio_anual / 12) : p.precio_mensual

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg, #f8fafc)' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-5 sm:px-10 py-4 border-b border-gray-200 bg-white">
        <Link to="/login" className="flex items-center gap-2.5">
          <img src={IconChart} alt="" className="h-8 w-auto max-w-[2.5rem] object-contain" />
          <div className="leading-none">
            <p className="font-extrabold text-gray-900 text-lg">SimplifyPOS</p>
            <p className="text-[10px] font-semibold text-emerald-600 mt-0.5">Point of Sale · Colombia</p>
          </div>
        </Link>
        <Link to="/login" className="text-sm font-semibold text-gray-600 hover:text-emerald-700">
          Ya tengo cuenta →
        </Link>
      </header>

      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-12">
        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full mb-4">
            <Sparkles size={13} /> 1 mes gratis · sin permanencia
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Elige el plan para tu negocio
          </h1>
          <p className="text-gray-500 mt-3">
            Empieza hoy con un mes de prueba gratis. Cancela cuando quieras. Todos los planes incluyen
            facturación y soporte en español.
          </p>
        </div>

        {/* Toggle ciclo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="inline-flex items-center bg-white rounded-full p-1 border border-gray-200 shadow-sm">
            {(['MENSUAL', 'ANUAL'] as Ciclo[]).map((c) => (
              <button
                key={c}
                onClick={() => setCiclo(c)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                  ciclo === c ? 'bg-emerald-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {c === 'MENSUAL' ? 'Mensual' : 'Anual'}
              </button>
            ))}
          </div>
          {ciclo === 'ANUAL' && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              2 meses gratis
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-emerald-600" size={32} />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3 items-stretch">
            {(planes ?? []).map((p) => {
              const esPopular = p.codigo === popular
              return (
                <div
                  key={p.id}
                  className={`relative flex flex-col rounded-2xl bg-white p-6 transition-all ${
                    esPopular
                      ? 'border-2 border-emerald-500 shadow-xl md:-mt-3 md:mb-3'
                      : 'border border-gray-200 shadow-sm hover:shadow-md'
                  }`}
                >
                  {esPopular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                      Más popular
                    </span>
                  )}
                  <h3 className="text-lg font-bold text-gray-900">{p.nombre}</h3>
                  <p className="text-sm text-gray-500 mt-1 min-h-[40px]">{p.descripcion}</p>

                  <div className="mt-4 mb-1 flex items-end gap-1">
                    <span className="text-3xl font-extrabold text-gray-900">
                      {formatCOP(precioMensualEquivalente(p))}
                    </span>
                    <span className="text-sm text-gray-400 mb-1">/mes</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-4">
                    {ciclo === 'ANUAL'
                      ? `${formatCOP(p.precio_anual)} facturado al año`
                      : 'Facturado mensualmente'}
                  </p>

                  <button
                    onClick={() => navigate(`/signup?plan=${p.codigo}&ciclo=${ciclo}`)}
                    className={`w-full flex items-center justify-center gap-1.5 font-semibold py-2.5 rounded-lg transition-all ${
                      esPopular
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                  >
                    Suscríbete <ArrowRight size={15} />
                  </button>

                  <ul className="mt-6 space-y-2.5 text-sm">
                    <li className="flex items-center gap-2 text-gray-700 font-medium">
                      <Check size={16} className="text-emerald-600 shrink-0" />
                      {p.limite_documentos_mes === null
                        ? 'Facturas electrónicas DIAN ilimitadas'
                        : `${p.limite_documentos_mes} facturas electrónicas DIAN / mes`}
                    </li>
                    {p.limite_documentos_mes !== null && (
                      <li className="flex items-center gap-2 text-gray-500">
                        <Check size={16} className="text-emerald-600 shrink-0" />
                        Excedente {formatCOP(p.precio_excedente)} c/u
                      </li>
                    )}
                    <li className="flex items-center gap-2 text-gray-700">
                      <Check size={16} className="text-emerald-600 shrink-0" />
                      {p.max_usuarios === null ? 'Usuarios ilimitados' : `Hasta ${p.max_usuarios} usuarios`}
                    </li>
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-gray-700">
                        <Check size={16} className="text-emerald-600 shrink-0" />
                        {FEATURE_LABELS[f] ?? f}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-10">
          Precios en pesos colombianos (COP). Pagos con tarjeta débito/crédito, Nequi y PSE vía Wompi.
        </p>
      </main>
    </div>
  )
}

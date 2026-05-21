/**
 * SetupWizard — Wizard de configuración inicial para nuevos negocios.
 *
 * Se muestra automáticamente cuando:
 *   - El usuario es admin o master
 *   - No hay productos registrados (primer inicio)
 *   - No se ha completado en este navegador para este usuario
 *
 * Correcciones v2:
 *  - La clave de localStorage incluye el user_id → diferente por cuenta
 *  - StepEmpresa envía NIT con placeholder si está vacío (campo obligatorio back)
 *  - Todos los campos opcionales tienen defaults seguros
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Resolver } from 'react-hook-form'
import {
  CheckCircle2, ChevronRight, Store, Package, CreditCard,
  Wallet, Rocket,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Button, Input, Modal } from '@/shared/components/ui'
import { apiClient } from '@/shared/api/client'
import { productsApi } from '@/features/products/api'
import { useAuthStore } from '@/stores/auth'
import { apiError } from '@/shared/lib/apiError'

// ─── Schemas ─────────────────────────────────────────────────────────────────

const empresaSchema = z.object({
  razon_social: z.string().min(2, 'Requerido'),
  nit:          z.string().min(5, 'NIT requerido (mín. 5 dígitos)').max(20),
  direccion:    z.string().optional(),
  ciudad:       z.string().optional(),
  telefono:     z.string().optional(),
  email:        z.string().email('Email inválido').optional().or(z.literal('')),
})

const productoSchema = z.object({
  nombre: z.string().min(2, 'Requerido'),
  precio: z.coerce.number().min(1, 'Precio requerido'),
})

type EmpresaForm  = z.infer<typeof empresaSchema>
type ProductoForm = z.infer<typeof productoSchema>

// ─── Hook: controla cuándo mostrar el wizard ──────────────────────────────────

export function useSetupWizard() {
  const user    = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'   // master no necesita onboarding propio
  const storageKey = `simplifypos_setup_complete_${user?.id ?? 'unknown'}`

  const [open, setOpen] = useState(false)

  const { data: products = [], isSuccess: productsSuccess } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.getAll(),
    enabled: isAdmin,
    staleTime: 60_000,
  })

  // Si el negocio ya tiene historial de caja, el onboarding está completo
  const { data: cajaHistorial = [], isSuccess: cajaSuccess } = useQuery({
    queryKey: ['caja', 'historial-wizard'],
    queryFn: () =>
      apiClient
        .get<unknown[]>('/caja/historial?limit=1&offset=0')
        .then((r) => r.data)
        .catch(() => []),
    enabled: isAdmin,
    staleTime: 300_000,
  })

  const isReady = productsSuccess && cajaSuccess

  useEffect(() => {
    if (!isAdmin || !isReady) return

    const done = localStorage.getItem(storageKey)
    if (done) return

    // Si ya tiene productos O historial de caja → negocio activo, auto-completar wizard
    const hasActivity = products.length > 0 || cajaHistorial.length > 0

    if (hasActivity) {
      localStorage.setItem(storageKey, '1')
      return
    }

    const t = setTimeout(() => setOpen(true), 600)
    return () => clearTimeout(t)
  }, [isAdmin, isReady, products.length, cajaHistorial.length, storageKey])

  const dismiss = () => {
    localStorage.setItem(storageKey, '1')
    setOpen(false)
  }

  return { open, dismiss }
}

// ─── Steps config ─────────────────────────────────────────────────────────────

const STEPS = [
  { id: 'welcome',  label: 'Bienvenida',     icon: Rocket },
  { id: 'empresa',  label: 'Tu negocio',     icon: Store },
  { id: 'producto', label: 'Primer producto', icon: Package },
  { id: 'medios',   label: 'Medios de pago', icon: CreditCard },
  { id: 'caja',     label: 'Abrir caja',     icon: Wallet },
]

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onDismiss: () => void
}

export default function SetupWizard({ open, onDismiss }: Props) {
  const [step, setStep]           = useState(0)
  const [completed, setCompleted] = useState<Set<number>>(new Set())
  const navigate = useNavigate()
  const qc       = useQueryClient()

  const markDone = (s: number) => setCompleted((prev) => new Set(prev).add(s))
  const next     = () => setStep((s) => Math.min(s + 1, STEPS.length - 1))
  const skip     = () => { markDone(step); next() }

  const finish = () => {
    const user = useAuthStore.getState().user
    const storageKey = `simplifypos_setup_complete_${user?.id ?? 'unknown'}`
    localStorage.setItem(storageKey, '1')
    onDismiss()
    toast.success('¡Listo! Tu negocio está configurado 🎉')
  }

  const isLast = step === STEPS.length - 1

  return (
    <Modal open={open} onClose={onDismiss} title="" size="lg" footer={null}>
      <div className="relative">
        {/* Barra de progreso */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              const done    = completed.has(i)
              const current = i === step
              return (
                <div key={s.id} className="flex flex-col items-center gap-1 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    done    ? 'bg-green-500 text-white' :
                    current ? 'bg-[var(--t-primary)] text-white ring-4 ring-[var(--t-primary-xlight)]' :
                              'bg-slate-100 text-slate-400'
                  }`}>
                    {done ? <CheckCircle2 size={16} /> : <Icon size={15} />}
                  </div>
                  <span className={`text-[10px] font-medium hidden sm:block ${current ? 't-text-dk' : 'text-slate-400'}`}>
                    {s.label}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="h-1 bg-slate-100 rounded-full">
            <div
              className="h-1 bg-[var(--t-primary)] rounded-full transition-all duration-500"
              style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Contenido del paso */}
        <div className="min-h-[300px]">
          {step === 0 && <StepWelcome onNext={next} />}
          {step === 1 && <StepEmpresa onDone={() => { markDone(1); next() }} onSkip={skip} qc={qc} />}
          {step === 2 && <StepProducto onDone={() => { markDone(2); next() }} onSkip={skip} qc={qc} />}
          {step === 3 && <StepMedios onDone={() => { markDone(3); next() }} onSkip={skip} />}
          {step === 4 && <StepCaja onDone={() => { markDone(4); finish() }} onSkip={finish} navigate={navigate} />}
        </div>

        {!isLast && (
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
            <button onClick={onDismiss} className="text-xs text-slate-400 hover:text-slate-600">
              Configurar después
            </button>
            <span className="text-xs text-slate-400">{step + 1} / {STEPS.length}</span>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ─── Step 1: Bienvenida ───────────────────────────────────────────────────────

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center py-4 gap-4">
      <div className="w-16 h-16 rounded-2xl bg-[var(--t-primary-xlight)] flex items-center justify-center">
        <Rocket size={32} className="t-text" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">¡Bienvenido a SimplifyPOS!</h2>
        <p className="text-sm text-slate-500 max-w-sm">
          Configura tu negocio en 4 pasos rápidos para empezar a vender hoy mismo.
        </p>
      </div>
      <div className="w-full max-w-sm space-y-2 text-left">
        {[
          { n: 1, label: 'Datos del negocio',  desc: 'Nombre, NIT y dirección para tus facturas' },
          { n: 2, label: 'Primer producto',    desc: 'Lo que vendes y su precio' },
          { n: 3, label: 'Medios de pago',     desc: 'Efectivo, Nequi, tarjeta...' },
          { n: 4, label: 'Abrir caja',         desc: 'Sin caja abierta no se registran ventas' },
        ].map(({ n, label, desc }) => (
          <div key={n} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl">
            <span className="w-6 h-6 rounded-full bg-[var(--t-primary)] text-white flex items-center justify-center text-xs font-bold shrink-0">{n}</span>
            <div>
              <p className="text-sm font-medium text-slate-700">{label}</p>
              <p className="text-[11px] text-slate-400">{desc}</p>
            </div>
          </div>
        ))}
      </div>
      <Button icon={<ChevronRight size={15} />} onClick={onNext} className="mt-1">
        Empezar configuración
      </Button>
    </div>
  )
}

// ─── Step 2: Empresa ──────────────────────────────────────────────────────────

function StepEmpresa({ onDone, onSkip, qc }: {
  onDone: () => void
  onSkip: () => void
  qc: ReturnType<typeof useQueryClient>
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<EmpresaForm>({
    resolver: zodResolver(empresaSchema) as unknown as Resolver<any>,
    defaultValues: { nit: '' },
  })

  const mut = useMutation({
    mutationFn: (data: EmpresaForm) =>
      apiClient.put('/billing/empresa', {
        razon_social:        data.razon_social,
        nit:                 data.nit,
        digito_verificacion: null,
        direccion:           data.direccion || '',
        ciudad:              data.ciudad || '',
        departamento:        '',
        telefono:            data.telefono || '',
        email:               data.email || '',
        regimen_iva:         'NO_RESPONSABLE_IVA',
        regimen_tributario:  'ORDINARIO',
        actividad_economica: '',
        obligaciones:        '',
        leyenda_pie:         'Gracias por su compra',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['empresa'] })
      onDone()
    },
    onError: (err) => toast.error(apiError(err, 'No se pudo guardar. Puedes configurarlo después en Facturación.')),
  })

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-slate-800 mb-0.5">Datos de tu negocio</h3>
        <p className="text-xs text-slate-500">Aparecerán en los recibos y facturas electrónicas.</p>
      </div>
      <form className="space-y-3" onSubmit={handleSubmit((d) => mut.mutate(d))}>
        <Input
          label="Nombre del negocio *"
          {...register('razon_social')}
          error={errors.razon_social?.message}
          placeholder="Ej: Tienda La Esperanza"
          autoFocus
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="NIT *"
            {...register('nit')}
            error={errors.nit?.message}
            placeholder="900123456"
          />
          <Input
            label="Teléfono"
            {...register('telefono')}
            placeholder="300 123 4567"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Ciudad"    {...register('ciudad')}    placeholder="Medellín" />
          <Input label="Dirección" {...register('direccion')} placeholder="Calle 10 #20-30" />
        </div>
        <Input
          label="Email"
          type="email"
          {...register('email')}
          error={errors.email?.message}
          placeholder="negocio@gmail.com"
        />
        <p className="text-[11px] text-slate-400">
          Puedes completar todos los datos fiscales después en <strong>Configuración → Facturación</strong>.
        </p>
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onSkip} className="flex-1">Omitir por ahora</Button>
          <Button type="submit" loading={mut.isPending} icon={<ChevronRight size={14} />} className="flex-1">
            Guardar y continuar
          </Button>
        </div>
      </form>
    </div>
  )
}

// ─── Step 3: Primer producto ──────────────────────────────────────────────────

function StepProducto({ onDone, onSkip, qc }: {
  onDone: () => void
  onSkip: () => void
  qc: ReturnType<typeof useQueryClient>
}) {
  const [precioDisplay, setPrecioDisplay] = useState('')
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ProductoForm>({
    resolver: zodResolver(productoSchema) as unknown as Resolver<any>,
  })

  const mut = useMutation({
    mutationFn: async (data: ProductoForm) => {
      const prod = await apiClient.post<{ id: number }>('/products', {
        nombre: data.nombre,
        stock_inicial: 0,
        precio_costo_inicial: 0,
      })
      await apiClient.post(`/products/${prod.data.id}/prices`, {
        nombre: 'Unidad',
        precio: data.precio,
        cantidad: 1,
      })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); onDone() },
    onError: (err) => toast.error(apiError(err, 'Error al crear producto. Puedes agregarlo después en Productos.')),
  })

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-slate-800 mb-0.5">Agrega tu primer producto</h3>
        <p className="text-xs text-slate-500">Después podrás agregar más desde la sección <strong>Productos</strong>.</p>
      </div>
      <form className="space-y-3" onSubmit={handleSubmit((d) => mut.mutate(d))}>
        <Input
          label="Nombre del producto *"
          {...register('nombre')}
          error={errors.nombre?.message}
          placeholder="Ej: Gaseosa 1L, Empanada de pipián..."
          autoFocus
        />
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">Precio de venta *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={precioDisplay}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '')
                const n   = raw ? parseInt(raw, 10) : 0
                setPrecioDisplay(n > 0 ? n.toLocaleString('es-CO') : '')
                setValue('precio', n, { shouldValidate: true })
              }}
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--t-primary)] focus:border-transparent"
            />
          </div>
          {errors.precio && <p className="text-xs text-red-600">{errors.precio.message}</p>}
        </div>
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onSkip} className="flex-1">Omitir por ahora</Button>
          <Button type="submit" loading={mut.isPending} icon={<ChevronRight size={14} />} className="flex-1">
            Crear y continuar
          </Button>
        </div>
      </form>
    </div>
  )
}

// ─── Step 4: Medios de pago ───────────────────────────────────────────────────

function StepMedios({ onDone, onSkip }: { onDone: () => void; onSkip: () => void }) {
  const { data: medios = [] } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () =>
      apiClient.get<{ id: number; nombre: string; activo: boolean; tipo: string }[]>('/payment-methods')
        .then((r) => r.data),
  })

  const activos = medios.filter((m) => m.activo)

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-slate-800 mb-0.5">Medios de pago activos</h3>
        <p className="text-xs text-slate-500">
          Estos son los medios que tus clientes pueden usar. Edítalos en <strong>Configuración → Medios de pago</strong>.
        </p>
      </div>

      {activos.length > 0 ? (
        <div className="space-y-2">
          {activos.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-3 bg-green-50 border border-green-100 rounded-xl">
              <CheckCircle2 size={16} className="text-green-500 shrink-0" />
              <span className="text-sm font-medium text-slate-700">{m.nombre}</span>
              <span className="ml-auto text-xs text-slate-400 capitalize">{m.tipo?.toLowerCase()}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700">
          No tienes medios de pago activos aún. Ve a{' '}
          <strong>Configuración → Medios de pago</strong> para habilitarlos (Efectivo, Nequi, Tarjeta...).
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button variant="secondary" onClick={onSkip} className="flex-1">Omitir</Button>
        <Button icon={<ChevronRight size={14} />} onClick={onDone} className="flex-1">Continuar</Button>
      </div>
    </div>
  )
}

// ─── Step 5: Caja ─────────────────────────────────────────────────────────────

function StepCaja({ onDone, onSkip, navigate }: {
  onDone: () => void
  onSkip: () => void
  navigate: ReturnType<typeof useNavigate>
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-slate-800 mb-0.5">¡Último paso — abre la caja!</h3>
        <p className="text-xs text-slate-500">Sin caja abierta no se pueden registrar ventas.</p>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-2">
        <div className="flex items-center gap-2">
          <Wallet size={18} className="text-blue-500" />
          <span className="text-sm font-semibold text-blue-800">¿Cómo funciona la caja?</span>
        </div>
        <ul className="text-xs text-blue-700 space-y-1 ml-6 list-disc">
          <li>Al abrir, defines el dinero inicial en efectivo (base).</li>
          <li>Cada venta y pago queda registrado en la sesión.</li>
          <li>Al cerrar, se hace el cuadre automático de caja.</li>
          <li>Sin caja abierta, el sistema bloquea el registro de pagos.</li>
        </ul>
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="secondary" onClick={onSkip} className="flex-1">Terminar sin abrir</Button>
        <Button
          icon={<Wallet size={14} />}
          onClick={() => { onDone(); navigate('/caja') }}
          className="flex-1"
        >
          Ir a abrir caja
        </Button>
      </div>
    </div>
  )
}

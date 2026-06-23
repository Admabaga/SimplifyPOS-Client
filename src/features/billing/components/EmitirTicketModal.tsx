/**
 * EmitirTicketModal — UX de emisión de documento.
 *
 * Flujo en 2 pasos:
 *  1. Selector de tipo: 2 cards grandes (Factura / Factura electrónica)
 *     con explicación clara de cuándo usar cada uno.
 *  2. Form de cliente (solo si POS o FACTURA_VENTA):
 *     - POS: datos opcionales
 *     - FACTURA_VENTA: tipo doc + número + nombre obligatorios (Art. 617 ET)
 *
 * Al confirmar → POST /billing/cuentas/{id}/tickets → muestra el ticket
 * emitido en TicketViewerModal automáticamente.
 */
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Receipt, FileText, ArrowLeft, AlertCircle,
  Check, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal, Button, Input, Select, InfoBanner } from '@/shared/components/ui'
import { billingApi } from '../api'
import type { TipoDocumento, Ticket } from '../types'
import { apiError } from '@/shared/lib/apiError'
import TicketViewerModal from './TicketViewerModal'

interface Props {
  open: boolean
  onClose: () => void
  cuentaId: number
  cuentaNombre: string
}

const clienteSchema = z.object({
  tipo_doc: z.enum(['CC', 'NIT', 'CE', 'PA', 'TI']),
  documento: z.string().min(3, 'Documento requerido'),
  nombre: z.string().min(2, 'Nombre requerido'),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().optional(),
})

export type ClienteForm = z.infer<typeof clienteSchema>

export default function EmitirTicketModal({ open, onClose, cuentaId, cuentaNombre }: Props) {
  const [step, setStep] = useState<'tipo' | 'cliente'>('tipo')
  const [tipoDoc, setTipoDoc] = useState<TipoDocumento | null>(null)
  const [emitted, setEmitted] = useState<Ticket | null>(null)
  const qc = useQueryClient()

  function reset() {
    setStep('tipo')
    setTipoDoc(null)
    setEmitted(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  const emitMutation = useMutation({
    mutationFn: (data: { tipo_documento: TipoDocumento; cliente?: ClienteForm | null }) =>
      billingApi.emitir(cuentaId, data),
    onSuccess: (ticket) => {
      toast.success(`${tituloTipo(ticket.tipo_documento)} emitido — ${ticket.numero_completo}`)
      qc.invalidateQueries({ queryKey: ['billing', 'tickets'] })
      qc.invalidateQueries({ queryKey: ['billing', 'cuenta-tickets', cuentaId] })
      setEmitted(ticket)
    },
    onError: (e) => toast.error(apiError(e)),
  })

  function handleSelectTipo(tipo: TipoDocumento) {
    setTipoDoc(tipo)
    if (tipo === 'INFORMAL') {
      emitMutation.mutate({ tipo_documento: 'INFORMAL' })
    } else {
      setStep('cliente')
    }
  }

  return (
    <>
      <Modal
        open={open && !emitted}
        onClose={handleClose}
        title={step === 'tipo' ? '¿Qué documento necesitas?' : 'Datos del cliente'}
        size="xl"
      >
        {step === 'tipo' && (
          <SelectorTipo
            cuentaNombre={cuentaNombre}
            onSelect={handleSelectTipo}
            loading={emitMutation.isPending}
          />
        )}

        {step === 'cliente' && tipoDoc && (
          <FormCliente
            tipo={tipoDoc}
            loading={emitMutation.isPending}
            onBack={() => setStep('tipo')}
            onSubmit={(data) => emitMutation.mutate({ tipo_documento: tipoDoc, cliente: data })}
          />
        )}
      </Modal>

      {emitted && (
        <TicketViewerModal
          open={!!emitted}
          onClose={handleClose}
          ticket={emitted}
        />
      )}
    </>
  )
}

// ─── Paso 1: selector de tipo ────────────────────────────────────────────────

function SelectorTipo({
  cuentaNombre, onSelect, loading,
}: {
  cuentaNombre: string
  onSelect: (t: TipoDocumento) => void
  loading: boolean
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Cuenta: <span className="font-semibold">{cuentaNombre}</span>
      </p>

      <div className="grid grid-cols-1 gap-3">
        <TipoCard
          icon={<Receipt size={20} />}
          color="slate"
          title="Factura"
          subtitle="Comprobante de venta rápido"
          bullets={[
            'Entrega inmediata al cliente',
            'No requiere datos del cliente',
            'Ideal para el día a día',
          ]}
          onClick={() => onSelect('INFORMAL')}
          disabled={loading}
        />

        <TipoCard
          icon={<FileText size={20} />}
          color="purple"
          title="Factura electrónica"
          subtitle="Validada por la DIAN"
          bullets={[
            'Documento fiscal formal (Art. 617 ET)',
            'Requiere datos del cliente',
            'Numeración autorizada DIAN',
            'Incluye discriminación de IVA',
          ]}
          highlight
          onClick={() => onSelect('FACTURA_VENTA')}
          disabled={loading}
        />
      </div>
    </div>
  )
}

function TipoCard({
  icon, title, subtitle, bullets, color, highlight, onClick, disabled,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  bullets: string[]
  color: 'slate' | 'blue' | 'purple'
  highlight?: boolean
  onClick: () => void
  disabled?: boolean
}) {
  const colors = {
    slate:  { border: 'border-slate-200 hover:border-slate-400 hover:bg-slate-50', icon: 'bg-slate-100 text-slate-700' },
    blue:   { border: 'border-blue-200 hover:border-blue-500 hover:bg-blue-50',   icon: 'bg-blue-100 text-blue-700' },
    purple: { border: 'border-purple-200 hover:border-purple-500 hover:bg-purple-50', icon: 'bg-purple-100 text-purple-700' },
  }[color]

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left rounded-xl border-2 transition-all p-4 ${colors.border} ${highlight ? 'ring-1 ring-purple-100' : ''} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${colors.icon}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <p className="text-[11px] text-slate-500 mb-2">{subtitle}</p>
          <ul className="space-y-0.5">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                <Check size={11} className="text-emerald-600 shrink-0 mt-0.5" />
                {b}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </button>
  )
}

// ─── Paso 2: formulario cliente ───────────────────────────────────────────────

function FormCliente({
  tipo, loading, onBack, onSubmit, initialValues,
}: {
  tipo: TipoDocumento
  loading: boolean
  onBack: () => void
  onSubmit: (data: ClienteForm) => void
  initialValues?: ClienteForm
}) {
  const esFormal = tipo === 'FACTURA_VENTA'
  const schema = esFormal ? clienteSchema : clienteSchema.partial({
    tipo_doc: true, documento: true, nombre: true,
  })

  const { register, handleSubmit, formState: { errors } } = useForm({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues: initialValues ?? {
      tipo_doc: 'CC' as const,
      documento: '', nombre: '', direccion: '', telefono: '', email: '',
    },
  })

  return (
    <form onSubmit={handleSubmit((d) => onSubmit(d as ClienteForm))} className="space-y-3">
      {esFormal && (
        <InfoBanner icon={<AlertCircle size={16} />} variant="info">
          La factura de venta requiere datos completos del cliente (Art. 617 ET).
          Estos datos quedan registrados de forma permanente en el documento.
        </InfoBanner>
      )}

      <div className="grid grid-cols-3 gap-2">
        <Select label="Tipo doc *" {...register('tipo_doc')} options={[
          { value: 'CC', label: 'C.C.' },
          { value: 'NIT', label: 'NIT' },
          { value: 'CE', label: 'C.E.' },
          { value: 'PA', label: 'Pasaporte' },
          { value: 'TI', label: 'T.I.' },
        ]} />
        <div className="col-span-2">
          <Input
            label={esFormal ? "Número *" : "Número"}
            {...register('documento')}
            error={errors.documento?.message as string | undefined}
            placeholder="1020304050"
          />
        </div>
      </div>

      <Input
        label={esFormal ? "Nombre / Razón social *" : "Nombre"}
        {...register('nombre')}
        error={errors.nombre?.message as string | undefined}
      />

      <div className="grid grid-cols-2 gap-2">
        <Input label="Dirección" {...register('direccion')} />
        <Input label="Teléfono" {...register('telefono')} />
      </div>
      <Input label="Email" type="email" {...register('email')} />

      <div className="flex justify-between pt-3 border-t border-slate-100">
        <Button type="button" variant="ghost" icon={<ArrowLeft size={14} />} onClick={onBack}>
          Cambiar tipo
        </Button>
        <Button type="submit" loading={loading}>
          Emitir {tituloTipo(tipo).toLowerCase()}
        </Button>
      </div>
    </form>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tituloTipo(t: TipoDocumento): string {
  switch (t) {
    case 'INFORMAL': return 'Factura'
    case 'FACTURA_VENTA': return 'Factura electrónica'
    default: return 'Documento'
  }
}

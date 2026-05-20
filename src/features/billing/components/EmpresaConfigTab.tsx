import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { Save, Building2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button, Card, Input, Select, Spinner, InfoBanner } from '@/shared/components/ui'
import { billingApi } from '../api'
import type { EmpresaConfigInput } from '../types'
import { apiError } from '@/shared/lib/apiError'

const schema = z.object({
  razon_social: z.string().min(2, 'Mínimo 2 caracteres'),
  nit: z.string().min(5, 'NIT inválido'),
  digito_verificacion: z.string().max(2).optional().nullable(),
  direccion: z.string(),
  ciudad: z.string(),
  departamento: z.string(),
  telefono: z.string(),
  email: z.string(),
  regimen_iva: z.enum(['RESPONSABLE_IVA', 'NO_RESPONSABLE_IVA']),
  regimen_tributario: z.enum(['ORDINARIO', 'SIMPLE']),
  actividad_economica: z.string(),
  obligaciones: z.string(),
  leyenda_pie: z.string(),
})

type FormData = z.infer<typeof schema>

export default function EmpresaConfigTab() {
  const qc = useQueryClient()

  const { data: empresa, isLoading } = useQuery({
    queryKey: ['billing', 'empresa'],
    queryFn: billingApi.getEmpresa,
  })

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: empresa ?? {
      razon_social: '', nit: '', digito_verificacion: '',
      direccion: '', ciudad: '', departamento: '',
      telefono: '', email: '',
      regimen_iva: 'NO_RESPONSABLE_IVA',
      regimen_tributario: 'ORDINARIO',
      actividad_economica: '', obligaciones: '', leyenda_pie: '',
    },
  })

  const saveMutation = useMutation({
    mutationFn: (data: EmpresaConfigInput) => billingApi.upsertEmpresa(data),
    onSuccess: () => {
      toast.success('Configuración guardada')
      qc.invalidateQueries({ queryKey: ['billing', 'empresa'] })
    },
    onError: (e) => toast.error(apiError(e)),
  })

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size={28} /></div>

  return (
    <form onSubmit={handleSubmit((d) => saveMutation.mutate(d as EmpresaConfigInput))} className="space-y-4">
      {!empresa && (
        <InfoBanner icon={<AlertCircle size={16} />} variant="warning">
          Aún no has configurado los datos de tu empresa. Estos son obligatorios para emitir documentos fiscales (POS y facturas de venta).
        </InfoBanner>
      )}

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={18} className="text-slate-600" />
          <h2 className="text-sm font-bold text-slate-800">Identificación</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input label="Razón social *" {...register('razon_social')} error={errors.razon_social?.message} />
          <div className="grid grid-cols-3 gap-2 items-start">
            <div className="col-span-2">
              <Input label="NIT *" {...register('nit')} error={errors.nit?.message} placeholder="900123456" />
            </div>
            <Input label="DV" {...register('digito_verificacion')} placeholder="7" maxLength={2} />
          </div>
          <Input label="Dirección" {...register('direccion')} />
          <Input label="Teléfono" {...register('telefono')} />
          <Input label="Ciudad" {...register('ciudad')} />
          <Input label="Departamento" {...register('departamento')} />
          <Input label="Email" type="email" {...register('email')} />
          <Input label="Código CIIU (actividad económica)" {...register('actividad_economica')} placeholder="4719" />
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-bold text-slate-800 mb-4">Régimen tributario</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select label="Régimen IVA" {...register('regimen_iva')} options={[
            { value: 'NO_RESPONSABLE_IVA', label: 'No responsable de IVA' },
            { value: 'RESPONSABLE_IVA', label: 'Responsable de IVA' },
          ]} />
          <Select label="Régimen tributario" {...register('regimen_tributario')} options={[
            { value: 'ORDINARIO', label: 'Ordinario' },
            { value: 'SIMPLE', label: 'Régimen Simple de Tributación' },
          ]} />
        </div>
        <p className="text-[11px] text-slate-400 mt-3">
          Si eres "No responsable de IVA" no se discriminará IVA en tus facturas.
          Asegúrate de declarar esto correctamente — el régimen aparece en el documento fiscal.
        </p>
      </Card>

      <Card>
        <h2 className="text-sm font-bold text-slate-800 mb-4">Información adicional</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Obligaciones</label>
            <textarea {...register('obligaciones')} rows={2}
              placeholder="Ej: Gran contribuyente (Res. 999), Autorretenedor"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Leyenda pie de página</label>
            <textarea {...register('leyenda_pie')} rows={2}
              placeholder="Ej: No somos responsables del IVA. Régimen simple de tributación."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500" />
            <p className="text-[10px] text-slate-400 mt-1">Aparecerá en el pie de cada documento emitido.</p>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button
          type="submit"
          icon={<Save size={14} />}
          loading={saveMutation.isPending}
          disabled={!isDirty}
        >
          Guardar configuración
        </Button>
      </div>
    </form>
  )
}

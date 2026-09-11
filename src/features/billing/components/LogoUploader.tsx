/**
 * LogoUploader — el comerciante pone su propia marca en los documentos.
 *
 * Dos ideas guían el diseño de esta tarjeta:
 *
 *  1. **Se muestra dónde va a salir, no cómo se ve el archivo.** Un cuadro con
 *     la imagen no le dice nada al tendero; una miniatura del ticket con su
 *     logo arriba, sí. Por eso la vista previa es un recibo, no un marco.
 *  2. **Se muestran las dos versiones.** La térmica imprime en blanco y negro
 *     puro: un logo con degradados se ve precioso en pantalla y sale como una
 *     mancha en el papel. Verlo antes evita el reclamo después.
 */
import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, Trash2, Upload, Printer, Monitor } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button, Card, ConfirmDialog, Spinner } from '@/shared/components/ui'
import { apiError } from '@/shared/lib/apiError'
import { billingApi } from '../api'

const FORMATOS = 'image/png,image/jpeg,image/webp'
const MAX_MB = 3

export default function LogoUploader({ nombreNegocio }: { nombreNegocio?: string }) {
  const qc = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const [confirmarBorrado, setConfirmarBorrado] = useState(false)

  const { data: logo, isLoading } = useQuery({
    queryKey: ['billing', 'logo'],
    queryFn: billingApi.getLogo,
    staleTime: 5 * 60_000,
  })

  const subir = useMutation({
    mutationFn: billingApi.uploadLogo,
    onSuccess: () => {
      toast.success('Logo actualizado')
      qc.invalidateQueries({ queryKey: ['billing', 'logo'] })
    },
    onError: (e) => toast.error(apiError(e, 'No se pudo guardar el logo')),
  })

  const borrar = useMutation({
    mutationFn: billingApi.deleteLogo,
    onSuccess: () => {
      toast.success('Logo eliminado')
      qc.invalidateQueries({ queryKey: ['billing', 'logo'] })
    },
    onError: (e) => toast.error(apiError(e)),
  })

  // El tamaño se valida aquí sólo para dar respuesta inmediata; el servidor
  // vuelve a validarlo porque este chequeo se salta con cualquier cliente.
  function procesar(file: File | undefined) {
    if (!file) return
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`La imagen supera ${MAX_MB} MB. Usa una más liviana.`)
      return
    }
    subir.mutate(file)
  }

  const ocupado = subir.isPending || borrar.isPending

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <ImagePlus size={18} className="text-slate-600" />
            <h2 className="text-sm font-bold text-slate-800">Logo del negocio</h2>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 max-w-md leading-relaxed">
            Aparece en la cabecera de los tickets y en el reporte de caja. Es tu marca la
            que ve el cliente, no la nuestra.
          </p>
        </div>
        {logo && (
          <Button
            type="button"
            size="xs"
            variant="ghost"
            icon={<Trash2 size={12} />}
            onClick={() => setConfirmarBorrado(true)}
            disabled={ocupado}
            className="text-red-600 hover:bg-red-50"
          >
            Quitar
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner size={24} /></div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
          {/* ── Zona de carga ── */}
          <div
            onDragOver={(e) => { e.preventDefault(); setArrastrando(true) }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={(e) => {
              e.preventDefault()
              setArrastrando(false)
              if (!ocupado) procesar(e.dataTransfer.files?.[0])
            }}
            className={`rounded-xl border-2 border-dashed transition-colors px-4 py-6 text-center ${
              arrastrando
                ? 'border-[var(--t-primary)] bg-[var(--t-primary-xlight)]'
                : 'border-slate-200 bg-slate-50/60'
            }`}
          >
            {subir.isPending ? (
              <div className="flex flex-col items-center gap-2 py-2">
                <Spinner size={22} />
                <p className="text-xs text-slate-500">Optimizando la imagen…</p>
              </div>
            ) : logo ? (
              <div className="flex flex-col items-center gap-3">
                <img
                  src={logo.data_uri}
                  alt="Logo del negocio"
                  className="max-h-24 w-auto object-contain"
                />
                <p className="text-[11px] text-slate-400">
                  {logo.ancho} × {logo.alto} px
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 py-2">
                <Upload size={22} className="text-slate-300" />
                <p className="text-xs font-medium text-slate-600">
                  Arrastra tu logo aquí
                </p>
                <p className="text-[11px] text-slate-400">
                  PNG, JPG o WEBP · hasta {MAX_MB} MB
                </p>
              </div>
            )}

            <div className="mt-4">
              <Button
                type="button"
                size="sm"
                variant="outline"
                icon={<ImagePlus size={13} />}
                onClick={() => inputRef.current?.click()}
                disabled={ocupado}
              >
                {logo ? 'Cambiar logo' : 'Elegir archivo'}
              </Button>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept={FORMATOS}
              className="sr-only"
              onChange={(e) => {
                procesar(e.target.files?.[0])
                // Reset: sin esto, volver a elegir el mismo archivo no dispara
                // el evento y parece que el botón no funciona.
                e.target.value = ''
              }}
            />
          </div>

          {/* ── Vista previa: el ticket, no el archivo ── */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              <Printer size={11} /> Así sale impreso
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-3 font-mono text-[9px] leading-relaxed text-slate-800">
              {logo ? (
                <img
                  src={logo.data_uri_mono}
                  alt=""
                  className="mx-auto mb-1.5 max-h-10 w-auto object-contain"
                />
              ) : (
                <div className="mx-auto mb-1.5 flex h-10 items-center justify-center text-[9px] text-slate-300">
                  (sin logo)
                </div>
              )}
              <p className="text-center font-bold uppercase">
                {nombreNegocio?.trim() || 'Tu negocio'}
              </p>
              <p className="text-center text-slate-400">NIT: 900.123.456-7</p>
              <p className="my-1.5 text-center tracking-widest text-slate-300">────────────</p>
              <div className="flex justify-between"><span>Producto</span><span>$ 12.000</span></div>
              <div className="flex justify-between font-bold"><span>TOTAL</span><span>$ 12.000</span></div>
            </div>
            <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-slate-400">
              <Monitor size={11} className="mt-px shrink-0" />
              La impresora térmica es de blanco y negro puro. Un logo con degradados o
              colores claros se ve bien en pantalla y sale lavado en el papel.
            </p>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmarBorrado}
        onCancel={() => setConfirmarBorrado(false)}
        onConfirm={() => { borrar.mutate(); setConfirmarBorrado(false) }}
        title="¿Quitar el logo?"
        message="Los tickets volverán a imprimirse sólo con el nombre del negocio."
        confirmLabel="Quitar"
        danger
        loading={borrar.isPending}
      />
    </Card>
  )
}

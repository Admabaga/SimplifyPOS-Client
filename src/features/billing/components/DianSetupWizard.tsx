/**
 * Wizard de configuración DIAN (2 pasos).
 *
 * 1) Régimen fiscal — tipo persona, CIIU, responsabilidades, ambiente
 * 2) Prueba de emisión — ping al servidor DIAN para validar
 *
 * Nota: datos de empresa → tab "Datos empresa"
 *       resolución DIAN  → tab "Resoluciones DIAN"
 *       Este wizard solo captura lo que es exclusivo de la config DIAN.
 */
import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2, AlertCircle, ChevronRight, ChevronLeft,
  Scale, Zap, Loader2,
} from 'lucide-react'
import {
  Card, Button, Input, Select, InfoBanner,
} from '@/shared/components/ui'
import toast from 'react-hot-toast'
import { billingApi, type DianSetupInput, type DianTestEmissionResult } from '../api'
import type { EmpresaConfig } from '../types'

/* ─── Catálogos DIAN ─────────────────────────────────────────────────────── */
const RESPONSABILIDADES_FISCALES = [
  { code: 'R-99-PN', label: 'No responsable de IVA',       hint: 'La mayoría de tiendas de barrio, restaurantes y negocios pequeños' },
  { code: 'O-47',    label: 'Régimen simple de tributación', hint: 'Si pagas el impuesto SIMPLE (antes IMAS/IMAS)' },
  { code: 'O-13',    label: 'Gran contribuyente',           hint: 'Solo si la DIAN te clasificó expresamente así' },
  { code: 'O-15',    label: 'Autorretenedor',               hint: 'Si la DIAN te autorizó retener en la fuente' },
  { code: 'O-23',    label: 'Agente de retención IVA',      hint: 'Si retienes IVA a tus proveedores' },
] as const

const CIIU_COMUNES = [
  { code: '4711', label: 'Supermercado / tienda de barrio' },
  { code: '4719', label: 'Comercio al por menor en general' },
  { code: '5611', label: 'Restaurante' },
  { code: '5613', label: 'Comida rápida / autoservicio' },
  { code: '5630', label: 'Bar / café' },
  { code: '4771', label: 'Ropa y calzado' },
  { code: '4773', label: 'Productos farmacéuticos' },
  { code: '4774', label: 'Cosméticos y aseo' },
  { code: '9602', label: 'Peluquería / belleza' },
] as const

type StepKey = 'fiscales' | 'prueba'

const STEPS: { key: StepKey; label: string; icon: typeof Scale }[] = [
  { key: 'fiscales', label: 'Configuración DIAN', icon: Scale },
  { key: 'prueba',   label: 'Prueba de emisión',  icon: Zap },
]

interface Props { empresa: EmpresaConfig }

export default function DianSetupWizard({ empresa }: Props) {
  if (empresa.dian_setup_completado === true) return null
  return <Wizard empresa={empresa} />
}

/* ═══════════════════════════════════════════════════════════════════════════
   WIZARD
   ═══════════════════════════════════════════════════════════════════════════ */

function Wizard({ empresa }: { empresa: EmpresaConfig }) {
  const qc = useQueryClient()
  const [step, setStep] = useState<StepKey>('fiscales')

  const [tipoPersona, setTipoPersona] = useState<'NATURAL' | 'JURIDICA'>(
    empresa.tipo_persona ?? 'JURIDICA',
  )
  const [responsabilidades, setResponsabilidades] = useState<string[]>(
    (empresa.responsabilidades_fiscales ?? '').split(',').filter(Boolean),
  )
  const [ciiu, setCiiu] = useState(empresa.actividad_economica_ciiu ?? '')
  const [ambiente, setAmbiente] = useState<'PRUEBAS' | 'PRODUCCION'>(
    empresa.dian_ambiente ?? 'PRUEBAS',
  )
  const [testSetId, setTestSetId] = useState(empresa.dian_test_set_id ?? '')
  const [testResult, setTestResult] = useState<DianTestEmissionResult | null>(null)

  const { refetch: refetchEmpresa } = useQuery({
    queryKey: ['billing', 'empresa'],
    queryFn: billingApi.getEmpresa,
    enabled: false,
  })

  const setupMut = useMutation({
    mutationFn: (data: DianSetupInput) => billingApi.updateDianSetup(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing', 'empresa'] }),
    onError: (err: any) =>
      toast.error(err?.response?.data?.detail ?? 'Error guardando configuración DIAN'),
  })

  const testMut = useMutation({
    mutationFn: billingApi.testDianEmission,
    onSuccess: (r) => {
      setTestResult(r)
      if (r.aceptado) {
        qc.invalidateQueries({ queryKey: ['billing', 'empresa'] })
        toast.success('Prueba aceptada por DIAN — setup completado')
      }
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.detail ?? 'Error en prueba de emisión'),
  })

  const stepValid = useMemo(() => {
    if (step === 'fiscales')
      return responsabilidades.length > 0 && /^\d{4}$/.test(ciiu)
    return testResult?.aceptado === true
  }, [step, responsabilidades, ciiu, testResult])

  const currentIdx = STEPS.findIndex((s) => s.key === step)

  const goNext = async () => {
    if (step === 'fiscales') {
      await setupMut.mutateAsync({
        tipo_persona: tipoPersona,
        responsabilidades_fiscales: responsabilidades.join(','),
        actividad_economica_ciiu: ciiu,
        dian_ambiente: ambiente,
        dian_test_set_id: testSetId || null,
      })
    }
    const next = STEPS[currentIdx + 1]
    if (next) setStep(next.key)
  }

  const goBack = () => {
    const prev = STEPS[currentIdx - 1]
    if (prev) setStep(prev.key)
  }

  // Auto-refrescar cuando prueba es aceptada (el tab desaparecerá solo)
  useEffect(() => {
    if (testResult?.aceptado) {
      const t = setTimeout(() => refetchEmpresa(), 2200)
      return () => clearTimeout(t)
    }
  }, [testResult, refetchEmpresa])

  return (
    <div className="space-y-4">
      <Stepper current={currentIdx} />

      <Card>
        {step === 'fiscales' && (
          <StepFiscales
            tipoPersona={tipoPersona} setTipoPersona={setTipoPersona}
            responsabilidades={responsabilidades} setResponsabilidades={setResponsabilidades}
            ciiu={ciiu} setCiiu={setCiiu}
            ambiente={ambiente} setAmbiente={setAmbiente}
            testSetId={testSetId} setTestSetId={setTestSetId}
          />
        )}
        {step === 'prueba' && (
          <StepPrueba
            testing={testMut.isPending}
            result={testResult}
            onTest={() => testMut.mutate()}
          />
        )}
      </Card>

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          icon={<ChevronLeft size={14} />}
          onClick={goBack}
          disabled={currentIdx === 0}
        >
          Anterior
        </Button>

        {step !== 'prueba' && (
          <Button
            onClick={goNext}
            disabled={!stepValid || setupMut.isPending}
            loading={setupMut.isPending}
          >
            Continuar
            <ChevronRight size={14} className="ml-1" />
          </Button>
        )}
      </div>
    </div>
  )
}

/* ─── Stepper ─────────────────────────────────────────────────────────────── */

function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((s, i) => {
        const Icon = s.icon
        const done   = i < current
        const active = i === current
        return (
          <div key={s.key} className="flex items-center gap-2 shrink-0">
            <div className={[
              'flex items-center gap-2 px-3 py-2 rounded-xl transition-all',
              done   ? 'bg-emerald-50 text-emerald-700' :
              active ? 'bg-violet-50 text-violet-700 ring-2 ring-violet-200' :
                       'bg-slate-50 text-slate-400',
            ].join(' ')}>
              <div className={[
                'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold',
                done   ? 'bg-emerald-500 text-white' :
                active ? 'bg-violet-500 text-white' :
                         'bg-slate-200 text-slate-500',
              ].join(' ')}>
                {done ? <CheckCircle2 size={14} /> : i + 1}
              </div>
              <div className="flex items-center gap-1.5">
                <Icon size={14} />
                <span className="text-xs font-semibold hidden sm:inline">{s.label}</span>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div className={[
                'h-0.5 w-8 rounded',
                done ? 'bg-emerald-300' : 'bg-slate-200',
              ].join(' ')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─── Paso 1: Configuración DIAN ─────────────────────────────────────────── */

function StepFiscales({
  tipoPersona, setTipoPersona,
  responsabilidades, setResponsabilidades,
  ciiu, setCiiu,
  ambiente, setAmbiente,
  testSetId, setTestSetId,
}: {
  tipoPersona: 'NATURAL' | 'JURIDICA'
  setTipoPersona: (v: 'NATURAL' | 'JURIDICA') => void
  responsabilidades: string[]
  setResponsabilidades: (v: string[]) => void
  ciiu: string
  setCiiu: (v: string) => void
  ambiente: 'PRUEBAS' | 'PRODUCCION'
  setAmbiente: (v: 'PRUEBAS' | 'PRODUCCION') => void
  testSetId: string
  setTestSetId: (v: string) => void
}) {
  const toggle = (code: string) =>
    setResponsabilidades(
      responsabilidades.includes(code)
        ? responsabilidades.filter((c) => c !== code)
        : [...responsabilidades, code],
    )

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600">
        Datos que identifican tu negocio ante la DIAN. Los encuentras en tu <strong>RUT</strong>.
        Si tienes dudas, consulta con tu contador.
      </p>

      {/* Tipo persona */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
          Tipo de persona
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(['JURIDICA', 'NATURAL'] as const).map((tipo) => (
            <button
              key={tipo}
              type="button"
              onClick={() => setTipoPersona(tipo)}
              className={[
                'rounded-xl border-2 p-3 text-left transition-all',
                tipoPersona === tipo
                  ? 'border-violet-500 bg-violet-50'
                  : 'border-slate-200 hover:border-slate-300',
              ].join(' ')}
            >
              <div className="font-bold text-sm">
                {tipo === 'JURIDICA' ? 'Persona jurídica' : 'Persona natural'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {tipo === 'JURIDICA'
                  ? 'SAS, LTDA, S.A. — NIT con dígito de verificación'
                  : 'Independiente con cédula — comerciante registrado'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Responsabilidades */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
          ¿Cómo es tu negocio ante la DIAN? <span className="text-red-500">*</span>
        </label>
        <p className="text-[11px] text-slate-500 mb-2">
          Selecciona todas las que aplican. Si tienes dudas, la primera opción aplica para la mayoría.
        </p>
        <div className="space-y-1.5">
          {RESPONSABILIDADES_FISCALES.map((r) => {
            const selected = responsabilidades.includes(r.code)
            return (
              <button
                key={r.code}
                type="button"
                onClick={() => toggle(r.code)}
                className={[
                  'w-full text-left rounded-xl border-2 px-3 py-2.5 transition-all',
                  selected
                    ? 'border-violet-400 bg-violet-50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                ].join(' ')}
              >
                <div className="flex items-center gap-2">
                  <div className={[
                    'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                    selected ? 'border-violet-500 bg-violet-500' : 'border-slate-300',
                  ].join(' ')}>
                    {selected && <CheckCircle2 size={10} className="text-white" />}
                  </div>
                  <span className={['font-semibold text-sm', selected ? 'text-violet-800' : 'text-slate-700'].join(' ')}>
                    {r.label}
                  </span>
                  <span className="ml-auto text-[10px] font-mono text-slate-400">{r.code}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 ml-6">{r.hint}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* CIIU */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
          Actividad económica (CIIU) <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-2">
          {CIIU_COMUNES.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => setCiiu(c.code)}
              className={[
                'text-left rounded-lg border px-2.5 py-1.5 text-xs transition-colors',
                ciiu === c.code
                  ? 'border-violet-400 bg-violet-50 font-semibold'
                  : 'border-slate-200 hover:bg-slate-50',
              ].join(' ')}
            >
              <span className="font-mono font-bold text-violet-600">{c.code}</span>
              {' — '}
              <span className="text-slate-700">{c.label}</span>
            </button>
          ))}
        </div>
        <Input
          value={ciiu}
          onChange={(e) => setCiiu(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="Otro código CIIU (4 dígitos)"
          maxLength={4}
        />
      </div>

      {/* Ambiente */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
          Ambiente DIAN
        </label>
        <Select
          value={ambiente}
          onChange={(e) => setAmbiente(e.target.value as 'PRUEBAS' | 'PRODUCCION')}
          options={[
            { value: 'PRUEBAS',    label: 'Pruebas — valida el setup (recomendado al inicio)' },
            { value: 'PRODUCCION', label: 'Producción — facturas legales reales' },
          ]}
        />
        {ambiente === 'PRODUCCION' && (
          <div className="mt-2">
            <Input
              value={testSetId}
              onChange={(e) => setTestSetId(e.target.value)}
              placeholder="ID set de pruebas DIAN (UUID asignado por DIAN)"
            />
          </div>
        )}
        <p className="text-[11px] text-slate-500 mt-1.5">
          Para pasar a producción necesitas el ID del set de pruebas que DIAN te asigna.
        </p>
      </div>
    </div>
  )
}

/* ─── Paso 2: Prueba de emisión ──────────────────────────────────────────── */

function StepPrueba({
  testing, result, onTest,
}: {
  testing: boolean
  result: DianTestEmissionResult | null
  onTest: () => void
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Enviamos una factura sintética al servidor DIAN para confirmar que todo está conectado.
        No afecta tu numeración real ni genera cobros.
      </p>

      {!result && !testing && (
        <div className="text-center py-6">
          <Button icon={<Zap size={16} />} onClick={onTest} size="lg">
            Hacer prueba de emisión
          </Button>
        </div>
      )}

      {testing && (
        <div className="flex items-center gap-3 justify-center py-8 text-slate-600">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Enviando a DIAN…</span>
        </div>
      )}

      {result && (
        <div className={[
          'rounded-xl border p-4',
          result.aceptado ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50',
        ].join(' ')}>
          <div className="flex items-start gap-3">
            {result.aceptado
              ? <CheckCircle2 size={22} className="text-emerald-600 shrink-0" />
              : <AlertCircle  size={22} className="text-red-600 shrink-0" />
            }
            <div className="flex-1">
              <div className="font-bold text-sm mb-1">
                {result.aceptado ? '¡Prueba aceptada por DIAN!' : 'Prueba rechazada'}
              </div>
              <div className="text-xs text-slate-700 mb-1">
                Estado: <span className="font-mono font-bold">{result.estado}</span>
              </div>
              <div className="text-sm text-slate-700">{result.mensaje}</div>
              {result.tracking_id && (
                <div className="text-[11px] text-slate-500 mt-2 font-mono">
                  Tracking: {result.tracking_id}
                </div>
              )}
            </div>
          </div>
          {!result.aceptado && (
            <div className="mt-3 flex justify-end">
              <Button variant="ghost" size="sm" onClick={onTest}>Reintentar</Button>
            </div>
          )}
          {result.aceptado && (
            <p className="mt-3 text-xs text-emerald-700">
              Marcando setup como completado…
            </p>
          )}
        </div>
      )}

      {!result && !testing && (
        <InfoBanner variant="info">
          <span className="text-xs">
            Asegúrate de tener una <strong>resolución activa</strong> en la pestaña{' '}
            <strong>Resoluciones DIAN</strong> antes de hacer la prueba.
          </span>
        </InfoBanner>
      )}
    </div>
  )
}

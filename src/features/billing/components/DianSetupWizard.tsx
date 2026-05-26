/**
 * Wizard de configuración DIAN multi-tenant (4 pasos).
 *
 * 1) Datos fiscales empresa (NIT, razón social, dirección)
 * 2) Responsabilidades fiscales DIAN (tipo persona, CIIU, códigos R-99-PN/O-13)
 * 3) Resolución de numeración + clave técnica
 * 4) Test de emisión al ambiente DIAN PRUEBAS
 *
 * Estados:
 *   - Setup incompleto → muestra wizard
 *   - Setup completo  → muestra resumen + botón "Reconfigurar"
 *
 * Microcopy claro orientado al comerciante colombiano (cero jerga técnica
 * innecesaria, explicaciones en lenguaje natural).
 */
import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2, AlertCircle, ChevronRight, ChevronLeft,
  Building2, Scale, FileCheck, Zap, ExternalLink, Loader2,
  ShieldCheck, RefreshCw,
} from 'lucide-react'
import {
  Card, Button, Input, Select, Badge, InfoBanner, SectionHeader,
} from '@/shared/components/ui'
import toast from 'react-hot-toast'
import { billingApi, type DianSetupInput, type DianTestEmissionResult } from '../api'
import type { EmpresaConfig } from '../types'

/* ─── Catálogos DIAN ─────────────────────────────────────────────────────────
   Referencia: cartilla DIAN "Facturación Electrónica de Venta — Anexo Técnico
   1.9". Solo incluimos los códigos relevantes para PYME colombiana. */
const RESPONSABILIDADES_FISCALES = [
  { code: 'O-13', label: 'Gran contribuyente' },
  { code: 'O-15', label: 'Autorretenedor' },
  { code: 'O-23', label: 'Agente de retención IVA' },
  { code: 'O-47', label: 'Régimen simple de tributación' },
  { code: 'R-99-PN', label: 'No aplica / No responsable de IVA' },
] as const

const CIIU_COMUNES = [
  { code: '4711', label: 'Supermercado / tienda de barrio' },
  { code: '4719', label: 'Comercio al por menor en general' },
  { code: '5611', label: 'Restaurante' },
  { code: '5613', label: 'Comida rápida / autoservicio' },
  { code: '5630', label: 'Bar / café' },
  { code: '4771', label: 'Ropa y calzado' },
  { code: '4773', label: 'Productos farmacéuticos (farmacia)' },
  { code: '4774', label: 'Productos cosméticos y de aseo' },
  { code: '9602', label: 'Peluquería / belleza' },
] as const

interface Props {
  empresa: EmpresaConfig
}

type StepKey = 'datos' | 'fiscales' | 'resolucion' | 'prueba'

const STEPS: { key: StepKey; label: string; icon: typeof Building2 }[] = [
  { key: 'datos',      label: 'Datos empresa',     icon: Building2 },
  { key: 'fiscales',   label: 'Régimen fiscal',    icon: Scale },
  { key: 'resolucion', label: 'Resolución DIAN',   icon: FileCheck },
  { key: 'prueba',     label: 'Prueba de emisión', icon: Zap },
]

export default function DianSetupWizard({ empresa }: Props) {
  const completo = empresa.dian_setup_completado === true
  const [reconfigurar, setReconfigurar] = useState(false)

  if (completo && !reconfigurar) {
    return <DianSetupResumen empresa={empresa} onReconfigurar={() => setReconfigurar(true)} />
  }

  return <Wizard empresa={empresa} onClose={() => setReconfigurar(false)} />
}

/* ═════════════════════════════════════════════════════════════════════════════
   RESUMEN — visible cuando setup ya está completo
   ═════════════════════════════════════════════════════════════════════════════ */

function DianSetupResumen({
  empresa,
  onReconfigurar,
}: {
  empresa: EmpresaConfig
  onReconfigurar: () => void
}) {
  const enProduccion = empresa.dian_ambiente === 'PRODUCCION'
  const ultimaPrueba = empresa.dian_ultima_prueba_at
    ? new Date(empresa.dian_ultima_prueba_at).toLocaleDateString('es-CO', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : null

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck size={26} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-base font-bold text-slate-900">
                Facturación electrónica DIAN configurada
              </h3>
              <Badge variant={enProduccion ? 'green' : 'yellow'} dot>
                {enProduccion ? 'En producción' : 'Modo pruebas'}
              </Badge>
            </div>
            <p className="text-sm text-slate-600">
              Tu negocio está listo para emitir facturas electrónicas legales en Colombia.
              {ultimaPrueba && (
                <>
                  {' '}
                  Última verificación: <strong>{ultimaPrueba}</strong>.
                </>
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <ResumenItem label="Tipo de persona" value={empresa.tipo_persona ?? 'JURIDICA'} />
          <ResumenItem
            label="Actividad CIIU"
            value={empresa.actividad_economica_ciiu || '—'}
          />
          <ResumenItem
            label="Ambiente DIAN"
            value={empresa.dian_ambiente ?? 'PRUEBAS'}
          />
        </div>

        {!enProduccion && (
          <InfoBanner variant="warning">
            <span className="text-xs">
              Estás emitiendo en <strong>ambiente de pruebas</strong>. Las facturas no son
              válidas legalmente. Cuando estés listo, cambia a producción desde "Reconfigurar".
            </span>
          </InfoBanner>
        )}

        <div className="flex justify-end">
          <Button
            variant="ghost"
            icon={<RefreshCw size={14} />}
            onClick={onReconfigurar}
          >
            Reconfigurar
          </Button>
        </div>
      </div>
    </Card>
  )
}

function ResumenItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div className="text-sm font-semibold text-slate-700 truncate mt-0.5">
        {value}
      </div>
    </div>
  )
}

/* ═════════════════════════════════════════════════════════════════════════════
   WIZARD — flujo de 4 pasos
   ═════════════════════════════════════════════════════════════════════════════ */

function Wizard({ empresa, onClose }: { empresa: EmpresaConfig; onClose: () => void }) {
  const qc = useQueryClient()
  const [step, setStep] = useState<StepKey>('datos')

  // Estado del formulario
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

  // Refrescar empresa al completar
  const { refetch: refetchEmpresa } = useQuery({
    queryKey: ['billing', 'empresa'],
    queryFn: billingApi.getEmpresa,
    enabled: false,
  })

  // Mutations
  const setupMut = useMutation({
    mutationFn: (data: DianSetupInput) => billingApi.updateDianSetup(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing', 'empresa'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail ?? 'Error guardando configuración DIAN')
    },
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
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail ?? 'Error en prueba de emisión')
    },
  })

  // Validación por paso
  const stepValid = useMemo(() => {
    switch (step) {
      case 'datos':
        return !!empresa.razon_social && !!empresa.nit && !!empresa.direccion
      case 'fiscales':
        return responsabilidades.length > 0 && ciiu.length === 4 && /^\d{4}$/.test(ciiu)
      case 'resolucion':
        return true // resoluciones se manejan en su propia tab, este paso es informativo
      case 'prueba':
        return testResult?.aceptado === true
    }
  }, [step, empresa, responsabilidades, ciiu, testResult])

  // Navegación
  const currentIdx = STEPS.findIndex((s) => s.key === step)
  const goNext = async () => {
    // Persistir cambios fiscales al salir del paso 2
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

  // Auto-cerrar al completar
  useEffect(() => {
    if (testResult?.aceptado) {
      const t = setTimeout(() => {
        refetchEmpresa()
        onClose()
      }, 2200)
      return () => clearTimeout(t)
    }
  }, [testResult, onClose, refetchEmpresa])

  return (
    <div className="space-y-4">
      <Stepper current={currentIdx} />

      <Card>
        {step === 'datos' && <StepDatos empresa={empresa} />}
        {step === 'fiscales' && (
          <StepFiscales
            tipoPersona={tipoPersona} setTipoPersona={setTipoPersona}
            responsabilidades={responsabilidades} setResponsabilidades={setResponsabilidades}
            ciiu={ciiu} setCiiu={setCiiu}
            ambiente={ambiente} setAmbiente={setAmbiente}
            testSetId={testSetId} setTestSetId={setTestSetId}
          />
        )}
        {step === 'resolucion' && <StepResolucion />}
        {step === 'prueba' && (
          <StepPrueba
            testing={testMut.isPending}
            result={testResult}
            onTest={() => testMut.mutate()}
          />
        )}
      </Card>

      {/* Navegación */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          icon={<ChevronLeft size={14} />}
          onClick={goBack}
          disabled={currentIdx === 0}
        >
          Anterior
        </Button>

        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
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
    </div>
  )
}

/* ═════════════════════════════════════════════════════════════════════════════
   STEPPER visual
   ═════════════════════════════════════════════════════════════════════════════ */

function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1">
      {STEPS.map((s, i) => {
        const Icon = s.icon
        const done = i < current
        const active = i === current
        return (
          <div key={s.key} className="flex items-center gap-1 sm:gap-2 shrink-0">
            <div
              className={[
                'flex items-center gap-2 px-3 py-2 rounded-xl transition-all',
                done ? 'bg-emerald-50 text-emerald-700' :
                active ? 'bg-violet-50 text-violet-700 ring-2 ring-violet-200' :
                'bg-slate-50 text-slate-400',
              ].join(' ')}
            >
              <div className={[
                'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold',
                done ? 'bg-emerald-500 text-white' :
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
                'h-0.5 w-4 sm:w-8 rounded',
                done ? 'bg-emerald-300' : 'bg-slate-200',
              ].join(' ')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ═════════════════════════════════════════════════════════════════════════════
   PASO 1 — Datos empresa (lectura)
   ═════════════════════════════════════════════════════════════════════════════ */

function StepDatos({ empresa }: { empresa: EmpresaConfig }) {
  const completo = !!(empresa.razon_social && empresa.nit && empresa.direccion)
  return (
    <div className="space-y-4">
      <SectionHeader title="1. Datos fiscales de tu negocio" icon={<Building2 size={16} />} />
      <p className="text-sm text-slate-600">
        Antes de configurar la facturación electrónica, asegúrate de que los datos básicos
        de tu negocio estén completos: razón social, NIT y dirección. Estos aparecerán en
        cada factura que emitas.
      </p>

      {completo ? (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 space-y-2">
          <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
            <CheckCircle2 size={16} /> Datos completos
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
            <Field label="Razón social" value={empresa.razon_social} />
            <Field label="NIT" value={`${empresa.nit}${empresa.digito_verificacion ? `-${empresa.digito_verificacion}` : ''}`} />
            <Field label="Dirección" value={`${empresa.direccion}, ${empresa.ciudad}`} />
            <Field label="Teléfono" value={empresa.telefono || '—'} />
          </div>
        </div>
      ) : (
        <InfoBanner variant="warning">
          <span className="text-xs">
            Faltan datos. Ve a la pestaña <strong>Datos empresa</strong> y completa la
            información antes de continuar.
          </span>
        </InfoBanner>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="font-medium truncate">{value}</div>
    </div>
  )
}

/* ═════════════════════════════════════════════════════════════════════════════
   PASO 2 — Régimen fiscal
   ═════════════════════════════════════════════════════════════════════════════ */

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
      <SectionHeader title="2. Régimen fiscal DIAN" icon={<Scale size={16} />} />

      <p className="text-sm text-slate-600">
        Esto le dice a la DIAN bajo qué normas operas. Lo encuentras en tu <strong>RUT</strong>{' '}
        (Registro Único Tributario) — si tienes dudas, pregúntale a tu contador.
      </p>

      {/* Tipo persona */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
          ¿Estás registrado como…?
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTipoPersona('JURIDICA')}
            className={[
              'rounded-xl border-2 p-3 text-left transition-all',
              tipoPersona === 'JURIDICA'
                ? 'border-violet-500 bg-violet-50'
                : 'border-slate-200 hover:border-slate-300',
            ].join(' ')}
          >
            <div className="font-bold text-sm">Persona jurídica</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              SAS, LTDA, S.A. — NIT con dígito de verificación
            </div>
          </button>
          <button
            type="button"
            onClick={() => setTipoPersona('NATURAL')}
            className={[
              'rounded-xl border-2 p-3 text-left transition-all',
              tipoPersona === 'NATURAL'
                ? 'border-violet-500 bg-violet-50'
                : 'border-slate-200 hover:border-slate-300',
            ].join(' ')}
          >
            <div className="font-bold text-sm">Persona natural</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Independiente con cédula — comerciante registrado
            </div>
          </button>
        </div>
      </div>

      {/* Responsabilidades */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
          Responsabilidades fiscales <span className="text-red-500">*</span>
        </label>
        <p className="text-[11px] text-slate-500 mb-2">
          Marca todas las que aplican. Si no estás seguro, casi todas las tiendas de barrio
          solo necesitan marcar "No responsable de IVA".
        </p>
        <div className="space-y-1.5">
          {RESPONSABILIDADES_FISCALES.map((r) => (
            <label
              key={r.code}
              className={[
                'flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors',
                responsabilidades.includes(r.code)
                  ? 'border-violet-300 bg-violet-50'
                  : 'border-slate-200 hover:bg-slate-50',
              ].join(' ')}
            >
              <input
                type="checkbox"
                checked={responsabilidades.includes(r.code)}
                onChange={() => toggle(r.code)}
                className="rounded"
              />
              <span className="text-[10px] font-mono font-bold text-slate-500 w-16">
                {r.code}
              </span>
              <span className="text-sm">{r.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* CIIU */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
          Actividad económica (CIIU) <span className="text-red-500">*</span>
        </label>
        <p className="text-[11px] text-slate-500 mb-2">
          Código de 4 dígitos según la actividad principal de tu negocio.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          {CIIU_COMUNES.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => setCiiu(c.code)}
              className={[
                'text-left rounded-lg border px-3 py-2 text-xs transition-colors',
                ciiu === c.code
                  ? 'border-violet-400 bg-violet-50 font-semibold'
                  : 'border-slate-200 hover:bg-slate-50',
              ].join(' ')}
            >
              <span className="font-mono font-bold text-violet-600">{c.code}</span>{' '}
              <span className="text-slate-700">— {c.label}</span>
            </button>
          ))}
        </div>
        <Input
          value={ciiu}
          onChange={(e) => setCiiu(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="O escribe otro código de 4 dígitos"
          maxLength={4}
        />
      </div>

      {/* Ambiente */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
          Ambiente DIAN
        </label>
        <Select
          value={ambiente}
          onChange={(e) => setAmbiente(e.target.value as 'PRUEBAS' | 'PRODUCCION')}
          options={[
            { value: 'PRUEBAS', label: 'PRUEBAS — para validar el setup (recomendado al inicio)' },
            { value: 'PRODUCCION', label: 'PRODUCCIÓN — facturas legales reales' },
          ]}
        />
        <p className="text-[11px] text-slate-500 mt-1.5">
          Para pasar a producción, primero debes superar el set de pruebas que asigna DIAN.
        </p>
      </div>

      {ambiente === 'PRODUCCION' && (
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            ID set de pruebas DIAN
          </label>
          <Input
            value={testSetId}
            onChange={(e) => setTestSetId(e.target.value)}
            placeholder="UUID que DIAN te asignó al aprobar tus pruebas"
          />
        </div>
      )}
    </div>
  )
}

/* ═════════════════════════════════════════════════════════════════════════════
   PASO 3 — Resolución DIAN (informativo, gestión real está en otra tab)
   ═════════════════════════════════════════════════════════════════════════════ */

function StepResolucion() {
  return (
    <div className="space-y-4">
      <SectionHeader title="3. Resolución de numeración DIAN" icon={<FileCheck size={16} />} />

      <p className="text-sm text-slate-600">
        Cada factura electrónica usa un número consecutivo dentro de un rango autorizado por
        la DIAN. Necesitas tener una <strong>resolución activa</strong> con su clave técnica.
      </p>

      <div className="space-y-2 text-sm">
        <Paso n="A">
          Entra a <a
            href="https://muisca.dian.gov.co"
            target="_blank"
            rel="noreferrer"
            className="text-violet-600 hover:underline inline-flex items-center gap-1"
          >
            muisca.dian.gov.co <ExternalLink size={11} />
          </a>{' '}
          con tu firma electrónica.
        </Paso>
        <Paso n="B">
          Solicita resolución de numeración para <strong>"Factura electrónica de venta"</strong>.
          DIAN te entregará prefijo + rango + clave técnica.
        </Paso>
        <Paso n="C">
          Vuelve a SimplifyPOS → pestaña <strong>Resoluciones DIAN</strong> → "Crear resolución"
          y copia los datos exactos.
        </Paso>
      </div>

      <InfoBanner variant="info">
        <span className="text-xs">
          Si ya tienes resolución activa, este paso ya está hecho — solo continúa al
          siguiente.
        </span>
      </InfoBanner>
    </div>
  )
}

function Paso({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0">
        {n}
      </div>
      <div className="flex-1 text-slate-700">{children}</div>
    </div>
  )
}

/* ═════════════════════════════════════════════════════════════════════════════
   PASO 4 — Prueba de emisión
   ═════════════════════════════════════════════════════════════════════════════ */

function StepPrueba({
  testing,
  result,
  onTest,
}: {
  testing: boolean
  result: DianTestEmissionResult | null
  onTest: () => void
}) {
  return (
    <div className="space-y-4">
      <SectionHeader title="4. Verifica con una emisión de prueba" icon={<Zap size={16} />} />

      <p className="text-sm text-slate-600">
        Vamos a enviar una factura sintética al ambiente de pruebas DIAN para confirmar que
        todo está conectado. <strong>No afecta tu numeración real</strong> ni se cobra al
        cliente — es solo un ping al servidor de DIAN.
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
        <div
          className={[
            'rounded-xl border p-4',
            result.aceptado
              ? 'border-emerald-200 bg-emerald-50'
              : 'border-red-200 bg-red-50',
          ].join(' ')}
        >
          <div className="flex items-start gap-3">
            {result.aceptado ? (
              <CheckCircle2 size={22} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={22} className="text-red-600 shrink-0" />
            )}
            <div className="flex-1">
              <div className="font-bold text-sm mb-1">
                {result.aceptado ? '¡Prueba aceptada por DIAN!' : 'Prueba rechazada'}
              </div>
              <div className="text-xs text-slate-700 mb-2">
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
              <Button variant="ghost" size="sm" onClick={onTest}>
                Reintentar
              </Button>
            </div>
          )}
          {result.aceptado && (
            <div className="mt-3 text-xs text-emerald-700">
              Marcando setup como completado…
            </div>
          )}
        </div>
      )}
    </div>
  )
}

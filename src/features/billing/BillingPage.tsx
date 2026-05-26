/**
 * /admin/billing — Facturación legal Colombia.
 *
 * Acceso por rol:
 *   - master / admin (facturacion:configure)  → todas las pestañas
 *   - supervisor / cajero (facturacion:read)  → solo "Documentos emitidos"
 *
 * Resumen rápido arriba (cards) muestra estado de configuración y métricas
 * de documentos sin abrir cada pestaña.
 */
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Building2, FileText, ScrollText, CheckCircle2, AlertTriangle, Lock, ShieldCheck,
} from 'lucide-react'
import { PageHeader, TabBar, Card, Spinner } from '@/shared/components/ui'
import { useAuthStore } from '@/stores/auth'
import { billingApi } from './api'
import EmpresaConfigTab from './components/EmpresaConfigTab'
import ResolucionesTab from './components/ResolucionesTab'
import TicketsHistorialTab from './components/TicketsHistorialTab'
import DianSetupWizard from './components/DianSetupWizard'

type Tab = 'empresa' | 'dian' | 'resoluciones' | 'historial'

export default function BillingPage() {
  const can  = useAuthStore((s) => s.can)
  const user = useAuthStore((s) => s.user)

  // Doble barrera: permiso + rol. Supervisor/cajero no ven config aunque
  // su JWT tenga el permiso por datos obsoletos (antes de la migración).
  const adminRoles = ['master', 'admin']
  const isAdminOrMaster = adminRoles.includes(user?.role ?? '')
  const canConfigure = isAdminOrMaster && can('facturacion:configure')

  // Si no puede configurar, solo verá historial.
  const defaultTab: Tab = canConfigure ? 'empresa' : 'historial'
  const [tab, setTab] = useState<Tab>(defaultTab)

  // Resumen: solo lo cargamos si tiene permiso de configuración
  const { data: empresa, isLoading: loadingEmp } = useQuery({
    queryKey: ['billing', 'empresa'],
    queryFn: billingApi.getEmpresa,
    enabled: canConfigure,
  })

  const { data: resoluciones = [], isLoading: loadingRes } = useQuery({
    queryKey: ['billing', 'resoluciones'],
    queryFn: billingApi.listResoluciones,
    enabled: canConfigure,
  })

  const { data: tickets = [], isLoading: loadingTk } = useQuery({
    queryKey: ['billing', 'tickets'],
    queryFn: () => billingApi.listTickets(1000, 0),
  })

  // ── KPIs derivados ────────────────────────────────────────────────────────
  const resActiva = useMemo(() => resoluciones.find((r) => r.activa) ?? null, [resoluciones])
  const recibos   = useMemo(() => tickets.filter((t) => t.tipo_documento === 'INFORMAL'),   [tickets])
  const dian      = useMemo(() => tickets.filter((t) => t.tipo_documento !== 'INFORMAL'),   [tickets])
  const emitidasMes = useMemo(() => {
    const now = new Date()
    const m = now.getMonth(); const y = now.getFullYear()
    return tickets.filter((t) => {
      const d = new Date(t.fecha_emision)
      return d.getMonth() === m && d.getFullYear() === y && t.estado === 'EMITIDA'
    }).length
  }, [tickets])

  // Resoluciones con problemas (próximas a vencerse o sin números)
  const resAlertas = useMemo(() => {
    if (!resActiva) return 0
    const diasParaVencer = Math.floor(
      (new Date(resActiva.fecha_vigencia_hasta).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
    return (diasParaVencer < 30 || resActiva.numeros_disponibles < 20) ? 1 : 0
  }, [resActiva])

  // ── Tabs visibles ────────────────────────────────────────────────────────
  const tabs = useMemo(() => {
    const all: { key: Tab; label: string; dot?: 'red' | 'yellow' | 'green' }[] = []
    if (canConfigure) {
      all.push({
        key: 'empresa',
        label: 'Datos empresa',
        dot: empresa ? 'green' : 'red',
      })
      // Solo mostrar tab DIAN si el setup está incompleto
      if (!empresa?.dian_setup_completado) {
        all.push({
          key: 'dian',
          label: 'Facturación electrónica',
          dot: empresa ? 'yellow' : 'red',
        })
      }
      all.push({
        key: 'resoluciones',
        label: 'Resoluciones DIAN',
        dot: resActiva ? (resAlertas ? 'yellow' : 'green') : 'red',
      })
    }
    all.push({ key: 'historial', label: 'Documentos emitidos' })
    return all
  }, [canConfigure, empresa, resActiva, resAlertas])

  const loadingResumen = canConfigure && (loadingEmp || loadingRes || loadingTk)

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Facturación legal"
        subtitle={
          canConfigure
            ? 'Configura tu empresa y resoluciones DIAN para emitir documentos fiscales'
            : 'Consulta los documentos fiscales emitidos por tu negocio'
        }
      />

      {/* ─── Resumen (sólo si puede configurar) ────────────────────────── */}
      {canConfigure && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <ResumenCard
            icon={<Building2 size={18} />}
            label="Datos empresa"
            loading={loadingResumen}
            ok={!!empresa}
            okText={empresa?.razon_social ?? ''}
            warnText="Sin configurar"
            onClick={() => setTab('empresa')}
          />
          <ResumenCard
            icon={<ShieldCheck size={18} />}
            label="Facturación electrónica"
            loading={loadingResumen}
            ok={!!empresa?.dian_setup_completado}
            okText={
              empresa?.dian_ambiente === 'PRODUCCION'
                ? 'Producción · activa'
                : 'Pruebas · validada'
            }
            warnText={empresa ? 'Pendiente de prueba' : 'Sin configurar'}
            warnLevel={empresa && !empresa.dian_setup_completado ? 'yellow' : undefined}
            onClick={() => setTab('dian')}
          />
          <ResumenCard
            icon={<FileText size={18} />}
            label="Resolución DIAN activa"
            loading={loadingResumen}
            ok={!!resActiva}
            okText={resActiva ? `${resActiva.prefijo || 'N/A'} · ${resActiva.numeros_disponibles} disponibles` : ''}
            warnText={resActiva ? '' : 'Sin resolución activa'}
            warnLevel={resAlertas ? 'yellow' : undefined}
            onClick={() => setTab('resoluciones')}
          />
          <ResumenCard
            icon={<ScrollText size={18} />}
            label="Recibos informales"
            loading={loadingResumen}
            ok
            okText={`${recibos.length} total · ${emitidasMes} este mes`}
          />
          <ResumenCard
            icon={<ScrollText size={18} />}
            label="Documentos DIAN"
            loading={loadingResumen}
            ok
            okText={`${dian.length} emitidos`}
          />
        </div>
      )}

      {/* ─── Aviso para supervisor / cajero ─────────────────────────────── */}
      {!canConfigure && (
        <Card>
          <div className="flex items-start gap-3 p-1">
            <Lock size={18} className="text-slate-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-500">
              Sólo administradores pueden ver y editar los datos de la empresa y las resoluciones DIAN.
              Puedes consultar los documentos emitidos abajo.
            </div>
          </div>
        </Card>
      )}

      <TabBar
        active={tab}
        onChange={(k) => setTab(k as Tab)}
        tabs={tabs}
      />

      {tab === 'empresa'     && canConfigure && <EmpresaConfigTab />}
      {tab === 'dian' && canConfigure && !empresa?.dian_setup_completado && (
        empresa
          ? <DianSetupWizard empresa={empresa} />
          : <Card><div className="text-sm text-slate-500 text-center py-6">
              Primero completa los datos de tu empresa en la pestaña anterior.
            </div></Card>
      )}
      {tab === 'resoluciones' && canConfigure && <ResolucionesTab />}
      {tab === 'historial'    && <TicketsHistorialTab />}
    </div>
  )
}

/* ─── Resumen Card ───────────────────────────────────────────────────────── */

function ResumenCard({
  icon, label, ok, okText, warnText, warnLevel, loading, onClick,
}: {
  icon: React.ReactNode
  label: string
  ok: boolean
  okText: string
  warnText?: string
  warnLevel?: 'yellow'
  loading?: boolean
  onClick?: () => void
}) {
  const color = !ok
    ? { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'text-red-500' }
    : warnLevel === 'yellow'
      ? { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: 'text-yellow-500' }
      : { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'text-emerald-600' }

  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      onClick={onClick}
      className={`text-left rounded-2xl border ${color.border} ${color.bg} p-3.5 transition-all ${onClick ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : ''}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={color.icon}>{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
        {!loading && (ok
          ? <CheckCircle2 size={13} className={`${color.icon} ml-auto`} />
          : <AlertTriangle  size={13} className={`${color.icon} ml-auto`} />
        )}
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <Spinner size={12} /> Cargando…
        </div>
      ) : (
        <p className={`text-xs font-semibold ${color.text} truncate`}>
          {ok ? okText : (warnText ?? 'Pendiente')}
        </p>
      )}
    </Comp>
  )
}

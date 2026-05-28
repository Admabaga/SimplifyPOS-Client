import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useBarcode } from '@/shared/hooks/useBarcode'
import Fuse from 'fuse.js'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Resolver } from 'react-hook-form'
import { z } from 'zod'
import {
  ArrowLeft, Plus, Trash2, ShoppingCart, CreditCard, ChevronDown, ChevronUp,
  CheckCircle2, AlertCircle, Search, Package, X, Receipt,
  FileText, Eye, Hash, Calendar, TrendingUp, Wallet,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  Button, Card, Badge, Spinner, EmptyState, Modal, ConfirmDialog,
  ProgressBar, SectionHeader, InfoBanner, Input, Select,
} from '@/shared/components/ui'
import Can from '@/shared/components/Can'
import { formatCOP, formatDate, formatDateTime } from '@/shared/lib/formatters'
import { apiError } from '@/shared/lib/apiError'
import { cuentasApi } from './api'
import type { AddVentaDto, AddPagoDto, AsignarClienteDto } from './api'
import { productsApi } from '@/features/products/api'
import { apiClient } from '@/shared/api/client'
import type { Cuenta, MedioPago, Venta } from '@/shared/types'
import { useCajaGuard } from '@/shared/hooks/useCajaGuard'
import EmitirTicketModal, { type ClienteForm } from '@/features/billing/components/EmitirTicketModal'
import TicketViewerModal from '@/features/billing/components/TicketViewerModal'
import { billingApi } from '@/features/billing/api'
import type { Ticket } from '@/features/billing/types'

// ─── Schemas ─────────────────────────────────────────────────────────────────

const ventaSchema = z.object({
  producto_id: z.coerce.number().min(1, 'Requerido'),
  producto_precio_id: z.coerce.number().min(1, 'Requerido'),
  cantidad: z.coerce.number().min(1, 'Mínimo 1'),
})

const pagoSchema = z.object({
  medio_pago_id: z.coerce.number().min(1, 'Requerido'),
  descripcion: z.string().optional(),
})

type VentaForm = z.infer<typeof ventaSchema>
type PagoForm = z.infer<typeof pagoSchema>

// ─── Hook formateo de monto (evita bug NumberInput+RHF con separadores de miles) ─

function useMontoInput(initialValue = 0) {
  const fmt = (n: number) => (n > 0 ? n.toLocaleString('es-CO') : '')
  const [display, setDisplay] = useState(fmt(initialValue))

  const inputProps = {
    type: 'text' as const,
    inputMode: 'numeric' as const,
    value: display,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9]/g, '')
      setDisplay(raw ? parseInt(raw, 10).toLocaleString('es-CO') : '')
    },
  }

  const numericValue = () => {
    const raw = display.replace(/[^0-9]/g, '')
    return raw ? parseInt(raw, 10) : 0
  }

  const setFromNumber = (n: number) => setDisplay(fmt(n))

  return { inputProps, numericValue, setFromNumber }
}

// ─── Ventas agrupadas ────────────────────────────────────────────────────────

interface VentaAgrupada {
  producto_id: number
  producto_nombre: string
  totalCantidad: number
  totalPrecio: number
  totalGanancia: number
  ventas: Venta[]
  expandido: boolean
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>()
  const cuentaId = Number(id)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { requireCaja } = useCajaGuard()

  const [showAddVenta, setShowAddVenta] = useState(false)
  const [showAddPago, setShowAddPago] = useState(false)
  const [showTicket, setShowTicket] = useState(false)
  const [deleteVentaId, setDeleteVentaId] = useState<number | null>(null)
  const [deletePagoId, setDeletePagoId] = useState<number | null>(null)
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set())
  const [barcodeProductId, setBarcodeProductId] = useState<number | null>(null)
  const [showClienteModal, setShowClienteModal] = useState(false)
  const [autoTicket, setAutoTicket] = useState<Ticket | null>(null)  // ticket generado automáticamente
  const [viewTicket, setViewTicket] = useState<Ticket | null>(null)  // ticket existente que se está viendo

  const { data: cuenta, isLoading } = useQuery({
    queryKey: ['accounts', cuentaId],
    queryFn: () => cuentasApi.getById(cuentaId),
  })

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.getAll(),
  })

  const { data: mediosPago = [] } = useQuery({
    queryKey: ['medios-pago'],
    queryFn: () => apiClient.get<MedioPago[]>('/payment-methods').then((r) => r.data),
  })

  // Tickets emitidos para esta cuenta (factura / POS / recibo informal)
  const { data: ticketsCuenta = [] } = useQuery({
    queryKey: ['billing', 'cuenta-tickets', cuentaId],
    queryFn: () => billingApi.listByCuenta(cuentaId),
    enabled: !!cuentaId,
  })

  useBarcode({
    products: products ?? [],
    enabled: !showAddVenta && !showAddPago,
    onProductFound: (id) => {
      setBarcodeProductId(id)
      setShowAddVenta(true)
    },
  })

  const addVentaMutation = useMutation({
    mutationFn: (dto: AddVentaDto) => cuentasApi.addVenta(cuentaId, dto),
    onSuccess: (newVenta) => {
      qc.setQueryData(['accounts', cuentaId], (old: Cuenta | undefined) => {
        if (!old) return old
        return { ...old, ventas: [...old.ventas, newVenta] }
      })
      qc.invalidateQueries({ queryKey: ['accounts', cuentaId] })
      qc.invalidateQueries({ queryKey: ['notifications', 'stock'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Venta añadida')
      setShowAddVenta(false)
    },
    onError: (err: unknown) => toast.error(apiError(err)),
  })

  const deleteVentaMutation = useMutation({
    mutationFn: (ventaId: number) => cuentasApi.deleteVenta(cuentaId, ventaId),
    onMutate: async (ventaId) => {
      await qc.cancelQueries({ queryKey: ['accounts', cuentaId] })
      const prev = qc.getQueryData(['accounts', cuentaId])
      qc.setQueryData(['accounts', cuentaId], (old: Cuenta | undefined) => {
        if (!old) return old
        return { ...old, ventas: old.ventas.filter((v) => v.id !== ventaId) }
      })
      return { prev }
    },
    onError: (err: unknown, _id, ctx) => {
      qc.setQueryData(['accounts', cuentaId], ctx?.prev)
      toast.error(apiError(err))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Venta eliminada')
      setDeleteVentaId(null)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['accounts', cuentaId] }),
  })

  /**
   * Helper: genera factura automática si la cuenta está pagada Y tiene cliente fiscal.
   * Optimización: usa el cache de tickets ya cargado para evitar un round-trip extra.
   * Intenta FACTURA_VENTA (requiere resolución DIAN activa) → fallback a INFORMAL.
   */
  async function maybeAutoEmitirFactura(c: Cuenta): Promise<void> {
    if (!c.esta_pagada || !c.cliente_documento || !c.cliente_nombre_fiscal) return

    // ¿Ya existe un ticket emitido? Lo sabemos por el cache local (sin red).
    const yaEmitido = ticketsCuenta.find((t) => t.estado === 'EMITIDA')
    if (yaEmitido) {
      setAutoTicket(yaEmitido)
      return
    }

    const clienteData = {
      tipo_doc: (c.cliente_tipo_doc as ClienteForm['tipo_doc']) ?? 'CC',
      documento: c.cliente_documento,
      nombre: c.cliente_nombre_fiscal,
      direccion: c.cliente_direccion ?? undefined,
      telefono: c.cliente_telefono ?? undefined,
      email: c.cliente_email ?? undefined,
    }

    let ticket
    try {
      ticket = await billingApi.emitir(c.id, { tipo_documento: 'FACTURA_VENTA', cliente: clienteData })
    } catch {
      try {
        ticket = await billingApi.emitir(c.id, { tipo_documento: 'INFORMAL', cliente: clienteData })
      } catch (err) {
        toast.error(apiError(err, 'No se pudo generar el documento. Emítelo manualmente desde "Emitir documento".'))
        return
      }
    }

    // Actualizar caches en paralelo (no bloquea el modal de ver)
    qc.invalidateQueries({ queryKey: ['billing', 'tickets'] })
    qc.invalidateQueries({ queryKey: ['billing', 'cuenta-tickets', cuentaId] })
    setAutoTicket(ticket)
    toast.success(`Documento ${ticket.numero_completo} generado`)
  }

  const addPagoMutation = useMutation({
    mutationFn: (dto: AddPagoDto) => cuentasApi.addPago(cuentaId, dto),
    onSuccess: async (cuentaActualizada) => {
      qc.setQueryData(['accounts', cuentaId], cuentaActualizada)
      qc.invalidateQueries({ queryKey: ['accounts', cuentaId] })
      toast.success('Pago registrado')
      setShowAddPago(false)
      await maybeAutoEmitirFactura(cuentaActualizada as Cuenta)
    },
    onError: (err: unknown) => toast.error(apiError(err)),
  })

  const deletePagoMutation = useMutation({
    mutationFn: (pagoId: number) => cuentasApi.deletePago(cuentaId, pagoId),
    onMutate: async (pagoId) => {
      await qc.cancelQueries({ queryKey: ['accounts', cuentaId] })
      const prev = qc.getQueryData(['accounts', cuentaId])
      qc.setQueryData(['accounts', cuentaId], (old: Cuenta | undefined) => {
        if (!old) return old
        return { ...old, pagos: old.pagos.filter((p) => p.id !== pagoId) }
      })
      return { prev }
    },
    onError: (err: unknown, _id, ctx) => {
      qc.setQueryData(['accounts', cuentaId], ctx?.prev)
      toast.error(apiError(err))
    },
    onSuccess: () => { toast.success('Pago eliminado'); setDeletePagoId(null) },
    onSettled: () => qc.invalidateQueries({ queryKey: ['accounts', cuentaId] }),
  })

  // ── Ventas agrupadas por producto ─────────────────────────────────────────
  const ventasAgrupadas = useMemo((): VentaAgrupada[] => {
    if (!cuenta?.ventas) return []
    const map = new Map<number, VentaAgrupada>()
    for (const v of cuenta.ventas) {
      const prod = products.find((p) => p.id === v.producto_id)
      const nombre = prod?.nombre ?? `Producto #${v.producto_id}`
      if (!map.has(v.producto_id)) {
        map.set(v.producto_id, {
          producto_id: v.producto_id,
          producto_nombre: nombre,
          totalCantidad: 0,
          totalPrecio: 0,
          totalGanancia: 0,
          ventas: [],
          expandido: false,
        })
      }
      const g = map.get(v.producto_id)!
      g.totalCantidad += v.cantidad_unidades
      g.totalPrecio += v.precio_venta
      g.totalGanancia += v.ganancia
      g.ventas.push(v)
    }
    return Array.from(map.values()).sort((a, b) => b.totalPrecio - a.totalPrecio)
  }, [cuenta?.ventas, products])

  const toggleProduct = (productId: number) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) next.delete(productId)
      else next.add(productId)
      return next
    })
  }

  if (isLoading) return <div className="flex justify-center py-24"><Spinner size={36} /></div>
  if (!cuenta) return <EmptyState title="Cuenta no encontrada" />

  const pagadoTotal = cuenta.total - (cuenta.valor_pendiente ?? 0)
  const pctPagado = cuenta.total > 0 ? (pagadoTotal / cuenta.total) * 100 : 0

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />} onClick={() => navigate('/accounts')}>
          Cuentas
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-slate-900 truncate">{cuenta.nombre}</h1>
        </div>
        <Badge variant={cuenta.esta_pagada ? 'green' : 'yellow'} dot>
          {cuenta.esta_pagada ? 'Pagada' : 'Abierta'}
        </Badge>
      </div>

      {/* ── Read-only banner ────────────────────────────────────────────────── */}
      {cuenta.esta_pagada && (
        <InfoBanner variant="info">
          Esta cuenta está pagada. Solo puedes ver el historial y emitir documentos.
        </InfoBanner>
      )}

      {/* ── Actividad + Resumen financiero — 2 columnas en desktop ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">

        {/* Actividad de la cuenta */}
        <Card padding={false} className="h-full flex flex-col">
          <div className="p-5 flex-1 flex flex-col">
            <SectionHeader
              title="Actividad de la cuenta"
              icon={<TrendingUp size={15} />}
            />

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
              {/* Ventas */}
              <div className="relative overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-blue-50/30 p-4 flex flex-col justify-between min-h-[110px]">
                <div className="flex items-start justify-between">
                  <div className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center">
                    <ShoppingCart size={16} className="text-blue-600" />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold text-slate-900 tabular-nums leading-none">{cuenta.ventas.length}</p>
                  <p className="text-[11px] text-slate-500 font-medium mt-1.5 leading-tight">Ventas registradas</p>
                </div>
              </div>

              {/* Productos */}
              <div className="relative overflow-hidden rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50 to-purple-50/30 p-4 flex flex-col justify-between min-h-[110px]">
                <div className="flex items-start justify-between">
                  <div className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center">
                    <Package size={16} className="text-purple-600" />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold text-slate-900 tabular-nums leading-none">{ventasAgrupadas.length}</p>
                  <p className="text-[11px] text-slate-500 font-medium mt-1.5 leading-tight">Productos distintos</p>
                </div>
              </div>

              {/* Pagos */}
              <div className="relative overflow-hidden rounded-xl border border-green-100 bg-gradient-to-br from-green-50 to-green-50/30 p-4 flex flex-col justify-between min-h-[110px]">
                <div className="flex items-start justify-between">
                  <div className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center">
                    <CreditCard size={16} className="text-green-600" />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold text-slate-900 tabular-nums leading-none">{cuenta.pagos.length}</p>
                  <p className="text-[11px] text-slate-500 font-medium mt-1.5 leading-tight">Pagos realizados</p>
                </div>
              </div>
            </div>

            {/* Mini-insight footer */}
            <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <p className="text-[11px] text-slate-500">
                Promedio por venta:{' '}
                <span className="font-semibold text-slate-700 tabular-nums">
                  {formatCOP(cuenta.ventas.length > 0 ? cuenta.total / cuenta.ventas.length : 0)}
                </span>
              </p>
            </div>
          </div>
        </Card>

        {/* Resumen financiero */}
        <Card padding={false} className="h-full flex flex-col">
          <div className="p-5 flex-1 flex flex-col">
            <SectionHeader
              title="Resumen financiero"
              icon={<Wallet size={15} />}
            />

            {/* Grid de métricas */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              {/* Total */}
              <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center">
                    <Receipt size={13} className="text-slate-600" />
                  </div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Total</p>
                </div>
                <p className="text-lg font-bold text-slate-900 tabular-nums leading-tight">{formatCOP(cuenta.total)}</p>
              </div>

              {/* Pendiente */}
              <div className={`relative overflow-hidden rounded-xl border p-4 ${
                cuenta.esta_pagada
                  ? 'border-slate-200 bg-gradient-to-br from-slate-50 to-white'
                  : 'border-red-100 bg-gradient-to-br from-red-50 to-red-50/30'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center">
                    <AlertCircle size={13} className={cuenta.esta_pagada ? 'text-slate-400' : 'text-red-600'} />
                  </div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Pendiente</p>
                </div>
                <p className={`text-lg font-bold tabular-nums leading-tight ${cuenta.esta_pagada ? 'text-slate-300' : 'text-red-600'}`}>
                  {formatCOP(cuenta.valor_pendiente ?? 0)}
                </p>
              </div>

              {/* Pagado */}
              <div className="relative overflow-hidden rounded-xl border border-green-100 bg-gradient-to-br from-green-50 to-green-50/30 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center">
                    <CheckCircle2 size={13} className="text-green-600" />
                  </div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Pagado</p>
                </div>
                <p className="text-lg font-bold text-green-600 tabular-nums leading-tight">{formatCOP(pagadoTotal)}</p>
              </div>

              {/* Apertura */}
              <div className="relative overflow-hidden rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50 to-amber-50/30 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center">
                    <Calendar size={13} className="text-amber-600" />
                  </div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Apertura</p>
                </div>
                <p className="text-sm font-semibold text-slate-700 leading-tight mt-0.5">{formatDate(cuenta.fecha_creacion)}</p>
              </div>
            </div>

            {/* Barra de progreso */}
            <div className="mt-4">
              <ProgressBar
                value={pctPagado}
                color={cuenta.esta_pagada ? 't-bg' : pctPagado > 50 ? 'bg-yellow-400' : 'bg-red-400'}
                size="md"
                showValue
                label="Progreso de pago"
              />
            </div>
          </div>

          {/* Botón pago prominente */}
          {!cuenta.esta_pagada && (
            <div className="px-5 pb-5">
              <Can permission="cuentas:pay">
                <Button
                  className="w-full"
                  icon={<CreditCard size={16} />}
                  onClick={() => requireCaja('registrar un pago') && setShowAddPago(true)}
                >
                  Registrar pago — {formatCOP(cuenta.valor_pendiente ?? 0)} pendiente
                </Button>
              </Can>
            </div>
          )}

          {cuenta.esta_pagada && (
            <div className="px-5 pb-5">
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                <p className="text-sm font-medium text-green-700">Cuenta completamente pagada</p>
              </div>
            </div>
          )}
        </Card>
      </div>
      {/* ── Ventas — full width centrado ──────────────────────────────────── */}
      <Card padding={false}>
        <div className="p-4 border-b border-slate-50">
          <SectionHeader
            title="Ventas"
            icon={<ShoppingCart size={15} />}
            actions={
              !cuenta.esta_pagada && (
                <Can permission="ventas:create">
                  <Button size="sm" icon={<Plus size={14} />} onClick={() => requireCaja('agregar una venta') && setShowAddVenta(true)}>
                    Agregar venta
                  </Button>
                </Can>
              )
            }
          />
        </div>

        {cuenta.ventas.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart size={32} />}
            title="Sin ventas"
            description="Agrega productos vendidos a esta cuenta"
            action={
              !cuenta.esta_pagada && (
                <Can permission="ventas:create">
                  <Button size="sm" icon={<Plus size={14} />} onClick={() => requireCaja('agregar una venta') && setShowAddVenta(true)}>
                    Primera venta
                  </Button>
                </Can>
              )
            }
          />
        ) : (
          <div className="divide-y divide-slate-50">
            {ventasAgrupadas.map((g) => {
              const isExpanded = expandedProducts.has(g.producto_id)
              const hasMultiple = g.ventas.length > 1

              return (
                <div key={g.producto_id}>
                  {/* Fila agrupada */}
                  <div
                    className={`flex items-center gap-3 px-4 py-3 ${hasMultiple ? 'cursor-pointer hover:bg-slate-50 transition-colors' : ''}`}
                    onClick={() => hasMultiple && toggleProduct(g.producto_id)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <Package size={14} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{g.producto_nombre}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {g.ventas.length} venta{g.ventas.length !== 1 ? 's' : ''} · {g.totalCantidad} unidades
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-800 tabular-nums">{formatCOP(g.totalPrecio)}</p>
                    </div>
                    {hasMultiple && (
                      <div className="text-slate-400 ml-1">
                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </div>
                    )}
                    {!cuenta.esta_pagada && (
                      <Can permission="ventas:delete">
                        {g.ventas.length === 1 && (
                          <button
                            aria-label="Eliminar venta"
                            onClick={(e) => { e.stopPropagation(); setDeleteVentaId(g.ventas[0]!.id) }}
                            className="p-1 text-slate-300 hover:text-red-400 transition-colors rounded"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </Can>
                    )}
                  </div>

                  {/* Detalle expandido */}
                  {isExpanded && (
                    <div className="bg-slate-50/80 border-t border-slate-100 px-4 py-2">
                      {g.ventas.map((v) => (
                        <div key={v.id} className="flex items-start gap-3 py-2 text-xs border-b border-slate-100 last:border-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-300 ml-2 mt-1 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-slate-600">{v.cantidad_unidades} u.</span>
                              <span className="text-slate-400">{formatDateTime(v.fecha_venta)}</span>
                            </div>
                            {/* Trazabilidad cajero/caja */}
                            {(v.nombre_cajero || v.sesion_caja_id) && (
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                {v.nombre_cajero && (
                                  <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 rounded-full px-2 py-0.5">
                                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
                                    {v.nombre_cajero}
                                  </span>
                                )}
                                {v.sesion_caja_id && (
                                  <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">
                                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-4 0v2" /></svg>
                                    Caja #{v.sesion_caja_id}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <span className="font-semibold text-slate-700 tabular-nums">{formatCOP(v.precio_venta)}</span>
                          {!cuenta.esta_pagada && (
                            <Can permission="ventas:delete">
                              <button
                                aria-label="Eliminar venta"
                                onClick={() => setDeleteVentaId(v.id)}
                                className="p-1 text-slate-300 hover:text-red-400 transition-colors rounded"
                              >
                                <Trash2 size={12} />
                              </button>
                            </Can>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Footer total ventas */}
            <div className="px-4 py-3 bg-slate-50 flex justify-between items-center">
              <span className="text-xs text-slate-500 font-medium">Total ventas</span>
              <span className="text-sm font-bold text-slate-800 tabular-nums">{formatCOP(cuenta.total)}</span>
            </div>
          </div>
        )}
      </Card>

      {/* ── Cliente fiscal + Documentos emitidos — 2 columnas en desktop ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

        {/* Cliente fiscal */}
        <Card className="h-full">
          <SectionHeader
            title="Cliente fiscal"
            icon={<Receipt size={15} />}
            actions={
              !cuenta.esta_pagada && (
                <Can permission="cuentas:create">
                  <Button size="sm" variant="outline" icon={<Plus size={14} />} onClick={() => setShowClienteModal(true)}>
                    {cuenta.cliente_documento ? 'Editar' : 'Asignar'}
                  </Button>
                </Can>
              )
            }
          />
          {cuenta.cliente_documento ? (
            <div className="mt-3 space-y-1.5 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 w-20 shrink-0">Nombre</span>
                <span className="font-semibold text-slate-800 truncate">{cuenta.cliente_nombre_fiscal}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 w-20 shrink-0">{cuenta.cliente_tipo_doc}</span>
                <span className="font-medium text-slate-700">{cuenta.cliente_documento}</span>
              </div>
              {cuenta.cliente_direccion && (
                <div className="flex items-start gap-2">
                  <span className="text-slate-400 w-20 shrink-0">Dirección</span>
                  <span className="text-slate-600">{cuenta.cliente_direccion}</span>
                </div>
              )}
              {(cuenta.cliente_telefono || cuenta.cliente_email) && (
                <div className="flex items-center gap-2">
                  {cuenta.cliente_telefono && <span className="text-slate-500 text-xs">{cuenta.cliente_telefono}</span>}
                  {cuenta.cliente_email && <span className="text-slate-500 text-xs truncate">{cuenta.cliente_email}</span>}
                </div>
              )}
              <div className="pt-1">
                <span className="inline-flex items-center gap-1.5 text-[10px] bg-purple-50 text-purple-700 border border-purple-200 rounded-full px-2 py-0.5">
                  <CheckCircle2 size={10} /> Factura automática al pagar
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-col items-center text-center py-5 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Receipt size={20} className="text-slate-300 mb-2" />
              <p className="text-xs text-slate-500 font-medium mb-0.5">Sin cliente fiscal</p>
              <p className="text-[11px] text-slate-400">La factura se emite manualmente.</p>
            </div>
          )}
        </Card>

        {/* Documentos emitidos */}
        <Card className="h-full">
          <SectionHeader
            title="Documentos emitidos"
            icon={<FileText size={15} />}
            actions={
              cuenta.ventas.length > 0 && ticketsCuenta.length === 0 && (
                <Can permission="cuentas:create">
                  <Button size="sm" variant="outline" icon={<Receipt size={14} />} onClick={() => setShowTicket(true)}>
                    Emitir ahora
                  </Button>
                </Can>
              )
            }
          />

          {ticketsCuenta.length === 0 ? (
            <div className="mt-3 flex flex-col items-center text-center py-6 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center mb-3">
                <FileText size={20} className="text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-600 mb-1">
                Aún no hay documentos para esta cuenta
              </p>
              <p className="text-xs text-slate-400 max-w-sm">
                {cuenta.ventas.length === 0
                  ? 'Agrega ventas y luego podrás emitir un recibo o factura.'
                  : cuenta.cliente_documento
                    ? 'Se generará automáticamente al pagar la cuenta. O puedes emitirlo manualmente con "Emitir documento".'
                    : 'Usa el botón "Emitir documento" arriba para generar un recibo o factura.'}
              </p>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {ticketsCuenta.map((t) => {
                const isAnulada = t.estado === 'ANULADA'
                const tipoLabel =
                  t.tipo_documento === 'FACTURA_VENTA' ? 'Factura de venta' :
                    t.tipo_documento === 'POS' ? 'Documento POS' :
                      'Recibo informal'
                const tipoColor =
                  t.tipo_documento === 'FACTURA_VENTA' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                    t.tipo_documento === 'POS' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                      'bg-slate-100 text-slate-700 border-slate-200'
                const iconColor =
                  t.tipo_documento === 'FACTURA_VENTA' ? 'text-purple-600 bg-purple-50' :
                    t.tipo_documento === 'POS' ? 'text-blue-600 bg-blue-50' :
                      'text-slate-600 bg-slate-50'

                return (
                  <div
                    key={t.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isAnulada
                      ? 'bg-red-50/40 border-red-100 opacity-70'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                      }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconColor}`}>
                      <FileText size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${tipoColor}`}>
                          {tipoLabel}
                        </span>
                        {isAnulada && (
                          <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                            Anulada
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-slate-800 text-sm tabular-nums mt-0.5 flex items-center gap-1.5">
                        <Hash size={11} className="text-slate-400" />
                        {t.numero_completo}
                      </p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar size={10} />
                        {formatDateTime(t.fecha_emision ?? '')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-800 tabular-nums">{formatCOP(t.total ?? 0)}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Eye size={13} />}
                        onClick={() => setViewTicket(t)}
                        className="mt-1"
                      >
                        Ver
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

      </div>{/* end grid cliente+documentos */}



      {/* ── Pagos — full width debajo ──────────────────────────────────────── */}
      <Card padding={false}>
        <div className="p-4 border-b border-slate-50">
          <SectionHeader
            title="Pagos"
            icon={<CreditCard size={15} />}
            actions={
              !cuenta.esta_pagada && (
                <Can permission="cuentas:pay">
                  <Button size="sm" variant="outline" icon={<Plus size={14} />} onClick={() => requireCaja('registrar un pago') && setShowAddPago(true)}>
                    Registrar pago
                  </Button>
                </Can>
              )
            }
          />
        </div>

        {cuenta.pagos.length === 0 ? (
          <EmptyState
            icon={<CreditCard size={32} />}
            title="Sin pagos registrados"
            description={cuenta.esta_pagada ? '' : 'Registra el primer pago de esta cuenta'}
          />
        ) : (
          <div className="divide-y divide-slate-50">
            {cuenta.pagos.map((p, idx) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                {/* Timeline dot */}
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-7 h-7 rounded-full t-bg-lt flex items-center justify-center">
                    <span className="text-[10px] font-bold t-text-dk">{idx + 1}</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{p.nombre_medio_pago}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {p.descripcion && `${p.descripcion} · `}
                    {p.fecha_pago ? formatDateTime(p.fecha_pago) : '—'}
                    {p.sub_total > p.total && (
                      <span className="ml-1 text-orange-500">({(((p.sub_total - p.total) / p.sub_total) * 100).toFixed(1)}% comisión)</span>
                    )}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold t-text-dk tabular-nums">{formatCOP(p.sub_total)}</p>
                  {p.sub_total > p.total && (
                    <p className="text-[10px] text-orange-500 tabular-nums">neto: {formatCOP(p.total)}</p>
                  )}
                </div>
                <Can permission="pagos:delete">
                  <button
                    aria-label="Eliminar pago"
                    onClick={() => setDeletePagoId(p.id)}
                    className="p-1 text-slate-300 hover:text-red-400 transition-colors rounded shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </Can>
              </div>
            ))}

            {/* Footer pagos */}
            <div className="px-4 py-3 bg-green-50 flex justify-between items-center">
              <span className="text-xs text-slate-500 font-medium">Total pagado</span>
              <span className="text-sm font-bold text-green-700 tabular-nums">{formatCOP(pagadoTotal)}</span>
            </div>
          </div>
        )}
      </Card>

      {/* ── Modals ────────────────────────────────────────────────────────────── */}
      <AddVentaModal
        open={showAddVenta}
        onClose={() => { setShowAddVenta(false); setBarcodeProductId(null) }}
        products={products}
        onSubmit={(dto) => addVentaMutation.mutate(dto)}
        loading={addVentaMutation.isPending}
        initialProductId={barcodeProductId ?? undefined}
      />

      <AddPagoModal
        open={showAddPago}
        onClose={() => setShowAddPago(false)}
        mediosPago={mediosPago}
        pendiente={cuenta.valor_pendiente ?? 0}
        onSubmit={(dto) => addPagoMutation.mutate(dto)}
        loading={addPagoMutation.isPending}
      />

      <ConfirmDialog
        open={deleteVentaId !== null}
        title="Eliminar venta"
        message="¿Eliminar esta venta de la cuenta? El stock será revertido."
        confirmLabel="Eliminar"
        danger
        loading={deleteVentaMutation.isPending}
        onConfirm={() => deleteVentaId !== null && deleteVentaMutation.mutate(deleteVentaId)}
        onCancel={() => setDeleteVentaId(null)}
      />

      <ConfirmDialog
        open={deletePagoId !== null}
        title="Eliminar pago"
        message="¿Eliminar este pago? Solo es posible si fue registrado hace menos de 24 horas."
        confirmLabel="Eliminar"
        danger
        loading={deletePagoMutation.isPending}
        onConfirm={() => deletePagoId !== null && deletePagoMutation.mutate(deletePagoId)}
        onCancel={() => setDeletePagoId(null)}
      />

      {/* Emitir documento manual */}
      <EmitirTicketModal
        open={showTicket}
        onClose={() => setShowTicket(false)}
        cuentaId={cuenta.id}
        cuentaNombre={cuenta.nombre}
      />

      {/* Ticket generado automáticamente al pagar — muestra el visor directamente */}
      {autoTicket && (
        <TicketViewerModal
          open={!!autoTicket}
          onClose={() => setAutoTicket(null)}
          ticket={autoTicket}
        />
      )}

      {/* Visor de tickets existentes (botón "Ver" en la lista de documentos) */}
      {viewTicket && (
        <TicketViewerModal
          open={!!viewTicket}
          onClose={() => setViewTicket(null)}
          ticket={viewTicket}
        />
      )}

      {/* Modal asignar / editar cliente fiscal */}
      <AsignarClienteModal
        open={showClienteModal}
        onClose={() => setShowClienteModal(false)}
        cuentaId={cuenta.id}
        initialValues={
          cuenta.cliente_documento
            ? {
              tipo_doc: (cuenta.cliente_tipo_doc as ClienteForm['tipo_doc']) ?? 'CC',
              documento: cuenta.cliente_documento,
              nombre: cuenta.cliente_nombre_fiscal ?? '',
              direccion: cuenta.cliente_direccion ?? undefined,
              telefono: cuenta.cliente_telefono ?? undefined,
              email: cuenta.cliente_email ?? undefined,
            }
            : undefined
        }
        onAssigned={(updated) => {
          // Si la cuenta ya estaba pagada, dispara la auto-factura inmediatamente
          void maybeAutoEmitirFactura(updated)
        }}
      />

    </div>
  )
}

// ─── AddVentaModal ─────────────────────────────────────────────────────────────

interface AddVentaModalProps {
  open: boolean
  onClose: () => void
  products: { id: number; nombre: string; precios: { id: number; nombre: string; precio: number; cantidad: number; activo: boolean }[]; stock_total?: number }[]
  onSubmit: (dto: AddVentaDto) => void
  loading: boolean
  initialProductId?: number
}

function AddVentaModal({ open, onClose, products, onSubmit, loading, initialProductId }: AddVentaModalProps) {
  const [search, setSearch] = useState('')
  const [selectedProdId, setSelectedProdId] = useState<number | null>(null)
  const [selectedPrecioId, setSelectedPrecioId] = useState<number | null>(null)
  const [cantidad, setCantidad] = useState(1)
  // Descuento rápido
  const [showDescuento, setShowDescuento] = useState(false)
  const [descTipo, setDescTipo] = useState<'pct' | 'monto'>('pct')
  const descInput = useMontoInput(0)
  const [descPct, setDescPct] = useState('')

  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setSearch('')
      setSelectedProdId(initialProductId ?? null)
      setSelectedPrecioId(null)
      setCantidad(1)
      setShowDescuento(false)
      setDescPct('')
      descInput.setFromNumber(0)
    }
  }, [open, initialProductId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) setTimeout(() => searchRef.current?.focus(), 100) }, [open])

  // Fuzzy search con Fuse.js
  const fuse = useMemo(
    () => new Fuse(products, { keys: ['nombre'], threshold: 0.35, includeScore: true }),
    [products]
  )
  const filtered = useMemo(() => {
    if (!search) return products.slice(0, 12)
    return fuse.search(search).slice(0, 10).map((r) => r.item)
  }, [products, search, fuse])

  const handleSearchKey = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filtered.length === 1) {
      setSelectedProdId(filtered[0]!.id)
    }
  }, [filtered])

  const selectedProduct = products.find((p) => p.id === selectedProdId)
  const selectedPrecio = selectedProduct?.precios.find((pr) => pr.id === selectedPrecioId)
  const precioActivos = selectedProduct?.precios.filter((pr) => pr.nombre !== 'Perdida') ?? []
  const stockDisponible = selectedProduct?.stock_total ?? 0
  const stockEnPresentaciones = Math.floor(stockDisponible / (selectedPrecio?.cantidad ?? 1))
  const precioLista = (selectedPrecio?.precio ?? 0) * cantidad

  // Calcular precio con descuento
  const precioConDescuento = useMemo(() => {
    if (!showDescuento || precioLista === 0) return precioLista
    if (descTipo === 'pct') {
      const pct = parseFloat(descPct) || 0
      return Math.max(0, Math.round(precioLista * (1 - pct / 100)))
    }
    const monto = descInput.numericValue()
    return Math.max(0, precioLista - monto)
  }, [showDescuento, descTipo, descPct, descInput, precioLista])

  const hayDescuento = showDescuento && precioConDescuento < precioLista && precioLista > 0
  const montoDescuento = precioLista - precioConDescuento
  const canSubmit = selectedProdId && selectedPrecioId && cantidad >= 1 && cantidad <= stockEnPresentaciones

  const handleSubmit = () => {
    if (!canSubmit) return
    onSubmit({
      producto_id: selectedProdId!,
      producto_precio_id: selectedPrecioId!,
      cantidad,
      ...(hayDescuento ? { precio_manual: precioConDescuento } : {}),
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Agregar venta"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={loading} disabled={!canSubmit} onClick={handleSubmit} icon={<ShoppingCart size={14} />}>
            Agregar
            {selectedPrecio && cantidad > 0 && (
              <span className="font-normal opacity-80 ml-1">
                — {formatCOP(hayDescuento ? precioConDescuento : precioLista)}
              </span>
            )}
          </Button>
        </>
      }
    >
      {/* Enter confirma cuando el form está listo */}
      <div
        className="space-y-4"
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && canSubmit) { e.preventDefault(); handleSubmit() } }}
      >
        {/* Búsqueda */}
        {!selectedProdId && (
          <>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Buscar producto por nombre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKey}
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>

            <div className="space-y-1 max-h-60 overflow-y-auto">
              {filtered.length === 0 && (
                <p className="text-center text-sm text-slate-400 py-6">Sin resultados para "{search}"</p>
              )}
              {filtered.map((p) => {
                const stock = p.stock_total ?? 0
                return (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedProdId(p.id); setSelectedPrecioId(null) }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:t-bg-xlt border border-transparent hover:t-border-lt transition-all text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <Package size={14} className="text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{p.nombre}</p>
                      <p className="text-xs text-slate-400">
                        {p.precios?.length ?? 0} presentaciones · stock: {stock}
                      </p>
                    </div>
                    {stock === 0 && (
                      <span className="text-xs text-red-400 font-medium shrink-0">Agotado</span>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* Producto seleccionado */}
        {selectedProdId && selectedProduct && (
          <>
            <div className="flex items-center gap-3 p-3 t-bg-xlt border t-border rounded-xl">
              <div className="w-9 h-9 rounded-lg t-bg-lt flex items-center justify-center shrink-0">
                <Package size={16} className="t-text" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold t-text-dk truncate">{selectedProduct.nombre}</p>
                <p className="text-xs t-text">Stock: {selectedProduct.stock_total ?? 0} unidades</p>
              </div>
              <button aria-label="Deseleccionar producto" onClick={() => { setSelectedProdId(null); setSelectedPrecioId(null) }} className="t-text hover:t-text-dk">
                <X size={16} />
              </button>
            </div>

            {/* Presentación */}
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Presentación *</p>
              <div className="grid grid-cols-1 gap-2">
                {precioActivos.map((pr) => (
                  <button
                    key={pr.id}
                    onClick={() => setSelectedPrecioId(pr.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left ${selectedPrecioId === pr.id
                      ? 't-border t-bg-xlt ring-1 ring-[var(--t-primary-ring)]'
                      : 'border-slate-200 hover:t-border hover:t-bg-xlt'
                      }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">{pr.nombre}</p>
                      {pr.cantidad > 1 && (
                        <p className="text-xs text-slate-400">{pr.cantidad} unidades por presentación</p>
                      )}
                    </div>
                    <span className={`text-sm font-bold tabular-nums ${selectedPrecioId === pr.id ? 't-text-dk' : 'text-slate-700'}`}>
                      {formatCOP(pr.precio)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Cantidad */}
            {selectedPrecioId && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Cantidad</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCantidad((v) => Math.max(1, v - 1))}
                    className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors text-lg font-medium shrink-0"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={stockEnPresentaciones || 9999}
                    value={cantidad}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10)
                      if (isNaN(v) || v < 1) { setCantidad(1); return }
                      setCantidad(Math.min(v, stockEnPresentaciones || 9999))
                    }}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur()
                    }}
                    className="w-16 text-center text-xl font-bold tabular-nums border border-slate-200 rounded-xl py-1 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  />
                  <button
                    onClick={() => setCantidad((v) => Math.min(stockEnPresentaciones, v + 1))}
                    disabled={cantidad >= stockEnPresentaciones}
                    className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors text-lg font-medium disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                  >
                    +
                  </button>
                  <div className="flex-1" />
                  {cantidad === stockEnPresentaciones && stockEnPresentaciones > 0 && (
                    <span className="text-xs text-orange-500 font-medium">Máximo</span>
                  )}
                  {selectedPrecio && !hayDescuento && (
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Total</p>
                      <p className="text-base font-bold t-text-dk tabular-nums">{formatCOP(precioLista)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Descuento ────────────────────────────────────────────── */}
            {selectedPrecioId && (
              <div>
                {!showDescuento ? (
                  <button
                    type="button"
                    onClick={() => setShowDescuento(true)}
                    className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-200 hover:border-orange-300 hover:bg-orange-50/40 transition-all group"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-600 group-hover:text-orange-700">
                      <span className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">%</span>
                      Aplicar descuento
                    </span>
                    <span className="text-[11px] text-slate-400 group-hover:text-orange-500">Opcional</span>
                  </button>
                ) : (
                  <div className="rounded-xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50/30 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-orange-100 bg-white/40">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-orange-500 text-white flex items-center justify-center text-xs font-bold">%</span>
                        <span className="text-sm font-semibold text-orange-900">Descuento</span>
                      </div>
                      <button
                        type="button"
                        aria-label="Quitar descuento"
                        onClick={() => { setShowDescuento(false); setDescPct(''); descInput.setFromNumber(0) }}
                        className="text-orange-400 hover:text-orange-700 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <div className="p-4 space-y-3">
                      {/* Tabs tipo descuento */}
                      <div className="grid grid-cols-2 gap-2 p-1 bg-white rounded-lg border border-orange-100">
                        <button
                          type="button"
                          onClick={() => setDescTipo('pct')}
                          className={`py-2 rounded-md text-xs font-bold transition-all ${descTipo === 'pct'
                            ? 'bg-orange-500 text-white shadow-sm'
                            : 'text-slate-500 hover:text-orange-600'
                            }`}
                        >
                          % Porcentaje
                        </button>
                        <button
                          type="button"
                          onClick={() => setDescTipo('monto')}
                          className={`py-2 rounded-md text-xs font-bold transition-all ${descTipo === 'monto'
                            ? 'bg-orange-500 text-white shadow-sm'
                            : 'text-slate-500 hover:text-orange-600'
                            }`}
                        >
                          $ Monto fijo
                        </button>
                      </div>

                      {/* Inputs según tipo */}
                      {descTipo === 'pct' ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-5 gap-1.5">
                            {[5, 10, 15, 20, 50].map((p) => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setDescPct(String(p))}
                                className={`py-2 rounded-lg text-sm font-bold border-2 transition-all ${descPct === String(p)
                                  ? 'bg-orange-500 text-white border-orange-500 shadow-md scale-105'
                                  : 'bg-white text-slate-700 border-orange-100 hover:border-orange-400 hover:bg-orange-50'
                                  }`}
                              >
                                {p}%
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-[11px] font-medium text-orange-700 whitespace-nowrap">Personalizado:</label>
                            <div className="relative flex-1">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={descPct}
                                onChange={(e) => setDescPct(e.target.value)}
                                placeholder="0"
                                className="w-full px-3 py-2 pr-8 text-sm font-bold text-right border-2 border-orange-100 rounded-lg focus:outline-none focus:border-orange-400 bg-white"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-500 font-bold text-sm">%</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500 font-bold text-sm">$</span>
                          <input
                            {...descInput.inputProps}
                            placeholder="0"
                            className="w-full pl-8 pr-3 py-2.5 text-base font-bold text-right border-2 border-orange-100 rounded-lg focus:outline-none focus:border-orange-400 bg-white"
                          />
                          <p className="text-[11px] text-orange-600 mt-1">
                            Resta este monto al precio total
                          </p>
                        </div>
                      )}

                      {/* Breakdown visual */}
                      {hayDescuento && (
                        <div className="grid grid-cols-3 gap-2 pt-3 mt-1 border-t-2 border-dashed border-orange-200">
                          <div className="text-center">
                            <p className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">Original</p>
                            <p className="text-sm font-bold text-slate-400 line-through tabular-nums">
                              {formatCOP(precioLista)}
                            </p>
                          </div>
                          <div className="text-center border-x border-orange-200">
                            <p className="text-[10px] uppercase tracking-wide text-orange-600 font-medium">Ahorra</p>
                            <p className="text-sm font-bold text-orange-600 tabular-nums">
                              −{formatCOP(montoDescuento)}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] uppercase tracking-wide text-emerald-600 font-medium">Cobrar</p>
                            <p className="text-base font-extrabold text-emerald-700 tabular-nums">
                              {formatCOP(precioConDescuento)}
                            </p>
                          </div>
                        </div>
                      )}

                      {!hayDescuento && (descPct !== '' || descInput.numericValue() > 0) && (
                        <p className="text-[11px] text-amber-600 text-center pt-1">
                          El descuento ingresado no afecta el precio
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}

// ─── AddPagoModal ──────────────────────────────────────────────────────────────

interface AddPagoModalProps {
  open: boolean
  onClose: () => void
  mediosPago: MedioPago[]
  pendiente: number
  onSubmit: (dto: AddPagoDto) => void
  loading: boolean
}

function AddPagoModal({ open, onClose, mediosPago, pendiente, onSubmit, loading }: AddPagoModalProps) {
  const montoInput = useMontoInput(pendiente)
  const { register, handleSubmit, watch, formState: { errors } } = useForm<PagoForm>({
    resolver: zodResolver(pagoSchema) as Resolver<PagoForm>,
  })

  const medioId = watch('medio_pago_id')
  const medioSeleccionado = mediosPago.find((m) => m.id === Number(medioId))
  const subTotal = montoInput.numericValue()
  const comision = medioSeleccionado ? (subTotal * (Number(medioSeleccionado.comision_porcentaje) / 100)) : 0
  const totalNeto = subTotal - comision
  const cambio = subTotal > pendiente ? subTotal - pendiente : 0
  const canPay = !!medioId && subTotal >= 1

  useEffect(() => {
    if (open) montoInput.setFromNumber(pendiente > 0 ? pendiente : 0)
  }, [open, pendiente]) // eslint-disable-line react-hooks/exhaustive-deps

  const doSubmit = handleSubmit((formData) => {
    const monto = montoInput.numericValue()
    if (monto < 1) { toast.error('Ingresa un monto válido'); return }
    onSubmit({ ...formData, sub_total: monto })
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar pago"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={loading} icon={<CreditCard size={14} />} onClick={doSubmit}>
            Registrar pago
          </Button>
        </>
      }
    >
      {/* Enter confirma cuando medio y monto están listos */}
      <div
        className="space-y-4"
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && canPay) { e.preventDefault(); doSubmit() } }}
      >
        {/* Saldo pendiente */}
        <div className="p-3.5 bg-yellow-50 border border-yellow-100 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="text-yellow-500 shrink-0" />
            <span className="text-sm font-medium text-yellow-700">Pendiente</span>
          </div>
          <span className="text-base font-bold text-yellow-800 tabular-nums">{formatCOP(pendiente)}</span>
        </div>

        <form className="space-y-4">
          {/* Medio de pago */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Medio de pago *</p>
            <div className="grid grid-cols-1 gap-2">
              {mediosPago.map((m) => (
                <label
                  key={m.id}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${Number(medioId) === m.id ? 't-border t-bg-xlt ring-1 ring-[var(--t-primary-ring)]' : 'border-slate-200 hover:t-border'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <input type="radio" {...register('medio_pago_id')} value={m.id} />
                    <span className="text-sm font-medium text-slate-800">{m.nombre}</span>
                  </div>
                  {Number(m.comision_porcentaje) > 0 && (
                    <span className="text-xs text-orange-500 font-medium">{m.comision_porcentaje}% comisión</span>
                  )}
                </label>
              ))}
            </div>
            {errors.medio_pago_id && <p className="text-xs text-red-600">{String(errors.medio_pago_id.message)}</p>}
          </div>

          {/* Monto */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Monto *</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none select-none">$</span>
                <input
                  {...montoInput.inputProps}
                  placeholder="0"
                  className="w-full pl-7 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>
              {pendiente > 0 && (
                <button
                  type="button"
                  onClick={() => montoInput.setFromNumber(pendiente)}
                  className="shrink-0 px-3 py-2 text-xs font-semibold rounded-xl border t-border t-text hover:t-bg-lt transition-colors"
                  title={`Pagar todo — ${formatCOP(pendiente)}`}
                >
                  Pagar todo
                </button>
              )}
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Descripción (opcional)</label>
            <input {...register('descripcion')} placeholder="Ej: Abono parcial..." className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none" />
          </div>

          {/* Vuelto / cambio */}
          {cambio > 0 && (
            <div className="p-3.5 t-bg-xlt border t-border rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">💵</span>
                <div>
                  <p className="text-sm font-semibold t-text-dk">Vuelto a dar</p>
                  <p className="text-[10px] t-text">El cliente pagó más de lo debido</p>
                </div>
              </div>
              <span className="text-xl font-bold t-text-dk tabular-nums">{formatCOP(cambio)}</span>
            </div>
          )}

          {/* Resumen comisión */}
          {comision > 0 && (
            <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl text-xs space-y-1">
              <div className="flex justify-between text-orange-700">
                <span>Monto pagado por cliente</span>
                <span className="font-semibold tabular-nums">{formatCOP(subTotal)}</span>
              </div>
              <div className="flex justify-between text-orange-600">
                <span>Comisión {medioSeleccionado?.nombre} ({medioSeleccionado?.comision_porcentaje}%)</span>
                <span className="tabular-nums">−{formatCOP(comision)}</span>
              </div>
              <div className="flex justify-between text-orange-800 font-bold border-t border-orange-100 pt-1">
                <span>Recibido neto</span>
                <span className="tabular-nums">{formatCOP(totalNeto)}</span>
              </div>
            </div>
          )}
        </form>
      </div>
    </Modal>
  )
}

// ─── AsignarClienteModal ───────────────────────────────────────────────────────

const clienteAsignarSchema = z.object({
  tipo_doc: z.enum(['CC', 'NIT', 'CE', 'PA', 'TI']).default('CC'),
  documento: z.string().min(3, 'Documento requerido'),
  nombre_fiscal: z.string().min(2, 'Nombre requerido'),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().optional(),
})

type ClienteAsignarForm = z.infer<typeof clienteAsignarSchema>

interface AsignarClienteModalProps {
  open: boolean
  onClose: () => void
  cuentaId: number
  initialValues?: ClienteForm
  /** Callback con la cuenta actualizada — el parent decide si dispara auto-factura. */
  onAssigned?: (updated: Cuenta) => void
}

function AsignarClienteModal({ open, onClose, cuentaId, initialValues, onAssigned }: AsignarClienteModalProps) {
  const qc = useQueryClient()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ClienteAsignarForm>({
    resolver: zodResolver(clienteAsignarSchema) as Resolver<ClienteAsignarForm>,
    defaultValues: {
      tipo_doc: initialValues?.tipo_doc ?? 'CC',
      documento: initialValues?.documento ?? '',
      nombre_fiscal: initialValues?.nombre ?? '',
      direccion: initialValues?.direccion ?? '',
      telefono: initialValues?.telefono ?? '',
      email: initialValues?.email ?? '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        tipo_doc: initialValues?.tipo_doc ?? 'CC',
        documento: initialValues?.documento ?? '',
        nombre_fiscal: initialValues?.nombre ?? '',
        direccion: initialValues?.direccion ?? '',
        telefono: initialValues?.telefono ?? '',
        email: initialValues?.email ?? '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const mutation = useMutation({
    mutationFn: (dto: AsignarClienteDto) => cuentasApi.asignarCliente(cuentaId, dto),
    onSuccess: (updated) => {
      qc.setQueryData(['accounts', cuentaId], updated)
      qc.invalidateQueries({ queryKey: ['accounts'] })
      toast.success('Cliente fiscal actualizado')
      onClose()
      onAssigned?.(updated as Cuenta)
    },
    onError: (err: unknown) => toast.error(apiError(err)),
  })

  function onSubmit(data: ClienteAsignarForm) {
    mutation.mutate({
      tipo_doc: data.tipo_doc,
      documento: data.documento,
      nombre_fiscal: data.nombre_fiscal,
      direccion: data.direccion || null,
      telefono: data.telefono || null,
      email: data.email || null,
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Cliente fiscal" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <InfoBanner icon={<AlertCircle size={15} />} variant="info">
          Al pagar esta cuenta, se generará una factura de venta automáticamente con estos datos.
        </InfoBanner>

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
              label="Número *"
              {...register('documento')}
              error={errors.documento?.message}
              placeholder="1020304050"
            />
          </div>
        </div>

        <Input
          label="Nombre / Razón social *"
          {...register('nombre_fiscal')}
          error={errors.nombre_fiscal?.message}
        />

        <div className="grid grid-cols-2 gap-2">
          <Input label="Dirección" {...register('direccion')} />
          <Input label="Teléfono" {...register('telefono')} />
        </div>
        <Input label="Email" type="email" {...register('email')} />

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={mutation.isPending}>Guardar cliente</Button>
        </div>
      </form>
    </Modal>
  )
}

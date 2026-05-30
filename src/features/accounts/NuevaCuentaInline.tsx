/**
 * NuevaCuentaInline — módulo compacto para crear cuentas SIN abrir modal.
 *
 * Vive entre las estadísticas y la lista de cuentas. Permite cambiar al
 * instante entre tres modos, ahorrando el paso del modal:
 *   • Solo nombre   — cuenta con nombre libre (sin cliente fiscal)
 *   • Cliente fiscal — cuenta ligada a un cliente del directorio (auto-factura al pagar)
 *   • Venta rápida   — abre el flujo de venta rápida (selección de productos)
 *
 * SRP: este componente solo arma el formulario de creación. La mutación y la
 * navegación las maneja el padre (AccountsPage) vía callbacks.
 */
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users, Receipt, Zap, Plus } from 'lucide-react'
import { Card, Button, Input } from '@/shared/components/ui'
import Combobox from '@/shared/components/Combobox'
import QuickSaleInline from './QuickSaleInline'
import { clientesApi } from '@/features/clients/api'
import type { Cliente } from '@/shared/types'

type Modo = 'nombre' | 'cliente' | 'rapida'

interface Props {
  onCrear: (payload: { nombre: string; cliente_id?: number }) => void
  creating: boolean
  /** Guarda de caja: devuelve false (y muestra toast) si no hay caja abierta. */
  guardCaja: (accion: string) => boolean
}

const MODOS: { key: Modo; label: string; icon: typeof Users }[] = [
  { key: 'nombre', label: 'Solo nombre', icon: Users },
  { key: 'cliente', label: 'Cliente fiscal', icon: Receipt },
  { key: 'rapida', label: 'Venta rápida', icon: Zap },
]

export default function NuevaCuentaInline({ onCrear, creating, guardCaja }: Props) {
  const [modo, setModo] = useState<Modo>('nombre')
  const [nombre, setNombre] = useState('')
  const [clienteId, setClienteId] = useState<number | null>(null)

  const { data: clientes = [] } = useQuery({
    queryKey: ['clients', 'activos'],
    queryFn: () => clientesApi.getAll(true),
    enabled: modo === 'cliente',
  })

  const clienteSel = useMemo(
    () => clientes.find((c) => c.id === clienteId) as Cliente | undefined,
    [clientes, clienteId],
  )

  function reset() {
    setNombre('')
    setClienteId(null)
  }

  function handleClienteSelect(c: Cliente | null) {
    if (c) {
      setClienteId(c.id)
      setNombre(c.nombre_fiscal)
    } else {
      setClienteId(null)
    }
  }

  function handleCrear() {
    if (!guardCaja('crear una cuenta')) return
    if (!nombre.trim()) return
    if (modo === 'cliente' && !clienteId) return
    onCrear({
      nombre: nombre.trim(),
      cliente_id: modo === 'cliente' && clienteId ? clienteId : undefined,
    })
    reset()
  }

  const submitDisabled =
    creating || !nombre.trim() || (modo === 'cliente' && !clienteId)

  return (
    <Card className="mb-6" padding={false}>
      {/* Selector de modo */}
      <div className="flex border-b border-slate-100">
        {MODOS.map((m) => {
          const active = modo === m.key
          const Icon = m.icon
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => { setModo(m.key); reset() }}
              className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors relative ${
                active ? 't-text' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/60'
              }`}
            >
              <Icon size={15} className={m.key === 'rapida' ? 'text-yellow-500' : undefined} />
              {m.label}
              {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 t-bg" />}
            </button>
          )
        })}
      </div>

      {/* Cuerpo según modo */}
      <div className="p-4">
        {modo === 'nombre' && (
          <form
            onSubmit={(e) => { e.preventDefault(); handleCrear() }}
            className="flex flex-col sm:flex-row gap-3 sm:items-end"
          >
            <div className="flex-1">
              <Input
                label="Nombre del cliente o negocio"
                placeholder="Ej: Restaurante El Parque"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                autoFocus
              />
            </div>
            <Button type="submit" icon={<Plus size={16} />} loading={creating} disabled={submitDisabled}>
              Crear cuenta
            </Button>
          </form>
        )}

        {modo === 'cliente' && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex-1">
                <Combobox<Cliente>
                  label="Cliente fiscal"
                  items={clientes}
                  value={clienteSel ?? null}
                  onChange={handleClienteSelect}
                  toKey={(c) => c.id}
                  toText={(c) => `${c.documento ?? ''} ${c.tipo_doc ?? ''} ${c.nombre_fiscal}`}
                  renderSelected={(c) => (c.es_generico ? c.nombre_fiscal : (c.label ?? c.nombre_fiscal))}
                  placeholder="Escribe documento o nombre…"
                  emptyText="No se encontró ningún cliente"
                  renderItem={(c) => (
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">
                        {c.es_generico ? `⚡ ${c.nombre_fiscal}` : c.nombre_fiscal}
                      </span>
                      {!c.es_generico && c.documento && (
                        <span className="text-[11px] text-slate-400 shrink-0">
                          {c.tipo_doc} {c.documento}
                        </span>
                      )}
                    </div>
                  )}
                />
              </div>
              <Button icon={<Plus size={16} />} loading={creating} disabled={submitDisabled} onClick={handleCrear}>
                Crear cuenta
              </Button>
            </div>
            {clienteSel ? (
              <div className="bg-purple-50 border border-purple-100 rounded-xl px-3 py-2 text-xs text-purple-700 flex items-center justify-between gap-2">
                <span>
                  <strong className="text-purple-800">{clienteSel.nombre_fiscal}</strong>
                  {clienteSel.tipo_doc && ` · ${clienteSel.tipo_doc} ${clienteSel.documento ?? ''}`}
                </span>
                <span className="text-[11px] text-purple-500 shrink-0">Factura automática al pagar</span>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400">
                Al pagar, se generará automáticamente la factura de venta con los datos del cliente.
              </p>
            )}
          </div>
        )}

        {modo === 'rapida' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              Venta inmediata sin crear cuenta de crédito — ideal para clientes de paso.
              Busca productos, arma el carrito y cobra; la cuenta se cierra al instante.
            </p>
            <QuickSaleInline guardCaja={guardCaja} />
          </div>
        )}
      </div>
    </Card>
  )
}

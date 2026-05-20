/**
 * /admin/billing — Configuración de facturación legal Colombia.
 *
 * Tabs:
 *  1. Empresa: datos de la empresa (razón social, NIT, régimen, etc.)
 *  2. Resoluciones DIAN: gestión de resoluciones POS / Factura Venta
 *  3. Historial: tickets emitidos
 */
import { useState } from 'react'
import { PageHeader, TabBar } from '@/shared/components/ui'
import EmpresaConfigTab from './components/EmpresaConfigTab'
import ResolucionesTab from './components/ResolucionesTab'
import TicketsHistorialTab from './components/TicketsHistorialTab'

type Tab = 'empresa' | 'resoluciones' | 'historial'

export default function BillingPage() {
  const [tab, setTab] = useState<Tab>('empresa')

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Facturación legal"
        subtitle="Configura tu empresa y resoluciones DIAN para emitir documentos fiscales"
      />

      <TabBar
        active={tab}
        onChange={setTab}
        tabs={[
          { key: 'empresa',      label: 'Datos empresa' },
          { key: 'resoluciones', label: 'Resoluciones DIAN' },
          { key: 'historial',    label: 'Documentos emitidos' },
        ]}
      />

      {tab === 'empresa' && <EmpresaConfigTab />}
      {tab === 'resoluciones' && <ResolucionesTab />}
      {tab === 'historial' && <TicketsHistorialTab />}
    </div>
  )
}

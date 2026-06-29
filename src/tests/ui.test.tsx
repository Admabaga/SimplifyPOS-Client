import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import {
  Button, Input, NumberInput, Select, Card, StatCard, Badge, ProgressBar,
  Spinner, Skeleton, SkeletonTable, EmptyState, PageHeader, SectionHeader,
  Modal, ConfirmDialog, Table, Th, Td, Pagination, Divider, TabBar,
  DateRangeBar, SearchInput, InfoBanner, FileDropZone, Tooltip,
} from '@/shared/components/ui'

describe('ui primitives', () => {
  it('Button: variantes, loading, icon y click', () => {
    const onClick = vi.fn()
    const { rerender } = render(<Button onClick={onClick} icon={<span>i</span>}>Guardar</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalled()
    rerender(<Button variant="secondary" loading>Cargando</Button>)
    rerender(<Button variant="danger" size="sm">X</Button>)
    rerender(<Button variant="outline" size="lg">Y</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('Input y NumberInput con label y error', () => {
    render(<Input label="Nombre" error="requerido" />)
    expect(screen.getByText('Nombre')).toBeInTheDocument()
    expect(screen.getByText('requerido')).toBeInTheDocument()
    const onChange = vi.fn()
    render(<NumberInput label="Precio" value={1000} onChange={onChange} />)
    const input = screen.getByDisplayValue('1.000')
    fireEvent.change(input, { target: { value: '2.500' } })
    expect(onChange).toHaveBeenCalled()
  })

  it('Select renderiza opciones', () => {
    render(<Select label="Cat" error="err" placeholder="Elige" options={[{ value: '1', label: 'Uno' }]} />)
    expect(screen.getByText('Cat')).toBeInTheDocument()
    expect(screen.getByText('err')).toBeInTheDocument()
    expect(screen.getByText('Uno')).toBeInTheDocument()
  })

  it('Card clickeable dispara onClick', () => {
    const onClick = vi.fn()
    render(<Card hover onClick={onClick}>contenido</Card>)
    fireEvent.click(screen.getByText('contenido'))
    expect(onClick).toHaveBeenCalled()
  })

  it('StatCard con trend y accents', () => {
    const { rerender } = render(<StatCard label="Ventas" value="$100" trend={5} trendLabel="+5%" accent="green" />)
    expect(screen.getByText('Ventas')).toBeInTheDocument()
    rerender(<StatCard label="X" value="1" trend={-3} accent="red" subValue="hoy" />)
    rerender(<StatCard label="X" value="1" trend={0} accent="blue" onClick={() => {}} icon={<span>i</span>} />)
    expect(screen.getByText('X')).toBeInTheDocument()
  })

  it('Badge, ProgressBar, Spinner, Skeleton, SkeletonTable', () => {
    render(<Badge variant="green" dot>OK</Badge>)
    render(<ProgressBar value={50} label="uso" showValue />)
    render(<Spinner />)
    render(<Skeleton lines={3} />)
    render(<SkeletonTable rows={2} cols={3} />)
    expect(screen.getByText('OK')).toBeInTheDocument()
  })

  it('EmptyState con acción', () => {
    render(<EmptyState title="Vacío" description="nada aquí" action={<Button>Crear</Button>} />)
    expect(screen.getByText('Vacío')).toBeInTheDocument()
  })

  it('PageHeader con back y SectionHeader', () => {
    render(
      <MemoryRouter>
        <PageHeader title="T" subtitle="s" back actions={<span>a</span>} />
      </MemoryRouter>,
    )
    render(<SectionHeader title="Sec" icon={<span>i</span>} actions={<span>x</span>} />)
    expect(screen.getByText('T')).toBeInTheDocument()
    expect(screen.getByText('Sec')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Volver'))
  })

  it('Modal abre, muestra footer y cierra con backdrop/escape', () => {
    const onClose = vi.fn()
    const { rerender } = render(
      <Modal open onClose={onClose} title="Titulo" footer={<span>pie</span>}>cuerpo</Modal>,
    )
    expect(screen.getByText('Titulo')).toBeInTheDocument()
    expect(screen.getByText('cuerpo')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
    rerender(<Modal open={false} onClose={onClose} title="x">y</Modal>)
    expect(screen.queryByText('y')).not.toBeInTheDocument()
  })

  it('ConfirmDialog confirma y cancela', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(
      <ConfirmDialog open onCancel={onCancel} onConfirm={onConfirm} title="Eliminar" message="seguro" danger confirmLabel="Sí, borrar" />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Sí, borrar' }))
    expect(onConfirm).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalled()
  })

  it('Table/Th/Td', () => {
    render(
      <Table>
        <thead><tr><Th>Col</Th></tr></thead>
        <tbody><tr><Td>Val</Td></tr></tbody>
      </Table>,
    )
    expect(screen.getByText('Col')).toBeInTheDocument()
    expect(screen.getByText('Val')).toBeInTheDocument()
  })

  it('Pagination cambia de página', () => {
    const onChange = vi.fn()
    render(<Pagination page={1} total={200} pageSize={50} onChange={onChange} />)
    const next = screen.getAllByRole('button').at(-1)!
    fireEvent.click(next)
    expect(onChange).toHaveBeenCalled()
  })

  it('Divider, TabBar, SearchInput, InfoBanner, Tooltip', () => {
    render(<Divider label="o" />)
    const onTab = vi.fn()
    render(<TabBar tabs={[{ key: 'a', label: 'A' }, { key: 'b', label: 'B', count: 3, dot: 'red' }]} active="a" onChange={onTab} />)
    fireEvent.click(screen.getByText('B'))
    expect(onTab).toHaveBeenCalledWith('b')

    const onSearch = vi.fn()
    render(<SearchInput value="" onChange={onSearch} />)
    fireEvent.change(screen.getByPlaceholderText('Buscar...'), { target: { value: 'q' } })
    expect(onSearch).toHaveBeenCalled()

    render(<InfoBanner variant="warning">aviso</InfoBanner>)
    render(<Tooltip content="ayuda"><span>hover</span></Tooltip>)
    expect(screen.getByText('aviso')).toBeInTheDocument()
  })

  it('DateRangeBar aplica presets', () => {
    const onDesde = vi.fn()
    const onHasta = vi.fn()
    render(<DateRangeBar desde="" hasta="" onDesde={onDesde} onHasta={onHasta} />)
    // Click en un preset (ej. "Hoy")
    const hoy = screen.queryByText(/hoy/i)
    if (hoy) fireEvent.click(hoy)
    expect(onDesde).toHaveBeenCalled()
  })

  it('FileDropZone acepta archivos', () => {
    const onFiles = vi.fn()
    const { container } = render(<FileDropZone onFiles={onFiles} accept="image/*" />)
    const input = container.querySelector('input[type=file]') as HTMLInputElement
    const file = new File(['x'], 'foto.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file] } })
    expect(onFiles).toHaveBeenCalled()
  })
})

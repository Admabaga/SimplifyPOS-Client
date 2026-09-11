/**
 * Lenguaje visual del Master.
 *
 * El Master no es "otra pantalla más" de la app: es la consola de quien opera
 * la plataforma, no la de quien atiende un mostrador. Por eso tiene su propia
 * voz, y la idea es que al entrar se note el cambio de contexto sin necesidad
 * de leer el título.
 *
 * De dónde sale la estética: un cuaderno técnico. Papel con retícula finísima,
 * rótulos en versalitas con una línea que cruza el ancho, cifras en la
 * tipografía de titulares. Nada de tarjetas redondeadas con un ícono de color
 * y un número gigante — eso es lo que hace cualquiera.
 *
 * El elemento propio es el ESPECTRO: cada negocio es una barra vertical,
 * ordenados de peor a mejor. Cien negocios caben en el ancho de la pantalla y
 * de un vistazo se ve la *forma* de la cartera —si es verde con una cola roja,
 * o si está partida en dos— que es justo lo que cuatro tarjetas de conteo no
 * pueden mostrar.
 */
import { type ReactNode } from 'react'
import { clsx } from 'clsx'

// ─── Niveles ─────────────────────────────────────────────────────────────────
// Sin emojis a propósito: el color y la posición ya comunican, y un semáforo de
// emojis en una herramienta de trabajo la hace ver de juguete.

export type Nivel = 'red' | 'yellow' | 'green'

export const NIVEL = {
  red: {
    label: 'Crítico',
    texto: 'text-rose-700',
    barra: 'bg-rose-500',
    barraTenue: 'bg-rose-200',
    borde: 'border-rose-200',
    fondo: 'bg-rose-50',
    punto: 'bg-rose-500',
  },
  yellow: {
    label: 'Atención',
    texto: 'text-amber-700',
    barra: 'bg-amber-500',
    barraTenue: 'bg-amber-200',
    borde: 'border-amber-200',
    fondo: 'bg-amber-50/70',
    punto: 'bg-amber-500',
  },
  green: {
    label: 'Estable',
    texto: 'text-emerald-700',
    barra: 'bg-emerald-500',
    barraTenue: 'bg-emerald-200',
    borde: 'border-emerald-200',
    fondo: 'bg-emerald-50/60',
    punto: 'bg-emerald-500',
  },
} as const satisfies Record<Nivel, Record<string, string>>

// ─── Superficie ──────────────────────────────────────────────────────────────

/**
 * Papel de la consola. La retícula va a una opacidad casi imperceptible: no se
 * "ve", se siente — da sensación de instrumento sin competir con el contenido.
 */
export function Papel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={clsx('relative rounded-2xl border border-slate-200/80 bg-white', className)}
      style={{
        backgroundImage:
          'linear-gradient(to right, rgba(15,23,42,0.035) 1px, transparent 1px),' +
          'linear-gradient(to bottom, rgba(15,23,42,0.035) 1px, transparent 1px)',
        backgroundSize: '22px 22px',
      }}
    >
      {children}
    </div>
  )
}

/**
 * Rótulo de sección: versalitas espaciadas y una línea que se va hasta el
 * borde. Ordena la página sin gastar el peso visual de un título grande.
 */
export function Rotulo({
  children,
  contador,
  accion,
}: {
  children: ReactNode
  contador?: ReactNode
  accion?: ReactNode
}) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 shrink-0">
        {children}
      </span>
      {contador !== undefined && (
        <span className="num text-[11px] font-semibold text-slate-400 shrink-0">{contador}</span>
      )}
      <span className="h-px flex-1 bg-slate-200" />
      {accion}
    </div>
  )
}

// ─── Cifras ──────────────────────────────────────────────────────────────────

/**
 * Una cifra con su etiqueta. Deliberadamente sin caja ni ícono: van varias
 * seguidas separadas por filetes verticales, como la cabecera de un informe.
 */
export function Cifra({
  valor,
  etiqueta,
  nota,
  tono = 'neutro',
}: {
  valor: ReactNode
  etiqueta: string
  nota?: ReactNode
  tono?: 'neutro' | 'red' | 'yellow' | 'green'
}) {
  return (
    <div className="min-w-0 px-4 first:pl-0 last:pr-0">
      <p
        className={clsx(
          'font-display num text-[26px] leading-none tracking-[-0.03em]',
          tono === 'neutro' ? 'text-slate-900' : NIVEL[tono].texto,
        )}
      >
        {valor}
      </p>
      <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        {etiqueta}
      </p>
      {nota && <p className="mt-0.5 text-[11px] text-slate-500 truncate">{nota}</p>}
    </div>
  )
}

/** Fila de cifras separadas por filete. */
export function Cifras({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start divide-x divide-slate-200">{children}</div>
  )
}

// ─── Espectro ────────────────────────────────────────────────────────────────

export interface PuntoEspectro {
  id: number
  nombre: string
  score: number
  nivel: Nivel
}

/**
 * El espectro de la cartera. Cada negocio, una barra; ordenadas de peor a
 * mejor. La altura es el score, así que la silueta cuenta la historia: una
 * rampa pareja es una cartera sana, un escalón a la izquierda es un problema
 * concentrado.
 *
 * Con pocos negocios las barras se limitan en ancho y quedan a la izquierda:
 * estiradas a todo lo ancho parecerían un gráfico de otra cosa.
 */
export function Espectro({
  puntos,
  onSelect,
}: {
  puntos: PuntoEspectro[]
  onSelect?: (id: number) => void
}) {
  if (puntos.length === 0) return null
  const ordenados = [...puntos].sort((a, b) => a.score - b.score)

  return (
    <div>
      {/* Las barras crecen para llenar el ancho pero con tope: con 100 negocios
          quedan finas como un peine y con 3 no se convierten en bloques. El
          grupo va centrado para que no quede un vacío raro a un costado. */}
      <div
        className="flex items-end justify-center gap-[2px] h-20"
        role="list"
        aria-label="Salud de la cartera"
      >
        {ordenados.map((p) => (
          <button
            key={p.id}
            type="button"
            role="listitem"
            onClick={() => onSelect?.(p.id)}
            title={`${p.nombre} · ${p.score}/100 · ${NIVEL[p.nivel].label}`}
            aria-label={`${p.nombre}, salud ${p.score} de 100`}
            className={clsx(
              'group relative flex-1 min-w-[3px] max-w-[46px] rounded-t-[2px] transition-all',
              'hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20',
              NIVEL[p.nivel].barra,
              onSelect ? 'cursor-pointer opacity-85' : 'cursor-default opacity-85',
            )}
            // Piso del 12%: un negocio en cero seguiría siendo un negocio y
            // tiene que poder clicarse.
            style={{ height: `${Math.max(12, p.score)}%` }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex items-center justify-between border-t border-slate-200 pt-1.5">
        <span className="text-[10px] uppercase tracking-[0.14em] text-slate-400">
          ← más frágil
        </span>
        <span className="text-[10px] uppercase tracking-[0.14em] text-slate-400">
          más sólido →
        </span>
      </div>
    </div>
  )
}

// ─── Marcador de score ───────────────────────────────────────────────────────

/**
 * El score de un negocio como columna, no como pastilla de color. Se lee la
 * altura antes que el número, que es lo que uno hace al comparar una lista.
 */
export function Marcador({ score, nivel }: { score: number; nivel: Nivel }) {
  return (
    <div className="flex items-end gap-1.5 shrink-0" title={`${score}/100`}>
      <div className="relative h-8 w-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={clsx('absolute bottom-0 inset-x-0 rounded-full', NIVEL[nivel].barra)}
          style={{ height: `${Math.max(6, score)}%` }}
        />
      </div>
      <span className={clsx('num font-display text-[15px] leading-none', NIVEL[nivel].texto)}>
        {score}
      </span>
    </div>
  )
}

/** Motivo del score: chip sobrio, sin ícono. */
export function Motivo({ children, tono }: { children: ReactNode; tono: 'danger' | 'warning' | 'info' }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[10.5px] font-medium',
        tono === 'danger' && 'bg-rose-50 text-rose-700',
        tono === 'warning' && 'bg-amber-50 text-amber-700',
        tono === 'info' && 'bg-slate-100 text-slate-600',
      )}
    >
      <span
        className={clsx(
          'h-1 w-1 rounded-full',
          tono === 'danger' && 'bg-rose-500',
          tono === 'warning' && 'bg-amber-500',
          tono === 'info' && 'bg-slate-400',
        )}
      />
      {children}
    </span>
  )
}

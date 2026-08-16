/**
 * LogoutOverlay — cierre de sesión con carácter.
 *
 * Cerrar sesión es un cambio de contexto, no una acción menor: un toast se
 * pierde en la esquina y deja la app "viva" detrás, así que el usuario duda y
 * vuelve a hacer clic. Aquí la pantalla completa toma el color de la marca y
 * bloquea la interacción POR CONSTRUCCIÓN — no hay nada que volver a pulsar.
 *
 * En vez de un spinner genérico, una barra indeterminada delgada: se lee como
 * "el sistema está trabajando" (lenguaje de instrumento, igual que el resto de
 * la app) en lugar de "algo se quedó cargando".
 */
import { createPortal } from 'react-dom'
import Logo from '@/assets/logo-mark.svg'

export function LogoutOverlay({ open, nombre }: { open: boolean; nombre?: string }) {
  if (!open) return null

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      aria-label="Cerrando sesión"
      style={{ background: 'var(--t-sidebar-bg)' }}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center px-6 animate-fade-in"
    >
      <img src={Logo} alt="" className="h-12 w-12 opacity-95" />

      <p className="mt-5 text-[17px] font-semibold tracking-[-0.01em] text-white">
        Cerrando sesión
      </p>
      <p style={{ color: 'var(--t-accent)' }} className="mt-1 text-xs opacity-80">
        {nombre ? `Hasta pronto, ${nombre.split(' ')[0]}` : 'Guardando tu sesión de forma segura'}
      </p>

      {/* Barra indeterminada: progreso sin prometer un porcentaje que no sabemos */}
      <div className="mt-7 h-[3px] w-44 overflow-hidden rounded-full bg-white/15">
        <div
          style={{ background: 'var(--t-accent)' }}
          className="h-full w-1/3 rounded-full animate-indeterminate"
        />
      </div>
    </div>,
    document.body,
  )
}

export default LogoutOverlay

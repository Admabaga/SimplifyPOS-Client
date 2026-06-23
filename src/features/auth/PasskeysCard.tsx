import { useEffect, useState } from 'react'
import { Fingerprint, Plus, Trash2, KeyRound, Loader2, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { startRegistration } from '@simplewebauthn/browser'
import { authApi, type PasskeyInfo } from './api'
import { apiError } from '@/shared/lib/apiError'
import { Card, Button, Badge, ConfirmDialog } from '@/shared/components/ui'

function formatFecha(iso: string | null): string {
  if (!iso) return 'Nunca'
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function PasskeysCard() {
  const [passkeys, setPasskeys] = useState<PasskeyInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [showNameInput, setShowNameInput] = useState(false)
  const [nombre, setNombre] = useState('')
  const [toDelete, setToDelete] = useState<PasskeyInfo | null>(null)
  const [deleting, setDeleting] = useState(false)

  const cargar = async () => {
    try {
      setPasskeys(await authApi.passkeyList())
    } catch {
      /* silencioso: la tarjeta simplemente muestra vacío */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  const onRegister = async () => {
    if (!nombre.trim()) {
      toast.error('Dale un nombre a tu passkey (ej. "iPhone de Adrián")')
      return
    }
    setRegistering(true)
    try {
      const { options, ticket } = await authApi.passkeyRegisterBegin()
      const credential = await startRegistration({ optionsJSON: options })
      await authApi.passkeyRegisterFinish({ ticket, nombre: nombre.trim(), credential })
      toast.success('Passkey registrada')
      setNombre('')
      setShowNameInput(false)
      await cargar()
    } catch (err) {
      const name = (err as { name?: string })?.name
      if (name === 'NotAllowedError' || name === 'AbortError') return // canceló
      toast.error(apiError(err, 'No se pudo registrar la passkey'))
    } finally {
      setRegistering(false)
    }
  }

  const onDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await authApi.passkeyDelete(toDelete.id)
      toast.success('Passkey eliminada')
      setToDelete(null)
      await cargar()
    } catch (err) {
      toast.error(apiError(err, 'No se pudo eliminar'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card className="mt-5">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-50 rounded-lg">
            <Fingerprint size={15} className="text-emerald-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Passkeys</h3>
            <p className="text-xs text-slate-500">Inicia sesión sin contraseña con huella, Face ID o llave</p>
          </div>
        </div>
        {passkeys.length > 0 && <Badge variant="green">{passkeys.length} activa{passkeys.length > 1 ? 's' : ''}</Badge>}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
          <Loader2 size={14} className="animate-spin" /> Cargando…
        </div>
      ) : passkeys.length === 0 ? (
        <div className="flex flex-col items-center text-center py-6 px-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
            <KeyRound size={22} className="text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-600">Aún no tienes passkeys</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Una passkey te deja entrar al instante con tu huella o Face ID, sin escribir contraseña ni códigos.
          </p>
        </div>
      ) : (
        <div className="space-y-2 mt-3">
          {passkeys.map((pk) => (
            <div key={pk.id} className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <ShieldCheck size={16} className="text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700 truncate">{pk.nombre}</p>
                <p className="text-[11px] text-slate-400">
                  Creada {formatFecha(pk.created_at)} · Último uso {formatFecha(pk.last_used)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setToDelete(pk)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Eliminar passkey"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Agregar */}
      {showNameInput ? (
        <div className="mt-4 space-y-2">
          <label className="text-sm font-medium text-slate-700">Nombre de esta passkey</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onRegister()}
            autoFocus
            maxLength={100}
            placeholder='Ej: "iPhone de Adrián", "MacBook trabajo"'
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none"
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => { setShowNameInput(false); setNombre('') }}>
              Cancelar
            </Button>
            <Button onClick={onRegister} loading={registering}>
              <Fingerprint size={15} className="mr-1.5" />
              Crear passkey
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <Button variant="secondary" onClick={() => setShowNameInput(true)}>
            <Plus size={15} className="mr-1.5" />
            Agregar passkey
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onCancel={() => setToDelete(null)}
        onConfirm={onDelete}
        title="Eliminar passkey"
        message={
          <div>
            ¿Eliminar la passkey <strong>{toDelete?.nombre}</strong>? Ya no podrás usarla para
            iniciar sesión. Si es la única forma sin contraseña que tienes, asegúrate de recordar
            tu contraseña.
          </div>
        }
        danger
        loading={deleting}
      />
    </Card>
  )
}

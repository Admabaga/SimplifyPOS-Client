import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import { Copy, Download, KeyRound, ShieldCheck, ShieldOff, Smartphone } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from './api'
import { apiError } from '@/shared/lib/apiError'
import { Badge, Button, Card, Modal } from '@/shared/components/ui'

/** Tarjeta de "Verificación en dos pasos" para el perfil.
 *
 * Flujo de activación: setup (QR) → confirmar código → guardar códigos de
 * recuperación (se muestran UNA sola vez). Desactivar exige contraseña + código.
 */
export default function TwoFactorCard() {
  const qc = useQueryClient()
  const { data: me } = useQuery({ queryKey: ['auth', 'me'], queryFn: authApi.me })

  // Pasos del wizard de activación
  const [setupData, setSetupData] = useState<{ secret: string; otpauth_uri: string } | null>(null)
  const [confirmCode, setConfirmCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const [showDisable, setShowDisable] = useState(false)
  const [disablePwd, setDisablePwd] = useState('')
  const [disableCode, setDisableCode] = useState('')

  const refresh = () => qc.invalidateQueries({ queryKey: ['auth', 'me'] })

  const setupMut = useMutation({
    mutationFn: authApi.twofaSetup,
    onSuccess: setSetupData,
    onError: (e) => toast.error(apiError(e)),
  })
  const enableMut = useMutation({
    mutationFn: () => authApi.twofaEnable(confirmCode.trim()),
    onSuccess: (r) => {
      setSetupData(null)
      setConfirmCode('')
      setRecoveryCodes(r.recovery_codes)
      refresh()
      toast.success('Verificación en dos pasos activada')
    },
    onError: (e) => toast.error(apiError(e, 'Código inválido. Verifica tu app.')),
  })
  const disableMut = useMutation({
    mutationFn: () => authApi.twofaDisable(disablePwd, disableCode.trim()),
    onSuccess: () => {
      setShowDisable(false)
      setDisablePwd('')
      setDisableCode('')
      refresh()
      toast.success('Verificación en dos pasos desactivada')
    },
    onError: (e) => toast.error(apiError(e, 'Contraseña o código incorrectos')),
  })

  const copyCodes = () => {
    if (!recoveryCodes) return
    navigator.clipboard.writeText(recoveryCodes.join('\n'))
    toast.success('Códigos copiados')
  }

  const downloadCodes = () => {
    if (!recoveryCodes) return
    const blob = new Blob(
      [`Códigos de recuperación SimplifyPOS\n\n${recoveryCodes.join('\n')}\n\nGuárdalos en un lugar seguro. Cada código sirve UNA sola vez.`],
      { type: 'text/plain' }
    )
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'simplifypos-codigos-recuperacion.txt'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const enabled = me?.totp_enabled ?? false

  return (
    <Card className="mt-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-50 rounded-lg">
            <ShieldCheck size={15} className="text-emerald-600" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">Verificación en dos pasos (2FA)</h3>
        </div>
        <Badge variant={enabled ? 'green' : 'gray'}>{enabled ? 'Activada' : 'Desactivada'}</Badge>
      </div>

      {!enabled && !setupData && (
        <>
          <p className="text-sm text-slate-500">
            Protege tu cuenta exigiendo un código de tu celular además de la contraseña.
            Recomendado especialmente para cuentas administradoras.
          </p>
          <Button
            className="mt-3"
            size="sm"
            icon={<Smartphone size={14} />}
            onClick={() => setupMut.mutate()}
            loading={setupMut.isPending}
          >
            Activar verificación en dos pasos
          </Button>
        </>
      )}

      {/* Paso 1-2: escanear QR + confirmar código */}
      {setupData && (
        <div className="space-y-4">
          <ol className="text-sm text-slate-600 list-decimal ml-4 space-y-1">
            <li>Abre tu app de autenticación (Google Authenticator, 1Password, Authy…)</li>
            <li>Escanea este código QR</li>
            <li>Escribe el código de 6 dígitos para confirmar</li>
          </ol>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <QRCodeSVG value={setupData.otpauth_uri} size={140} />
            </div>
            <div className="flex-1 w-full">
              <p className="text-xs text-slate-400 mb-1">
                ¿No puedes escanear? Ingresa esta clave manualmente:
              </p>
              <code className="block text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 break-all select-all">
                {setupData.secret}
              </code>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
                placeholder="Código de 6 dígitos"
                className="mt-3 w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl tracking-widest"
              />
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  onClick={() => enableMut.mutate()}
                  loading={enableMut.isPending}
                  disabled={confirmCode.trim().length < 6}
                >
                  Confirmar y activar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setSetupData(null); setConfirmCode('') }}>
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Paso 3: códigos de recuperación (una sola vez) */}
      {recoveryCodes && (
        <Modal open onClose={() => setRecoveryCodes(null)} title="Guarda tus códigos de recuperación">
          <p className="text-sm text-slate-600">
            Si pierdes tu celular, estos códigos son la <strong>única</strong> forma de entrar.
            Cada uno sirve una sola vez y <strong>no volverán a mostrarse</strong>.
          </p>
          <div className="grid grid-cols-2 gap-2 my-4">
            {recoveryCodes.map((c) => (
              <code key={c} className="text-center text-sm bg-slate-50 border border-slate-200 rounded-lg py-2 select-all">
                {c}
              </code>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <Button size="sm" variant="outline" icon={<Copy size={13} />} onClick={copyCodes}>Copiar</Button>
            <Button size="sm" variant="outline" icon={<Download size={13} />} onClick={downloadCodes}>Descargar</Button>
            <Button size="sm" onClick={() => setRecoveryCodes(null)}>Ya los guardé</Button>
          </div>
        </Modal>
      )}

      {enabled && (
        <>
          <p className="text-sm text-slate-500">
            Tu cuenta pide un código de verificación al iniciar sesión. Si pierdes el celular,
            usa uno de tus códigos de recuperación en el campo del código.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <RegenerateCodes onCodes={setRecoveryCodes} />
            <Button
              size="sm"
              variant="ghost"
              icon={<ShieldOff size={14} />}
              className="text-red-500 hover:bg-red-50"
              onClick={() => setShowDisable(true)}
            >
              Desactivar
            </Button>
          </div>
        </>
      )}

      {/* Modal desactivar: acción sensible → contraseña + código */}
      <Modal open={showDisable} onClose={() => setShowDisable(false)} title="Desactivar verificación en dos pasos">
        <p className="text-sm text-slate-600 mb-3">
          Por seguridad confirma tu contraseña y un código de tu app (o de recuperación).
        </p>
        <div className="space-y-3">
          <input
            type="password"
            autoComplete="current-password"
            value={disablePwd}
            onChange={(e) => setDisablePwd(e.target.value)}
            placeholder="Contraseña actual"
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl"
          />
          <input
            type="text"
            inputMode="numeric"
            value={disableCode}
            onChange={(e) => setDisableCode(e.target.value)}
            placeholder="Código de verificación"
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl tracking-widest"
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowDisable(false)}>Cancelar</Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => disableMut.mutate()}
              loading={disableMut.isPending}
              disabled={!disablePwd || disableCode.trim().length < 6}
            >
              Desactivar 2FA
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  )
}

/** Botón + mini-modal para regenerar códigos de recuperación. */
function RegenerateCodes({ onCodes }: { onCodes: (codes: string[]) => void }) {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const mut = useMutation({
    mutationFn: () => authApi.twofaRegenerateCodes(code.trim()),
    onSuccess: (r) => {
      setOpen(false)
      setCode('')
      onCodes(r.recovery_codes)
      toast.success('Códigos regenerados — los anteriores ya no sirven')
    },
    onError: (e) => toast.error(apiError(e, 'Código inválido')),
  })
  return (
    <>
      <Button size="sm" variant="outline" icon={<KeyRound size={13} />} onClick={() => setOpen(true)}>
        Regenerar códigos de recuperación
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Regenerar códigos de recuperación">
        <p className="text-sm text-slate-600 mb-3">
          Confirma con un código de tu app. Los códigos anteriores quedarán invalidados.
        </p>
        <input
          type="text"
          inputMode="numeric"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Código de verificación"
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl tracking-widest"
        />
        <div className="mt-3 flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button size="sm" onClick={() => mut.mutate()} loading={mut.isPending} disabled={code.trim().length < 6}>
            Regenerar
          </Button>
        </div>
      </Modal>
    </>
  )
}

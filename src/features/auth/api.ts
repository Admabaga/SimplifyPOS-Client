import apiClient from '@/shared/api/client'
import type { TokenResponse, User } from '@/shared/types'
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser'

export interface LoginPayload {
  email: string
  password: string
  totp_code?: string
}

export interface ChangePasswordPayload {
  current_password: string
  new_password: string
}

export interface UpdateProfilePayload {
  nombre?: string
  nit?: string
}

export const authApi = {
  login: (payload: LoginPayload) =>
    apiClient.post<TokenResponse>('/auth/login', payload).then((r) => r.data),

  logout: () =>
    apiClient.post('/auth/logout').then(() => undefined),

  me: () =>
    apiClient.get<User>('/auth/me').then((r) => r.data),

  changePassword: (payload: ChangePasswordPayload) =>
    apiClient.post('/auth/change-password', payload).then(() => undefined),

  updateProfile: (payload: UpdateProfilePayload) =>
    apiClient.patch<User>('/auth/me', payload).then((r) => r.data),

  refresh: () =>
    apiClient.post<{ access_token: string }>('/auth/refresh').then((r) => r.data),

  // ── 2FA ──
  twofaSetup: () =>
    apiClient
      .post<{ secret: string; otpauth_uri: string }>('/auth/2fa/setup')
      .then((r) => r.data),

  twofaEnable: (code: string) =>
    apiClient
      .post<{ recovery_codes: string[] }>('/auth/2fa/enable', { code })
      .then((r) => r.data),

  twofaDisable: (password: string, code: string) =>
    apiClient.post('/auth/2fa/disable', { password, code }).then(() => undefined),

  twofaRegenerateCodes: (code: string) =>
    apiClient
      .post<{ recovery_codes: string[] }>('/auth/2fa/recovery-codes', { code })
      .then((r) => r.data),

  // ── Passkeys (WebAuthn) ──
  passkeyRegisterBegin: () =>
    apiClient
      .post<{ options: PublicKeyCredentialCreationOptionsJSON; ticket: string }>(
        '/auth/passkey/register/begin'
      )
      .then((r) => r.data),

  passkeyRegisterFinish: (payload: { ticket: string; nombre: string; credential: unknown }) =>
    apiClient.post<PasskeyInfo>('/auth/passkey/register/finish', payload).then((r) => r.data),

  passkeyList: () =>
    apiClient.get<PasskeyInfo[]>('/auth/passkey').then((r) => r.data),

  passkeyDelete: (id: number) =>
    apiClient.delete(`/auth/passkey/${id}`).then(() => undefined),

  passkeyLoginBegin: (email?: string) =>
    apiClient
      .post<{ options: PublicKeyCredentialRequestOptionsJSON; ticket: string }>(
        '/auth/passkey/login/begin',
        { email: email || null }
      )
      .then((r) => r.data),

  passkeyLoginFinish: (payload: { ticket: string; credential: unknown }) =>
    apiClient.post<TokenResponse>('/auth/passkey/login/finish', payload).then((r) => r.data),
}

export interface PasskeyInfo {
  id: number
  nombre: string
  transports: string | null
  last_used: string | null
  created_at: string
}

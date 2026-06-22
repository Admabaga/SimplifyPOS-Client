import apiClient from '@/shared/api/client'
import type { TokenResponse, User } from '@/shared/types'

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
}

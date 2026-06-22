import { apiClient } from '@/shared/api/client'
import type {
  Plan,
  SignupPayload,
  SignupResponse,
  SubscriptionConfig,
  SubscriptionMe,
} from './types'

export const subscriptionApi = {
  getPlans: () => apiClient.get<Plan[]>('/plans').then((r) => r.data),

  getConfig: () =>
    apiClient.get<SubscriptionConfig>('/subscriptions/config').then((r) => r.data),

  signup: (payload: SignupPayload) =>
    apiClient.post<SignupResponse>('/auth/signup', payload).then((r) => r.data),

  getMe: () => apiClient.get<SubscriptionMe>('/subscriptions/me').then((r) => r.data),

  savePaymentMethod: (
    card_token: string,
    meta?: { brand?: string; last4?: string; holder?: string; exp?: string },
  ) =>
    apiClient
      .post<SubscriptionMe>('/subscriptions/payment-method', { card_token, ...meta })
      .then((r) => r.data),

  pay: () =>
    apiClient
      .post<{ estado_transaccion: string; estado_suscripcion: string; mensaje: string }>(
        '/subscriptions/pay'
      )
      .then((r) => r.data),

  changePlan: (plan_id: number) =>
    apiClient.post<SubscriptionMe>('/subscriptions/change-plan', { plan_id }).then((r) => r.data),

  changeCiclo: (ciclo: 'MENSUAL' | 'ANUAL') =>
    apiClient.post<SubscriptionMe>('/subscriptions/change-ciclo', { ciclo }).then((r) => r.data),

  cancel: (at_period_end = true) =>
    apiClient
      .post<SubscriptionMe>('/subscriptions/cancel', { at_period_end })
      .then((r) => r.data),

  reactivate: () =>
    apiClient.post<SubscriptionMe>('/subscriptions/reactivate').then((r) => r.data),
}

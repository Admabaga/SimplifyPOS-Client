import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User } from '@/shared/types'
import { useThemeStore } from './theme'
import { queryClient } from '@/shared/api/queryClient'

const TOKEN_KEY = 'simplifypos_token'
const REMEMBER_KEY = 'simplifypos_remember'

/** Lee el token del almacén correcto (localStorage si rememberMe, sino sessionStorage) */
export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY)
}

function saveToken(token: string, remember: boolean) {
  if (remember) {
    localStorage.setItem(TOKEN_KEY, token)
    sessionStorage.removeItem(TOKEN_KEY)
  } else {
    sessionStorage.setItem(TOKEN_KEY, token)
    localStorage.removeItem(TOKEN_KEY)
  }
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
}

function isRemembered(): boolean {
  return localStorage.getItem(REMEMBER_KEY) === '1'
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  // Actions
  setUser: (user: User, token: string, remember?: boolean) => void
  updateUser: (partial: Partial<User>) => void
  clearAuth: () => void
  can: (permission: string) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      setUser: (user, token, remember) => {
        // Si no se especifica, usar el valor guardado previamente
        const shouldRemember = remember !== undefined ? remember : isRemembered()
        if (remember !== undefined) {
          if (remember) localStorage.setItem(REMEMBER_KEY, '1')
          else localStorage.removeItem(REMEMBER_KEY)
        }
        saveToken(token, shouldRemember)
        // Normalizar role siempre a lowercase (backend puede devolver uppercase)
        set({ user: { ...user, role: user.role.toLowerCase() }, isAuthenticated: true })
        useThemeStore.getState().initForUser(user.id)
      },

      updateUser: (partial) => {
        const { user } = get()
        if (user) set({ user: { ...user, ...partial } })
      },

      clearAuth: () => {
        clearToken()
        localStorage.removeItem(REMEMBER_KEY)
        set({ user: null, isAuthenticated: false })
        useThemeStore.getState().resetUser()
        // Limpiar TODO el cache de React Query al salir de sesión.
        // Sin esto, el próximo usuario ve datos del anterior durante el primer render.
        queryClient.clear()
      },

      can: (permission) => {
        const { user } = get()
        if (!user) return false
        return user.permissions.includes(permission)
      },
    }),
    {
      name: 'simplifypos-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        // Al recargar la página, cargar el tema del usuario persistido
        if (state?.user?.id) {
          // Normalizar role a lowercase (por si se persistió en uppercase)
          if (state.user.role) {
            state.user.role = state.user.role.toLowerCase()
          }
          useThemeStore.getState().initForUser(state.user.id)
        }
      },
    }
  )
)

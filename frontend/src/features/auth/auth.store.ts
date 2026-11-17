import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiFetch, ApiError, TOKEN_KEY } from '@/shared/lib/api'
import { anonymousId } from '@/shared/lib/identity'

export interface User {
  id: string
  username: string
  display_name: string
}
interface AuthResponse {
  token: string
  user: User
}

/**
 * Sesión del usuario. Sin cuenta se puede seguir usando la app (identidad anónima del
 * dispositivo); con cuenta, playlists/favoritos/historial viven en el servidor y el
 * nombre aparece en las salas.
 */
const USER_KEY = 'auth:user'

function storedUser(): User | null {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null') as User | null
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  // Optimista: con token guardado arrancamos ya con el usuario conocido (sin parpadeo de
  // la biblioteca anónima y funcionando sin conexión); init() lo valida con el servidor.
  const user = ref<User | null>(token.value ? storedUser() : null)
  /** true cuando ya sabemos si hay sesión (evita parpadeos al arrancar). */
  const ready = ref(!token.value)

  const isLoggedIn = computed(() => !!user.value)
  /** Identidad efectiva: la cuenta si hay sesión; si no, la anónima del dispositivo. */
  const uid = computed(() => user.value?.id ?? anonymousId)
  const displayName = computed(() => user.value?.display_name ?? 'Oyente anónimo')

  function setSession(res: AuthResponse): void {
    token.value = res.token
    user.value = res.user
    localStorage.setItem(TOKEN_KEY, res.token)
    localStorage.setItem(USER_KEY, JSON.stringify(res.user))
  }
  function clearSession(): void {
    token.value = null
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  /** Al arrancar: validar el token guardado. */
  async function init(): Promise<void> {
    if (!token.value) {
      ready.value = true
      return
    }
    try {
      const res = await apiFetch<{ user: User }>('/api/auth/me')
      user.value = res.user
      localStorage.setItem(USER_KEY, JSON.stringify(res.user))
    } catch (e) {
      // Solo cerrar sesión si el servidor dice que el token no vale (no por estar offline)
      if (e instanceof ApiError && e.status === 401) clearSession()
    } finally {
      ready.value = true
    }
  }

  async function login(username: string, password: string): Promise<void> {
    setSession(
      await apiFetch<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
    )
  }

  async function register(p: {
    username: string
    password: string
    display_name?: string
    code?: string
  }): Promise<void> {
    setSession(
      await apiFetch<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify(p) }),
    )
  }

  async function logout(): Promise<void> {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' })
    } catch {
      /* aunque falle la red, cerramos la sesión local */
    }
    clearSession()
  }

  return { user, token, ready, isLoggedIn, uid, displayName, init, login, register, logout }
})

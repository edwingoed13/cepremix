/**
 * Cliente HTTP tipado y mínimo hacia FastAPI.
 * En dev, Vite hace proxy de /api -> http://127.0.0.1:8000 (ver vite.config.ts).
 * Si hay sesión iniciada, añade `Authorization: Bearer <token>`.
 */
const BASE_URL = import.meta.env.VITE_API_URL ?? ''
export const TOKEN_KEY = 'auth:token'

export class ApiError extends Error {
  status: number
  body: unknown
  constructor(status: number, message: string, body: unknown = null) {
    super(message)
    this.status = status
    this.body = body
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY)
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    let body: unknown = null
    try {
      body = await res.json()
    } catch {
      /* sin cuerpo JSON */
    }
    const msg = (body as { error?: string } | null)?.error ?? `API ${res.status}: ${res.statusText}`
    throw new ApiError(res.status, msg, body)
  }
  return (await res.json()) as T
}

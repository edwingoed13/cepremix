/**
 * Cliente HTTP tipado y mínimo hacia FastAPI.
 * En dev, Vite hace proxy de /api -> http://127.0.0.1:8000 (ver vite.config.ts).
 */
const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText}`)
  }
  return (await res.json()) as T
}

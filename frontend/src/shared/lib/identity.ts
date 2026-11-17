/**
 * Identidad anónima por dispositivo (persistida en localStorage). Se usa cuando no hay
 * sesión iniciada: presencia en salas y creador (host) de salas. Con cuenta, la identidad
 * efectiva es la de la cuenta: usar `useAuthStore().uid` en vez de esto directamente.
 */
function ensureUserId(): string {
  let id = localStorage.getItem('user_id')
  if (!id) {
    id = 'u_' + Math.random().toString(36).slice(2, 10)
    localStorage.setItem('user_id', id)
  }
  return id
}

export const anonymousId = ensureUserId()

/** Color estable derivado de un id (avatares distinguibles). */
export function colorFor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360
  return `hsl(${h} 60% 52%)`
}

/** Iniciales para un avatar ("Ana Pérez" -> "AP", "carlos" -> "CA"). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
  return (parts[0] ?? '?').slice(0, 2).toUpperCase()
}

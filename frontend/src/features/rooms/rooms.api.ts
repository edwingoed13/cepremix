import { apiFetch, ApiError } from '@/shared/lib/api'
import { useAuthStore } from '@/features/auth/auth.store'

export interface RoomNowPlaying {
  id: string
  title: string
  artist?: string
  thumbnail: string
}

export interface RoomSummary {
  id: string
  name: string
  is_public: boolean
  requires_password: boolean
  /** Oyentes conectados ahora mismo (0 si la sala no está activa en el servidor). */
  listeners: number
  /** Lo que suena (solo salas públicas). */
  now_playing: RoomNowPlaying | null
}

export async function listRooms(): Promise<RoomSummary[]> {
  // Resiliente a ambas versiones del backend: la nueva expone `requires_password`;
  // la antigua exponía `password_hash` (que ya no debería filtrarse).
  type RawRoom = Partial<RoomSummary> & { id: string; name: string; password_hash?: string | null }
  const data = await apiFetch<{ rooms: RawRoom[] }>('/api/rooms')
  return (data.rooms ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    is_public: r.is_public ?? true,
    requires_password: r.requires_password ?? (!r.is_public && !!r.password_hash),
    listeners: r.listeners ?? 0,
    now_playing: r.now_playing ?? null,
  }))
}

/* ---- Token de dueño: lo entrega el servidor solo al crear la sala ---- */
const ownerKey = (roomId: string): string => `room:owner:${roomId}`

export function getOwnerToken(roomId: string): string | null {
  return localStorage.getItem(ownerKey(roomId))
}

/** Desde internet, crear salas exige pasar por Cloudflare Access (código por correo). */
export class AccessRequiredError extends Error {
  constructor() {
    super('Verifica tu correo para crear salas')
  }
}

/** Página protegida por Cloudflare Access que, tras el código, crea la sala y entra. */
export function accessCreateRoomUrl(name: string): string {
  return `/acceso/crear-sala?nombre=${encodeURIComponent(name)}`
}

export async function createRoom(name: string): Promise<{ room_id: string }> {
  let res: { room_id: string; owner_token?: string }
  try {
    // /acceso/* es la ruta que protege Cloudflare Access. Sin sesión de Access responde
    // con una redirección a su pantalla de login: con redirect 'manual' la detectamos
    // (respuesta "opaqueredirect", status 0) en vez de seguirla.
    res = await apiFetch('/acceso/api/rooms', {
      method: 'POST',
      redirect: 'manual',
      body: JSON.stringify({ name, is_public: true, user_id: useAuthStore().uid }),
    })
  } catch (e) {
    if (e instanceof ApiError && (e.status === 0 || (e.body as { error?: string } | null)?.error === 'access_required'))
      throw new AccessRequiredError()
    throw e
  }
  if (res.owner_token) localStorage.setItem(ownerKey(res.room_id), res.owner_token)
  return res
}

export async function deleteRoom(roomId: string): Promise<void> {
  const token = getOwnerToken(roomId)
  if (!token) throw new Error('No eres el dueño de esta sala')
  await apiFetch(`/api/rooms/${roomId}`, {
    method: 'DELETE',
    body: JSON.stringify({ owner_token: token }),
  })
  localStorage.removeItem(ownerKey(roomId))
}

export async function joinRoom(
  roomId: string,
  password?: string,
): Promise<{ success: boolean; session_token: string }> {
  return apiFetch(`/api/rooms/${roomId}/join`, {
    method: 'POST',
    body: JSON.stringify({ password: password ?? null }),
  })
}

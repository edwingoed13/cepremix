import { apiFetch } from '@/shared/lib/api'
import { userId } from '@/shared/lib/identity'

export interface RoomSummary {
  id: string
  name: string
  is_public: boolean
  requires_password: boolean
}

export async function listRooms(): Promise<RoomSummary[]> {
  // Resiliente a ambas versiones del backend: la nueva expone `requires_password`;
  // la antigua exponía `password_hash` (que ya no debería filtrarse).
  type RawRoom = RoomSummary & { password_hash?: string | null }
  const data = await apiFetch<{ rooms: RawRoom[] }>('/api/rooms')
  return (data.rooms ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    is_public: r.is_public,
    requires_password: r.requires_password ?? (!r.is_public && !!r.password_hash),
  }))
}

export async function createRoom(name: string): Promise<{ room_id: string }> {
  return apiFetch('/api/rooms', {
    method: 'POST',
    body: JSON.stringify({ name, is_public: true, user_id: userId }),
  })
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

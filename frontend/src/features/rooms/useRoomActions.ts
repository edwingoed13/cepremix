import { useRouter } from 'vue-router'
import { useQueryClient } from '@tanstack/vue-query'
import { useUiStore } from '@/shared/lib/ui.store'
import {
  AccessRequiredError,
  accessCreateRoomUrl,
  createRoom,
  joinRoom,
  type RoomSummary,
} from './rooms.api'

/** Entrar a una sala (pidiendo contraseña si es privada) y crear salas nuevas. */
export function useRoomActions() {
  const router = useRouter()
  const ui = useUiStore()
  const qc = useQueryClient()

  async function openRoom(r: Pick<RoomSummary, 'id' | 'name' | 'requires_password'>): Promise<void> {
    if (!r.requires_password) {
      await router.push({ name: 'room', params: { id: r.id } })
      return
    }
    const pw = await ui.promptText(`Contraseña de "${r.name}"`, 'Contraseña', {
      inputType: 'password',
      confirmLabel: 'Entrar',
    })
    if (!pw) return
    try {
      const res = await joinRoom(r.id, pw)
      await router.push({ name: 'room', params: { id: r.id }, query: { t: res.session_token } })
    } catch {
      ui.toast('No se pudo entrar (¿contraseña incorrecta?)')
    }
  }

  async function newRoom(): Promise<void> {
    const name = await ui.promptText('Nueva sala', 'Nombre de la sala', { confirmLabel: 'Crear' })
    if (!name?.trim()) return
    try {
      const res = await createRoom(name.trim())
      void qc.invalidateQueries({ queryKey: ['rooms'] })
      await router.push({ name: 'room', params: { id: res.room_id } })
    } catch (e) {
      if (e instanceof AccessRequiredError) {
        // Desde internet: pantalla de Cloudflare (código por correo) y, al volver, se crea
        // la sala sola. Navegación completa (no fetch): Access necesita mostrar su página.
        ui.toast('Para crear salas, verifica tu correo')
        window.location.assign(accessCreateRoomUrl(name.trim()))
        return
      }
      ui.toast('No se pudo crear la sala')
    }
  }

  return { openRoom, newRoom }
}

/** Degradado estable y vistoso derivado del id de la sala (sin carátula). */
export function roomGradient(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360
  const h2 = (h + 48) % 360
  return `linear-gradient(135deg, hsl(${h} 70% 42%), hsl(${h2} 75% 22%))`
}

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Track } from '@/entities/track'
import { usePlayerStore, type RemoteController } from '@/features/player/player.store'
import { useUiStore } from '@/shared/lib/ui.store'
import { apiFetch } from '@/shared/lib/api'
import { useAuthStore } from '@/features/auth/auth.store'
import { deleteRoom, getOwnerToken } from './rooms.api'

/** Registro de track tal como lo envía el backend (db record). */
function mapServerTrack(t: {
  id: string
  title: string
  seconds?: number
  duration?: number
  thumbnail?: string
  uploader?: string
  artist?: string
}): Track {
  return {
    id: t.id,
    title: t.title,
    artist: t.artist ?? t.uploader ?? 'YouTube',
    durationSec: t.seconds ?? t.duration ?? 0,
    thumbnail: t.thumbnail ?? `https://i.ytimg.com/vi/${t.id}/hqdefault.jpg`,
  }
}

/**
 * - idle: sin sala · connecting/reconnecting: abriendo el socket · live: conectado
 * - not_found: la sala no existe o fue eliminada · denied: sala privada sin acceso
 * not_found y denied son finales: no se reintenta la conexión.
 */
export type RoomStatus = 'idle' | 'connecting' | 'reconnecting' | 'live' | 'not_found' | 'denied'

// Códigos de cierre que manda el backend (ver ws_room_endpoint en main.py)
const CLOSE_NOT_FOUND = 4404
const CLOSE_DENIED = 4403
const MAX_BACKOFF_MS = 15_000

const sessionKey = (id: string): string => `room:session:${id}`

/**
 * Sala activa (una a la vez). Posee la conexión WebSocket con reconexión y
 * outbox, y traduce el estado autoritativo del servidor al player.store
 * (modelo híbrido: el servidor manda la posición, el cliente reproduce YouTube).
 *
 * La sala sigue conectada al navegar por la app (p. ej. a Buscar para añadir
 * canciones); solo se sale con leave() (botón "Salir de la sala").
 */
export const useRoomStore = defineStore('room', () => {
  const roomId = ref<string | null>(null)
  const roomName = ref('')
  const status = ref<RoomStatus>('idle')
  const queue = ref<Track[]>([])
  const playing = ref(false)
  const position = ref(0)
  const current = ref<Track | null>(null)
  const listenerCount = ref(0)
  const members = ref<string[]>([])
  /** Nombres visibles de quienes tienen cuenta (id -> nombre) */
  const names = ref<Record<string, string>>({})
  const hostId = ref<string | null>(null)

  const connected = computed(() => status.value === 'live')
  /** Hay una sala "abierta" (conectada o intentándolo). */
  const active = computed(() =>
    ['connecting', 'reconnecting', 'live'].includes(status.value),
  )
  const isOwner = computed(() => (roomId.value ? !!getOwnerToken(roomId.value) : false))
  const auth = useAuthStore()
  const isHost = computed(
    () => isOwner.value || (hostId.value !== null && hostId.value === auth.uid),
  )

  const player = usePlayerStore()
  const ui = useUiStore()

  let ws: WebSocket | null = null
  let outbox: string[] = []
  let reconnectTimer: number | null = null
  let attempt = 0
  let lastReportedDur = 0
  const enriching = new Set<string>()

  // Controles globales (mini/full/desktop/pantalla de bloqueo) -> servidor
  const controller: RemoteController = {
    get label() {
      return roomName.value || 'Sala'
    },
    toggle: () => {
      // Si la sala suena pero aquí no (autoplay bloqueado), reanudar solo localmente
      // en vez de pausar la sala para todos.
      if (playing.value && !player.isPlaying) player.resumeLocal()
      else if (playing.value) pause()
      else play()
    },
    next: () => next(),
    prev: () => seek(0),
    seek: (s) => seek(s),
  }

  // Si un track llega con título placeholder ("YouTube Video <id>"), traer su
  // metadata real y parchearlo localmente (robustez ante data antigua del backend).
  async function enrich(id: string): Promise<void> {
    if (enriching.has(id) || !/^[\w-]{11}$/.test(id)) return
    enriching.add(id)
    try {
      const m = await apiFetch<{
        title?: string
        uploader?: string
        seconds?: number
        duration?: number
        thumbnail?: string
      }>(`/api/metadata/${id}`)
      if (!m.title || m.title.startsWith('YouTube Video')) return
      const patch = (t: Track): Track =>
        t.id === id
          ? {
              ...t,
              title: m.title as string,
              artist: m.uploader || t.artist,
              durationSec: m.seconds ?? m.duration ?? t.durationSec,
              thumbnail: m.thumbnail || t.thumbnail,
            }
          : t
      queue.value = queue.value.map(patch)
      if (current.value?.id === id) current.value = patch(current.value)
    } catch {
      /* metadata best-effort */
    }
  }

  function enrichPlaceholders(): void {
    if (current.value && current.value.title.startsWith('YouTube Video')) void enrich(current.value.id)
    queue.value.forEach((t) => {
      if (t.title.startsWith('YouTube Video')) void enrich(t.id)
    })
  }

  function send(payload: Record<string, unknown>): void {
    const msg = JSON.stringify(payload)
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(msg)
    else outbox.push(msg)
  }

  function applyState(data: {
    playing?: boolean
    position?: number
    duration?: number
    current?: {
      id: string
      title: string
      artist?: string | null
      thumbnail?: string | null
      seconds?: number | null
    } | null
  }): void {
    playing.value = !!data.playing
    position.value = data.position ?? 0
    const c = data.current
    if (c?.id) {
      const fromQueue = queue.value.find((t) => t.id === c.id)
      const known = current.value?.id === c.id ? current.value : null
      current.value =
        fromQueue ??
        known ?? {
          id: c.id,
          title: c.title,
          artist: c.artist || 'YouTube',
          durationSec: c.seconds || data.duration || 0,
          thumbnail: c.thumbnail || `https://i.ytimg.com/vi/${c.id}/hqdefault.jpg`,
        }
      player.syncTo(current.value, position.value, playing.value)
    } else {
      // La sala se quedó sin canción: que no siga sonando aquí la anterior.
      if (current.value) player.pauseLocal()
      current.value = null
    }
  }

  /** Limpia los datos de la sala (no toca roomId ni status). */
  function clearRoomData(): void {
    roomName.value = ''
    queue.value = []
    current.value = null
    playing.value = false
    position.value = 0
    listenerCount.value = 0
    members.value = []
    names.value = {}
    hostId.value = null
    lastReportedDur = 0
    outbox = []
  }

  /** Estado final (no_found/denied): sin reintentos y la UI vuelve a controlar el player local. */
  function settle(final: 'not_found' | 'denied'): void {
    status.value = final
    clearTimer()
    player.setRemote(null)
    clearRoomData()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handle(msg: { type: string; data: any }): void {
    const { type, data } = msg
    if (type === 'state') {
      if (data.room_name) roomName.value = data.room_name
      if (Array.isArray(data.queue)) queue.value = data.queue.map(mapServerTrack)
      applyState(data)
      enrichPlaceholders()
    } else if (type === 'queue:update') {
      if (Array.isArray(data)) queue.value = data.map(mapServerTrack)
      enrichPlaceholders()
    } else if (type === 'player:tick') {
      position.value = data.position ?? 0
      if (current.value) player.syncTo(current.value, position.value, playing.value)
    } else if (type === 'presence') {
      listenerCount.value = data.count ?? 0
      members.value = Array.isArray(data.listeners) ? data.listeners : []
      names.value = data.names && typeof data.names === 'object' ? data.names : {}
      hostId.value = data.host ?? null
    } else if (type === 'ok' && data?.action === 'queue:add') {
      ui.toast('Añadido a la cola de la sala')
    } else if (type === 'room_not_found') {
      settle('not_found')
    } else if (type === 'room_deleted') {
      ui.toast('La sala fue eliminada')
      settle('not_found')
    } else if (type === 'access_denied') {
      settle('denied')
    } else if (type === 'warning' || type === 'error') {
      ui.toast(data?.message ?? 'Ocurrió un problema')
    }
  }

  function clearTimer(): void {
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  function open(id: string, token?: string): void {
    const params = new URLSearchParams({ user_id: auth.uid })
    if (auth.token) params.set('token', auth.token) // el servidor pone tu nombre en la sala
    if (token) params.set('session_token', token)
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const socket = new WebSocket(`${proto}://${location.host}/ws/${id}?${params.toString()}`)
    ws = socket

    socket.onopen = () => {
      if (ws !== socket) return
      attempt = 0
      status.value = 'live'
      outbox.forEach((m) => socket.send(m))
      outbox = []
      send({ type: 'state:get' })
    }
    socket.onmessage = (ev) => {
      if (ws !== socket) return
      try {
        handle(JSON.parse(ev.data))
      } catch {
        /* mensaje malformado: ignorar */
      }
    }
    socket.onclose = (ev) => {
      // Ignorar cierres de sockets viejos (salimos o cambiamos de sala)
      if (ws !== socket) return
      ws = null
      if (ev.code === CLOSE_NOT_FOUND) return settle('not_found')
      if (ev.code === CLOSE_DENIED) return settle('denied')
      if (status.value === 'not_found' || status.value === 'denied') return
      status.value = 'reconnecting'
      const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** attempt)
      attempt += 1
      reconnectTimer = window.setTimeout(() => open(id, token), delay)
    }
  }

  function connect(id: string, token?: string): void {
    if (roomId.value === id && active.value) return
    leave()
    roomId.value = id
    status.value = 'connecting'
    if (token) sessionStorage.setItem(sessionKey(id), token)
    attempt = 0
    player.setRemote(controller)
    open(id, token ?? sessionStorage.getItem(sessionKey(id)) ?? undefined)
  }

  function leave(): void {
    clearTimer()
    const s = ws
    ws = null // antes de close(): así su onclose se ignora y no reconecta
    s?.close()
    player.setRemote(null)
    clearRoomData()
    roomId.value = null
    status.value = 'idle'
  }

  async function remove(): Promise<boolean> {
    if (!roomId.value) return false
    try {
      await deleteRoom(roomId.value)
      leave()
      ui.toast('Sala eliminada')
      return true
    } catch {
      ui.toast('No se pudo eliminar la sala')
      return false
    }
  }

  // Controles -> servidor (autoritativo)
  function enqueue(track: {
    id: string
    title?: string
    artist?: string
    durationSec?: number
    thumbnail?: string
  }): void {
    send({
      type: 'queue:add',
      urlOrId: track.id,
      hybrid: true,
      title: track.title,
      artist: track.artist,
      duration: track.durationSec,
      thumbnail: track.thumbnail,
    })
  }
  function play(): void {
    send({ type: 'player:play' })
    if (current.value) {
      playing.value = true // optimista: el servidor lo confirma con el siguiente state
      player.syncTo(current.value, position.value, true)
    }
  }
  function pause(): void {
    send({ type: 'player:pause' })
    if (current.value) {
      playing.value = false
      player.syncTo(current.value, position.value, false)
    }
  }
  function next(): void {
    send({ type: 'player:next' })
  }
  function seek(at: number): void {
    position.value = at
    send({ type: 'player:seek', at })
  }

  // Precargar el audio de las 2 próximas de la cola compartida (cambio de pista sin silencio)
  watch(
    () => queue.value.slice(0, 2).map((t) => t.id).join(','),
    (ids) => ids.split(',').filter(Boolean).forEach((id) => void player.prefetch(id)),
  )

  // Reportar al servidor la duración real detectada por el reproductor del cliente,
  // para que el auto-avance ocurra al final real de la canción (no en el placeholder).
  watch(
    () => player.duration,
    (d) => {
      if (connected.value && current.value && d > 0 && Math.abs(d - lastReportedDur) > 1) {
        lastReportedDur = d
        send({ type: 'player:update_duration', duration: d })
      }
    },
  )

  // Al volver a la pestaña, re-sincronizar con el estado autoritativo del servidor
  // (mientras estaba oculta no corregimos drift para no cortar el audio).
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && connected.value) send({ type: 'state:get' })
  })

  return {
    roomId,
    roomName,
    status,
    connected,
    active,
    queue,
    playing,
    position,
    current,
    listenerCount,
    members,
    names,
    hostId,
    isOwner,
    isHost,
    connect,
    leave,
    remove,
    enqueue,
    play,
    pause,
    next,
    seek,
  }
})

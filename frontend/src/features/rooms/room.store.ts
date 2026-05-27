import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { Track } from '@/entities/track'
import { usePlayerStore } from '@/features/player/player.store'
import { useUiStore } from '@/shared/lib/ui.store'
import { apiFetch } from '@/shared/lib/api'
import { userId } from '@/shared/lib/identity'

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
 * Sala activa (una a la vez). Posee la conexión WebSocket con reconexión y
 * outbox, y traduce el estado autoritativo del servidor al player.store
 * (modelo híbrido: el servidor manda la posición, el cliente reproduce YouTube).
 */
export const useRoomStore = defineStore('room', () => {
  const roomId = ref<string | null>(null)
  const roomName = ref('')
  const connected = ref(false)
  const queue = ref<Track[]>([])
  const playing = ref(false)
  const position = ref(0)
  const current = ref<Track | null>(null)
  const listenerCount = ref(0)
  const members = ref<string[]>([])
  const hostId = ref<string | null>(null)

  const player = usePlayerStore()
  const ui = useUiStore()

  let ws: WebSocket | null = null
  let outbox: string[] = []
  let manualClose = false
  let reconnectTimer: number | null = null
  let lastReportedDur = 0
  const enriching = new Set<string>()

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
    current?: { id: string; title: string } | null
  }): void {
    playing.value = !!data.playing
    position.value = data.position ?? 0
    if (data.current?.id) {
      const fromQueue = queue.value.find((t) => t.id === data.current!.id)
      current.value =
        fromQueue ?? {
          id: data.current.id,
          title: data.current.title,
          artist: 'En la sala',
          durationSec: data.duration ?? 0,
          thumbnail: `https://i.ytimg.com/vi/${data.current.id}/hqdefault.jpg`,
        }
      player.syncTo(current.value, position.value, playing.value)
    } else {
      current.value = null
    }
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
      hostId.value = data.host ?? null
    } else if (type === 'ok' && data?.action === 'queue:add') {
      ui.toast('Añadido a la cola')
    } else if (type === 'warning' || type === 'error') {
      ui.toast(data?.message ?? 'Ocurrió un problema')
    } else if (type === 'room_deleted') {
      ui.toast('La sala fue eliminada')
      leave()
    }
  }

  function connect(id: string, token?: string): void {
    if (roomId.value === id && connected.value) return
    leave()
    manualClose = false
    roomId.value = id
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const params = new URLSearchParams({ user_id: userId })
    if (token) params.set('session_token', token)
    const url = `${proto}://${location.host}/ws/${id}?${params.toString()}`
    ws = new WebSocket(url)
    ws.onopen = () => {
      connected.value = true
      outbox.forEach((m) => ws?.send(m))
      outbox = []
      send({ type: 'state:get' })
    }
    ws.onmessage = (ev) => handle(JSON.parse(ev.data))
    ws.onclose = () => {
      connected.value = false
      if (!manualClose) reconnectTimer = window.setTimeout(() => connect(id, token), 1000)
    }
  }

  function leave(): void {
    manualClose = true
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    ws?.close()
    ws = null
    connected.value = false
    roomId.value = null
    roomName.value = ''
    queue.value = []
    current.value = null
    listenerCount.value = 0
    members.value = []
    hostId.value = null
    lastReportedDur = 0
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
  }
  function pause(): void {
    send({ type: 'player:pause' })
  }
  function next(): void {
    send({ type: 'player:next' })
  }
  function seek(at: number): void {
    send({ type: 'player:seek', at })
  }

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
    connected,
    queue,
    playing,
    position,
    current,
    listenerCount,
    members,
    hostId,
    connect,
    leave,
    enqueue,
    play,
    pause,
    next,
    seek,
  }
})

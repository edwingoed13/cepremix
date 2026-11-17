import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { Track, Playlist } from '@/entities/track'
import { usePlayerStore } from '@/features/player/player.store'
import { useAuthStore } from '@/features/auth/auth.store'
import { useUiStore } from '@/shared/lib/ui.store'
import { apiFetch, ApiError } from '@/shared/lib/api'
import {
  type LibraryData,
  HISTORY_LIMIT,
  isEmptyLibrary,
  mergeLibraries,
  normalizeLibrary,
} from './merge'

/**
 * Biblioteca personal: favoritos, historial y playlists.
 *
 * - Sin cuenta: se guarda en este navegador (claves `lib:*` de siempre).
 * - Con cuenta: el servidor es la fuente de verdad (por usuario) y aquí queda una copia
 *   (claves `lib:<userId>:*`) para que abra al instante y funcione sin conexión. Cada
 *   cambio se sube (con la versión en la que se basó); si otro dispositivo guardó antes,
 *   se fusiona y se reintenta. Al volver a la app se trae lo último del servidor.
 * - La primera vez que alguien inicia sesión en un dispositivo, lo que tenía sin cuenta
 *   se suma a su cuenta (no se pierde nada).
 */
export const useLibraryStore = defineStore('library', () => {
  const auth = useAuthStore()
  const ui = useUiStore()

  const favorites = ref<Track[]>([])
  const history = ref<Track[]>([])
  const playlists = ref<Playlist[]>([])

  /* ---------------- copia local por "ámbito" (anónimo o cuenta) ---------------- */
  const prefix = computed(() => (auth.user ? `lib:${auth.user.id}:` : 'lib:'))

  function readJson<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : fallback
    } catch {
      return fallback
    }
  }
  function readLocal(p: string): LibraryData {
    return normalizeLibrary({
      favorites: readJson(p + 'favorites', []),
      history: readJson(p + 'history', []),
      playlists: readJson(p + 'playlists', []),
    })
  }
  function writeLocal(p: string): void {
    localStorage.setItem(p + 'favorites', JSON.stringify(favorites.value))
    localStorage.setItem(p + 'history', JSON.stringify(history.value))
    localStorage.setItem(p + 'playlists', JSON.stringify(playlists.value))
  }
  function snapshot(): LibraryData {
    return { favorites: favorites.value, history: history.value, playlists: playlists.value }
  }
  function apply(d: LibraryData): void {
    favorites.value = d.favorites
    history.value = d.history
    playlists.value = d.playlists
  }

  /* ---------------- sincronización con el servidor ---------------- */
  let version = 0
  let lastSynced = '' // JSON de lo último que coincide con el servidor
  let pushTimer: number | null = null
  let pushing = false
  let pushAgain = false

  const versionKey = (): string => prefix.value + 'version'
  // Marca persistente de "hay cambios locales sin subir": sobrevive a recargas/cierres,
  // para no pisar esos cambios con lo del servidor al volver a abrir la app.
  const dirtyKey = (): string => prefix.value + 'dirty'
  const DIRTY = '<pending>' // valor de lastSynced que nunca coincide con datos reales (JSON)

  async function pull(opts: { importAnon?: boolean } = {}): Promise<void> {
    const uid = auth.user?.id
    if (!uid) return
    try {
      const res = await apiFetch<{ data: unknown; version: number }>('/api/me/library')
      if (auth.user?.id !== uid) return // cambió la sesión mientras tanto
      let next = normalizeLibrary(res.data)
      let mustPush = false
      // Primera vez con esta cuenta en este dispositivo: sumar lo que había sin cuenta
      const importedKey = `lib:${uid}:imported`
      if (opts.importAnon && !localStorage.getItem(importedKey)) {
        const anon = readLocal('lib:')
        if (!isEmptyLibrary(anon)) {
          next = mergeLibraries(next, anon)
          mustPush = true
          ui.toast('Guardamos en tu cuenta la biblioteca de este dispositivo')
        }
        localStorage.setItem(importedKey, '1')
      }
      // Cambios locales aún sin subir: fusionarlos en vez de pisarlos
      const local = JSON.stringify(snapshot())
      if (lastSynced && local !== lastSynced) {
        next = mergeLibraries(snapshot(), next)
        mustPush = true
      }
      version = res.version
      localStorage.setItem(versionKey(), String(version))
      if (!mustPush) lastSynced = JSON.stringify(next)
      apply(next) // el watcher sube si difiere de lastSynced
    } catch {
      /* sin conexión: seguimos con la copia local */
    }
  }

  function schedulePush(delay = 800): void {
    if (pushTimer !== null) clearTimeout(pushTimer)
    pushTimer = window.setTimeout(() => {
      pushTimer = null
      void push()
    }, delay)
  }

  async function push(): Promise<void> {
    const uid = auth.user?.id
    if (!uid) return
    if (pushing) {
      pushAgain = true
      return
    }
    pushing = true
    const data = snapshot()
    const json = JSON.stringify(data)
    try {
      const res = await apiFetch<{ version: number }>('/api/me/library', {
        method: 'PUT',
        body: JSON.stringify({ data, base_version: version }),
      })
      if (auth.user?.id === uid) {
        version = res.version
        localStorage.setItem(versionKey(), String(version))
        lastSynced = json
        if (JSON.stringify(snapshot()) === json) localStorage.removeItem(dirtyKey())
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && auth.user?.id === uid) {
        // Otro dispositivo guardó antes: fusionar con lo del servidor y volver a subir
        const server = e.body as { data: unknown; version: number }
        version = server.version
        apply(mergeLibraries(snapshot(), normalizeLibrary(server.data)))
        pushAgain = true
      }
      // Otros errores (sin red): se reintenta en el próximo cambio o al volver a la app
    } finally {
      pushing = false
      if (pushAgain) {
        pushAgain = false
        schedulePush(0)
      }
    }
  }

  // Cambio de ámbito (inicio/cierre de sesión): cargar su copia local y sincronizar
  watch(
    prefix,
    (p) => {
      lastSynced = ''
      version = Number(localStorage.getItem(p + 'version') || 0)
      const local = readLocal(p)
      // La copia local coincide con el servidor salvo que quedaran cambios sin subir
      if (auth.user) lastSynced = localStorage.getItem(p + 'dirty') ? DIRTY : JSON.stringify(local)
      apply(local)
      if (auth.user) void pull({ importAnon: true })
    },
    { immediate: true },
  )

  // Al cerrar sesión, borrar la copia local de esa cuenta (el servidor la conserva)
  watch(
    () => auth.user?.id,
    (_now, before) => {
      if (before && !auth.user) {
        for (const k of ['favorites', 'history', 'playlists', 'version', 'dirty'])
          localStorage.removeItem(`lib:${before}:${k}`)
      }
    },
  )

  // Cada cambio: guardar la copia local y, con cuenta, subirlo al servidor
  watch(
    [favorites, history, playlists],
    () => {
      writeLocal(prefix.value)
      if (auth.user && JSON.stringify(snapshot()) !== lastSynced) {
        localStorage.setItem(dirtyKey(), '1')
        schedulePush()
      }
    },
    { deep: true },
  )

  /** Sube YA lo pendiente (antes de cerrar sesión o al salir de la app). */
  async function flush(): Promise<void> {
    if (pushTimer !== null) {
      clearTimeout(pushTimer)
      pushTimer = null
    }
    if (auth.user && JSON.stringify(snapshot()) !== lastSynced) await push()
  }

  // Al salir de la app: subir lo pendiente. Al volver (otro dispositivo pudo cambiar algo):
  // traer lo último del servidor.
  document.addEventListener('visibilitychange', () => {
    if (!auth.user) return
    if (document.hidden) void flush()
    else void pull()
  })

  /* ---------------- API de la biblioteca (igual que antes) ---------------- */
  const favoriteIds = computed(() => new Set(favorites.value.map((t) => t.id)))
  function isFavorite(id: string): boolean {
    return favoriteIds.value.has(id)
  }
  function toggleFavorite(track: Track): void {
    const i = favorites.value.findIndex((t) => t.id === track.id)
    if (i >= 0) favorites.value.splice(i, 1)
    else favorites.value.unshift(track)
  }

  function addToHistory(track: Track): void {
    const rest = history.value.filter((t) => t.id !== track.id)
    rest.unshift(track)
    history.value = rest.slice(0, HISTORY_LIMIT)
  }

  function createPlaylist(name: string): Playlist {
    const now = Date.now()
    const p: Playlist = { id: crypto.randomUUID(), name, tracks: [], createdAt: now, updatedAt: now }
    playlists.value.unshift(p)
    return p
  }
  function deletePlaylist(id: string): void {
    playlists.value = playlists.value.filter((p) => p.id !== id)
  }
  function getPlaylist(id: string): Playlist | undefined {
    return playlists.value.find((p) => p.id === id)
  }
  function addTrackToPlaylist(playlistId: string, track: Track): boolean {
    const p = playlists.value.find((x) => x.id === playlistId)
    if (!p || p.tracks.some((t) => t.id === track.id)) return false
    p.tracks.push(track)
    p.updatedAt = Date.now()
    return true
  }
  function removeTrackFromPlaylist(playlistId: string, trackId: string): void {
    const p = playlists.value.find((x) => x.id === playlistId)
    if (p) {
      p.tracks = p.tracks.filter((t) => t.id !== trackId)
      p.updatedAt = Date.now()
    }
  }

  // Auto-historial: registrar cada vez que cambia la canción actual del reproductor.
  const player = usePlayerStore()
  watch(
    () => player.current?.id,
    (id) => {
      if (id && player.current) addToHistory(player.current)
    },
  )

  return {
    favorites,
    history,
    playlists,
    isFavorite,
    toggleFavorite,
    addToHistory,
    createPlaylist,
    deletePlaylist,
    getPlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    flush,
  }
})

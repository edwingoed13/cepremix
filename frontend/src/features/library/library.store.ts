import { defineStore } from 'pinia'
import { computed, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import type { Track, Playlist } from '@/entities/track'
import { usePlayerStore } from '@/features/player/player.store'

/**
 * Biblioteca personal persistida en localStorage: favoritos, historial y playlists.
 * (Sin backend todavía; cuando exista, estos métodos se cablean a la API.)
 */
export const useLibraryStore = defineStore('library', () => {
  const favorites = useLocalStorage<Track[]>('lib:favorites', [])
  const history = useLocalStorage<Track[]>('lib:history', [])
  const playlists = useLocalStorage<Playlist[]>('lib:playlists', [])

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
    history.value = rest.slice(0, 100)
  }

  function createPlaylist(name: string): Playlist {
    const p: Playlist = { id: crypto.randomUUID(), name, tracks: [], createdAt: Date.now() }
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
    return true
  }
  function removeTrackFromPlaylist(playlistId: string, trackId: string): void {
    const p = playlists.value.find((x) => x.id === playlistId)
    if (p) p.tracks = p.tracks.filter((t) => t.id !== trackId)
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
  }
})

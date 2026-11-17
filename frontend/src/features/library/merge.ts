import type { Playlist, Track } from '@/entities/track'

/** Biblioteca personal tal como se guarda (en el navegador y en el servidor). */
export interface LibraryData {
  favorites: Track[]
  history: Track[]
  playlists: Playlist[]
}

export const HISTORY_LIMIT = 100

export function emptyLibrary(): LibraryData {
  return { favorites: [], history: [], playlists: [] }
}

/** Acepta datos de cualquier origen (servidor viejo, localStorage corrupto) sin romperse. */
export function normalizeLibrary(d: unknown): LibraryData {
  const o = (d ?? {}) as Partial<LibraryData>
  return {
    favorites: Array.isArray(o.favorites) ? o.favorites : [],
    history: Array.isArray(o.history) ? o.history : [],
    playlists: Array.isArray(o.playlists) ? o.playlists : [],
  }
}

export function isEmptyLibrary(d: LibraryData): boolean {
  return !d.favorites.length && !d.history.length && !d.playlists.length
}

function uniqById<T extends { id: string }>(list: T[]): T[] {
  const seen = new Set<string>()
  return list.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)))
}

const stamp = (p: Playlist): number => p.updatedAt ?? p.createdAt ?? 0

/**
 * Fusiona dos bibliotecas (p. ej. este dispositivo + lo que hay en la cuenta).
 * - Favoritos e historial: unión sin duplicados; manda el orden de `primary`.
 * - Playlists: unión por id; si existe en ambas gana la modificada más recientemente.
 * Nunca pierde datos (a costa de que algo borrado en otro dispositivo justo a la vez
 * pueda reaparecer: preferible a perder una playlist).
 */
export function mergeLibraries(primary: LibraryData, other: LibraryData): LibraryData {
  const byId = new Map<string, Playlist>()
  for (const p of [...primary.playlists, ...other.playlists]) {
    const prev = byId.get(p.id)
    if (!prev || stamp(p) > stamp(prev)) byId.set(p.id, p)
  }
  const order = uniqById([...primary.playlists, ...other.playlists]).map((p) => p.id)
  return {
    favorites: uniqById([...primary.favorites, ...other.favorites]),
    history: uniqById([...primary.history, ...other.history]).slice(0, HISTORY_LIMIT),
    playlists: order.map((id) => byId.get(id) as Playlist),
  }
}

import type { Track } from '@/entities/track'
import { searchTracks } from '@/features/search/search.api'
import { sampleTracks } from '@/features/search/mock'

const GENERIC = new Set(['', 'youtube', 'desconocido', 'unknown', 'various artists'])

/** Artistas más frecuentes en un conjunto de tracks (historial + favoritos). */
export function topArtists(tracks: Track[], n = 3): string[] {
  const counts = new Map<string, number>()
  for (const t of tracks) {
    const a = (t.artist || '').trim()
    if (GENERIC.has(a.toLowerCase())) continue
    counts.set(a, (counts.get(a) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((x, y) => y[1] - x[1])
    .slice(0, n)
    .map(([a]) => a)
}

function dedupe(tracks: Track[]): Track[] {
  const seen = new Set<string>()
  const out: Track[] = []
  for (const t of tracks) {
    if (!seen.has(t.id)) {
      seen.add(t.id)
      out.push(t)
    }
  }
  return out
}

function interleave(lists: Track[][]): Track[] {
  const out: Track[] = []
  const max = lists.reduce((m, l) => Math.max(m, l.length), 0)
  for (let i = 0; i < max; i++) {
    for (const l of lists) {
      const v = l[i]
      if (v) out.push(v)
    }
  }
  return out
}

/**
 * "Para ti": busca temas de los artistas que más escuchas (vía /api/search),
 * excluyendo lo que ya está en tu historial/favoritos para descubrir cosas nuevas.
 * Sin datos aún → descubrimiento por una búsqueda popular; si todo falla → catálogo demo.
 */
export async function recommendForYou(seedTracks: Track[]): Promise<Track[]> {
  const artists = topArtists(seedTracks, 3)
  const seenIds = new Set(seedTracks.map((t) => t.id))
  try {
    if (artists.length === 0) {
      const r = dedupe(await searchTracks('top hits 2024'))
      return r.length ? r.slice(0, 12) : sampleTracks
    }
    const lists = await Promise.all(
      artists.slice(0, 2).map((a) => searchTracks(a).catch(() => [] as Track[])),
    )
    const merged = dedupe(interleave(lists)).filter((t) => !seenIds.has(t.id))
    return merged.length ? merged.slice(0, 12) : sampleTracks
  } catch {
    return sampleTracks
  }
}

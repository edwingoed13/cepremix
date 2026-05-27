import type { Track } from '@/entities/track'
import { apiFetch } from '@/shared/lib/api'
import { parseDurationLabel } from '@/shared/lib/format'

/** Forma de la respuesta de FastAPI /api/search (estilo YouTube Data API). */
interface YtSearchItem {
  id: { videoId: string }
  snippet: {
    title: string
    channelTitle?: string
    thumbnails?: { default?: { url: string }; medium?: { url: string } }
  }
  duration?: string | number
}
interface YtSearchResponse {
  items: YtSearchItem[]
}

export async function searchTracks(q: string): Promise<Track[]> {
  const term = q.trim()
  if (!term) return []
  const data = await apiFetch<YtSearchResponse>(
    `/api/search?q=${encodeURIComponent(term)}&maxResults=25`,
  )
  return (data.items ?? []).map((it) => ({
    id: it.id.videoId,
    title: it.snippet.title,
    artist: it.snippet.channelTitle || 'Desconocido',
    durationSec: parseDurationLabel(it.duration ?? 0),
    thumbnail:
      it.snippet.thumbnails?.medium?.url ??
      it.snippet.thumbnails?.default?.url ??
      `https://i.ytimg.com/vi/${it.id.videoId}/hqdefault.jpg`,
  }))
}

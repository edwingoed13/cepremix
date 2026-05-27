import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Track } from '@/entities/track'

// Aislamos la búsqueda: las recomendaciones no deben pegarle al backend en los tests.
vi.mock('@/features/search/search.api', () => ({ searchTracks: vi.fn() }))

import { topArtists, recommendForYou } from './recommendations'
import { searchTracks } from '@/features/search/search.api'

const t = (id: string, artist: string): Track => ({
  id,
  title: id,
  artist,
  durationSec: 100,
  thumbnail: '',
})

describe('topArtists', () => {
  it('ordena por frecuencia e ignora artistas genéricos', () => {
    const seed = [t('1', 'Queen'), t('2', 'Queen'), t('3', 'PSY'), t('4', 'YouTube')]
    expect(topArtists(seed, 3)).toEqual(['Queen', 'PSY'])
  })
})

describe('recommendForYou', () => {
  beforeEach(() => vi.mocked(searchTracks).mockReset())

  it('busca por el artista top y excluye lo ya escuchado', async () => {
    const seed = [t('a', 'Queen'), t('b', 'Queen')]
    vi.mocked(searchTracks).mockResolvedValue([t('a', 'Queen'), t('c', 'Queen'), t('d', 'Queen')])
    const recs = await recommendForYou(seed)
    expect(searchTracks).toHaveBeenCalledWith('Queen')
    const ids = recs.map((r) => r.id)
    expect(ids).not.toContain('a') // ya escuchado -> excluido
    expect(ids).toContain('c')
  })

  it('sin semillas usa una búsqueda popular', async () => {
    vi.mocked(searchTracks).mockResolvedValue([t('x', 'Hit')])
    const recs = await recommendForYou([])
    expect(searchTracks).toHaveBeenCalledWith('top hits 2024')
    expect(recs.map((r) => r.id)).toContain('x')
  })
})

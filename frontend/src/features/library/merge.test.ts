import { describe, it, expect } from 'vitest'
import type { Playlist, Track } from '@/entities/track'
import { mergeLibraries, normalizeLibrary, isEmptyLibrary, emptyLibrary, HISTORY_LIMIT } from './merge'

const t = (id: string): Track => ({ id, title: id, artist: 'a', durationSec: 1, thumbnail: '' })
const pl = (id: string, name: string, tracks: Track[], at: number): Playlist => ({
  id,
  name,
  tracks,
  createdAt: 1,
  updatedAt: at,
})

describe('mergeLibraries', () => {
  it('une favoritos sin duplicar y respeta el orden del principal', () => {
    const m = mergeLibraries(
      { ...emptyLibrary(), favorites: [t('a'), t('b')] },
      { ...emptyLibrary(), favorites: [t('b'), t('c')] },
    )
    expect(m.favorites.map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })

  it('en playlists con el mismo id gana la modificada más reciente', () => {
    const m = mergeLibraries(
      { ...emptyLibrary(), playlists: [pl('p1', 'Vieja', [t('a')], 10)] },
      { ...emptyLibrary(), playlists: [pl('p1', 'Nueva', [t('a'), t('b')], 20), pl('p2', 'Otra', [], 5)] },
    )
    expect(m.playlists.map((p) => p.name)).toEqual(['Nueva', 'Otra'])
    expect(m.playlists[0]?.tracks).toHaveLength(2)
  })

  it('limita el historial', () => {
    const many = Array.from({ length: HISTORY_LIMIT + 20 }, (_, i) => t(`h${i}`))
    const m = mergeLibraries({ ...emptyLibrary(), history: many }, { ...emptyLibrary(), history: [t('x')] })
    expect(m.history).toHaveLength(HISTORY_LIMIT)
  })
})

describe('normalizeLibrary', () => {
  it('tolera datos vacíos o corruptos', () => {
    expect(normalizeLibrary(null)).toEqual(emptyLibrary())
    expect(normalizeLibrary({ favorites: 'x', playlists: [] })).toEqual(emptyLibrary())
    expect(isEmptyLibrary(normalizeLibrary(undefined))).toBe(true)
  })
})

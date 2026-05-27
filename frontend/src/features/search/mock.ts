import type { Track } from '@/entities/track'

const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`

/** Catálogo de muestra (IDs reales de YouTube) para probar el reproductor en Fase 0.
 *  En MVP se reemplaza por la búsqueda real contra FastAPI (/api/search). */
export const sampleTracks: Track[] = [
  { id: 'bdz90srbneU', title: 'Los Malaventurados No Lloran', artist: 'PXNDX', durationSec: 237, thumbnail: thumb('bdz90srbneU') },
  { id: 'kJQP7kiw5Fk', title: 'Despacito', artist: 'Luis Fonsi', durationSec: 282, thumbnail: thumb('kJQP7kiw5Fk') },
  { id: 'JGwWNGJdvx8', title: 'Shape of You', artist: 'Ed Sheeran', durationSec: 263, thumbnail: thumb('JGwWNGJdvx8') },
  { id: '9bZkp7q19f0', title: 'Gangnam Style', artist: 'PSY', durationSec: 252, thumbnail: thumb('9bZkp7q19f0') },
  { id: 'fJ9rUzIMcZQ', title: 'Bohemian Rhapsody', artist: 'Queen', durationSec: 355, thumbnail: thumb('fJ9rUzIMcZQ') },
  { id: 'OPf0YbXqDm0', title: 'Uptown Funk', artist: 'Mark Ronson ft. Bruno Mars', durationSec: 270, thumbnail: thumb('OPf0YbXqDm0') },
]

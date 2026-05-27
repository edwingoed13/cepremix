/** Modelos de dominio. La fuente de audio es un video de YouTube (id). */

export interface Track {
  /** YouTube video id */
  id: string
  title: string
  artist: string
  durationSec: number
  thumbnail: string
}

export interface Playlist {
  id: string
  name: string
  tracks: Track[]
  createdAt: number
  cover?: string
}

export interface Room {
  id: string
  name: string
  isPublic: boolean
  listeners: number
}

export interface User {
  id: string
  name: string
}

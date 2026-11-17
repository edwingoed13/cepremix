import type { Component } from 'vue'
import { Moon, Zap, PartyPopper, Headphones, Heart, Car, Rewind, Mic } from 'lucide-vue-next'

/** Atajos de descubrimiento: estados de ánimo (chips) y géneros (cuadrícula de Buscar). */
export interface BrowseItem {
  label: string
  /** Búsqueda que se lanza al tocarlo */
  q: string
  /** Color de la tarjeta (solo géneros) */
  color?: string
  icon?: Component
}

export const MOODS: BrowseItem[] = [
  { label: 'Relax', q: 'música relajante chill', icon: Moon },
  { label: 'Energía', q: 'música para entrenar', icon: Zap },
  { label: 'Fiesta', q: 'reggaeton fiesta mix', icon: PartyPopper },
  { label: 'Concentración', q: 'lofi para estudiar', icon: Headphones },
  { label: 'Romance', q: 'baladas románticas', icon: Heart },
  { label: 'De viaje', q: 'canciones para viajar en carretera', icon: Car },
  { label: 'Nostalgia', q: 'éxitos de los 2000 en español', icon: Rewind },
  { label: 'Para cantar', q: 'canciones para cantar karaoke', icon: Mic },
]

export const GENRES: BrowseItem[] = [
  { label: 'Pop', q: 'pop hits', color: '#e13300' },
  { label: 'Reggaetón', q: 'reggaeton nuevo', color: '#8d67ab' },
  { label: 'Rock', q: 'rock clásico', color: '#e8115b' },
  { label: 'Hip-Hop', q: 'hip hop', color: '#ba5d07' },
  { label: 'Electrónica', q: 'electronic dance music', color: '#0d73ec' },
  { label: 'Salsa', q: 'salsa clásica', color: '#d84000' },
  { label: 'Cumbia', q: 'cumbia mix', color: '#148a08' },
  { label: 'Indie', q: 'indie alternativo', color: '#608108' },
  { label: 'Lo-fi', q: 'lofi hip hop', color: '#477d95' },
  { label: 'Baladas', q: 'baladas en español', color: '#b02897' },
  { label: 'K-Pop', q: 'kpop hits', color: '#f037a5' },
  { label: 'Jazz', q: 'jazz clásico', color: '#1e3264' },
  { label: 'Clásica', q: 'música clásica', color: '#7d4b32' },
  { label: 'Metal', q: 'metal', color: '#535353' },
  { label: 'Andina', q: 'música andina peruana', color: '#2d46b9' },
  { label: 'Regional', q: 'regional mexicano', color: '#a56752' },
]

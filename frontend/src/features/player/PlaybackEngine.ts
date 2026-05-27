/**
 * Abstracción del motor de audio. Hoy lo implementa YouTubeEngine (IFrame API).
 * El día que se hospede audio propio, basta crear HtmlAudioEngine con esta misma
 * interfaz: el resto de la app (store, UI) no cambia. Eso es escalabilidad real.
 */

export type PlayerStatus =
  | 'idle'
  | 'loading'
  | 'buffering'
  | 'playing'
  | 'paused'
  | 'ended'
  | 'error'

export interface EngineEventMap {
  status: PlayerStatus
  time: { current: number; duration: number }
  ended: void
  error: string
}

export type EngineHandler<K extends keyof EngineEventMap> = (
  payload: EngineEventMap[K],
) => void

export interface PlaybackEngine {
  load(videoId: string): Promise<void>
  play(): void
  pause(): void
  seek(sec: number): void
  setVolume(volume: number): void
  destroy(): void
  on<K extends keyof EngineEventMap>(event: K, handler: EngineHandler<K>): void
  /** Solo lo implementa el motor con Web Audio (<audio>): espectro real por FFT. */
  getFrequencyData?(): Uint8Array | null
  /** Engancha el analizador Web Audio al audio en curso (motor <audio>). */
  enableAnalyser?(): void
}

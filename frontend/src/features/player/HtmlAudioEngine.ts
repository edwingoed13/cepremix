import type { PlaybackEngine, EngineEventMap, EngineHandler } from './PlaybackEngine'

/**
 * Motor de audio "real": reproduce con un <audio> apuntando a /audio/{id} (proxy del
 * backend con yt-dlp). Ventajas frente al iframe de YouTube:
 *  - Reproducción en segundo plano fiable (HTMLAudioElement).
 *  - Espectro REAL por FFT (Web Audio AnalyserNode), porque la fuente es del mismo origen.
 * Coste: el audio pasa por el servidor (extracción sujeta a límites de YouTube).
 */
export class HtmlAudioEngine implements PlaybackEngine {
  private audio: HTMLAudioElement
  private handlers: { [K in keyof EngineEventMap]?: Array<EngineHandler<K>> } = {}
  private ctx: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private pendingVolume = 80

  constructor() {
    const audio = new Audio()
    audio.crossOrigin = 'anonymous' // permite el AnalyserNode aunque sea cross-origin
    audio.preload = 'auto'
    audio.addEventListener('play', () => this.emit('status', 'playing'))
    audio.addEventListener('playing', () => this.emit('status', 'playing'))
    audio.addEventListener('pause', () => {
      if (!audio.ended) this.emit('status', 'paused')
    })
    audio.addEventListener('waiting', () => this.emit('status', 'buffering'))
    audio.addEventListener('ended', () => {
      this.emit('status', 'ended')
      this.emit('ended', undefined)
    })
    audio.addEventListener('error', () => this.emit('error', 'Error al cargar el audio'))
    audio.addEventListener('timeupdate', () =>
      this.emit('time', {
        current: audio.currentTime,
        duration: isFinite(audio.duration) ? audio.duration : 0,
      }),
    )
    audio.addEventListener('loadedmetadata', () =>
      this.emit('time', {
        current: 0,
        duration: isFinite(audio.duration) ? audio.duration : 0,
      }),
    )
    audio.volume = this.pendingVolume / 100
    this.audio = audio
  }

  /** Construye el grafo Web Audio una sola vez (en la primera reproducción, tras gesto). */
  private ensureGraph(): void {
    if (this.ctx) return
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.ctx = new Ctor()
    // Best-effort: si el navegador interrumpe/suspende el contexto al cambiar de
    // pestaña, intentamos reanudarlo (mitiga, no garantiza, el corte de audio).
    this.ctx.addEventListener('statechange', () => {
      if (this.ctx && this.ctx.state !== 'running' && !this.audio.paused) void this.ctx.resume()
    })
    const src = this.ctx.createMediaElementSource(this.audio)
    this.analyser = this.ctx.createAnalyser()
    this.analyser.fftSize = 256
    this.analyser.smoothingTimeConstant = 0.8
    src.connect(this.analyser)
    this.analyser.connect(this.ctx.destination)
  }

  getFrequencyData(): Uint8Array | null {
    if (!this.analyser) return null
    const data = new Uint8Array(this.analyser.frequencyBinCount)
    this.analyser.getByteFrequencyData(data)
    return data
  }

  /** Engancha el analizador al audio que ya está sonando (sin esperar al próximo play). */
  enableAnalyser(): void {
    this.ensureGraph()
    if (this.ctx && this.ctx.state !== 'running') void this.ctx.resume()
  }

  private emit<K extends keyof EngineEventMap>(event: K, payload: EngineEventMap[K]): void {
    const list = (this.handlers[event] ?? []) as Array<EngineHandler<K>>
    list.forEach((h) => h(payload))
  }

  on<K extends keyof EngineEventMap>(event: K, handler: EngineHandler<K>): void {
    const list = (this.handlers[event] ?? []) as Array<EngineHandler<K>>
    list.push(handler)
    this.handlers[event] = list as never
  }

  async load(videoId: string): Promise<void> {
    this.emit('status', 'loading')
    this.audio.src = `/audio/${videoId}`
    this.audio.load()
  }

  play(): void {
    // Flag leído dinámicamente: activar "Espectro real" surte efecto en la siguiente
    // reproducción sin recargar. Solo entonces enrutamos por Web Audio (lo que puede
    // afectar el background); si no, el <audio> reproduce directo (background fiable).
    if (localStorage.getItem('spectrum') === 'real') {
      this.ensureGraph()
      if (this.ctx && this.ctx.state !== 'running') void this.ctx.resume()
    }
    void this.audio.play().catch(() => this.emit('error', 'Reproducción rechazada por el navegador'))
  }

  pause(): void {
    this.audio.pause()
  }

  seek(sec: number): void {
    this.audio.currentTime = sec
  }

  setVolume(volume: number): void {
    this.pendingVolume = volume
    this.audio.volume = Math.max(0, Math.min(1, volume / 100))
  }

  destroy(): void {
    this.audio.pause()
    this.audio.removeAttribute('src')
    this.audio.load()
    void this.ctx?.close()
  }
}

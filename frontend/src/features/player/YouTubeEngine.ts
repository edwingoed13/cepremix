import type {
  PlaybackEngine,
  EngineEventMap,
  EngineHandler,
  PlayerStatus,
} from './PlaybackEngine'

/* Tipado mínimo de la IFrame API de YouTube (suficiente para nuestro uso). */
declare global {
  interface Window {
    YT?: { Player: new (el: string | HTMLElement, opts: unknown) => YTPlayer }
    onYouTubeIframeAPIReady?: () => void
  }
}
interface YTPlayer {
  loadVideoById(id: string): void
  playVideo(): void
  pauseVideo(): void
  seekTo(sec: number, allowSeekAhead: boolean): void
  setVolume(v: number): void
  getCurrentTime(): number
  getDuration(): number
  destroy(): void
}

function ytApiReady(): Promise<NonNullable<Window['YT']>> {
  return new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve(window.YT)
      return
    }
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      resolve(window.YT!)
    }
  })
}

// YT.PlayerState -> nuestro estado de dominio
const STATE_MAP: Record<number, PlayerStatus> = {
  [-1]: 'idle',
  0: 'ended',
  1: 'playing',
  2: 'paused',
  3: 'buffering',
  5: 'idle',
}

export class YouTubeEngine implements PlaybackEngine {
  private player: YTPlayer | null = null
  private ready: Promise<void>
  private timer: number | null = null
  private pendingVolume = 80
  private handlers: { [K in keyof EngineEventMap]?: Array<EngineHandler<K>> } = {}

  constructor(elementId: string) {
    this.ready = this.init(elementId)
  }

  private async init(elementId: string): Promise<void> {
    const YT = await ytApiReady()
    await new Promise<void>((resolve) => {
      this.player = new YT.Player(elementId, {
        height: '1',
        width: '1',
        // Modo privacy-enhanced: menos tracking/ads (doubleclick) que youtube.com
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            this.player?.setVolume(this.pendingVolume)
            resolve()
          },
          onStateChange: (e: { data: number }) => this.onState(e.data),
          onError: () => this.emit('error', 'Error de reproducción de YouTube'),
        },
      }) as YTPlayer
    })
  }

  private onState(state: number): void {
    const status = STATE_MAP[state] ?? 'idle'
    this.emit('status', status)
    if (status === 'playing') this.startTimer()
    else this.stopTimer()
    if (state === 0) this.emit('ended', undefined)
  }

  private startTimer(): void {
    this.stopTimer()
    this.timer = window.setInterval(() => {
      if (!this.player) return
      this.emit('time', {
        current: this.player.getCurrentTime() ?? 0,
        duration: this.player.getDuration() ?? 0,
      })
    }, 250)
  }

  private stopTimer(): void {
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
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
    await this.ready
    this.player?.loadVideoById(videoId)
  }

  play(): void {
    this.player?.playVideo()
  }

  pause(): void {
    this.player?.pauseVideo()
  }

  seek(sec: number): void {
    this.player?.seekTo(sec, true)
  }

  setVolume(volume: number): void {
    this.pendingVolume = volume
    this.player?.setVolume(volume)
  }

  destroy(): void {
    this.stopTimer()
    this.player?.destroy()
  }
}

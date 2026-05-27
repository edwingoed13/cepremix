import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Track } from '@/entities/track'
import type { PlayerStatus, PlaybackEngine } from './PlaybackEngine'
import { YouTubeEngine } from './YouTubeEngine'
import { HtmlAudioEngine } from './HtmlAudioEngine'

/**
 * Única fuente de verdad de la reproducción. Vive fuera del árbol de rutas,
 * por lo que el audio NUNCA se reinicia al navegar entre pantallas.
 */
export const usePlayerStore = defineStore('player', () => {
  const queue = ref<Track[]>([])
  const index = ref(-1)
  const status = ref<PlayerStatus>('idle')
  const position = ref(0)
  const duration = ref(0)
  const volume = ref(Number(localStorage.getItem('volume') ?? 80))
  const isFullOpen = ref(false)
  const wantPlaying = ref(false) // intención del usuario/servidor (para reanudar tras auto-pausa)

  const current = computed<Track | null>(() => queue.value[index.value] ?? null)
  const isPlaying = computed(() => status.value === 'playing')
  const progress = computed(() =>
    duration.value > 0 ? Math.min(1, position.value / duration.value) : 0,
  )

  let engine: PlaybackEngine | null = null
  let ytElementId = 'yt-player'
  let engineKind: 'audio' | 'youtube' = 'youtube'
  let triedFallback = false

  function createEngine(kind: 'audio' | 'youtube'): PlaybackEngine {
    const e: PlaybackEngine =
      kind === 'youtube' ? new YouTubeEngine(ytElementId) : new HtmlAudioEngine()
    e.on('status', (s) => {
      status.value = s
      updateMediaSessionState()
      // El navegador puede pausar/cue-ar el iframe en segundo plano al cargar una
      // canción nueva: reintentamos reproducir si esa es la intención.
      if ((s === 'paused' || s === 'idle') && wantPlaying.value && document.hidden) engine?.play()
    })
    e.on('time', ({ current: c, duration: d }) => {
      position.value = c
      if (d) duration.value = d
    })
    e.on('ended', () => next())
    e.on('error', () => handleEngineError())
    return e
  }

  // Si el motor <audio> falla (típico en servidor: /audio da 502 porque YouTube bloquea
  // la extracción desde IPs de datacenter), caemos al iframe de YouTube, que reproduce
  // desde el navegador del usuario y funciona en cualquier hosting.
  function handleEngineError(): void {
    if (engineKind === 'audio' && !triedFallback) {
      triedFallback = true
      engineKind = 'youtube'
      // No persistimos la elección: así, si /audio vuelve a funcionar (p. ej. al añadir
      // cookies en el server), al recargar se reintenta <audio> y se auto-recupera.
      const track = current.value
      const pos = position.value
      const shouldPlay = wantPlaying.value
      try {
        engine?.destroy()
      } catch {
        /* ignore */
      }
      engine = createEngine('youtube')
      engine.setVolume(volume.value)
      if (track) {
        void engine.load(track.id).then(() => {
          engine?.seek(pos)
          if (shouldPlay) engine?.play()
        })
      }
    } else {
      status.value = 'error'
    }
  }

  function init(elementId: string): void {
    if (engine) return
    ytElementId = elementId
    // Por defecto <audio> (background + espectro). Si /audio falla, cae al iframe.
    engineKind = localStorage.getItem('engine') === 'youtube' ? 'youtube' : 'audio'
    engine = createEngine(engineKind)
    engine.setVolume(volume.value)
    setupMediaSession()

    // Al volver a la pestaña, reanudar si quedó pausado.
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && wantPlaying.value && !isPlaying.value) engine?.play()
    })
  }

  function loadCurrent(autoplay: boolean): void {
    const track = current.value
    if (!track || !engine) return
    duration.value = track.durationSec
    position.value = 0
    if (autoplay) wantPlaying.value = true
    void engine.load(track.id).then(() => {
      if (autoplay) engine?.play()
    })
    updateMediaSessionMetadata()
  }

  function playQueue(tracks: Track[], startIndex = 0): void {
    queue.value = tracks
    index.value = startIndex
    loadCurrent(true)
  }

  function toggle(): void {
    if (!engine || !current.value) return
    if (isPlaying.value) {
      wantPlaying.value = false
      engine.pause()
    } else {
      wantPlaying.value = true
      engine.play()
    }
  }

  function next(): void {
    if (index.value < queue.value.length - 1) {
      index.value += 1
      loadCurrent(true)
    } else {
      status.value = 'ended'
      wantPlaying.value = false // fin de la cola: no reintentar reproducir
    }
  }

  function prev(): void {
    if (position.value > 3) {
      seek(0)
      return
    }
    if (index.value > 0) {
      index.value -= 1
      loadCurrent(true)
    }
  }

  function seek(sec: number): void {
    engine?.seek(sec)
    position.value = sec
  }

  /**
   * Alinea el reproductor a un estado autoritativo externo (p. ej. una sala).
   * Si cambió el track, lo carga y salta a la posición; si es el mismo, sólo
   * corrige el drift y el estado play/pause. Lo usa el room.store.
   */
  function syncTo(track: Track, positionSec: number, shouldPlay: boolean): void {
    if (!engine) return
    wantPlaying.value = shouldPlay
    if (current.value?.id !== track.id) {
      queue.value = [track]
      index.value = 0
      duration.value = track.durationSec || duration.value
      void engine.load(track.id).then(() => {
        engine?.seek(positionSec)
        if (shouldPlay) engine?.play()
      })
      updateMediaSessionMetadata()
    } else {
      // No re-buscar mientras la pestaña está oculta: los seeks repetidos en segundo
      // plano cortan el audio al cambiar de pestaña. Al volver, el siguiente tick resincroniza.
      if (!document.hidden && Math.abs(position.value - positionSec) > 2.5) engine.seek(positionSec)
      if (shouldPlay && !isPlaying.value) engine.play()
      if (!shouldPlay && isPlaying.value) engine.pause()
    }
  }

  function setVolume(v: number): void {
    volume.value = v
    localStorage.setItem('volume', String(v))
    engine?.setVolume(v)
  }

  /** Datos de frecuencia (FFT) si el motor los expone (<audio>); null con el iframe. */
  function getFrequencyData(): Uint8Array | null {
    return engine?.getFrequencyData?.() ?? null
  }

  /** Engancha el analizador al audio en curso (para activar el espectro real al instante). */
  function enableAnalyser(): void {
    engine?.enableAnalyser?.()
  }

  function openFull(): void {
    isFullOpen.value = true
  }
  function closeFull(): void {
    isFullOpen.value = false
  }

  /* ---- Media Session API: controles en pantalla de bloqueo / notificación ---- */
  function setupMediaSession(): void {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.setActionHandler('play', () => {
      wantPlaying.value = true
      engine?.play()
    })
    navigator.mediaSession.setActionHandler('pause', () => {
      wantPlaying.value = false
      engine?.pause()
    })
    navigator.mediaSession.setActionHandler('nexttrack', () => next())
    navigator.mediaSession.setActionHandler('previoustrack', () => prev())
  }
  function updateMediaSessionMetadata(): void {
    if (!('mediaSession' in navigator) || !current.value) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.value.title,
      artist: current.value.artist,
      artwork: [{ src: current.value.thumbnail, sizes: '480x360', type: 'image/jpeg' }],
    })
  }
  function updateMediaSessionState(): void {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.playbackState = isPlaying.value ? 'playing' : 'paused'
  }

  return {
    queue,
    index,
    status,
    position,
    duration,
    volume,
    isFullOpen,
    current,
    isPlaying,
    progress,
    init,
    playQueue,
    toggle,
    next,
    prev,
    seek,
    syncTo,
    setVolume,
    getFrequencyData,
    enableAnalyser,
    openFull,
    closeFull,
  }
})

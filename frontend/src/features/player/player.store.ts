import { defineStore } from 'pinia'
import { ref, computed, shallowRef } from 'vue'
import type { Track } from '@/entities/track'
import type { PlayerStatus, PlaybackEngine } from './PlaybackEngine'
import { YouTubeEngine } from './YouTubeEngine'
import { HtmlAudioEngine } from './HtmlAudioEngine'

export type RepeatMode = 'off' | 'all' | 'one'

/**
 * Controlador externo de la reproducción (p. ej. una sala). Mientras está activo,
 * los controles de la UI (mini/full/desktop/pantalla de bloqueo) se envían a él en
 * vez de al motor local, y el estado llega de vuelta vía syncTo().
 */
export interface RemoteController {
  /** Nombre visible del contexto ("Sala Viernes"). */
  label: string
  toggle(): void
  next(): void
  prev(): void
  seek(sec: number): void
}

/** Cuánto esperamos a saber si el servidor ya tiene la canción en disco antes de arrancar
 *  con el iframe. Con cache responde en ~20-50 ms en la red local. */
const QUICK_MS = 350
const sleep = (ms: number): Promise<void> => new Promise((r) => window.setTimeout(r, ms))

function shuffled<T>(list: T[]): T[] {
  const a = list.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j] as T, a[i] as T]
  }
  return a
}

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
  const shuffle = ref(localStorage.getItem('shuffle') === '1')
  const repeat = ref<RepeatMode>((localStorage.getItem('repeat') as RepeatMode | null) ?? 'off')
  const remote = shallowRef<RemoteController | null>(null)
  /** Orden original de la cola, para restaurarlo al desactivar el aleatorio. */
  let originalOrder: Track[] | null = null

  const current = computed<Track | null>(() => queue.value[index.value] ?? null)
  const isPlaying = computed(() => status.value === 'playing')
  const isRemote = computed(() => remote.value !== null)
  const upNext = computed(() => queue.value.slice(index.value + 1))
  const progress = computed(() =>
    duration.value > 0 ? Math.min(1, position.value / duration.value) : 0,
  )

  /*
   * Dos motores persistentes:
   *  - audioEng (<audio> vía /audio del backend): sigue sonando en segundo plano.
   *  - ytEng (iframe de YouTube): arranca al instante, pero YouTube lo pausa al salir
   *    de la app en el móvil.
   * "Arranque en caliente": si el audio de una canción aún no está listo en el servidor
   * (~7 s: extracción + espera que exige YouTube), suena primero el iframe y, cuando el
   * <audio> puede reproducir, se pasa a él en el mismo segundo. Las siguientes canciones
   * se precargan, así que arrancan ya directamente en <audio>.
   * `engine` es siempre el motor ACTIVO: solo sus eventos actualizan el estado.
   */
  let engine: PlaybackEngine | null = null
  let audioEng: HtmlAudioEngine | null = null
  let ytEng: YouTubeEngine | null = null
  /** Motor activo, para la UI (Ajustes) y diagnóstico. */
  const engineName = ref<'audio' | 'youtube'>('audio')
  /** false = el servidor no puede dar audio en esta sesión (p. ej. Render: AUDIO_PROXY=off). */
  let audioAvailable = true
  let audioFailures = 0
  /** Incrementa con cada carga: invalida handoffs/promesas de canciones anteriores. */
  let loadSeq = 0

  function wire(e: PlaybackEngine): void {
    e.on('status', (s) => {
      if (engine !== e) return
      status.value = s
      updateMediaSessionState()
      // El iframe puede pausarse/cue-arse en segundo plano al cargar una canción nueva:
      // reintentamos si esa es la intención. Solo con el iframe: con <audio>, una pausa en
      // segundo plano la pide el sistema (p. ej. una nota de voz de WhatsApp toma el foco
      // de audio) y no debemos pelearle el foco.
      if (e === ytEng && (s === 'paused' || s === 'idle') && wantPlaying.value && document.hidden)
        e.play()
    })
    e.on('time', ({ current: c, duration: d }) => {
      if (engine !== e) return
      position.value = c
      if (d) duration.value = d
    })
    e.on('ended', () => {
      if (engine === e) onEnded()
    })
    // Ignorar errores de un motor que no es el activo (p. ej. el <audio> preparándose).
    e.on('error', () => {
      if (engine === e) handleEngineError()
    })
  }

  /** Cambia el motor activo y silencia el otro. */
  function use(e: PlaybackEngine): void {
    const prev = engine
    engine = e
    engineName.value = e === audioEng ? 'audio' : 'youtube'
    if (prev && prev !== e) prev.pause()
  }

  function noteAudioFailure(): void {
    audioFailures += 1
    if (audioFailures >= 3) audioAvailable = false // el servidor no puede: solo iframe
  }

  // El <audio> falló sonando (p. ej. la URL de YouTube caducó): seguir en el iframe en el
  // mismo segundo. Si falla repetidamente, se deja de intentar <audio> en esta sesión.
  function handleEngineError(): void {
    if (engine === audioEng && ytEng) {
      noteAudioFailure()
      const track = current.value
      const pos = position.value
      use(ytEng)
      if (track) startOn(ytEng, track.id, pos, ++loadSeq)
    } else {
      status.value = 'error'
    }
  }

  function startOn(e: PlaybackEngine, id: string, at: number, seq: number): void {
    void e.load(id).then(() => {
      if (seq !== loadSeq) return
      if (at > 0) e.seek(at)
      if (wantPlaying.value) e.play()
    })
  }

  /** Arranca una canción en `at` segundos con el mejor motor disponible. */
  function startTrack(id: string, at: number): void {
    const seq = ++loadSeq
    if (!audioEng || !ytEng) return
    engine?.pause() // que no siga sonando la anterior mientras decidimos
    if (!audioAvailable) {
      use(ytEng)
      return startOn(ytEng, id, at, seq)
    }
    if (readyIds.has(id)) {
      use(audioEng) // ya lista en el servidor: directo a <audio>
      return startOn(audioEng, id, at, seq)
    }
    // ¿La tiene el servidor en disco? Si la precarga responde en QUICK_MS (cache), va directo
    // a <audio>; si tarda (canción nueva: ~8 s por YouTube), arranque en caliente con el iframe.
    status.value = 'loading'
    const ready = prefetch(id)
    void Promise.race([ready, sleep(QUICK_MS).then(() => 'slow' as const)]).then((r) => {
      if (seq !== loadSeq || !audioEng) return
      if (r === 'ok') {
        use(audioEng)
        return startOn(audioEng, id, at, seq)
      }
      warmStart(id, at, seq, ready)
    })
  }

  /**
   * Arranque en caliente: suena YA el iframe y, cuando el servidor tiene el audio, se pasa
   * al <audio> en el mismo segundo (el que sigue sonando con la app en segundo plano).
   */
  function warmStart(id: string, at: number, seq: number, ready: Promise<PrefetchResult>): void {
    if (!ytEng || !audioEng) return
    use(ytEng)
    startOn(ytEng, id, at, seq)
    const audio = audioEng
    void ready.then(async (r) => {
      if (seq !== loadSeq) return
      if (r === 'disabled') {
        audioAvailable = false
        return
      }
      if (r !== 'ok') return noteAudioFailure()
      try {
        await audio.prepare(id)
      } catch {
        return noteAudioFailure()
      }
      if (seq !== loadSeq) return
      audioFailures = 0
      // Pasar al <audio> en el mismo punto (+ un pelín por la latencia del reloj del iframe)
      audio.seek(position.value + 0.2)
      if (!wantPlaying.value) {
        use(audio) // estaba en pausa: queda listo en <audio>, sin sonar
        status.value = 'paused'
        return
      }
      // Solo soltamos el iframe cuando el <audio> ya suena (si el navegador lo bloquea,
      // seguimos con el iframe en vez de cortar la música).
      const ok = await audio.tryPlay()
      if (seq !== loadSeq) {
        // Mientras tanto cambiaron de canción: callar este <audio> salvo que ya lo use la nueva
        if (engine !== audio) audio.pause()
        return
      }
      if (!ok) return
      use(audio)
      status.value = 'playing'
      updateMediaSessionState()
    })
  }

  function init(elementId: string): void {
    if (engine) return
    audioEng = new HtmlAudioEngine()
    ytEng = new YouTubeEngine(elementId)
    wire(audioEng)
    wire(ytEng)
    audioEng.setVolume(volume.value)
    ytEng.setVolume(volume.value)
    use(audioEng)
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
    startTrack(track.id, 0)
    updateMediaSessionMetadata()
    // Dejar listas las 2 siguientes (el servidor las guarda en disco): cambio de pista inmediato
    queue.value.slice(index.value + 1, index.value + 3).forEach((t) => void prefetch(t.id))
  }

  /**
   * Pide al servidor que extraiga el audio de una canción y lo deje listo (cache ~5 h).
   * Se usa para la PRÓXIMA canción (cambio de pista inmediato, clave en segundo plano)
   * y para el arranque en caliente de la actual. Una sola petición por id.
   */
  type PrefetchResult = 'ok' | 'fail' | 'disabled'
  const readyIds = new Set<string>()
  const pending = new Map<string, Promise<PrefetchResult>>()
  function prefetch(id: string | undefined): Promise<PrefetchResult> {
    if (!id || !audioAvailable) return Promise.resolve('disabled')
    if (readyIds.has(id)) return Promise.resolve('ok')
    let p = pending.get(id)
    if (!p) {
      p = fetch(`/audio/${id}/prefetch`)
        .then((r): PrefetchResult => (r.ok ? 'ok' : r.status === 503 ? 'disabled' : 'fail'))
        .catch((): PrefetchResult => 'fail')
        .then((r) => {
          pending.delete(id)
          if (r === 'ok') readyIds.add(id)
          if (r === 'disabled') audioAvailable = false
          return r
        })
      pending.set(id, p)
    }
    return p
  }

  /** Reproduce una lista desde un índice. Con aleatorio activo, baraja lo que viene después. */
  function playQueue(tracks: Track[], startIndex = 0): void {
    if (shuffle.value && tracks.length > 1) {
      originalOrder = tracks.slice()
      const first = tracks[startIndex] as Track
      const rest = tracks.filter((_, i) => i !== startIndex)
      queue.value = [first, ...shuffled(rest)]
      index.value = 0
    } else {
      originalOrder = null
      queue.value = tracks
      index.value = startIndex
    }
    loadCurrent(true)
  }

  /** Salta a una canción de la cola actual (vista "A continuación"). */
  function playAt(i: number): void {
    if (i < 0 || i >= queue.value.length) return
    index.value = i
    loadCurrent(true)
  }

  /** Reanuda solo el motor local (p. ej. el navegador bloqueó el autoplay en una sala). */
  function resumeLocal(): void {
    wantPlaying.value = true
    engine?.play()
  }
  /** Pausa solo el motor local (p. ej. la sala se quedó sin canción). */
  function pauseLocal(): void {
    wantPlaying.value = false
    engine?.pause()
  }

  function toggle(): void {
    if (remote.value) return remote.value.toggle()
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
    if (remote.value) return remote.value.next()
    if (index.value < queue.value.length - 1) {
      index.value += 1
      loadCurrent(true)
    } else if (repeat.value === 'all' && queue.value.length) {
      index.value = 0
      loadCurrent(true)
    } else {
      status.value = 'ended'
      wantPlaying.value = false // fin de la cola: no reintentar reproducir
    }
  }

  function prev(): void {
    if (remote.value) return remote.value.prev()
    if (position.value > 3) {
      seek(0)
      return
    }
    if (index.value > 0) {
      index.value -= 1
      loadCurrent(true)
    }
  }

  /** Fin natural de la canción. En una sala no hacemos nada: el servidor avanza la cola. */
  function onEnded(): void {
    if (remote.value) return
    if (repeat.value === 'one') {
      engine?.seek(0)
      engine?.play()
      return
    }
    next()
  }

  function seek(sec: number): void {
    engine?.seek(sec)
    position.value = sec
    remote.value?.seek(sec)
  }

  function toggleShuffle(): void {
    shuffle.value = !shuffle.value
    localStorage.setItem('shuffle', shuffle.value ? '1' : '0')
    const cur = current.value
    if (!cur) return
    if (shuffle.value) {
      originalOrder = queue.value.slice()
      const head = queue.value.slice(0, index.value + 1)
      queue.value = [...head, ...shuffled(queue.value.slice(index.value + 1))]
    } else if (originalOrder) {
      const i = originalOrder.findIndex((t) => t.id === cur.id)
      queue.value = originalOrder
      index.value = Math.max(0, i)
      originalOrder = null
    }
  }

  function cycleRepeat(): void {
    repeat.value = repeat.value === 'off' ? 'all' : repeat.value === 'all' ? 'one' : 'off'
    localStorage.setItem('repeat', repeat.value)
  }

  /** Lo activa/desactiva el room.store al entrar/salir de una sala. */
  function setRemote(ctrl: RemoteController | null): void {
    remote.value = ctrl
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
      originalOrder = null
      duration.value = track.durationSec || duration.value
      position.value = positionSec
      startTrack(track.id, positionSec)
      updateMediaSessionMetadata()
    } else {
      // No re-buscar mientras la pestaña está oculta: los seeks repetidos en segundo
      // plano cortan el audio al cambiar de pestaña. Al volver, el siguiente tick resincroniza.
      if (!document.hidden && Math.abs(position.value - positionSec) > 2.5) engine.seek(positionSec)
      // En segundo plano con <audio> no forzamos play en cada tick: si está pausado es
      // porque el sistema tomó el foco de audio. Al volver a la app se resincroniza.
      const mayForce = !document.hidden || engine === ytEng
      if (shouldPlay && !isPlaying.value && mayForce) engine.play()
      if (!shouldPlay && isPlaying.value) engine.pause()
    }
  }

  function setVolume(v: number): void {
    volume.value = v
    localStorage.setItem('volume', String(v))
    audioEng?.setVolume(v) // ambos: el volumen se mantiene al pasar de un motor al otro
    ytEng?.setVolume(v)
  }

  /** Datos de frecuencia (FFT) si el motor los expone (<audio>); null con el iframe. */
  function getFrequencyData(): Uint8Array | null {
    return engine === audioEng ? (audioEng?.getFrequencyData() ?? null) : null
  }

  /** Engancha el analizador al audio en curso (para activar el espectro real al instante). */
  function enableAnalyser(): void {
    audioEng?.enableAnalyser()
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
      if (!isPlaying.value) toggle()
    })
    navigator.mediaSession.setActionHandler('pause', () => {
      if (isPlaying.value) toggle()
    })
    navigator.mediaSession.setActionHandler('nexttrack', () => next())
    navigator.mediaSession.setActionHandler('previoustrack', () => prev())
  }
  function updateMediaSessionMetadata(): void {
    if (!('mediaSession' in navigator) || !current.value) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.value.title,
      artist: current.value.artist,
      album: remote.value?.label ?? 'CEPREMIX',
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
    shuffle,
    repeat,
    remote,
    engineName,
    current,
    isPlaying,
    isRemote,
    upNext,
    progress,
    init,
    playQueue,
    playAt,
    resumeLocal,
    pauseLocal,
    toggle,
    next,
    prev,
    seek,
    toggleShuffle,
    cycleRepeat,
    setRemote,
    prefetch,
    syncTo,
    setVolume,
    getFrequencyData,
    enableAnalyser,
    openFull,
    closeFull,
  }
})

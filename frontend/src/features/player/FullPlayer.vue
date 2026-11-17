<script setup lang="ts">
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  Shuffle,
  Repeat,
  Repeat1,
  ListMusic,
  ListPlus,
  Volume1,
  Volume2,
  Radio,
} from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { useRouter } from 'vue-router'
import { usePlayerStore } from './player.store'
import { ambientColor } from './ambient'
import { useLibraryStore } from '@/features/library/library.store'
import { useRoomStore } from '@/features/rooms/room.store'
import { useUiStore } from '@/shared/lib/ui.store'
import { mmss } from '@/shared/lib/format'
import { isLetterboxed } from '@/shared/lib/youtube'
import AudioSpectrum from './AudioSpectrum.vue'
import MarqueeText from '@/shared/ui/MarqueeText.vue'
import TrackRow from '@/shared/ui/TrackRow.vue'

const player = usePlayerStore()
const lib = useLibraryStore()
const room = useRoomStore()
const ui = useUiStore()
const router = useRouter()
const isDesktop = useMediaQuery('(min-width: 1024px)')

const showQueue = ref(false)
const pct = computed(() => `${player.progress * 100}%`)
const isFav = computed(() => !!player.current && lib.isFavorite(player.current.id))
const art = computed(() => player.current?.thumbnail ?? '')

/** Lo que viene: la cola de la sala o la cola local. */
const upcoming = computed(() => (player.isRemote ? room.queue : player.upNext))

function onSeek(e: Event): void {
  player.seek(Number((e.target as HTMLInputElement).value))
}
function toggleFav(): void {
  if (player.current) lib.toggleFavorite(player.current)
}
function addToPlaylist(): void {
  if (player.current) ui.openAddToPlaylist(player.current)
}
function onVolume(e: Event): void {
  player.setVolume(Number((e.target as HTMLInputElement).value))
}
function pickUpcoming(i: number): void {
  if (player.isRemote) return // en la sala el orden lo decide la cola compartida
  player.playAt(player.index + 1 + i)
}
function openRoom(): void {
  if (!room.roomId) return
  player.closeFull()
  void router.push(`/room/${room.roomId}`)
}

// Gesto: arrastrar hacia abajo para cerrar (como Apple Music)
const dragY = ref(0)
const grabbing = ref(false)
let startY = 0
function onTouchStart(e: TouchEvent): void {
  const el = e.target as HTMLElement
  if (el.closest('input, button, .queue')) return // no interferir con scrubber/controles/lista
  startY = e.touches[0]?.clientY ?? 0
  grabbing.value = true
}
function onTouchMove(e: TouchEvent): void {
  if (!grabbing.value) return
  dragY.value = Math.max(0, (e.touches[0]?.clientY ?? 0) - startY)
}
function onTouchEnd(): void {
  if (!grabbing.value) return
  grabbing.value = false
  if (dragY.value > 120) player.closeFull()
  dragY.value = 0
}
</script>

<template>
  <section
    class="full"
    :class="{ grabbing }"
    :style="dragY ? { transform: `translateY(${dragY}px)` } : undefined"
    role="dialog"
    aria-label="Reproductor"
    @touchstart.passive="onTouchStart"
    @touchmove.passive="onTouchMove"
    @touchend="onTouchEnd"
  >
    <!-- Fondo "vivo": la carátula difuminada se mueve lentamente (Apple Music) -->
    <div class="living" aria-hidden="true">
      <img v-if="art" class="blob b1" :src="art" alt="" />
      <img v-if="art" class="blob b2" :src="art" alt="" />
    </div>
    <div class="scrim" />

    <div class="inner">
      <header class="topbar">
        <button class="icon-btn" aria-label="Cerrar reproductor" @click="player.closeFull()">
          <ChevronDown :size="28" />
        </button>
        <button v-if="player.isRemote" class="ctx ctx--room" @click="openRoom">
          <span class="ctx-k"><span class="live-dot green" /> Reproduciendo en la sala</span>
          <span class="ctx-v">{{ player.remote?.label }}</span>
        </button>
        <div v-else class="ctx">
          <span class="ctx-k">Reproduciendo</span>
          <span class="ctx-v">{{ player.queue.length > 1 ? `Tu cola · ${player.index + 1} de ${player.queue.length}` : 'CEPREMIX' }}</span>
        </div>
        <button
          class="icon-btn q-toggle"
          :class="{ on: showQueue }"
          :aria-label="showQueue ? 'Ver carátula' : 'Ver a continuación'"
          @click="showQueue = !showQueue"
        >
          <ListMusic :size="22" />
        </button>
      </header>

      <div class="layout">
        <div class="player-col">
          <!-- Carátula (se encoge al pausar, como Apple Music) o la cola en móvil -->
          <div v-if="!showQueue || isDesktop" class="art-wrap">
            <div class="art" :class="{ paused: !player.isPlaying }">
              <img :class="{ lb: isLetterboxed(art) }" :src="art" :alt="player.current?.title" />
            </div>
          </div>
          <div v-else class="queue queue--inline">
            <p class="q-h">A continuación</p>
            <ul v-if="upcoming.length" class="list">
              <li v-for="(t, i) in upcoming" :key="t.id + i">
                <TrackRow :track="t" dense @select="pickUpcoming(i)" />
              </li>
            </ul>
            <p v-else class="q-empty">No hay más canciones en la cola.</p>
          </div>

          <div class="info">
            <div class="texts">
              <MarqueeText class="title" :text="player.current?.title ?? ''" />
              <p class="artist">{{ player.current?.artist }}</p>
            </div>
            <button class="icon-btn" aria-label="Añadir a playlist" @click="addToPlaylist()">
              <ListPlus :size="22" />
            </button>
            <button class="icon-btn" :class="{ on: isFav }" :aria-label="isFav ? 'Quitar de favoritos' : 'Añadir a favoritos'" @click="toggleFav()">
              <Heart :size="24" :fill="isFav ? 'currentColor' : 'none'" />
            </button>
          </div>

          <AudioSpectrum :playing="player.isPlaying" :color="ambientColor ?? undefined" />

          <div class="scrubber">
            <input
              class="slider"
              type="range"
              min="0"
              :max="player.duration || 1"
              step="0.5"
              :value="player.position"
              :style="{ '--p': pct }"
              aria-label="Posición de la canción"
              @input="onSeek"
            />
            <div class="times">
              <span>{{ mmss(player.position) }}</span>
              <span>-{{ mmss(Math.max(0, player.duration - player.position)) }}</span>
            </div>
          </div>

          <div class="controls">
            <button
              class="icon-btn"
              :class="{ on: player.shuffle }"
              :disabled="player.isRemote"
              :aria-label="player.shuffle ? 'Desactivar aleatorio' : 'Activar aleatorio'"
              @click="player.toggleShuffle()"
            >
              <Shuffle :size="22" />
            </button>
            <button class="icon-btn big" aria-label="Anterior" @click="player.prev()">
              <SkipBack :size="32" fill="currentColor" />
            </button>
            <button class="play" :aria-label="player.isPlaying ? 'Pausar' : 'Reproducir'" @click="player.toggle()">
              <component :is="player.isPlaying ? Pause : Play" :size="32" fill="currentColor" />
            </button>
            <button class="icon-btn big" aria-label="Siguiente" @click="player.next()">
              <SkipForward :size="32" fill="currentColor" />
            </button>
            <button
              class="icon-btn"
              :class="{ on: player.repeat !== 'off' }"
              :disabled="player.isRemote"
              :aria-label="`Repetir: ${player.repeat === 'off' ? 'no' : player.repeat === 'all' ? 'todo' : 'una'}`"
              @click="player.cycleRepeat()"
            >
              <component :is="player.repeat === 'one' ? Repeat1 : Repeat" :size="22" />
            </button>
          </div>

          <div class="volume">
            <Volume1 :size="18" />
            <input
              class="slider"
              type="range"
              min="0"
              max="100"
              :value="player.volume"
              :style="{ '--p': player.volume + '%' }"
              aria-label="Volumen"
              @input="onVolume"
            />
            <Volume2 :size="18" />
          </div>
        </div>

        <!-- Desktop: panel "A continuación" siempre visible (Spotify / Apple Music) -->
        <aside v-if="isDesktop" class="queue queue--side">
          <p class="q-h">
            <template v-if="player.isRemote"><Radio :size="16" /> Cola de la sala</template>
            <template v-else>A continuación</template>
          </p>
          <ul v-if="upcoming.length" class="list">
            <li v-for="(t, i) in upcoming" :key="t.id + i">
              <TrackRow :track="t" :index="i" dense @select="pickUpcoming(i)" />
            </li>
          </ul>
          <p v-else class="q-empty">No hay más canciones en la cola.</p>
        </aside>
      </div>
    </div>
  </section>
</template>

<style scoped>
.full {
  position: fixed;
  inset: 0;
  z-index: 60;
  overflow: hidden;
  background: var(--bg);
  color: #fff;
  --text: #fff;
  --text-muted: rgba(255, 255, 255, 0.66);
  transition: transform 0.25s ease;
}
.full.grabbing {
  transition: none;
}

/* ---- Fondo vivo ---- */
.living {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: color-mix(in srgb, var(--ambient) 55%, #000);
}
.blob {
  position: absolute;
  width: 130vmax;
  height: 130vmax;
  object-fit: cover;
  border-radius: 50%;
  filter: blur(70px) saturate(1.6);
  opacity: 0.8;
}
.b1 {
  top: -45vmax;
  left: -35vmax;
  animation: drift1 26s ease-in-out infinite alternate;
}
.b2 {
  bottom: -55vmax;
  right: -45vmax;
  transform: rotate(180deg);
  animation: drift2 32s ease-in-out infinite alternate;
}
@keyframes drift1 {
  to {
    transform: translate(18vmax, 14vmax) rotate(40deg) scale(1.1);
  }
}
@keyframes drift2 {
  to {
    transform: translate(-16vmax, -18vmax) rotate(220deg) scale(1.15);
  }
}
.scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.18), rgba(0, 0, 0, 0.5));
}

/* ---- Contenido ---- */
.inner {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: calc(env(safe-area-inset-top) + var(--space-2)) var(--space-6)
    calc(env(safe-area-inset-bottom) + var(--space-6));
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin: 0 calc(-1 * var(--space-2));
}
.ctx {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  background: none;
  border: 0;
  color: inherit;
  padding: 0;
}
.ctx-k {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.ctx-v {
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 60vw;
}
.ctx--room .ctx-k {
  color: var(--accent);
}
.icon-btn {
  color: #fff;
  width: 44px;
  height: 44px;
}
.icon-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}
.icon-btn.on {
  color: var(--accent);
}
.layout {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: var(--space-10);
}
.player-col {
  flex: 1;
  min-height: 0;
  min-width: 0; /* sin esto, el título largo (nowrap) ensancha la columna y desborda */
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  padding-top: var(--space-4);
}
.art-wrap {
  flex: 1;
  min-height: 0;
  display: grid;
  place-items: center;
}
.art {
  width: min(84vw, 360px, 100%);
  max-height: 100%;
  aspect-ratio: 1;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
  box-shadow: 0 28px 60px rgba(0, 0, 0, 0.55);
  transition:
    transform 0.55s var(--ease-spring),
    box-shadow 0.55s ease;
}
.art img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.art.paused {
  transform: scale(0.84);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
}
.info {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}
.texts {
  flex: 1;
  min-width: 0;
}
.title {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.artist {
  margin: 4px 0 0;
  font-size: 16px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.slider {
  --fill: #fff;
}
.slider:hover,
.slider:active {
  --fill: #fff;
}
.times {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  margin-top: 2px;
  font-variant-numeric: tabular-nums;
}
.controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.icon-btn.big {
  width: 56px;
  height: 56px;
}
.play {
  background: #fff;
  color: #000;
  border: 0;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
  transition: transform 0.18s var(--ease-spring);
}
.play:hover {
  transform: scale(1.05);
}
.play:active {
  transform: scale(0.92);
}
.volume {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--text-muted);
}

/* ---- Cola ---- */
.queue {
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
}
.queue--inline {
  flex: 1;
  margin: 0 calc(-1 * var(--space-2));
}
.q-h {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 var(--space-2);
  padding: 0 var(--space-2);
  font-size: 16px;
  font-weight: 800;
}
.q-empty {
  padding: 0 var(--space-2);
  color: var(--text-muted);
  font-size: 14px;
}
.queue :deep(.row:hover) {
  background: rgba(255, 255, 255, 0.1);
}
.queue :deep(.artist),
.queue :deep(.dur),
.queue :deep(.num) {
  color: rgba(255, 255, 255, 0.6);
}

/* ---- Desktop: reproductor + panel de cola ---- */
@media (min-width: 1024px) {
  .inner {
    padding: var(--space-6) var(--space-10) var(--space-8);
  }
  .q-toggle {
    visibility: hidden;
  }
  .layout {
    max-width: 1200px;
    width: 100%;
    margin: 0 auto;
  }
  .player-col {
    flex: 0 1 480px;
    margin: 0 auto;
  }
  .art {
    width: min(46vh, 440px);
  }
  .queue--side {
    flex: 1;
    max-width: 520px;
    padding: var(--space-5) var(--space-3);
    border-radius: var(--radius-lg);
    background: rgba(0, 0, 0, 0.22);
    backdrop-filter: blur(20px);
    align-self: stretch;
    margin-top: var(--space-4);
  }
}
@media (max-height: 700px) {
  .player-col {
    gap: var(--space-3);
  }
  .play {
    width: 62px;
    height: 62px;
  }
}
</style>

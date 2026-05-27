<script setup lang="ts">
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  Shuffle,
  ListMusic,
  ListPlus,
  Volume2,
} from 'lucide-vue-next'
import { ref, watch } from 'vue'
import { usePlayerStore } from './player.store'
import { useLibraryStore } from '@/features/library/library.store'
import { useUiStore } from '@/shared/lib/ui.store'
import { mmss } from '@/shared/lib/format'
import { getDominantColor } from '@/shared/lib/color'
import AudioSpectrum from './AudioSpectrum.vue'
import MarqueeText from '@/shared/ui/MarqueeText.vue'

const player = usePlayerStore()
const lib = useLibraryStore()
const ui = useUiStore()

// Color dominante del arte del álbum para teñir el espectro (fallback: acento).
const artColor = ref<string | undefined>(undefined)
watch(
  () => player.current?.thumbnail,
  async (url) => {
    artColor.value = undefined
    if (url) {
      const c = await getDominantColor(url)
      if (c) artColor.value = c
    }
  },
  { immediate: true },
)

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

// Gesto: arrastrar hacia abajo para cerrar (como Apple Music)
const dragY = ref(0)
const grabbing = ref(false)
let startY = 0
function onTouchStart(e: TouchEvent): void {
  const el = e.target as HTMLElement
  if (el.closest('input, button')) return // no interferir con scrubber/controles
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
    @touchstart.passive="onTouchStart"
    @touchmove.passive="onTouchMove"
    @touchend="onTouchEnd"
  >
    <!-- Fondo: carátula difuminada tiñe la pantalla (truco premium barato) -->
    <div class="bg" :style="{ backgroundImage: `url(${player.current?.thumbnail})` }" />
    <div class="scrim" />

    <div class="inner">
      <header class="topbar">
        <button class="icon" aria-label="Cerrar reproductor" @click="player.closeFull()">
          <ChevronDown :size="26" />
        </button>
        <span class="ctx">Reproduciendo</span>
        <button class="icon" aria-label="Ver cola"><ListMusic :size="22" /></button>
      </header>

      <div class="art-wrap">
        <img class="art" :src="player.current?.thumbnail" :alt="player.current?.title" />
      </div>

      <div class="info">
        <div class="texts">
          <MarqueeText class="title" :text="player.current?.title ?? ''" />
          <p class="artist">{{ player.current?.artist }}</p>
        </div>
        <button class="icon" aria-label="Añadir a playlist" @click="addToPlaylist()">
          <ListPlus :size="22" />
        </button>
        <button
          class="icon"
          :class="{ fav: player.current && lib.isFavorite(player.current.id) }"
          aria-label="Favorito"
          @click="toggleFav()"
        >
          <Heart
            :size="24"
            :fill="player.current && lib.isFavorite(player.current.id) ? 'currentColor' : 'none'"
          />
        </button>
      </div>

      <AudioSpectrum :playing="player.isPlaying" :color="artColor" />

      <div class="scrubber">
        <input
          class="range"
          type="range"
          min="0"
          :max="player.duration || 1"
          :value="player.position"
          aria-label="Posición de la canción"
          @input="onSeek"
        />
        <div class="times">
          <span>{{ mmss(player.position) }}</span>
          <span>{{ mmss(player.duration) }}</span>
        </div>
      </div>

      <div class="controls">
        <button class="icon" aria-label="Aleatorio"><Shuffle :size="22" /></button>
        <button class="icon" aria-label="Anterior" @click="player.prev()">
          <SkipBack :size="30" fill="currentColor" />
        </button>
        <button
          class="play"
          :aria-label="player.isPlaying ? 'Pausar' : 'Reproducir'"
          @click="player.toggle()"
        >
          <component :is="player.isPlaying ? Pause : Play" :size="30" fill="currentColor" />
        </button>
        <button class="icon" aria-label="Siguiente" @click="player.next()">
          <SkipForward :size="30" fill="currentColor" />
        </button>
        <button class="icon" aria-label="Repetir"><Shuffle :size="22" /></button>
      </div>

      <div class="volume">
        <Volume2 :size="18" />
        <input
          class="vol"
          type="range"
          min="0"
          max="100"
          :value="player.volume"
          aria-label="Volumen"
          @input="onVolume"
        />
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
  transition: transform 0.25s ease;
}
.full.grabbing {
  transition: none;
}
.bg {
  position: absolute;
  inset: -40px;
  background-size: cover;
  background-position: center;
  filter: blur(40px) saturate(1.4);
  transform: scale(1.2);
}
.scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(14, 14, 17, 0.6), var(--bg) 75%);
}
.inner {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: calc(env(safe-area-inset-top) + var(--space-4)) var(--space-6) var(--space-8);
  gap: var(--space-6);
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ctx {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.icon {
  background: none;
  border: 0;
  color: var(--text);
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
}
.icon:active {
  transform: scale(0.9);
}
.icon.fav {
  color: var(--accent);
}
.art-wrap {
  flex: 1;
  display: grid;
  place-items: center;
  min-height: 0;
}
.art {
  width: min(78vw, 340px);
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: var(--radius-lg);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5);
}
.info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}
.texts {
  min-width: 0;
}
.title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
}
.artist {
  margin: 4px 0 0;
  color: var(--text-muted);
}
.range {
  width: 100%;
  accent-color: var(--accent);
}
.times {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-muted);
  margin-top: var(--space-1);
}
.controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.play {
  background: var(--text);
  color: var(--bg);
  border: 0;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: grid;
  place-items: center;
}
.play:active {
  transform: scale(0.94);
}
.volume {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--text-muted);
}
.vol {
  flex: 1;
  accent-color: var(--accent);
}

/* En desktop: columna "ahora suena" centrada y acotada (no estirada a todo el ancho) */
@media (min-width: 1024px) {
  .inner {
    max-width: 560px;
    margin: 0 auto;
    padding-top: var(--space-8);
    padding-bottom: var(--space-8);
  }
  .art {
    width: min(46vh, 400px);
  }
}
</style>

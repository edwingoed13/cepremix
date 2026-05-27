<script setup lang="ts">
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  Volume2,
  ListMusic,
  Maximize2,
} from 'lucide-vue-next'
import { usePlayerStore } from './player.store'
import { useLibraryStore } from '@/features/library/library.store'
import { mmss } from '@/shared/lib/format'
import MarqueeText from '@/shared/ui/MarqueeText.vue'

const player = usePlayerStore()
const lib = useLibraryStore()

function onSeek(e: Event): void {
  player.seek(Number((e.target as HTMLInputElement).value))
}
function onVolume(e: Event): void {
  player.setVolume(Number((e.target as HTMLInputElement).value))
}
function toggleFav(): void {
  if (player.current) lib.toggleFavorite(player.current)
}
</script>

<template>
  <footer class="bar">
    <!-- Izquierda: ahora suena -->
    <div class="now">
      <img class="art" :src="player.current?.thumbnail" :alt="player.current?.title" />
      <div class="meta">
        <MarqueeText class="t" :text="player.current?.title ?? ''" />
        <p class="a">{{ player.current?.artist }}</p>
      </div>
      <button
        class="ic"
        :class="{ fav: player.current && lib.isFavorite(player.current.id) }"
        aria-label="Favorito"
        @click="toggleFav()"
      >
        <Heart
          :size="18"
          :fill="player.current && lib.isFavorite(player.current.id) ? 'currentColor' : 'none'"
        />
      </button>
    </div>

    <!-- Centro: controles + progreso -->
    <div class="center">
      <div class="ctrls">
        <button class="ic" aria-label="Anterior" @click="player.prev()">
          <SkipBack :size="20" fill="currentColor" />
        </button>
        <button
          class="play"
          :aria-label="player.isPlaying ? 'Pausar' : 'Reproducir'"
          @click="player.toggle()"
        >
          <component :is="player.isPlaying ? Pause : Play" :size="20" fill="currentColor" />
        </button>
        <button class="ic" aria-label="Siguiente" @click="player.next()">
          <SkipForward :size="20" fill="currentColor" />
        </button>
      </div>
      <div class="seek">
        <span>{{ mmss(player.position) }}</span>
        <input
          class="range"
          type="range"
          min="0"
          :max="player.duration || 1"
          :value="player.position"
          aria-label="Posición"
          @input="onSeek"
        />
        <span>{{ mmss(player.duration) }}</span>
      </div>
    </div>

    <!-- Derecha: cola, volumen, expandir -->
    <div class="right">
      <button class="ic" aria-label="Cola" @click="player.openFull()"><ListMusic :size="18" /></button>
      <Volume2 :size="18" class="vol-ic" />
      <input
        class="vol"
        type="range"
        min="0"
        max="100"
        :value="player.volume"
        aria-label="Volumen"
        @input="onVolume"
      />
      <button class="ic" aria-label="Expandir" @click="player.openFull()"><Maximize2 :size="18" /></button>
    </div>
  </footer>
</template>

<style scoped>
.bar {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(360px, 2fr) minmax(180px, 1fr);
  align-items: center;
  gap: var(--space-4);
  height: 84px;
  padding: 0 var(--space-6);
  background: var(--surface);
  border-top: 1px solid var(--border);
}
.now {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}
.art {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  flex-shrink: 0;
}
.meta {
  min-width: 0;
}
.t {
  font-size: 14px;
  font-weight: 600;
}
.a {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}
.ctrls {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}
.seek {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  font-size: 11px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}
.range {
  flex: 1;
  accent-color: var(--accent);
}
.right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
}
.vol {
  width: 96px;
  accent-color: var(--accent);
}
.vol-ic {
  color: var(--text-muted);
  flex-shrink: 0;
}
.ic {
  background: none;
  border: 0;
  color: var(--text-muted);
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
}
.ic:hover {
  color: var(--text);
}
.ic.fav {
  color: var(--accent);
}
.play {
  background: var(--text);
  color: var(--bg);
  border: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: grid;
  place-items: center;
}
.play:hover {
  transform: scale(1.06);
}
</style>

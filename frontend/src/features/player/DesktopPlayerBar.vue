<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  Volume2,
  Volume1,
  VolumeX,
  ListMusic,
  Maximize2,
  Shuffle,
  Repeat,
  Repeat1,
  ListPlus,
} from 'lucide-vue-next'
import { usePlayerStore } from './player.store'
import { useLibraryStore } from '@/features/library/library.store'
import { useRoomStore } from '@/features/rooms/room.store'
import { useUiStore } from '@/shared/lib/ui.store'
import { mmss } from '@/shared/lib/format'
import MarqueeText from '@/shared/ui/MarqueeText.vue'

const player = usePlayerStore()
const lib = useLibraryStore()
const room = useRoomStore()
const ui = useUiStore()

const pct = computed(() => `${player.progress * 100}%`)
const isFav = computed(() => !!player.current && lib.isFavorite(player.current.id))
const volIcon = computed(() => (player.volume === 0 ? VolumeX : player.volume < 50 ? Volume1 : Volume2))
let lastVol = player.volume || 80

function onSeek(e: Event): void {
  player.seek(Number((e.target as HTMLInputElement).value))
}
function onVolume(e: Event): void {
  player.setVolume(Number((e.target as HTMLInputElement).value))
}
function toggleMute(): void {
  if (player.volume > 0) {
    lastVol = player.volume
    player.setVolume(0)
  } else {
    player.setVolume(lastVol || 80)
  }
}
function toggleFav(): void {
  if (player.current) lib.toggleFavorite(player.current)
}
</script>

<template>
  <footer class="bar">
    <!-- Izquierda: ahora suena -->
    <div class="now">
      <button class="art-btn" aria-label="Abrir reproductor" @click="player.openFull()">
        <img class="art" :src="player.current?.thumbnail" :alt="player.current?.title" />
      </button>
      <div class="meta">
        <MarqueeText class="t" :text="player.current?.title ?? ''" />
        <p class="a">{{ player.current?.artist }}</p>
      </div>
      <button class="icon-btn muted sm" :class="{ on: isFav }" :aria-label="isFav ? 'Quitar de favoritos' : 'Añadir a favoritos'" @click="toggleFav()">
        <Heart :size="17" :fill="isFav ? 'currentColor' : 'none'" />
      </button>
      <button
        v-if="player.current"
        class="icon-btn muted sm"
        aria-label="Añadir a playlist"
        @click="ui.openAddToPlaylist(player.current)"
      >
        <ListPlus :size="17" />
      </button>
    </div>

    <!-- Centro: controles + progreso -->
    <div class="center">
      <div class="ctrls">
        <button
          class="icon-btn muted sm"
          :class="{ on: player.shuffle }"
          :disabled="player.isRemote"
          :aria-label="player.shuffle ? 'Desactivar aleatorio' : 'Activar aleatorio'"
          @click="player.toggleShuffle()"
        >
          <Shuffle :size="17" />
        </button>
        <button class="icon-btn muted" aria-label="Anterior" @click="player.prev()">
          <SkipBack :size="20" fill="currentColor" />
        </button>
        <button
          class="play"
          :aria-label="player.isPlaying ? 'Pausar' : 'Reproducir'"
          @click="player.toggle()"
        >
          <component :is="player.isPlaying ? Pause : Play" :size="18" fill="currentColor" />
        </button>
        <button class="icon-btn muted" aria-label="Siguiente" @click="player.next()">
          <SkipForward :size="20" fill="currentColor" />
        </button>
        <button
          class="icon-btn muted sm"
          :class="{ on: player.repeat !== 'off' }"
          :disabled="player.isRemote"
          :aria-label="`Repetir: ${player.repeat === 'off' ? 'no' : player.repeat === 'all' ? 'todo' : 'una'}`"
          @click="player.cycleRepeat()"
        >
          <component :is="player.repeat === 'one' ? Repeat1 : Repeat" :size="17" />
        </button>
      </div>
      <div class="seek">
        <span>{{ mmss(player.position) }}</span>
        <input
          class="slider"
          type="range"
          min="0"
          :max="player.duration || 1"
          step="0.5"
          :value="player.position"
          :style="{ '--p': pct }"
          aria-label="Posición"
          @input="onSeek"
        />
        <span>{{ mmss(player.duration) }}</span>
      </div>
    </div>

    <!-- Derecha: sala, cola, volumen, expandir -->
    <div class="right">
      <RouterLink v-if="room.active && room.roomId" :to="`/room/${room.roomId}`" class="room-pill">
        <span class="live-dot green" /> {{ room.roomName || 'Sala' }}
      </RouterLink>
      <button class="icon-btn muted sm" aria-label="A continuación" title="A continuación" @click="player.openFull()">
        <ListMusic :size="17" />
      </button>
      <button class="icon-btn muted sm" :aria-label="player.volume ? 'Silenciar' : 'Activar sonido'" @click="toggleMute">
        <component :is="volIcon" :size="17" />
      </button>
      <input
        class="slider vol"
        type="range"
        min="0"
        max="100"
        :value="player.volume"
        :style="{ '--p': player.volume + '%' }"
        aria-label="Volumen"
        @input="onVolume"
      />
      <button class="icon-btn muted sm" aria-label="Pantalla completa" title="Pantalla completa" @click="player.openFull()">
        <Maximize2 :size="16" />
      </button>
    </div>
  </footer>
</template>

<style scoped>
.bar {
  display: grid;
  grid-template-columns: minmax(200px, 1fr) minmax(380px, 1.6fr) minmax(200px, 1fr);
  align-items: center;
  gap: var(--space-4);
  height: 80px;
  padding: 0 var(--space-4);
  background: var(--bg);
}
.now {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}
.art-btn {
  padding: 0;
  border: 0;
  background: none;
  border-radius: var(--radius-xs);
  flex-shrink: 0;
}
.art {
  display: block;
  width: 56px;
  height: 56px;
  border-radius: var(--radius-xs);
  object-fit: cover;
  box-shadow: var(--shadow-1);
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
.sm {
  width: 32px;
  height: 32px;
}
.center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  max-width: 720px;
  width: 100%;
  justify-self: center;
}
.ctrls {
  display: flex;
  align-items: center;
  gap: var(--space-3);
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
.seek span {
  min-width: 36px;
  text-align: center;
}
.right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
  min-width: 0;
}
.room-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  max-width: 160px;
  height: 30px;
  padding: 0 12px;
  margin-right: var(--space-2);
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.vol {
  width: 100px;
}
.play {
  background: var(--text);
  color: var(--bg);
  border: 0;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  transition: transform 0.15s;
}
.play:hover {
  transform: scale(1.07);
}
.play:active {
  transform: scale(0.94);
}
</style>

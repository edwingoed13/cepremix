<script setup lang="ts">
import { Play, Pause, SkipForward } from 'lucide-vue-next'
import { usePlayerStore } from './player.store'
import { useRoomStore } from '@/features/rooms/room.store'
import MarqueeText from '@/shared/ui/MarqueeText.vue'

const player = usePlayerStore()
const room = useRoomStore()
</script>

<template>
  <div
    class="mini"
    role="button"
    tabindex="0"
    aria-label="Abrir reproductor"
    @click="player.openFull()"
    @keydown.enter="player.openFull()"
  >
    <img class="art" :src="player.current?.thumbnail" :alt="player.current?.title" />
    <div class="meta">
      <MarqueeText class="title" :text="player.current?.title ?? ''" />
      <p v-if="room.active" class="artist room">
        <span class="live-dot green" /> {{ room.roomName || 'Sala' }}
      </p>
      <p v-else class="artist">{{ player.current?.artist }}</p>
    </div>

    <button
      class="ctrl"
      :aria-label="player.isPlaying ? 'Pausar' : 'Reproducir'"
      @click.stop="player.toggle()"
    >
      <component :is="player.isPlaying ? Pause : Play" :size="24" fill="currentColor" />
    </button>
    <button class="ctrl" aria-label="Siguiente" @click.stop="player.next()">
      <SkipForward :size="22" fill="currentColor" />
    </button>

    <div class="bar"><div class="bar-fill" :style="{ width: player.progress * 100 + '%' }" /></div>
  </div>
</template>

<style scoped>
.mini {
  position: fixed;
  left: var(--space-2);
  right: var(--space-2);
  bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom) + 2px);
  z-index: 45;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  height: var(--mini-h);
  padding: 0 var(--space-2) 0 var(--space-2);
  /* Cápsula de vidrio teñida con el color de la carátula */
  background: color-mix(in srgb, var(--ambient) 32%, var(--glass));
  backdrop-filter: blur(24px) saturate(1.6);
  -webkit-backdrop-filter: blur(24px) saturate(1.6);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-2);
  overflow: hidden;
  transition: background 0.8s ease;
}
.mini:active {
  transform: scale(0.99);
}
.art {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-xs);
  object-fit: cover;
  flex-shrink: 0;
  box-shadow: var(--shadow-1);
}
.meta {
  flex: 1;
  min-width: 0;
}
.title {
  font-size: 14px;
  font-weight: 700;
}
.artist {
  margin: 1px 0 0;
  font-size: 12px;
  color: color-mix(in srgb, var(--text) 70%, transparent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.artist.room {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--accent);
  font-weight: 700;
}
.ctrl {
  flex-shrink: 0;
  background: none;
  border: 0;
  color: var(--text);
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 50%;
}
.ctrl:active {
  transform: scale(0.88);
}
.bar {
  position: absolute;
  left: var(--space-2);
  right: var(--space-2);
  bottom: 0;
  height: 2px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--text) 18%, transparent);
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  background: var(--text);
  transition: width 0.25s linear;
}
</style>

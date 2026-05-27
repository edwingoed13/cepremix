<script setup lang="ts">
import { Play, Pause, SkipForward } from 'lucide-vue-next'
import { usePlayerStore } from './player.store'
import MarqueeText from '@/shared/ui/MarqueeText.vue'

const player = usePlayerStore()
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
    <div class="bar"><div class="bar-fill" :style="{ width: player.progress * 100 + '%' }" /></div>

    <img class="art" :src="player.current?.thumbnail" :alt="player.current?.title" />
    <div class="meta">
      <MarqueeText class="title" :text="player.current?.title ?? ''" />
      <p class="artist">{{ player.current?.artist }}</p>
    </div>

    <button
      class="ctrl"
      :aria-label="player.isPlaying ? 'Pausar' : 'Reproducir'"
      @click.stop="player.toggle()"
    >
      <component :is="player.isPlaying ? Pause : Play" :size="22" fill="currentColor" />
    </button>
    <button class="ctrl" aria-label="Siguiente" @click.stop="player.next()">
      <SkipForward :size="22" fill="currentColor" />
    </button>
  </div>
</template>

<style scoped>
.mini {
  position: fixed;
  left: var(--space-2);
  right: var(--space-2);
  bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom) + var(--space-1));
  z-index: 45;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  height: var(--mini-h);
  padding: var(--space-2) var(--space-3);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}
.bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--border);
}
.bar-fill {
  height: 100%;
  background: var(--accent);
  transition: width 0.25s linear;
}
.art {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  flex-shrink: 0;
}
.meta {
  flex: 1;
  min-width: 0;
}
.artist {
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.title {
  font-size: 14px;
  font-weight: 600;
}
.artist {
  font-size: 12px;
  color: var(--text-muted);
}
.ctrl {
  flex-shrink: 0;
  background: none;
  border: 0;
  color: var(--text);
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
}
.ctrl:active {
  transform: scale(0.9);
}
</style>

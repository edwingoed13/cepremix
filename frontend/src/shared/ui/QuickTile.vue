<script setup lang="ts">
import { computed } from 'vue'
import { Play, Pause } from 'lucide-vue-next'
import type { Track } from '@/entities/track'
import { usePlayerStore } from '@/features/player/player.store'
import EqBars from './EqBars.vue'

/** Acceso rápido compacto (cuadrícula de la home de Spotify). */
const props = defineProps<{ track: Track }>()
const emit = defineEmits<{ play: [] }>()

const player = usePlayerStore()
const isCurrent = computed(() => player.current?.id === props.track.id)

function onClick(): void {
  if (isCurrent.value) player.toggle()
  else emit('play')
}
</script>

<template>
  <button class="tile" :class="{ current: isCurrent }" @click="onClick">
    <img class="art" :src="track.thumbnail" alt="" loading="lazy" />
    <span class="title">{{ track.title }}</span>
    <EqBars v-if="isCurrent" class="eq" :playing="player.isPlaying" />
    <span class="play-fab fab" aria-hidden="true">
      <component :is="isCurrent && player.isPlaying ? Pause : Play" :size="16" fill="currentColor" />
    </span>
  </button>
</template>

<style scoped>
.tile {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  height: 56px;
  min-width: 0;
  padding: 0 var(--space-2) 0 0;
  border: 0;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: color-mix(in srgb, var(--text) 9%, transparent);
  color: var(--text);
  text-align: left;
  transition: background 0.15s;
}
.tile:hover {
  background: color-mix(in srgb, var(--text) 16%, transparent);
}
.tile:active {
  transform: scale(0.98);
}
.art {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  object-fit: cover;
  box-shadow: 4px 0 12px rgba(0, 0, 0, 0.3);
}
.title {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.25;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.current .title {
  color: var(--accent);
}
.eq {
  flex-shrink: 0;
}
.fab {
  display: none;
  width: 34px;
  height: 34px;
  box-shadow: var(--shadow-1);
}
@media (hover: hover) {
  .tile:hover .fab {
    display: grid;
  }
  .tile:hover .eq {
    display: none;
  }
}
@media (min-width: 1024px) {
  .tile {
    height: 64px;
  }
  .art {
    width: 64px;
    height: 64px;
  }
  .title {
    font-size: 14px;
  }
}
</style>

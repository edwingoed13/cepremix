<script setup lang="ts">
import { computed } from 'vue'
import { Play, Pause } from 'lucide-vue-next'
import type { Track } from '@/entities/track'
import { usePlayerStore } from '@/features/player/player.store'
import EqBars from './EqBars.vue'
import { isLetterboxed } from '@/shared/lib/youtube'

const props = defineProps<{ track: Track; subtitle?: string }>()
const emit = defineEmits<{ play: [] }>()

const player = usePlayerStore()
const isCurrent = computed(() => player.current?.id === props.track.id)

function onFab(): void {
  if (isCurrent.value) player.toggle()
  else emit('play')
}
</script>

<template>
  <div class="card" :class="{ current: isCurrent }">
    <button class="hit" :aria-label="`Reproducir ${track.title}`" @click="isCurrent ? player.openFull() : emit('play')">
      <span class="art-wrap">
        <img class="art" :class="{ lb: isLetterboxed(track.thumbnail) }" :src="track.thumbnail" alt="" loading="lazy" />
        <span v-if="isCurrent" class="now"><EqBars :playing="player.isPlaying" :size="16" /></span>
      </span>
      <span class="title">{{ track.title }}</span>
      <span class="artist">{{ subtitle ?? track.artist }}</span>
    </button>
    <button
      class="play-fab fab"
      :aria-label="isCurrent && player.isPlaying ? 'Pausar' : 'Reproducir'"
      tabindex="-1"
      @click.stop="onFab"
    >
      <component :is="isCurrent && player.isPlaying ? Pause : Play" :size="20" fill="currentColor" />
    </button>
  </div>
</template>

<style scoped>
.card {
  --w: 148px;
  position: relative;
  flex: 0 0 auto;
  width: calc(var(--w) + 16px);
  padding: 8px;
  margin: -8px 0;
  border-radius: var(--radius);
  transition: background 0.2s;
}
.hit {
  display: block;
  width: 100%;
  background: none;
  border: 0;
  padding: 0;
  text-align: left;
  color: inherit;
}
.hit:active {
  transform: scale(0.98);
}
.art-wrap {
  position: relative;
  display: block;
  width: var(--w);
  aspect-ratio: 1;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--surface-2);
  box-shadow: var(--shadow-1);
}
.art {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s var(--ease-out);
}
.now {
  position: absolute;
  left: 8px;
  bottom: 8px;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
}
.title,
.artist {
  display: block;
  margin-top: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.title {
  font-size: 14px;
  font-weight: 600;
}
.current .title {
  color: var(--accent);
}
.artist {
  margin-top: 2px;
  font-size: 13px;
  color: var(--text-muted);
}
/* Botón play flotante: aparece al pasar el cursor (Spotify) */
.fab {
  position: absolute;
  top: calc(8px + var(--w) - 56px);
  right: 16px;
  width: 44px;
  height: 44px;
  opacity: 0;
  transform: translateY(8px);
  transition:
    opacity 0.2s,
    transform 0.25s var(--ease-out),
    background 0.15s;
}
@media (hover: hover) {
  .card:hover {
    background: var(--surface);
  }
  .card:hover .art {
    transform: scale(1.04);
  }
  .card:hover .fab,
  .card.current .fab {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (hover: none) {
  .fab {
    display: none;
  }
}
@media (min-width: 1024px) {
  .card {
    --w: 172px;
  }
}
</style>

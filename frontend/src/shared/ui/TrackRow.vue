<script setup lang="ts">
import type { Track } from '@/entities/track'
import { MoreHorizontal } from 'lucide-vue-next'
import { mmss } from '@/shared/lib/format'

defineProps<{ track: Track; showMore?: boolean }>()
const emit = defineEmits<{ select: []; more: [] }>()
</script>

<template>
  <div
    class="row"
    role="button"
    tabindex="0"
    @click="emit('select')"
    @keydown.enter="emit('select')"
  >
    <img class="art" :src="track.thumbnail" :alt="track.title" loading="lazy" />
    <div class="meta">
      <p class="title">{{ track.title }}</p>
      <p class="artist">{{ track.artist }}</p>
    </div>
    <button v-if="showMore" class="more" aria-label="Más opciones" @click.stop="emit('more')">
      <MoreHorizontal :size="18" />
    </button>
    <span v-else class="dur">{{ mmss(track.durationSec) }}</span>
  </div>
</template>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-2);
  border-radius: var(--radius);
  color: inherit;
  text-align: left;
}
.row:active {
  background: var(--surface-2);
}
/* Desktop (con cursor): resalta la fila y muestra el ⋯ solo al pasar por encima */
@media (hover: hover) {
  .row:hover {
    background: var(--surface-2);
  }
  .row .more {
    opacity: 0;
    transition: opacity 0.15s ease;
  }
  .row:hover .more {
    opacity: 1;
  }
}
.art {
  width: 48px;
  height: 48px;
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
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  /* Títulos largos: hasta 2 líneas en vez de cortarse en una */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.artist {
  font-size: 13px;
  color: var(--text-muted);
}
.dur {
  font-size: 13px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}
.more {
  flex-shrink: 0;
  background: none;
  border: 0;
  color: var(--text-muted);
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
}
.more:active {
  background: var(--surface);
}
</style>

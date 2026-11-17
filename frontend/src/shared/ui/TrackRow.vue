<script setup lang="ts">
import { computed } from 'vue'
import type { Track } from '@/entities/track'
import { MoreHorizontal, Play } from 'lucide-vue-next'
import { mmss } from '@/shared/lib/format'
import { usePlayerStore } from '@/features/player/player.store'
import EqBars from './EqBars.vue'
import { isLetterboxed } from '@/shared/lib/youtube'

const props = defineProps<{
  track: Track
  showMore?: boolean
  /** Número de pista (listas tipo playlist). Al pasar el cursor se convierte en ▶. */
  index?: number
  moreLabel?: string
  /** Fuerza el resaltado de "sonando" (p. ej. la canción actual de una sala). */
  active?: boolean
  dense?: boolean
}>()
const emit = defineEmits<{ select: []; more: [] }>()

const player = usePlayerStore()
// Ojo: las props booleanas ausentes valen false (no undefined), por eso OR y no ??
const isCurrent = computed(() => props.active || player.current?.id === props.track.id)
</script>

<template>
  <div
    class="row"
    :class="{ current: isCurrent, dense, numbered: index !== undefined }"
    role="button"
    tabindex="0"
    @click="emit('select')"
    @keydown.enter="emit('select')"
  >
    <span v-if="index !== undefined" class="num">
      <EqBars v-if="isCurrent" :playing="player.isPlaying" />
      <template v-else>
        <span class="n">{{ index + 1 }}</span>
        <Play class="p" :size="14" fill="currentColor" />
      </template>
    </span>
    <span class="art-wrap">
      <img class="art" :class="{ lb: isLetterboxed(track.thumbnail) }" :src="track.thumbnail" alt="" loading="lazy" />
      <span v-if="isCurrent && index === undefined" class="eq-ov"><EqBars :playing="player.isPlaying" /></span>
    </span>
    <div class="meta">
      <p class="title">{{ track.title }}</p>
      <p class="artist">{{ track.artist }}</p>
    </div>
    <span v-if="track.durationSec" class="dur" :class="{ always: !showMore }">{{ mmss(track.durationSec) }}</span>
    <button
      v-if="showMore"
      class="more"
      :aria-label="moreLabel ?? 'Más opciones'"
      :title="moreLabel ?? 'Más opciones'"
      @click.stop="emit('more')"
    >
      <MoreHorizontal :size="18" />
    </button>
  </div>
</template>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: 6px var(--space-2);
  border-radius: var(--radius-sm);
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s;
}
.row:active {
  background: var(--surface-2);
}
.num {
  flex-shrink: 0;
  width: 22px;
  display: grid;
  place-items: center;
  font-size: 14px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}
.num .p {
  display: none;
  color: var(--text);
}
.art-wrap {
  position: relative;
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: var(--radius-xs);
  overflow: hidden;
}
.dense .art-wrap {
  width: 44px;
  height: 44px;
}
.art {
  width: 100%;
  height: 100%;
  border-radius: var(--radius-xs);
  object-fit: cover;
  background: var(--surface-2);
}
.eq-ov {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: var(--radius-xs);
  background: rgba(0, 0, 0, 0.55);
}
.meta {
  flex: 1;
  min-width: 0;
}
.title {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.3;
  /* Títulos largos: hasta 2 líneas en vez de cortarse en una */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.dense .title {
  font-size: 14px;
  -webkit-line-clamp: 1;
  line-clamp: 1;
}
.current .title {
  color: var(--accent);
}
.artist {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dur {
  display: none;
  flex-shrink: 0;
  font-size: 13px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}
.dur.always {
  display: block;
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
.more:hover {
  color: var(--text);
  background: var(--surface-3);
}
/* Desktop (con cursor): resalta la fila; el número se vuelve ▶ y aparece el ⋯ */
@media (hover: hover) {
  .row:hover {
    background: color-mix(in srgb, var(--text) 7%, transparent);
  }
  .row:hover .num .n {
    display: none;
  }
  .row:hover .num .p {
    display: block;
  }
  .row .more {
    opacity: 0;
    transition: opacity 0.15s ease;
  }
  .row:hover .more,
  .row:focus-within .more {
    opacity: 1;
  }
}
@media (min-width: 1024px) {
  .dur {
    display: block;
    min-width: 40px;
    text-align: right;
  }
}
</style>

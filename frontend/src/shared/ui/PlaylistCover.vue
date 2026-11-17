<script setup lang="ts">
import { computed } from 'vue'
import { Music2, Heart } from 'lucide-vue-next'
import type { Track } from '@/entities/track'

/** Portada de playlist: mosaico 2×2 con las primeras carátulas (Spotify/Apple). */
const props = defineProps<{ tracks?: Track[]; size?: number; liked?: boolean }>()

const thumbs = computed(() => {
  const unique = [...new Map((props.tracks ?? []).map((t) => [t.thumbnail, t])).values()]
  return unique.slice(0, 4).map((t) => t.thumbnail)
})
</script>

<template>
  <span class="cover" :class="{ liked }" :style="{ '--s': (size ?? 48) + 'px' }">
    <template v-if="liked">
      <Heart :size="Math.round((size ?? 48) * 0.42)" fill="currentColor" />
    </template>
    <template v-else-if="thumbs.length >= 4">
      <img v-for="(src, i) in thumbs" :key="i" :src="src" alt="" loading="lazy" class="q" />
    </template>
    <img v-else-if="thumbs.length" :src="thumbs[0]" alt="" loading="lazy" class="one" />
    <Music2 v-else :size="Math.round((size ?? 48) * 0.4)" />
  </span>
</template>

<style scoped>
.cover {
  flex-shrink: 0;
  width: var(--s);
  height: var(--s);
  display: grid;
  grid-template-columns: 1fr 1fr;
  place-items: center;
  border-radius: var(--radius-xs);
  overflow: hidden;
  background: var(--surface-3);
  color: var(--text-muted);
}
.cover > :only-child {
  grid-column: 1 / -1;
}
.q {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.one {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.liked {
  background: linear-gradient(135deg, #1f8f5f, #3dd68c 55%, #b8f5d6);
  color: #fff;
}
</style>

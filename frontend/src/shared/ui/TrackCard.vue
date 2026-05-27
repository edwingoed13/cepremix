<script setup lang="ts">
import type { Track } from '@/entities/track'

defineProps<{ track: Track }>()
</script>

<template>
  <button class="card">
    <img class="art" :src="track.thumbnail" :alt="track.title" loading="lazy" />
    <p class="title">{{ track.title }}</p>
    <p class="artist">{{ track.artist }}</p>
  </button>
</template>

<style scoped>
.card {
  flex: 0 0 auto;
  width: 144px;
  background: none;
  border: 0;
  padding: 0;
  text-align: left;
  color: inherit;
}
.card:active {
  transform: scale(0.97);
}
.art {
  width: 144px;
  height: 144px;
  object-fit: cover;
  border-radius: var(--radius);
  background: var(--surface-2);
  transition: transform 0.15s ease, filter 0.15s ease;
}
@media (hover: hover) {
  .card:hover .art {
    transform: translateY(-3px);
    filter: brightness(1.08);
  }
}
.title,
.artist {
  margin: 6px 0 0;
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
</style>

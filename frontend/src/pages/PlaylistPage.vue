<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft, Play, ListMusic } from 'lucide-vue-next'
import TrackRow from '@/shared/ui/TrackRow.vue'
import EmptyState from '@/shared/ui/EmptyState.vue'
import { useLibraryStore } from '@/features/library/library.store'
import { usePlayerStore } from '@/features/player/player.store'
import { useUiStore } from '@/shared/lib/ui.store'

const route = useRoute()
const router = useRouter()
const lib = useLibraryStore()
const player = usePlayerStore()
const ui = useUiStore()

const playlist = computed(() => lib.getPlaylist(String(route.params.id)))

function playAll(i = 0): void {
  const pl = playlist.value
  if (pl && pl.tracks.length) player.playQueue(pl.tracks, i)
}
function removeTrack(trackId: string): void {
  const pl = playlist.value
  if (pl) {
    lib.removeTrackFromPlaylist(pl.id, trackId)
    ui.toast('Quitada de la playlist')
  }
}
</script>

<template>
  <div class="page">
    <header class="topbar">
      <button class="icon" aria-label="Volver" @click="router.push('/library')">
        <ChevronLeft :size="24" />
      </button>
      <h1 class="title">{{ playlist?.name ?? 'Playlist' }}</h1>
    </header>

    <template v-if="playlist && playlist.tracks.length">
      <button class="playall" @click="playAll(0)"><Play :size="20" fill="currentColor" /> Reproducir</button>
      <ul class="list">
        <li v-for="(t, i) in playlist.tracks" :key="t.id">
          <TrackRow :track="t" show-more @select="playAll(i)" @more="removeTrack(t.id)" />
        </li>
      </ul>
    </template>

    <EmptyState
      v-else
      :icon="ListMusic"
      title="Playlist vacía"
      hint="Añade canciones con el menú ⋯ de cualquier canción"
    />
  </div>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.icon {
  background: none;
  border: 0;
  color: var(--text);
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
}
.playall {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  margin: var(--space-4) 0;
  padding: 10px 22px;
  background: var(--accent);
  color: #fff;
  border: 0;
  border-radius: 999px;
  font-weight: 600;
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
}
</style>

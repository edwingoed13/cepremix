<script setup lang="ts">
import { ref, computed } from 'vue'
import { refDebounced } from '@vueuse/core'
import { useQuery } from '@tanstack/vue-query'
import { Search, ListMusic, ServerCrash } from 'lucide-vue-next'
import TrackRow from '@/shared/ui/TrackRow.vue'
import EmptyState from '@/shared/ui/EmptyState.vue'
import { searchTracks } from '@/features/search/search.api'
import { usePlayerStore } from '@/features/player/player.store'
import { useRoomStore } from '@/features/rooms/room.store'
import { useUiStore } from '@/shared/lib/ui.store'

const player = usePlayerStore()
const room = useRoomStore()
const ui = useUiStore()
const q = ref('')
const debounced = refDebounced(q, 350)
const hasQuery = computed(() => debounced.value.trim().length > 0)

const { data: results, isFetching, isError } = useQuery({
  queryKey: ['search', debounced],
  queryFn: () => searchTracks(debounced.value),
  enabled: hasQuery,
  staleTime: 60_000,
})

function pick(i: number): void {
  const list = results.value ?? []
  if (!list.length) return
  if (room.connected) room.enqueue(list[i])
  else player.playQueue(list, i)
}
</script>

<template>
  <div class="page">
    <header class="head"><h1>Buscar</h1></header>

    <label class="searchbox">
      <Search :size="18" />
      <input v-model="q" type="search" placeholder="Canciones, artistas…" aria-label="Buscar" />
    </label>

    <p v-if="room.connected" class="ctx">
      Añadiendo a la sala <strong>{{ room.roomName || room.roomId }}</strong>
    </p>

    <template v-if="hasQuery">
      <div v-if="isFetching && !(results && results.length)" class="list" aria-hidden="true">
        <div v-for="n in 6" :key="n" class="skeleton" />
      </div>
      <EmptyState
        v-else-if="isError"
        :icon="ServerCrash"
        title="No se pudo buscar"
        hint="¿Está corriendo el backend en :8000?"
      />
      <ul v-else-if="results && results.length" class="list">
        <li v-for="(t, i) in results" :key="t.id">
          <TrackRow :track="t" show-more @select="pick(i)" @more="ui.openAddToPlaylist(t)" />
        </li>
      </ul>
      <EmptyState v-else :icon="Search" title="Sin resultados" hint="Prueba con otro término" />
    </template>
    <EmptyState
      v-else
      :icon="ListMusic"
      title="Busca tu música"
      hint="Escribe el nombre de una canción o artista"
    />
  </div>
</template>

<style scoped>
.searchbox {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-4);
  padding: 0 var(--space-3);
  height: 46px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-muted);
}
.searchbox input {
  flex: 1;
  background: none;
  border: 0;
  outline: none;
  color: var(--text);
  font-size: 15px;
}
.ctx {
  margin: var(--space-3) 0 0;
  font-size: 13px;
  color: var(--accent);
}
.list {
  list-style: none;
  margin: var(--space-4) 0 0;
  padding: 0;
}
.skeleton {
  height: 64px;
  border-radius: var(--radius);
  background: var(--surface-2);
  margin-bottom: var(--space-2);
  animation: pulse 1.2s ease-in-out infinite;
}
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}
</style>

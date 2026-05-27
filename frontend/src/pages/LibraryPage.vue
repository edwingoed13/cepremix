<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Heart, ListMusic, Clock, Plus, ChevronRight } from 'lucide-vue-next'
import type { Track } from '@/entities/track'
import TrackRow from '@/shared/ui/TrackRow.vue'
import EmptyState from '@/shared/ui/EmptyState.vue'
import { useLibraryStore } from '@/features/library/library.store'
import { usePlayerStore } from '@/features/player/player.store'
import { useUiStore } from '@/shared/lib/ui.store'

const tabs = ['Playlists', 'Favoritos', 'Historial'] as const
type Tab = (typeof tabs)[number]
const active = ref<Tab>('Playlists')

const lib = useLibraryStore()
const player = usePlayerStore()
const ui = useUiStore()
const router = useRouter()

function play(list: Track[], i: number): void {
  player.playQueue(list, i)
}
async function newPlaylist(): Promise<void> {
  const name = await ui.promptText('Nombre de la playlist', 'Mi playlist')
  if (name) {
    lib.createPlaylist(name)
    ui.toast('Playlist creada')
  }
}
</script>

<template>
  <div class="page">
    <header class="head"><h1>Biblioteca</h1></header>

    <div class="tabs">
      <button
        v-for="t in tabs"
        :key="t"
        class="tab"
        :class="{ on: active === t }"
        @click="active = t"
      >
        {{ t }}
      </button>
    </div>

    <!-- Playlists -->
    <template v-if="active === 'Playlists'">
      <button class="new-pl" @click="newPlaylist()"><Plus :size="18" /> Nueva playlist</button>
      <ul v-if="lib.playlists.length" class="list">
        <li
          v-for="p in lib.playlists"
          :key="p.id"
          class="pl-row"
          @click="router.push({ name: 'playlist', params: { id: p.id } })"
        >
          <div class="pl-ico"><ListMusic :size="20" /></div>
          <div class="pl-meta">
            <p class="pl-name">{{ p.name }}</p>
            <p class="pl-sub">{{ p.tracks.length }} canciones</p>
          </div>
          <ChevronRight :size="18" />
        </li>
      </ul>
      <EmptyState
        v-else
        :icon="ListMusic"
        title="Aún no tienes playlists"
        hint="Crea una con el botón de arriba"
      />
    </template>

    <!-- Favoritos -->
    <template v-else-if="active === 'Favoritos'">
      <ul v-if="lib.favorites.length" class="list">
        <li v-for="(t, i) in lib.favorites" :key="t.id">
          <TrackRow :track="t" show-more @select="play(lib.favorites, i)" @more="ui.openAddToPlaylist(t)" />
        </li>
      </ul>
      <EmptyState
        v-else
        :icon="Heart"
        title="Sin favoritos todavía"
        hint="Toca el corazón en el reproductor"
      />
    </template>

    <!-- Historial -->
    <template v-else>
      <ul v-if="lib.history.length" class="list">
        <li v-for="(t, i) in lib.history" :key="t.id">
          <TrackRow :track="t" show-more @select="play(lib.history, i)" @more="ui.openAddToPlaylist(t)" />
        </li>
      </ul>
      <EmptyState
        v-else
        :icon="Clock"
        title="Tu historial está vacío"
        hint="Lo que reproduzcas aparecerá aquí"
      />
    </template>
  </div>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: var(--space-2);
  margin: var(--space-4) 0;
}
.tab {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-muted);
}
.tab.on {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.new-pl {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-3);
  margin-bottom: var(--space-2);
  background: var(--surface);
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  color: var(--accent);
  font-weight: 600;
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.pl-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2);
  border-radius: var(--radius);
  color: var(--text-muted);
}
.pl-row:active {
  background: var(--surface-2);
}
.pl-ico {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  display: grid;
  place-items: center;
  color: var(--accent);
}
.pl-meta {
  flex: 1;
  min-width: 0;
}
.pl-name {
  margin: 0;
  color: var(--text);
  font-weight: 600;
}
.pl-sub {
  margin: 0;
  font-size: 13px;
}
</style>

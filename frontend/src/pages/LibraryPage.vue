<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Heart, ListMusic, Clock, Plus, Play } from 'lucide-vue-next'
import type { Track } from '@/entities/track'
import TrackRow from '@/shared/ui/TrackRow.vue'
import EmptyState from '@/shared/ui/EmptyState.vue'
import PlaylistCover from '@/shared/ui/PlaylistCover.vue'
import { useLibraryStore } from '@/features/library/library.store'
import { usePlayerStore } from '@/features/player/player.store'
import { useUiStore } from '@/shared/lib/ui.store'

const tabs = ['Playlists', 'Favoritos', 'Historial'] as const
type Tab = (typeof tabs)[number]

const route = useRoute()
const router = useRouter()
const lib = useLibraryStore()
const player = usePlayerStore()
const ui = useUiStore()

const fromQuery = (): Tab => {
  const t = route.query.tab
  return tabs.includes(t as Tab) ? (t as Tab) : 'Playlists'
}
const active = ref<Tab>(fromQuery())
watch(
  () => route.query.tab,
  () => {
    if (route.name === 'library') active.value = fromQuery() // ignorar al salir de la página
  },
)
function select(t: Tab): void {
  active.value = t
  void router.replace({ query: t === 'Playlists' ? {} : { tab: t } })
}

function play(list: Track[], i: number): void {
  player.playQueue(list, i)
}
async function newPlaylist(): Promise<void> {
  const name = await ui.promptText('Nueva playlist', 'Mi playlist', { confirmLabel: 'Crear' })
  if (name) {
    lib.createPlaylist(name)
    ui.toast('Playlist creada')
  }
}
</script>

<template>
  <div class="page">
    <header class="head top">
      <h1>Tu biblioteca</h1>
      <button class="icon-btn" aria-label="Nueva playlist" title="Nueva playlist" @click="newPlaylist()">
        <Plus :size="24" />
      </button>
    </header>

    <div class="chips tabs" role="tablist">
      <button
        v-for="t in tabs"
        :key="t"
        class="chip"
        :class="{ on: active === t }"
        role="tab"
        :aria-selected="active === t"
        @click="select(t)"
      >
        {{ t }}
      </button>
    </div>

    <!-- Playlists -->
    <template v-if="active === 'Playlists'">
      <!-- "Tus favoritos" destacado (Canciones que te gustan, de Spotify) -->
      <div class="liked" role="button" tabindex="0" @click="select('Favoritos')" @keydown.enter="select('Favoritos')">
        <div class="liked-txt">
          <p class="liked-t">Tus favoritos</p>
          <p class="liked-s">{{ lib.favorites.length }} canciones</p>
        </div>
        <button
          v-if="lib.favorites.length"
          class="play-fab"
          aria-label="Reproducir favoritos"
          @click.stop="play(lib.favorites, 0)"
        >
          <Play :size="20" fill="currentColor" />
        </button>
      </div>

      <ul v-if="lib.playlists.length" class="pl-grid">
        <li
          v-for="p in lib.playlists"
          :key="p.id"
          class="pl"
          role="button"
          tabindex="0"
          @click="router.push({ name: 'playlist', params: { id: p.id } })"
          @keydown.enter="router.push({ name: 'playlist', params: { id: p.id } })"
        >
          <PlaylistCover :tracks="p.tracks" :size="64" class="pl-cover" />
          <div class="pl-meta">
            <p class="pl-name">{{ p.name }}</p>
            <p class="pl-sub">Playlist · {{ p.tracks.length }} canciones</p>
          </div>
        </li>
      </ul>
      <EmptyState
        v-else
        :icon="ListMusic"
        title="Crea tu primera playlist"
        hint="Toca + arriba, o el menú ⋯ de cualquier canción"
      />
    </template>

    <!-- Favoritos -->
    <template v-else-if="active === 'Favoritos'">
      <div v-if="lib.favorites.length" class="bar-actions">
        <button class="play-fab" aria-label="Reproducir favoritos" @click="play(lib.favorites, 0)">
          <Play :size="22" fill="currentColor" />
        </button>
        <span class="count">{{ lib.favorites.length }} canciones</span>
      </div>
      <ul v-if="lib.favorites.length" class="list">
        <li v-for="(t, i) in lib.favorites" :key="t.id">
          <TrackRow :track="t" :index="i" show-more @select="play(lib.favorites, i)" @more="ui.openAddToPlaylist(t)" />
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
.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.tabs {
  margin: var(--space-4) calc(-1 * var(--space-4)) var(--space-5);
}
.liked {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: 132px;
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, #14774d 0%, #3dd68c 60%, #b8f5d6 130%);
  color: #fff;
  cursor: pointer;
  box-shadow: var(--shadow-1);
  transition: transform 0.15s;
}
.liked:active {
  transform: scale(0.99);
}
.liked-t {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.liked-s {
  margin: 2px 0 0;
  font-size: 14px;
  opacity: 0.9;
}
.liked .play-fab {
  background: #fff;
  color: #0a0a0c;
}
.pl-grid {
  list-style: none;
  margin: var(--space-4) 0 0;
  padding: 0;
  display: grid;
  gap: 2px;
}
.pl {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.12s;
}
.pl:hover {
  background: var(--surface);
}
.pl-meta {
  flex: 1;
  min-width: 0;
}
.pl-name {
  margin: 0;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pl-sub {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--text-muted);
}
.bar-actions {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-3);
}
.count {
  font-size: 14px;
  color: var(--text-muted);
}

/* Desktop: playlists como tarjetas (Spotify / Apple Music) */
@media (min-width: 1024px) {
  .tabs {
    margin: var(--space-4) 0 var(--space-5);
  }
  .liked {
    min-height: 200px;
  }
  .liked-t {
    font-size: 36px;
  }
  .pl-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: var(--space-4);
    margin-top: var(--space-6);
  }
  .pl {
    flex-direction: column;
    align-items: stretch;
    padding: var(--space-3);
  }
  .pl-cover {
    width: 100% !important;
    height: auto !important;
    aspect-ratio: 1;
    border-radius: var(--radius-sm) !important;
    box-shadow: var(--shadow-1);
  }
}
</style>

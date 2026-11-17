<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { refDebounced, useLocalStorage } from '@vueuse/core'
import { useQuery } from '@tanstack/vue-query'
import { Search, ServerCrash, X, Play, Pause, Clock } from 'lucide-vue-next'
import type { Track } from '@/entities/track'
import TrackRow from '@/shared/ui/TrackRow.vue'
import EmptyState from '@/shared/ui/EmptyState.vue'
import { searchTracks } from '@/features/search/search.api'
import { GENRES, MOODS } from '@/features/search/browse'
import { usePlayerStore } from '@/features/player/player.store'
import { useRoomStore } from '@/features/rooms/room.store'
import { useUiStore } from '@/shared/lib/ui.store'

const route = useRoute()
const router = useRouter()
const player = usePlayerStore()
const room = useRoomStore()
const ui = useUiStore()

const q = ref(typeof route.query.q === 'string' ? route.query.q : '')
const debounced = refDebounced(q, 350)
const term = computed(() => debounced.value.trim())
const hasQuery = computed(() => term.value.length > 0)
const recent = useLocalStorage<string[]>('search:recent', [])

// La búsqueda vive en la URL (?q=): se puede compartir y "atrás" funciona
// (Ojo: solo mientras estemos en /search; durante la transición de salida esta
// página sigue viva y no debe tocar la URL ni el estado de la página siguiente.)
const onSearch = (): boolean => route.name === 'search'
watch(term, (t) => {
  if (onSearch()) void router.replace({ query: t ? { q: t } : {} })
})
// Chips/géneros de otras pantallas cambian ?q= mientras esta página está montada
watch(
  () => route.query.q,
  (v) => {
    if (!onSearch()) return
    const s = typeof v === 'string' ? v : ''
    if (s.trim() !== term.value) q.value = s
  },
)

const { data: results, isFetching, isError } = useQuery({
  queryKey: ['search', term],
  queryFn: () => searchTracks(term.value),
  enabled: hasQuery,
  staleTime: 60_000,
})

const top = computed<Track | null>(() => results.value?.[0] ?? null)
const songs = computed(() => results.value ?? [])
const topIsCurrent = computed(() => !!top.value && player.current?.id === top.value.id)

function remember(t: string): void {
  recent.value = [t, ...recent.value.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 8)
}

function pick(i: number): void {
  const list = songs.value
  const t = list[i]
  if (!t) return
  remember(term.value)
  if (room.connected) room.enqueue(t)
  else player.playQueue(list, i)
}

function playTop(): void {
  if (topIsCurrent.value) player.toggle()
  else pick(0)
}

function browse(query: string): void {
  q.value = query
}
</script>

<template>
  <div class="page">
    <header class="head"><h1>Buscar</h1></header>

    <div class="search-wrap">
      <label class="field searchbox">
        <Search :size="20" />
        <input
          v-model="q"
          type="search"
          placeholder="¿Qué quieres escuchar?"
          aria-label="Buscar"
          enterkeyhint="search"
        />
        <button v-if="q" class="clear" aria-label="Borrar búsqueda" @click="q = ''"><X :size="18" /></button>
      </label>
    </div>

    <p v-if="room.connected" class="ctx">
      <span class="live-dot green" /> Lo que elijas se añade a la sala
      <strong>{{ room.roomName || room.roomId }}</strong>
    </p>

    <!-- Resultados -->
    <template v-if="hasQuery">
      <div v-if="isFetching && !songs.length" class="results">
        <div class="skel sk-top" />
        <div class="sk-list">
          <div v-for="n in 5" :key="n" class="skel sk-row" />
        </div>
      </div>
      <EmptyState
        v-else-if="isError"
        :icon="ServerCrash"
        title="No se pudo buscar"
        hint="¿Está corriendo el backend en :8000?"
      />
      <div v-else-if="top" class="results">
        <section class="top-col">
          <h2 class="col-h">Mejor resultado</h2>
          <div class="top" :class="{ current: topIsCurrent }" role="button" tabindex="0" @click="playTop" @keydown.enter="playTop">
            <img class="top-art" :src="top.thumbnail" alt="" />
            <p class="top-t">{{ top.title }}</p>
            <p class="top-a"><span class="pill">Canción</span> {{ top.artist }}</p>
            <button class="play-fab top-fab" :aria-label="topIsCurrent && player.isPlaying ? 'Pausar' : 'Reproducir'" @click.stop="playTop">
              <component :is="topIsCurrent && player.isPlaying ? Pause : Play" :size="22" fill="currentColor" />
            </button>
          </div>
        </section>
        <section class="songs-col">
          <h2 class="col-h">Canciones</h2>
          <ul class="list">
            <li v-for="(t, i) in songs.slice(1)" :key="t.id">
              <TrackRow :track="t" show-more @select="pick(i + 1)" @more="ui.openAddToPlaylist(t)" />
            </li>
          </ul>
        </section>
      </div>
      <EmptyState v-else :icon="Search" title="Sin resultados" hint="Prueba con otro término" />
    </template>

    <!-- Explorar (sin búsqueda) -->
    <template v-else>
      <section v-if="recent.length">
        <div class="sec-head">
          <h2>Búsquedas recientes</h2>
          <button class="sec-link" @click="recent = []">Borrar</button>
        </div>
        <div class="chips">
          <button v-for="r in recent" :key="r" class="chip" @click="browse(r)">
            <Clock :size="13" /> {{ r }}
          </button>
        </div>
      </section>

      <section>
        <div class="sec-head"><h2>Según tu ánimo</h2></div>
        <div class="chips">
          <button v-for="m in MOODS" :key="m.label" class="chip" @click="browse(m.q)">
            <component :is="m.icon" v-if="m.icon" :size="14" /> {{ m.label }}
          </button>
        </div>
      </section>

      <section>
        <div class="sec-head"><h2>Explorar todo</h2></div>
        <div class="genres">
          <button
            v-for="g in GENRES"
            :key="g.label"
            class="genre"
            :style="{ background: g.color }"
            @click="browse(g.q)"
          >
            <span>{{ g.label }}</span>
            <i class="deco" aria-hidden="true" />
          </button>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.search-wrap {
  position: sticky;
  top: 0;
  z-index: 5;
  margin: var(--space-4) calc(-1 * var(--space-4)) 0;
  padding: var(--space-2) var(--space-4);
  background: linear-gradient(var(--page-bg) 70%, transparent);
}
.searchbox {
  height: 50px;
  background: var(--text);
  color: var(--bg);
  border-radius: var(--radius-sm);
}
.searchbox:focus-within {
  background: var(--text);
  border-color: transparent;
  box-shadow: 0 0 0 2px var(--accent);
}
.searchbox input {
  color: var(--bg);
  font-weight: 500;
}
.searchbox input::placeholder {
  color: color-mix(in srgb, var(--bg) 55%, transparent);
}
/* Quitar la X nativa (usamos la propia) */
.searchbox input::-webkit-search-cancel-button {
  -webkit-appearance: none;
}
.clear {
  display: grid;
  place-items: center;
  background: none;
  border: 0;
  color: var(--bg);
  padding: 4px;
}
.ctx {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin: var(--space-3) 0 0;
  font-size: 13px;
  color: var(--text-muted);
}
.ctx strong {
  color: var(--accent);
}

/* Resultados: mejor resultado + canciones (Spotify) */
.results {
  display: grid;
  gap: var(--space-6);
  margin-top: var(--space-5);
}
.col-h {
  margin: 0 0 var(--space-3);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.015em;
}
.top {
  position: relative;
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  background: var(--surface);
  cursor: pointer;
  transition: background 0.2s;
}
.top:hover {
  background: var(--surface-2);
}
.top-art {
  width: 104px;
  height: 104px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  box-shadow: var(--shadow-2);
}
.top-t {
  margin: var(--space-4) 0 0;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.15;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.current .top-t {
  color: var(--accent);
}
.top-a {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: var(--space-2) 0 0;
  font-size: 14px;
  color: var(--text-muted);
}
.pill {
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--bg);
  color: var(--text);
  font-size: 12px;
  font-weight: 700;
}
.top-fab {
  position: absolute;
  right: var(--space-5);
  bottom: var(--space-5);
}
.sk-top {
  height: 240px;
  border-radius: var(--radius-lg);
}
.sk-row {
  height: 56px;
  margin-bottom: 6px;
}

/* Géneros: tarjetas de color con forma decorativa inclinada */
.genres {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}
.genre {
  position: relative;
  overflow: hidden;
  height: 96px;
  padding: var(--space-3);
  border: 0;
  border-radius: var(--radius);
  color: #fff;
  text-align: left;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.01em;
  transition: transform 0.15s;
}
.genre span {
  position: relative;
  z-index: 1;
}
.genre:active {
  transform: scale(0.97);
}
.deco {
  position: absolute;
  right: -14px;
  bottom: -10px;
  width: 64px;
  height: 64px;
  border-radius: var(--radius-sm);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.05));
  box-shadow: var(--shadow-1);
  transform: rotate(25deg);
}

@media (min-width: 640px) {
  .genres {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (min-width: 1024px) {
  .search-wrap {
    margin: var(--space-4) 0 0;
    padding: var(--space-2) 0;
    max-width: 560px;
  }
  .results {
    grid-template-columns: minmax(320px, 2fr) 3fr;
    align-items: start;
  }
  .top-col {
    position: sticky;
    top: 72px;
  }
  .genres {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: var(--space-4);
  }
  .genre {
    height: 120px;
    font-size: 20px;
  }
  .deco {
    width: 84px;
    height: 84px;
  }
}
</style>

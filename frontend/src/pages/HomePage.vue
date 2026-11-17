<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { Settings, Play } from 'lucide-vue-next'
import type { Track } from '@/entities/track'
import TrackCard from '@/shared/ui/TrackCard.vue'
import TrackRow from '@/shared/ui/TrackRow.vue'
import QuickTile from '@/shared/ui/QuickTile.vue'
import RoomCard from '@/features/rooms/RoomCard.vue'
import { usePlayerStore } from '@/features/player/player.store'
import { useLibraryStore } from '@/features/library/library.store'
import { useRoomStore } from '@/features/rooms/room.store'
import { useUiStore } from '@/shared/lib/ui.store'
import { useAuthStore } from '@/features/auth/auth.store'
import { colorFor, initials } from '@/shared/lib/identity'
import { listRooms } from '@/features/rooms/rooms.api'
import { useRoomActions } from '@/features/rooms/useRoomActions'
import { recommendForYou, topArtists } from '@/features/recommendations/recommendations'
import { searchTracks } from '@/features/search/search.api'
import { MOODS } from '@/features/search/browse'

const player = usePlayerStore()
const lib = useLibraryStore()
const room = useRoomStore()
const ui = useUiStore()
const auth = useAuthStore()
const router = useRouter()
const { openRoom, newRoom } = useRoomActions()

const { data: rooms, isError: roomsError } = useQuery({
  queryKey: ['rooms'],
  queryFn: listRooms,
  refetchInterval: 20_000, // oyentes y "qué suena" en vivo
})
// Primero las salas con gente, luego el resto
const sortedRooms = computed(() =>
  [...(rooms.value ?? [])].sort((a, b) => b.listeners - a.listeners),
)

/* Acceso rápido: lo último que escuchaste (cuadrícula Spotify) */
const quick = computed(() => lib.history.slice(0, 8))

/* Selección rápida: recomendaciones en columnas de 4 filas (YouTube Music) */
const seedTracks = computed(() => [...lib.history, ...lib.favorites])
const recsKey = computed(() => topArtists(seedTracks.value, 3).join('|') || 'default')
const { data: recs, isFetching: recsLoading } = useQuery({
  queryKey: ['recs', recsKey],
  queryFn: () => recommendForYou(seedTracks.value),
  staleTime: 10 * 60_000,
})

/* Mixes por artista (Daily Mix / "Mis mixes") */
const mixes = computed(() =>
  topArtists(seedTracks.value, 6).map((artist) => ({
    artist,
    cover: seedTracks.value.find((t) => t.artist === artist)?.thumbnail ?? '',
  })),
)
async function playMix(artist: string): Promise<void> {
  ui.toast(`Preparando mix de ${artist}…`)
  try {
    const list = await searchTracks(artist)
    if (list.length) player.playQueue(list, 0)
    else ui.toast('No encontramos canciones para este mix')
  } catch {
    ui.toast('No se pudo cargar el mix')
  }
}

function play(list: Track[], i: number): void {
  // En una sala, tocar una canción la añade a la cola compartida
  if (room.connected) {
    const t = list[i]
    if (t) room.enqueue(t)
    return
  }
  player.playQueue(list, i)
}

function mood(q: string): void {
  void router.push({ name: 'search', query: { q } })
}

const greeting = ((): string => {
  const h = new Date().getHours()
  if (h < 6) return 'Buenas noches'
  if (h < 13) return 'Buenos días'
  if (h < 20) return 'Buenas tardes'
  return 'Buenas noches'
})()
</script>

<template>
  <div class="page home">
    <div class="glow" aria-hidden="true" />

    <header class="top">
      <h1 class="large-title">{{ greeting }}</h1>
      <RouterLink
        v-if="auth.user"
        to="/settings"
        class="me settings"
        :style="{ background: colorFor(auth.uid) }"
        :aria-label="`Perfil de ${auth.displayName}`"
      >
        {{ initials(auth.displayName) }}
      </RouterLink>
      <RouterLink v-else to="/settings" class="icon-btn settings" aria-label="Perfil y ajustes">
        <Settings :size="22" />
      </RouterLink>
    </header>

    <nav class="chips moods" aria-label="Estados de ánimo">
      <button v-for="m in MOODS" :key="m.label" class="chip" @click="mood(m.q)">
        <component :is="m.icon" v-if="m.icon" :size="14" />
        {{ m.label }}
      </button>
    </nav>

    <section v-if="quick.length" class="quick">
      <QuickTile v-for="(t, i) in quick" :key="t.id" :track="t" @play="play(quick, i)" />
    </section>

    <section>
      <div class="sec-head">
        <div>
          <span class="kicker">Escuchen juntos</span>
          <h2>Salas en vivo</h2>
        </div>
        <RouterLink to="/rooms" class="sec-link">Ver todas</RouterLink>
      </div>
      <p v-if="roomsError" class="err">No se pudieron cargar las salas (¿backend en :8000?)</p>
      <div class="hscroll">
        <RoomCard v-for="r in sortedRooms" :key="r.id" :room="r" @open="openRoom(r)" />
        <RoomCard create @open="newRoom()" />
      </div>
    </section>

    <section>
      <div class="sec-head">
        <div>
          <span class="kicker">{{ seedTracks.length ? 'Según lo que escuchas' : 'Para empezar' }}</span>
          <h2>Selección rápida</h2>
        </div>
        <button
          v-if="recs && recs.length"
          class="sec-link"
          @click="play(recs, 0)"
        >
          Reproducir todo
        </button>
      </div>
      <div v-if="recsLoading && !(recs && recs.length)" class="picks">
        <div v-for="n in 8" :key="n" class="skel skel-row" />
      </div>
      <div v-else class="picks">
        <TrackRow
          v-for="(t, i) in recs ?? []"
          :key="t.id"
          :track="t"
          dense
          show-more
          @select="play(recs ?? [], i)"
          @more="ui.openAddToPlaylist(t)"
        />
      </div>
    </section>

    <section v-if="mixes.length">
      <div class="sec-head">
        <div>
          <span class="kicker">Hechos para ti</span>
          <h2>Tus mixes</h2>
        </div>
      </div>
      <div class="hscroll">
        <button v-for="(m, i) in mixes" :key="m.artist" class="mix" @click="playMix(m.artist)">
          <span class="mix-cover" :class="`tone-${i % 6}`">
            <img v-if="m.cover" :src="m.cover" alt="" loading="lazy" />
            <span class="mix-label">MIX</span>
            <span class="mix-name">{{ m.artist }}</span>
            <span class="play-fab mix-fab" aria-hidden="true"><Play :size="18" fill="currentColor" /></span>
          </span>
          <span class="mix-sub">{{ m.artist }} y artistas similares</span>
        </button>
      </div>
    </section>

    <section v-if="lib.favorites.length">
      <div class="sec-head">
        <h2>Tus favoritos</h2>
        <RouterLink to="/library?tab=Favoritos" class="sec-link">Ver todos</RouterLink>
      </div>
      <div class="hscroll">
        <TrackCard
          v-for="(t, i) in lib.favorites.slice(0, 15)"
          :key="t.id"
          :track="t"
          @play="play(lib.favorites, i)"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Degradado superior teñido con la carátula que suena (Spotify) */
.glow {
  position: absolute;
  inset: 0 0 auto 0;
  height: 360px;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--ambient) 34%, transparent),
    transparent
  );
  pointer-events: none;
  transition: background 0.8s ease;
}
.home > :not(.glow) {
  position: relative;
}
.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.moods {
  margin-top: var(--space-4);
}
/* Avatar con iniciales (YouTube Music) cuando hay sesión */
.me {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
}
.quick {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
  margin-top: var(--space-5) !important;
}
.err {
  margin: 0 0 var(--space-3);
  font-size: 13px;
  color: var(--danger);
}

/* Selección rápida: columnas de 4 filas con scroll horizontal (YouTube Music) */
.picks {
  display: grid;
  grid-auto-flow: column;
  grid-template-rows: repeat(4, auto);
  grid-auto-columns: 86%;
  gap: 2px var(--space-3);
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-padding-inline: var(--space-4);
  scrollbar-width: none;
  margin: 0 calc(-1 * var(--space-4));
  padding: 0 var(--space-4);
}
.picks::-webkit-scrollbar {
  display: none;
}
.picks > * {
  scroll-snap-align: start;
}
.skel-row {
  height: 56px;
  margin: 2px 0;
}

/* Mixes */
.mix {
  flex: 0 0 auto;
  width: 160px;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  text-align: left;
}
.mix-cover {
  position: relative;
  display: block;
  aspect-ratio: 1;
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-1);
}
.mix-cover img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(1.2);
  transition: transform 0.4s var(--ease-out);
}
/* Velo de color + banda inferior, a lo "Daily Mix" */
.mix-cover::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, var(--tone) 0 24%, transparent 60%);
  mix-blend-mode: normal;
}
.tone-0 {
  --tone: #1e8a5a;
}
.tone-1 {
  --tone: #b0306a;
}
.tone-2 {
  --tone: #2d5fc4;
}
.tone-3 {
  --tone: #c2621b;
}
.tone-4 {
  --tone: #7a3fc0;
}
.tone-5 {
  --tone: #b83232;
}
.mix-label {
  position: absolute;
  z-index: 1;
  top: 10px;
  left: 10px;
  padding: 2px 6px;
  border-radius: var(--radius-xs);
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
}
.mix-name {
  position: absolute;
  z-index: 1;
  left: 12px;
  right: 12px;
  bottom: 10px;
  color: #fff;
  font-size: 16px;
  font-weight: 800;
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mix-fab {
  position: absolute;
  z-index: 2;
  right: 10px;
  bottom: 40px;
  width: 42px;
  height: 42px;
  opacity: 0;
  transform: translateY(8px);
  transition:
    opacity 0.2s,
    transform 0.25s var(--ease-out);
}
.mix-sub {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-muted);
}
@media (hover: hover) {
  .mix:hover img {
    transform: scale(1.05);
  }
  .mix:hover .mix-fab {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (min-width: 1024px) {
  .settings {
    display: none;
  }
  .quick {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--space-3);
  }
  .picks {
    grid-auto-columns: calc((100% - 2 * var(--space-4)) / 3);
    margin: 0;
    padding: 0;
    scroll-padding-inline: 0;
    gap: 2px var(--space-4);
  }
  .mix {
    width: 196px;
  }
}
</style>

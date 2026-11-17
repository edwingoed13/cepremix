<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft, Play, Pause, Shuffle, Trash2, ListMusic } from 'lucide-vue-next'
import TrackRow from '@/shared/ui/TrackRow.vue'
import EmptyState from '@/shared/ui/EmptyState.vue'
import PlaylistCover from '@/shared/ui/PlaylistCover.vue'
import { useLibraryStore } from '@/features/library/library.store'
import { usePlayerStore } from '@/features/player/player.store'
import { useUiStore } from '@/shared/lib/ui.store'
import { getDominantColor } from '@/shared/lib/color'

const route = useRoute()
const router = useRouter()
const lib = useLibraryStore()
const player = usePlayerStore()
const ui = useUiStore()

// Fijado al montar (la página se re-monta por ruta): así no parpadea "no encontrada"
// mientras se desvanece al navegar a otra pantalla.
const playlistId = String(route.params.id)
const playlist = computed(() => lib.getPlaylist(playlistId))
const totalMin = computed(() =>
  Math.round((playlist.value?.tracks ?? []).reduce((s, t) => s + (t.durationSec || 0), 0) / 60),
)
/** ¿Lo que suena ahora viene de esta playlist? */
const playingThis = computed(
  () => !!player.current && !!playlist.value?.tracks.some((t) => t.id === player.current?.id),
)

// Cabecera teñida con el color de la portada (Spotify)
const tint = ref<string | null>(null)
watch(
  () => playlist.value?.tracks[0]?.thumbnail,
  async (url) => {
    tint.value = url ? await getDominantColor(url) : null
  },
  { immediate: true },
)

function playAll(i = 0): void {
  const pl = playlist.value
  if (pl && pl.tracks.length) player.playQueue(pl.tracks, i)
}
function onMainPlay(): void {
  if (playingThis.value) player.toggle()
  else playAll(0)
}
function shufflePlay(): void {
  const pl = playlist.value
  if (!pl?.tracks.length) return
  if (!player.shuffle) player.toggleShuffle()
  playAll(Math.floor(Math.random() * pl.tracks.length))
}
function removeTrack(trackId: string): void {
  const pl = playlist.value
  if (pl) {
    lib.removeTrackFromPlaylist(pl.id, trackId)
    ui.toast('Quitada de la playlist')
  }
}
async function removePlaylist(): Promise<void> {
  const pl = playlist.value
  if (!pl) return
  const ok = await ui.confirmAction(`¿Eliminar "${pl.name}"?`, {
    message: 'Se borrará la playlist de este dispositivo. Las canciones seguirán en tu historial.',
    confirmLabel: 'Eliminar',
    danger: true,
  })
  if (!ok) return
  lib.deletePlaylist(pl.id)
  ui.toast('Playlist eliminada')
  void router.push('/library')
}
</script>

<template>
  <div class="pl-page">
    <header class="hero" :style="{ '--tint': tint ?? 'var(--surface-3)' }">
      <div class="hero-inner">
        <button class="icon-btn back" aria-label="Volver" @click="router.push('/library')">
          <ChevronLeft :size="24" />
        </button>
        <div class="hero-main">
          <PlaylistCover :tracks="playlist?.tracks" :size="200" class="cover" />
          <div class="hero-txt">
            <p class="kicker">PLAYLIST</p>
            <h1 class="title">{{ playlist?.name ?? 'Playlist' }}</h1>
            <p class="meta">
              {{ playlist?.tracks.length ?? 0 }} canciones<template v-if="totalMin"> · {{ totalMin }} min</template>
            </p>
          </div>
        </div>
      </div>
    </header>

    <div class="page body">
      <div v-if="playlist && playlist.tracks.length" class="actions">
        <button class="play-fab big" :aria-label="playingThis && player.isPlaying ? 'Pausar' : 'Reproducir'" @click="onMainPlay">
          <component :is="playingThis && player.isPlaying ? Pause : Play" :size="24" fill="currentColor" />
        </button>
        <button class="icon-btn muted" aria-label="Reproducir en aleatorio" title="Aleatorio" @click="shufflePlay">
          <Shuffle :size="24" />
        </button>
        <span class="spacer" />
        <button class="icon-btn muted" aria-label="Eliminar playlist" title="Eliminar playlist" @click="removePlaylist">
          <Trash2 :size="20" />
        </button>
      </div>

      <ul v-if="playlist && playlist.tracks.length" class="list">
        <li v-for="(t, i) in playlist.tracks" :key="t.id">
          <TrackRow
            :track="t"
            :index="i"
            show-more
            more-label="Quitar de la playlist"
            @select="playAll(i)"
            @more="removeTrack(t.id)"
          />
        </li>
      </ul>

      <EmptyState
        v-else-if="playlist"
        :icon="ListMusic"
        title="Playlist vacía"
        hint="Añade canciones con el menú ⋯ de cualquier canción"
      />
      <EmptyState v-else :icon="ListMusic" title="No encontramos esta playlist" hint="Puede que se haya eliminado" />

      <div v-if="playlist && !playlist.tracks.length" class="empty-actions">
        <button class="btn" @click="removePlaylist"><Trash2 :size="16" /> Eliminar playlist</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hero {
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--tint) 70%, #000),
    color-mix(in srgb, var(--tint) 18%, var(--bg-elev))
  );
  transition: background 0.6s ease;
}
.hero-inner {
  padding: calc(env(safe-area-inset-top) + var(--space-3)) var(--space-4) var(--space-6);
}
.back {
  margin-left: -8px;
  color: #fff;
}
.hero-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  margin-top: var(--space-2);
  text-align: center;
}
.cover {
  width: min(56vw, 220px) !important;
  height: min(56vw, 220px) !important;
  border-radius: var(--radius-sm) !important;
  box-shadow: var(--shadow-2);
}
.kicker {
  display: none;
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.8);
}
.title {
  margin: 0;
  font-size: 28px;
  line-height: 1.05;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #fff;
  overflow-wrap: anywhere;
}
.meta {
  margin: var(--space-2) 0 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.75);
}
.body {
  padding-top: var(--space-4);
}
.actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}
.play-fab.big {
  width: 56px;
  height: 56px;
}
.spacer {
  flex: 1;
}
.empty-actions {
  display: flex;
  justify-content: center;
}
@media (min-width: 1024px) {
  .hero-inner {
    padding: var(--space-6) var(--space-8) var(--space-6);
  }
  .hero-main {
    flex-direction: row;
    align-items: flex-end;
    text-align: left;
    gap: var(--space-6);
  }
  .cover {
    width: 232px !important;
    height: 232px !important;
  }
  .kicker {
    display: block;
  }
  .title {
    font-size: 72px;
    margin-top: var(--space-2);
  }
}
</style>

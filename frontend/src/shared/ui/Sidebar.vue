<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router'
import { Home, Search, Radio, Library, Plus, Settings } from 'lucide-vue-next'
import { useLibraryStore } from '@/features/library/library.store'
import { useRoomStore } from '@/features/rooms/room.store'
import { useUiStore } from '@/shared/lib/ui.store'
import { useAuthStore } from '@/features/auth/auth.store'
import { colorFor, initials } from '@/shared/lib/identity'
import PlaylistCover from './PlaylistCover.vue'
import EqBars from './EqBars.vue'

const lib = useLibraryStore()
const room = useRoomStore()
const ui = useUiStore()
const auth = useAuthStore()
const router = useRouter()

const nav = [
  { to: '/', label: 'Inicio', icon: Home, exact: true },
  { to: '/search', label: 'Buscar', icon: Search },
  { to: '/rooms', label: 'Salas', icon: Radio },
]

async function newPlaylist(): Promise<void> {
  const name = await ui.promptText('Nueva playlist', 'Mi playlist', { confirmLabel: 'Crear' })
  if (!name) return
  const p = lib.createPlaylist(name)
  void router.push({ name: 'playlist', params: { id: p.id } })
}
</script>

<template>
  <aside class="sidebar">
    <!-- Bloque superior: marca + navegación -->
    <div class="panel top">
      <RouterLink to="/" class="brand">
        <img src="/favicon.svg" alt="" class="logo" />
        <span>CEPREMIX</span>
      </RouterLink>
      <nav class="nav">
        <RouterLink
          v-for="n in nav"
          :key="n.to"
          :to="n.to"
          class="link"
          :active-class="n.exact ? '' : 'link--active'"
          :exact-active-class="n.exact ? 'link--active' : ''"
        >
          <component :is="n.icon" :size="22" />
          <span>{{ n.label }}</span>
        </RouterLink>
      </nav>
    </div>

    <!-- Bloque "Tu biblioteca" (Spotify) -->
    <div class="panel lib">
      <div class="lib-head">
        <RouterLink to="/library" class="link link--plain" active-class="link--active">
          <Library :size="22" />
          <span>Tu biblioteca</span>
        </RouterLink>
        <button class="icon-btn muted" aria-label="Crear playlist" title="Crear playlist" @click="newPlaylist">
          <Plus :size="18" />
        </button>
      </div>

      <div class="items">
        <RouterLink to="/library?tab=Favoritos" class="item">
          <PlaylistCover liked :size="44" />
          <span class="meta">
            <span class="name">Tus favoritos</span>
            <span class="sub">Playlist · {{ lib.favorites.length }} canciones</span>
          </span>
        </RouterLink>
        <RouterLink
          v-for="p in lib.playlists"
          :key="p.id"
          :to="{ name: 'playlist', params: { id: p.id } }"
          class="item"
          active-class="item--active"
        >
          <PlaylistCover :tracks="p.tracks" :size="44" />
          <span class="meta">
            <span class="name">{{ p.name }}</span>
            <span class="sub">Playlist · {{ p.tracks.length }} canciones</span>
          </span>
        </RouterLink>
        <button v-if="!lib.playlists.length" class="hint" @click="newPlaylist">
          <strong>Crea tu primera playlist</strong>
          <span>Es fácil, te ayudamos</span>
        </button>
      </div>

      <!-- Sala activa: acceso directo con pulso en vivo -->
      <RouterLink v-if="room.active && room.roomId" :to="`/room/${room.roomId}`" class="room-live">
        <span class="rl-ic"><EqBars :playing="room.playing" :size="14" /></span>
        <span class="meta">
          <span class="rl-k"><span class="live-dot green" /> En sala</span>
          <span class="name">{{ room.roomName || 'Sala' }}</span>
        </span>
      </RouterLink>

      <RouterLink v-if="auth.user" to="/settings" class="me-row" active-class="me-row--active">
        <span class="me-av" :style="{ background: colorFor(auth.uid) }">{{ initials(auth.displayName) }}</span>
        <span class="meta">
          <span class="name">{{ auth.displayName }}</span>
          <span class="sub">Perfil y ajustes</span>
        </span>
        <Settings :size="16" class="me-cog" />
      </RouterLink>
      <template v-else>
        <RouterLink to="/login" class="btn btn--accent login-btn">Iniciar sesión</RouterLink>
        <RouterLink to="/settings" class="link link--plain settings" active-class="link--active">
          <Settings :size="18" />
          <span>Ajustes</span>
        </RouterLink>
      </template>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-2) 0 var(--space-2) var(--space-2);
  background: var(--bg);
}
.panel {
  background: var(--bg-elev);
  border-radius: var(--radius);
  padding: var(--space-3);
}
.brand {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3) var(--space-3);
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text);
  text-decoration: none;
}
.logo {
  width: 28px;
  height: 28px;
}
.nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.link {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: 10px var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  text-decoration: none;
  font-weight: 700;
  font-size: 15px;
  transition: color 0.15s;
}
.link:hover {
  color: var(--text);
}
.link--active {
  color: var(--text);
}
.lib {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.lib-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.items {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0 calc(-1 * var(--space-1));
}
.item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 6px var(--space-2);
  border-radius: var(--radius-sm);
  color: var(--text);
  text-decoration: none;
  transition: background 0.12s;
}
.item:hover {
  background: var(--surface-2);
}
.item--active {
  background: var(--surface-3);
}
.meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.name {
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.item--active .name {
  color: var(--accent);
}
.sub {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hint {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: var(--space-2);
  padding: var(--space-4);
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--text);
  text-align: left;
  font-size: 14px;
}
.hint span {
  font-size: 13px;
  color: var(--text-muted);
}
.room-live {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--accent) 14%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
  color: var(--text);
  text-decoration: none;
}
.rl-ic {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent) 22%, transparent);
}
.rl-k {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--accent);
}
.login-btn {
  text-decoration: none;
}
.me-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  color: var(--text);
  text-decoration: none;
}
.me-row:hover,
.me-row--active {
  background: var(--surface-2);
}
.me-av {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: #fff;
  font-size: 13px;
  font-weight: 800;
}
.me-cog {
  margin-left: auto;
  color: var(--text-muted);
}
.settings {
  font-size: 13px;
  padding: 6px var(--space-3);
  gap: var(--space-3);
}
</style>

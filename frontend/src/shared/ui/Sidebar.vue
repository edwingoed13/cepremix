<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Home, Search, Library, User } from 'lucide-vue-next'
import { useLibraryStore } from '@/features/library/library.store'

const lib = useLibraryStore()
const nav = [
  { to: '/', label: 'Inicio', icon: Home },
  { to: '/search', label: 'Buscar', icon: Search },
  { to: '/library', label: 'Biblioteca', icon: Library },
  { to: '/settings', label: 'Perfil', icon: User },
]
</script>

<template>
  <aside class="sidebar">
    <div class="brand">
      <img src="/favicon.svg" alt="" class="logo" />
      <span>CEPREMIX</span>
    </div>

    <nav class="nav">
      <RouterLink
        v-for="n in nav"
        :key="n.to"
        :to="n.to"
        class="link"
        active-class="link--active"
      >
        <component :is="n.icon" :size="20" />
        <span>{{ n.label }}</span>
      </RouterLink>
    </nav>

    <div class="divider" />
    <p class="ph">Tus playlists</p>
    <div class="playlists">
      <RouterLink
        v-for="p in lib.playlists"
        :key="p.id"
        :to="{ name: 'playlist', params: { id: p.id } }"
        class="pl"
        active-class="pl--active"
      >
        {{ p.name }}
      </RouterLink>
      <p v-if="!lib.playlists.length" class="empty">Crea playlists desde el menú ⋯</p>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  height: 100%;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: var(--space-4) var(--space-3);
  gap: var(--space-2);
}
.brand {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 20px;
  font-weight: 700;
  padding: var(--space-2) var(--space-2) var(--space-4);
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
  gap: var(--space-3);
  padding: 10px var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
  transition: color 0.15s, background 0.15s;
}
.link:hover {
  color: var(--text);
  background: var(--surface-2);
}
.link--active {
  color: var(--text);
  background: var(--surface-2);
}
.divider {
  height: 1px;
  background: var(--border);
  margin: var(--space-3) var(--space-2);
}
.ph {
  margin: 0 0 var(--space-1);
  padding: 0 var(--space-3);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.playlists {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-height: 0;
}
.pl {
  padding: 8px var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  text-decoration: none;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pl:hover {
  color: var(--text);
  background: var(--surface-2);
}
.pl--active {
  color: var(--accent);
}
.empty {
  padding: 0 var(--space-3);
  font-size: 13px;
  color: var(--text-muted);
}
</style>

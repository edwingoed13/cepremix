<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Home, Search, Radio, Library } from 'lucide-vue-next'
import { useRoomStore } from '@/features/rooms/room.store'

const room = useRoomStore()
const tabs = [
  { to: '/', label: 'Inicio', icon: Home, exact: true },
  { to: '/search', label: 'Buscar', icon: Search },
  { to: '/rooms', label: 'Salas', icon: Radio, rooms: true },
  { to: '/library', label: 'Biblioteca', icon: Library },
]
</script>

<template>
  <nav class="tabbar" aria-label="Navegación principal">
    <RouterLink
      v-for="t in tabs"
      :key="t.to"
      :to="t.rooms && room.active && room.roomId ? `/room/${room.roomId}` : t.to"
      class="tab"
      :class="{ 'tab--active': t.rooms && $route.path.startsWith('/room') }"
      :active-class="t.exact ? '' : 'tab--active'"
      :exact-active-class="t.exact ? 'tab--active' : ''"
      :aria-label="t.label"
    >
      <span class="ic">
        <component :is="t.icon" :size="24" :stroke-width="2" />
        <span v-if="t.rooms && room.active" class="live-dot green badge" />
      </span>
      <span class="label">{{ t.label }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 40;
  display: flex;
  align-items: flex-start;
  height: calc(var(--tabbar-h) + env(safe-area-inset-bottom));
  padding-top: 6px;
  padding-bottom: env(safe-area-inset-bottom);
  /* Vidrio esmerilado (Apple Music) sobre un desvanecido (Spotify) */
  background: linear-gradient(to top, var(--bg) 35%, color-mix(in srgb, var(--bg) 70%, transparent));
  backdrop-filter: blur(20px) saturate(1.6);
  -webkit-backdrop-filter: blur(20px) saturate(1.6);
}
.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  color: var(--text-muted);
  text-decoration: none;
  font-size: 10.5px;
  font-weight: 600;
  padding: 4px 0;
  transition: color 0.15s ease;
}
.ic {
  position: relative;
  display: grid;
  place-items: center;
}
.badge {
  position: absolute;
  top: -1px;
  right: -4px;
  width: 9px;
  height: 9px;
  box-shadow: 0 0 0 2px var(--bg);
}
.tab--active {
  color: var(--text);
}
.tab--active .ic {
  color: var(--accent);
}
.tab:active {
  transform: scale(0.92);
}
</style>

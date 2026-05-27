<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Home, Search, Library, User } from 'lucide-vue-next'

const tabs = [
  { to: '/', label: 'Inicio', icon: Home },
  { to: '/search', label: 'Buscar', icon: Search },
  { to: '/library', label: 'Biblioteca', icon: Library },
  { to: '/settings', label: 'Perfil', icon: User },
]
</script>

<template>
  <nav class="tabbar">
    <RouterLink
      v-for="t in tabs"
      :key="t.to"
      :to="t.to"
      class="tab"
      active-class="tab--active"
      :aria-label="t.label"
    >
      <component :is="t.icon" :size="22" :stroke-width="2" />
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
  align-items: center;
  height: calc(var(--tabbar-h) + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: color-mix(in srgb, var(--bg) 88%, transparent);
  backdrop-filter: blur(18px);
  border-top: 1px solid var(--border);
}
.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  color: var(--text-muted);
  text-decoration: none;
  font-size: 11px;
  font-weight: 500;
  padding: 8px 0;
  transition: color 0.15s ease;
}
.tab--active {
  color: var(--accent);
}
.tab:active {
  transform: scale(0.94);
}
</style>

<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useMediaQuery } from '@vueuse/core'
import { usePlayerStore } from '@/features/player/player.store'
import { useLibraryStore } from '@/features/library/library.store'
import BottomTabBar from '@/shared/ui/BottomTabBar.vue'
import Sidebar from '@/shared/ui/Sidebar.vue'
import MiniPlayer from '@/features/player/MiniPlayer.vue'
import FullPlayer from '@/features/player/FullPlayer.vue'
import DesktopPlayerBar from '@/features/player/DesktopPlayerBar.vue'
import AppToast from '@/shared/ui/AppToast.vue'
import PromptSheet from '@/shared/ui/PromptSheet.vue'
import AddToPlaylistSheet from '@/features/library/AddToPlaylistSheet.vue'

const player = usePlayerStore()
useLibraryStore() // activa el seguimiento de historial desde el arranque
const isDesktop = useMediaQuery('(min-width: 1024px)')
onMounted(() => player.init('yt-player'))
</script>

<template>
  <div :class="isDesktop ? 'shell-d' : 'shell-m'">
    <!-- Navegación desktop -->
    <Sidebar v-if="isDesktop" class="g-sidebar" />

    <main class="content" :class="{ 'g-content': isDesktop }">
      <RouterView />
    </main>

    <!-- Reproductor ampliado (ambos layouts) -->
    <Transition name="slide-up">
      <FullPlayer v-if="player.isFullOpen" />
    </Transition>

    <!-- Chrome móvil -->
    <MiniPlayer v-if="!isDesktop && player.current && !player.isFullOpen" />
    <BottomTabBar v-if="!isDesktop" />

    <!-- Chrome desktop -->
    <DesktopPlayerBar v-if="isDesktop && player.current" class="g-bar" />

    <!-- Hosts globales de UI -->
    <AppToast />
    <PromptSheet />
    <AddToPlaylistSheet />

    <!-- Motor de audio (YouTube IFrame): persistente y fuera del flujo visual -->
    <div class="yt-host" aria-hidden="true"><div id="yt-player"></div></div>
  </div>
</template>

<style scoped>
/* ---- Layout móvil (mobile-first) ---- */
.shell-m {
  min-height: 100dvh;
}
.shell-m .content {
  min-height: 100dvh;
  /* Espacio para mini-player + tab bar + safe-area (notch/gestos iOS) */
  padding-bottom: calc(var(--tabbar-h) + var(--mini-h) + env(safe-area-inset-bottom));
}

/* ---- Layout desktop: sidebar | contenido, con barra inferior full-width ---- */
.shell-d {
  display: grid;
  grid-template-columns: 248px 1fr;
  grid-template-rows: 1fr auto;
  grid-template-areas:
    'sidebar content'
    'bar bar';
  height: 100dvh;
  overflow: hidden;
}
.g-sidebar {
  grid-area: sidebar;
  min-height: 0;
}
.g-content {
  grid-area: content;
  overflow-y: auto;
  min-height: 0;
}
.g-bar {
  grid-area: bar;
}

.yt-host {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
  overflow: hidden;
}
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.28s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}
</style>

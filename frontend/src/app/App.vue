<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useMediaQuery } from '@vueuse/core'
import { usePlayerStore } from '@/features/player/player.store'
import { useLibraryStore } from '@/features/library/library.store'
import { useAuthStore } from '@/features/auth/auth.store'
import BottomTabBar from '@/shared/ui/BottomTabBar.vue'
import Sidebar from '@/shared/ui/Sidebar.vue'
import MiniPlayer from '@/features/player/MiniPlayer.vue'
import FullPlayer from '@/features/player/FullPlayer.vue'
import DesktopPlayerBar from '@/features/player/DesktopPlayerBar.vue'
import AppToast from '@/shared/ui/AppToast.vue'
import PromptSheet from '@/shared/ui/PromptSheet.vue'
import AddToPlaylistSheet from '@/features/library/AddToPlaylistSheet.vue'
import { useAmbientColor } from '@/features/player/ambient'

const player = usePlayerStore()
void useAuthStore().init() // valida la sesión guardada (si hay)
useLibraryStore() // activa el seguimiento de historial desde el arranque
useAmbientColor() // tiñe la UI con el color de la carátula que suena
const isDesktop = useMediaQuery('(min-width: 1024px)')
onMounted(() => player.init('yt-player'))

// En desktop el scroll vive en el panel de contenido, no en window:
// volver arriba al cambiar de página (el scrollBehavior del router solo mueve window).
const route = useRoute()
const contentEl = ref<HTMLElement | null>(null)
watch(
  () => route.path,
  () => contentEl.value?.scrollTo({ top: 0 }),
)
</script>

<template>
  <!-- data-engine: motor de audio activo (diagnóstico y pruebas automáticas) -->
  <div :class="isDesktop ? 'shell-d' : 'shell-m'" :data-engine="player.engineName">
    <!-- Navegación desktop -->
    <Sidebar v-if="isDesktop" class="g-sidebar" />

    <main ref="contentEl" class="content" :class="{ 'g-content': isDesktop, 'has-mini': !!player.current }">
      <RouterView v-slot="{ Component, route }">
        <Transition name="page" mode="out-in">
          <component :is="Component" :key="route.name === 'room' ? 'room' : route.fullPath.split('?')[0]" />
        </Transition>
      </RouterView>
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
  /* Espacio para tab bar + safe-area (notch/gestos iOS) */
  padding-bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom) + var(--space-4));
}
.shell-m .content.has-mini {
  /* ...y para el mini-player flotante */
  padding-bottom: calc(var(--tabbar-h) + var(--mini-h) + env(safe-area-inset-bottom) + var(--space-4));
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
  /* Panel redondeado sobre fondo negro (Spotify) */
  margin: var(--space-2);
  border-radius: var(--radius);
  background: var(--bg-elev);
  --page-bg: var(--bg-elev);
  isolation: isolate;
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

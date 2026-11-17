<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Sun,
  Moon,
  BarChart3,
  Heart,
  Clock,
  ListMusic,
  ChevronRight,
  Smartphone,
  LogIn,
  LogOut,
  Cloud,
} from 'lucide-vue-next'
import { RouterLink, useRouter } from 'vue-router'
import { theme, toggleTheme } from '@/shared/lib/theme'
import { useUiStore } from '@/shared/lib/ui.store'
import { usePlayerStore } from '@/features/player/player.store'
import { useLibraryStore } from '@/features/library/library.store'
import { useAuthStore } from '@/features/auth/auth.store'
import { colorFor, initials } from '@/shared/lib/identity'

const ui = useUiStore()
const player = usePlayerStore()
const lib = useLibraryStore()
const auth = useAuthStore()
const router = useRouter()

const realSpectrum = ref(localStorage.getItem('spectrum') === 'real')
function toggleSpectrum(): void {
  realSpectrum.value = !realSpectrum.value
  localStorage.setItem('spectrum', realSpectrum.value ? 'real' : 'off')
  if (realSpectrum.value) player.enableAnalyser() // engancha al instante al audio en curso
  ui.toast(realSpectrum.value ? 'Espectro real activado' : 'Espectro estilizado')
}

/** Avatar: color estable del id (igual que en las salas) + iniciales. */
const avatarColor = computed(() => colorFor(auth.uid))
const avatarText = computed(() =>
  auth.user ? initials(auth.user.display_name) : auth.uid.slice(2, 4).toUpperCase(),
)

async function logout(): Promise<void> {
  const ok = await ui.confirmAction('¿Cerrar sesión?', {
    message: 'Tu biblioteca queda guardada en tu cuenta. En este dispositivo verás la de sin cuenta.',
    confirmLabel: 'Cerrar sesión',
  })
  if (!ok) return
  await lib.flush() // que no se pierda nada pendiente de subir
  await auth.logout()
  ui.toast('Sesión cerrada')
}
</script>

<template>
  <div class="page">
    <header class="profile">
      <span class="avatar" :style="{ background: avatarColor }">{{ avatarText }}</span>
      <div>
        <p class="kicker">PERFIL</p>
        <h1 class="large-title">{{ auth.displayName }}</h1>
        <p v-if="auth.user" class="subtitle sync">
          <Cloud :size="14" /> @{{ auth.user.username }} · biblioteca guardada en tu cuenta
        </p>
        <p v-else class="subtitle">Sin cuenta · tu biblioteca solo está en este dispositivo</p>
      </div>
    </header>

    <div class="account">
      <button v-if="!auth.user" class="btn btn--accent" @click="router.push('/login')">
        <LogIn :size="16" /> Iniciar sesión o crear cuenta
      </button>
      <button v-else class="btn" @click="logout"><LogOut :size="16" /> Cerrar sesión</button>
    </div>

    <div class="stats">
      <RouterLink to="/library?tab=Favoritos" class="stat">
        <Heart :size="18" /><strong>{{ lib.favorites.length }}</strong><span>Favoritos</span>
      </RouterLink>
      <RouterLink to="/library" class="stat">
        <ListMusic :size="18" /><strong>{{ lib.playlists.length }}</strong><span>Playlists</span>
      </RouterLink>
      <RouterLink to="/library?tab=Historial" class="stat">
        <Clock :size="18" /><strong>{{ lib.history.length }}</strong><span>Escuchadas</span>
      </RouterLink>
    </div>

    <p class="group-h">Apariencia y sonido</p>
    <ul class="settings">
      <li class="item" role="button" tabindex="0" @click="toggleTheme()" @keydown.enter="toggleTheme()">
        <span class="ic"><component :is="theme === 'dark' ? Moon : Sun" :size="18" /></span>
        <span class="label">Tema</span>
        <span class="val">{{ theme === 'dark' ? 'Oscuro' : 'Claro' }}</span>
        <ChevronRight :size="16" class="chev" />
      </li>
      <li class="item static">
        <span class="ic"><Smartphone :size="18" /></span>
        <span class="label">
          Sonido en segundo plano
          <small>{{
            player.engineName === 'audio'
              ? 'Audio directo: sigue sonando si cambias de app'
              : 'Reproductor de YouTube: se pausa al salir de la app'
          }}</small>
        </span>
        <span class="val" :class="player.engineName === 'audio' ? 'ok' : 'warn'">
          {{ player.engineName === 'audio' ? 'Sí' : 'No' }}
        </span>
      </li>
      <li class="item" role="button" tabindex="0" @click="toggleSpectrum()" @keydown.enter="toggleSpectrum()">
        <span class="ic"><BarChart3 :size="18" /></span>
        <span class="label">
          Espectro real
          <small>Sigue las frecuencias reales; puede cortar el audio en segundo plano</small>
        </span>
        <span class="switch" :class="{ on: realSpectrum }" aria-hidden="true"><i /></span>
      </li>
    </ul>

    <p class="ver">CEPREMIX · v0.2.0</p>
  </div>
</template>

<style scoped>
.profile {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}
.avatar {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 84px;
  height: 84px;
  border-radius: 50%;
  color: #fff;
  font-size: 28px;
  font-weight: 800;
  box-shadow: var(--shadow-2);
}
.kicker {
  margin: 0 0 2px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: var(--text-muted);
}
.account {
  margin-top: var(--space-5);
}
.sync {
  display: flex;
  align-items: center;
  gap: 6px;
}
.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
  margin-top: var(--space-6);
}
.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-3);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text-muted);
  text-decoration: none;
  font-size: 12px;
  transition: background 0.15s;
}
.stat:hover {
  background: var(--surface-2);
}
.stat strong {
  margin-top: 6px;
  font-size: 22px;
  color: var(--text);
}
.group-h {
  margin: var(--space-8) 0 var(--space-2);
  padding-left: var(--space-1);
  font-size: 13px;
  font-weight: 700;
  color: var(--text-muted);
}
/* Lista agrupada estilo iOS / Apple Music */
.settings {
  list-style: none;
  margin: 0;
  padding: 0;
  background: var(--surface);
  border-radius: var(--radius);
  overflow: hidden;
}
.item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  color: var(--text);
  cursor: pointer;
}
.item + .item {
  border-top: 1px solid var(--border);
}
.item:hover {
  background: var(--surface-2);
}
.ic {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--accent) 18%, transparent);
  color: var(--accent);
  flex-shrink: 0;
}
.label {
  flex: 1;
  display: flex;
  flex-direction: column;
  font-size: 15px;
}
.label small {
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-muted);
}
.val {
  color: var(--text-muted);
  font-size: 14px;
}
.val.ok {
  color: var(--accent);
  font-weight: 700;
}
.val.warn {
  color: var(--gold);
  font-weight: 700;
}
.item.static {
  cursor: default;
}
.item.static:hover {
  background: none;
}
.chev {
  color: var(--text-subtle);
}
.switch {
  flex-shrink: 0;
  position: relative;
  width: 46px;
  height: 28px;
  border-radius: 999px;
  background: var(--surface-3);
  transition: background 0.2s;
}
.switch i {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  transition: transform 0.25s var(--ease-spring);
}
.switch.on {
  background: var(--accent);
}
.switch.on i {
  transform: translateX(18px);
}
.ver {
  margin-top: var(--space-8);
  text-align: center;
  color: var(--text-subtle);
  font-size: 12px;
}
@media (min-width: 1024px) {
  .page {
    max-width: 760px;
  }
  .avatar {
    width: 128px;
    height: 128px;
    font-size: 40px;
  }
}
</style>

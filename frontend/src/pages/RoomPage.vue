<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ChevronLeft,
  Play,
  Pause,
  SkipForward,
  Plus,
  Radio,
  Crown,
  Share2,
  LogOut,
  Trash2,
  Search,
  Link2,
  Lock,
  SearchX,
} from 'lucide-vue-next'
import TrackRow from '@/shared/ui/TrackRow.vue'
import EmptyState from '@/shared/ui/EmptyState.vue'
import EqBars from '@/shared/ui/EqBars.vue'
import ListenerAvatars from '@/features/rooms/ListenerAvatars.vue'
import { useRoomStore } from '@/features/rooms/room.store'
import { usePlayerStore } from '@/features/player/player.store'
import { joinRoom } from '@/features/rooms/rooms.api'
import { roomGradient } from '@/features/rooms/useRoomActions'
import { useUiStore } from '@/shared/lib/ui.store'
import { extractVideoId, isLetterboxed } from '@/shared/lib/youtube'
import { apiFetch } from '@/shared/lib/api'
import { useAuthStore } from '@/features/auth/auth.store'
import { mmss } from '@/shared/lib/format'

const route = useRoute()
const router = useRouter()
const room = useRoomStore()
const auth = useAuthStore()
const player = usePlayerStore()
const ui = useUiStore()
const linkInput = ref('')
const password = ref('')
const joining = ref(false)

// Fijado al montar: al navegar fuera, route.params.id deja de existir y no queremos
// que esta página (aún viva durante la transición de salida) reaccione a ello.
const id = ref(String(route.params.id))

// Conectar al entrar (y al pasar de una sala a otra). Ya NO se sale al desmontar:
// la sala sigue activa mientras navegas (p. ej. a Buscar para añadir canciones).
watch(
  () => (route.name === 'room' ? String(route.params.id) : null),
  (rid) => {
    if (!rid) return // saliendo de la página de sala: no tocar la conexión
    id.value = rid
    const token = route.query.t ? String(route.query.t) : undefined
    room.connect(rid, token)
    // No dejar el token en la URL (evita compartirlo sin querer)
    if (token) void router.replace({ name: 'room', params: { id: rid } })
  },
  { immediate: true },
)

const statusLabel = computed(() => {
  switch (room.status) {
    case 'live':
      return 'En vivo'
    case 'reconnecting':
      return 'Reconectando…'
    default:
      return 'Conectando…'
  }
})
const heroBg = computed(() => roomGradient(id.value))
const progress = computed(() => {
  const d = room.current?.durationSec || player.duration
  return d > 0 ? Math.min(100, (room.position / d) * 100) : 0
})
const duration = computed(() => room.current?.durationSec || player.duration)

async function addLink(): Promise<void> {
  const vid = extractVideoId(linkInput.value)
  if (!vid) {
    ui.toast('Ese enlace no parece de YouTube')
    return
  }
  linkInput.value = ''
  // Enriquecer con metadata real para que no aparezca como "YouTube Video <id>"
  try {
    const meta = await apiFetch<{
      title?: string
      seconds?: number
      duration?: number
      uploader?: string
      thumbnail?: string
    }>(`/api/metadata/${vid}`)
    room.enqueue({
      id: vid,
      title: meta.title,
      artist: meta.uploader,
      durationSec: meta.seconds ?? meta.duration,
      thumbnail: meta.thumbnail,
    })
  } catch {
    room.enqueue({ id: vid })
  }
}

async function share(): Promise<void> {
  const url = `${location.origin}/room/${id.value}`
  const title = room.roomName || 'Sala'
  try {
    if (navigator.share) {
      await navigator.share({ title: `${title} · CEPREMIX`, text: 'Escuchemos juntos', url })
      return
    }
    await navigator.clipboard.writeText(url)
    ui.toast('Enlace copiado')
  } catch {
    /* el usuario canceló */
  }
}

// Si se entró directo por un enlace no hay "atrás" dentro de la app
function goBack(): void {
  if (window.history.state?.back) router.back()
  else void router.push('/rooms')
}

function exit(): void {
  room.leave()
  void router.push('/rooms')
}

async function destroy(): Promise<void> {
  const ok = await ui.confirmAction('¿Eliminar la sala?', {
    message: 'Se desconectará a todos los oyentes y se perderá la cola. No se puede deshacer.',
    confirmLabel: 'Eliminar',
    danger: true,
  })
  if (ok && (await room.remove())) void router.push('/rooms')
}

async function unlock(): Promise<void> {
  if (!password.value) return
  joining.value = true
  try {
    const res = await joinRoom(id.value, password.value)
    password.value = ''
    room.connect(id.value, res.session_token)
  } catch {
    ui.toast('Contraseña incorrecta')
  } finally {
    joining.value = false
  }
}
</script>

<template>
  <div v-if="room.status === 'not_found'" class="page state">
    <!-- La sala no existe (o fue eliminada / el servidor se reinició).
         Sin comentarios en la raíz: en dev cuentan como nodos y rompen <Transition>. -->
    <button class="icon-btn back-solo" aria-label="Volver" @click="router.push('/rooms')">
      <ChevronLeft :size="24" />
    </button>
    <EmptyState
      :icon="SearchX"
      title="Esta sala ya no existe"
      hint="Puede que la hayan eliminado o que el servidor se haya reiniciado."
    />
    <div class="state-actions">
      <button class="btn btn--accent" @click="router.push('/rooms')">Ver salas</button>
    </div>
  </div>

  <div v-else-if="room.status === 'denied'" class="page state">
    <!-- Sala privada sin acceso: pedir contraseña aquí mismo -->
    <button class="icon-btn back-solo" aria-label="Volver" @click="router.push('/rooms')">
      <ChevronLeft :size="24" />
    </button>
    <EmptyState :icon="Lock" title="Sala privada" hint="Introduce la contraseña para entrar" />
    <form class="unlock" @submit.prevent="unlock">
      <label class="field">
        <Lock :size="16" />
        <input v-model="password" type="password" placeholder="Contraseña" aria-label="Contraseña" />
      </label>
      <button class="btn btn--accent" type="submit" :disabled="joining">Entrar</button>
    </form>
  </div>

  <div v-else class="room-page">
    <!-- Cabecera inmersiva: carátula difuminada (Apple Music) -->
    <header class="hero">
      <div class="hero-bg" :style="{ background: heroBg }">
        <img v-if="room.current" :src="room.current.thumbnail" alt="" />
      </div>
      <div class="hero-scrim" />

      <div class="hero-inner">
        <div class="hero-top">
          <button class="icon-btn" aria-label="Volver" @click="goBack">
            <ChevronLeft :size="24" />
          </button>
          <span class="status" :class="room.status">
            <span class="live-dot" :class="{ green: room.status === 'live' }" />
            {{ statusLabel }}
          </span>
        </div>

        <p class="kicker">SALA</p>
        <h1 class="name">{{ room.roomName || 'Sala' }}</h1>

        <div class="presence">
          <ListenerAvatars :members="room.members" :names="room.names" :host-id="room.hostId" :self-id="auth.uid" />
          <span class="count">{{ room.listenerCount }} escuchando</span>
          <span class="role" :class="{ host: room.isHost }">
            <Crown v-if="room.isHost" :size="12" /> {{ room.isHost ? 'Eres el host' : 'Invitado' }}
          </span>
        </div>

        <div class="actions">
          <button class="btn btn--accent" @click="router.push('/search')">
            <Search :size="16" /> Añadir canciones
          </button>
          <button class="icon-btn ghost" aria-label="Compartir sala" title="Compartir" @click="share">
            <Share2 :size="18" />
          </button>
          <button class="icon-btn ghost" aria-label="Salir de la sala" title="Salir de la sala" @click="exit">
            <LogOut :size="18" />
          </button>
          <button
            v-if="room.isOwner"
            class="icon-btn ghost danger"
            aria-label="Eliminar sala"
            title="Eliminar sala"
            @click="destroy"
          >
            <Trash2 :size="18" />
          </button>
        </div>
      </div>
    </header>

    <div class="page body">
      <!-- Sonando ahora -->
      <section v-if="room.current" class="now">
        <button class="art" aria-label="Abrir reproductor" @click="player.openFull()">
          <img :class="{ lb: isLetterboxed(room.current.thumbnail) }" :src="room.current.thumbnail" alt="" />
        </button>
        <div class="now-main">
          <span class="now-k"><EqBars :playing="room.playing" :size="12" /> Sonando en la sala</span>
          <p class="t">{{ room.current.title }}</p>
          <p class="a">{{ room.current.artist }}</p>
          <div class="bar"><div class="fill" :style="{ width: progress + '%' }" /></div>
          <div class="times">
            <span>{{ mmss(room.position) }}</span>
            <span>{{ mmss(duration) }}</span>
          </div>
        </div>
        <div class="ctrls">
          <button
            class="play-fab"
            :aria-label="room.playing ? 'Pausar' : 'Reproducir'"
            @click="room.playing ? room.pause() : room.play()"
          >
            <component :is="room.playing ? Pause : Play" :size="22" fill="currentColor" />
          </button>
          <button class="icon-btn" aria-label="Siguiente" @click="room.next()">
            <SkipForward :size="22" fill="currentColor" />
          </button>
        </div>
      </section>
      <section v-else-if="room.connected" class="now now--empty">
        <Radio :size="22" />
        <p>No suena nada todavía. Añade una canción y empezará para todos.</p>
      </section>

      <form class="adder" @submit.prevent="addLink">
        <label class="field">
          <Link2 :size="16" />
          <input v-model="linkInput" placeholder="Pega un enlace de YouTube…" aria-label="Enlace de YouTube" />
        </label>
        <button class="play-fab add" type="submit" aria-label="Añadir a la cola"><Plus :size="20" /></button>
      </form>

      <section>
        <div class="sec-head">
          <h2>A continuación</h2>
          <span class="qcount">{{ room.queue.length }} {{ room.queue.length === 1 ? 'canción' : 'canciones' }}</span>
        </div>
        <ul v-if="room.queue.length" class="list">
          <li v-for="(t, i) in room.queue" :key="t.id"><TrackRow :track="t" :index="i" /></li>
        </ul>
        <EmptyState
          v-else
          :icon="Radio"
          title="La cola está vacía"
          hint="Busca canciones o pega un enlace: se añaden para todos"
        />
      </section>
    </div>
  </div>
</template>

<style scoped>
.state {
  max-width: 520px;
  margin: 0 auto;
}
.back-solo {
  margin-left: -8px;
}
.state-actions {
  display: flex;
  justify-content: center;
}
.unlock {
  display: flex;
  gap: var(--space-2);
}
.unlock .field {
  flex: 1;
}
.unlock .btn {
  height: 46px;
}

/* ---- Hero ---- */
.hero {
  position: relative;
  overflow: hidden;
  isolation: isolate;
}
.hero-bg {
  position: absolute;
  inset: 0;
  z-index: -2;
}
.hero-bg img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: blur(36px) saturate(1.5);
  transform: scale(1.3);
  opacity: 0.85;
}
.hero-scrim {
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.15), var(--bg));
}
.hero-inner {
  padding: calc(env(safe-area-inset-top) + var(--space-3)) var(--space-4) var(--space-5);
}
.hero-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-left: -8px;
  margin-bottom: var(--space-6);
}
.status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(12px);
  font-size: 12px;
  font-weight: 700;
  color: #fff;
}
.status:not(.live) .live-dot {
  background: var(--text-muted);
}
.kicker {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.14em;
  color: color-mix(in srgb, #fff 75%, transparent);
}
.name {
  margin: 4px 0 0;
  font-size: 34px;
  line-height: 1.05;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #fff;
  overflow-wrap: anywhere;
}
.presence {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-4);
  flex-wrap: wrap;
}
.count {
  font-size: 13px;
  color: color-mix(in srgb, #fff 80%, transparent);
}
.role {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 700;
  color: color-mix(in srgb, #fff 70%, transparent);
}
.role.host {
  color: var(--gold);
}
.actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-5);
}
.icon-btn.ghost {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  backdrop-filter: blur(10px);
}
.icon-btn.ghost:hover {
  background: rgba(255, 255, 255, 0.18);
}
.icon-btn.danger {
  color: #ff8c97;
}

/* ---- Cuerpo ---- */
.body {
  padding-top: var(--space-2);
}
.body > section {
  margin-top: var(--space-6);
}
.now {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-top: 0 !important;
  padding: var(--space-3);
  background: color-mix(in srgb, var(--ambient) 14%, var(--surface));
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}
.now .art {
  flex-shrink: 0;
  width: 76px;
  height: 76px;
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--surface-2);
  box-shadow: var(--shadow-1);
}
.now .art img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.now-main {
  flex: 1;
  min-width: 0;
}
.now-k {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: var(--accent);
}
.now .t,
.now .a {
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.now .t {
  margin-top: 2px;
  font-weight: 700;
}
.now .a {
  font-size: 13px;
  color: var(--text-muted);
}
.bar {
  height: 4px;
  margin-top: var(--space-2);
  border-radius: 999px;
  background: color-mix(in srgb, var(--text) 18%, transparent);
  overflow: hidden;
}
.fill {
  height: 100%;
  background: var(--text);
  transition: width 1s linear;
}
.times {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}
.ctrls {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}
.now--empty {
  color: var(--text-muted);
  font-size: 14px;
}
.now--empty p {
  margin: 0;
}
.adder {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-4);
}
.adder .field {
  flex: 1;
}
.adder .add {
  width: 46px;
  height: 46px;
  box-shadow: none;
}
.qcount {
  font-size: 13px;
  color: var(--text-muted);
}

@media (min-width: 1024px) {
  .hero-inner {
    padding: var(--space-6) var(--space-8) var(--space-8);
  }
  .name {
    font-size: 64px;
  }
  .body {
    max-width: 1000px;
  }
}
@media (max-width: 420px) {
  .now {
    gap: var(--space-3);
  }
  .now .art {
    width: 60px;
    height: 60px;
  }
}
</style>

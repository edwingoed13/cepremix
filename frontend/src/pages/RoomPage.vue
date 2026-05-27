<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft, Play, Pause, SkipForward, Plus, Radio, Crown } from 'lucide-vue-next'
import TrackRow from '@/shared/ui/TrackRow.vue'
import EmptyState from '@/shared/ui/EmptyState.vue'
import ListenerAvatars from '@/features/rooms/ListenerAvatars.vue'
import { useRoomStore } from '@/features/rooms/room.store'
import { extractVideoId } from '@/shared/lib/youtube'
import { apiFetch } from '@/shared/lib/api'
import { userId } from '@/shared/lib/identity'

const route = useRoute()
const router = useRouter()
const room = useRoomStore()
const linkInput = ref('')
const isHost = computed(() => room.hostId !== null && room.hostId === userId)

onMounted(() => {
  const id = String(route.params.id)
  const token = route.query.t ? String(route.query.t) : undefined
  room.connect(id, token)
})
onUnmounted(() => room.leave())

async function addLink(): Promise<void> {
  const id = extractVideoId(linkInput.value)
  if (!id) return
  linkInput.value = ''
  // Enriquecer con metadata real para que no aparezca como "YouTube Video <id>"
  try {
    const meta = await apiFetch<{
      title?: string
      seconds?: number
      duration?: number
      uploader?: string
      thumbnail?: string
    }>(`/api/metadata/${id}`)
    room.enqueue({
      id,
      title: meta.title,
      artist: meta.uploader,
      durationSec: meta.seconds ?? meta.duration,
      thumbnail: meta.thumbnail,
    })
  } catch {
    room.enqueue({ id })
  }
}
</script>

<template>
  <div class="page">
    <header class="topbar">
      <button class="icon" aria-label="Volver" @click="router.push('/')"><ChevronLeft :size="24" /></button>
      <div class="title">
        <h1>{{ room.roomName || 'Sala' }}</h1>
        <span class="status" :class="{ on: room.connected }">
          <Radio :size="12" /> {{ room.connected ? 'En vivo' : 'Conectando…' }}
        </span>
      </div>
    </header>

    <div class="presence">
      <ListenerAvatars :members="room.members" :host-id="room.hostId" :self-id="userId" />
      <span class="count">{{ room.listenerCount }} escuchando</span>
      <span class="role" :class="{ host: isHost }">
        <Crown v-if="isHost" :size="12" /> {{ isHost ? 'Eres el host' : 'Invitado' }}
      </span>
    </div>

    <section v-if="room.current" class="now">
      <img class="art" :src="room.current.thumbnail" :alt="room.current.title" />
      <div class="meta">
        <p class="t">{{ room.current.title }}</p>
        <p class="a">{{ room.current.artist }}</p>
      </div>
      <div class="ctrls">
        <button
          class="play"
          :aria-label="room.playing ? 'Pausar' : 'Reproducir'"
          @click="room.playing ? room.pause() : room.play()"
        >
          <component :is="room.playing ? Pause : Play" :size="22" fill="currentColor" />
        </button>
        <button class="icon" aria-label="Siguiente" @click="room.next()">
          <SkipForward :size="22" fill="currentColor" />
        </button>
      </div>
    </section>

    <form class="adder" @submit.prevent="addLink">
      <input v-model="linkInput" placeholder="Pega un link de YouTube o un ID…" aria-label="Añadir canción" />
      <button type="submit" aria-label="Añadir"><Plus :size="20" /></button>
    </form>

    <h2 class="qh">En cola</h2>
    <ul v-if="room.queue.length" class="list">
      <li v-for="t in room.queue" :key="t.id"><TrackRow :track="t" /></li>
    </ul>
    <EmptyState
      v-else
      :icon="Radio"
      title="La cola está vacía"
      hint="Añade canciones desde Buscar o pegando un link"
    />
  </div>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.title h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
}
.status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
}
.status.on {
  color: var(--success);
}
.icon {
  background: none;
  border: 0;
  color: var(--text);
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
}
.notice {
  margin: var(--space-3) 0 0;
  padding: var(--space-2) var(--space-3);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 13px;
}
.presence {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-3);
  flex-wrap: wrap;
}
.count {
  font-size: 13px;
  color: var(--text-muted);
}
.role {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  margin-left: auto;
}
.role.host {
  color: #ffcf4d;
}
.now {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-4);
  padding: var(--space-3);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.now .art {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-sm);
  object-fit: cover;
}
.now .meta {
  flex: 1;
  min-width: 0;
}
.now .t,
.now .a {
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.now .t {
  font-weight: 600;
}
.now .a {
  font-size: 13px;
  color: var(--text-muted);
}
.ctrls {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}
.play {
  background: var(--accent);
  color: #fff;
  border: 0;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: grid;
  place-items: center;
}
.adder {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-4);
}
.adder input {
  flex: 1;
  height: 44px;
  padding: 0 var(--space-3);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  outline: none;
}
.adder button {
  width: 44px;
  border: 0;
  border-radius: var(--radius);
  background: var(--accent);
  color: #fff;
  display: grid;
  place-items: center;
}
.qh {
  margin: var(--space-6) 0 var(--space-2);
  font-size: 16px;
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

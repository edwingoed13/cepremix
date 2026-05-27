<script setup lang="ts">
import { computed } from 'vue'
import { Radio, Plus, Lock, Globe } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import type { Track } from '@/entities/track'
import TrackCard from '@/shared/ui/TrackCard.vue'
import { usePlayerStore } from '@/features/player/player.store'
import { useLibraryStore } from '@/features/library/library.store'
import { useUiStore } from '@/shared/lib/ui.store'
import { listRooms, createRoom, joinRoom, type RoomSummary } from '@/features/rooms/rooms.api'
import { recommendForYou, topArtists } from '@/features/recommendations/recommendations'

const player = usePlayerStore()
const lib = useLibraryStore()
const router = useRouter()
const ui = useUiStore()

const { data: rooms, isError: roomsError } = useQuery({ queryKey: ['rooms'], queryFn: listRooms })

const recent = computed(() => lib.history.slice(0, 15))
const seedTracks = computed(() => [...lib.history, ...lib.favorites])
const recsKey = computed(() => topArtists(seedTracks.value, 3).join('|') || 'default')
const { data: recs, isFetching: recsLoading } = useQuery({
  queryKey: ['recs', recsKey],
  queryFn: () => recommendForYou(seedTracks.value),
  staleTime: 10 * 60_000,
})

function play(list: Track[], i: number): void {
  player.playQueue(list, i)
}

async function openRoom(r: RoomSummary): Promise<void> {
  if (r.requires_password) {
    const pw = await ui.promptText(`Contraseña de "${r.name}"`, 'Contraseña')
    if (!pw) return
    try {
      const res = await joinRoom(r.id, pw)
      router.push({ name: 'room', params: { id: r.id }, query: { t: res.session_token } })
    } catch {
      ui.toast('No se pudo entrar (¿contraseña incorrecta?)')
    }
  } else {
    router.push({ name: 'room', params: { id: r.id } })
  }
}

async function newRoom(): Promise<void> {
  const name = await ui.promptText('Nueva sala', 'Nombre de la sala')
  if (!name) return
  const res = await createRoom(name)
  router.push({ name: 'room', params: { id: res.room_id } })
}

const greeting = ((): string => {
  const h = new Date().getHours()
  if (h < 6) return 'Buenas noches'
  if (h < 13) return 'Buenos días'
  if (h < 20) return 'Buenas tardes'
  return 'Buenas noches'
})()
</script>

<template>
  <div class="page">
    <header class="head"><h1>{{ greeting }}</h1></header>

    <section>
      <div class="sec-head">
        <h2>Salas en vivo</h2>
        <span class="live"><Radio :size="13" /> En directo</span>
      </div>
      <p v-if="roomsError" class="err">No se pudieron cargar las salas (¿backend en :8000?)</p>
      <div class="hscroll">
        <button v-for="r in rooms ?? []" :key="r.id" class="room" @click="openRoom(r)">
          <div class="room-top">
            <component :is="r.requires_password ? Lock : Globe" :size="18" />
            <span class="badge">{{ r.requires_password ? 'PRIVADA' : 'PÚBLICA' }}</span>
          </div>
          <p class="room-name">{{ r.name }}</p>
        </button>
        <button class="room room--new" @click="newRoom()">
          <Plus :size="22" />
          <span>Crear sala</span>
        </button>
      </div>
    </section>

    <section v-if="recent.length">
      <div class="sec-head"><h2>Continuar escuchando</h2></div>
      <div class="hscroll">
        <TrackCard v-for="(t, i) in recent" :key="t.id" :track="t" @click="play(recent, i)" />
      </div>
    </section>

    <section>
      <div class="sec-head"><h2>Para ti</h2></div>
      <div v-if="recsLoading && !(recs && recs.length)" class="hscroll">
        <div v-for="n in 6" :key="n" class="skel" />
      </div>
      <div v-else class="hscroll">
        <TrackCard v-for="(t, i) in recs ?? []" :key="t.id" :track="t" @click="play(recs ?? [], i)" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.live {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--success);
}
.err {
  margin: 0 0 var(--space-3);
  font-size: 13px;
  color: var(--danger);
}
.room {
  flex: 0 0 auto;
  width: 180px;
  text-align: left;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-4);
  color: inherit;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.room:active {
  transform: scale(0.98);
}
.room-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--accent);
}
.badge {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 2px 6px;
}
.room-name {
  margin: 0;
  font-weight: 600;
}
.room--new {
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  border-style: dashed;
}
.skel {
  flex: 0 0 auto;
  width: 144px;
  height: 188px;
  border-radius: var(--radius);
  background: var(--surface-2);
  animation: pulse 1.2s ease-in-out infinite;
}
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}
</style>

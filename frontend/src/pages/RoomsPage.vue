<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { Plus, Radio, ServerCrash } from 'lucide-vue-next'
import RoomCard from '@/features/rooms/RoomCard.vue'
import EmptyState from '@/shared/ui/EmptyState.vue'
import { listRooms } from '@/features/rooms/rooms.api'
import { useRoomActions } from '@/features/rooms/useRoomActions'

const { openRoom, newRoom } = useRoomActions()
const { data: rooms, isError, isLoading } = useQuery({
  queryKey: ['rooms'],
  queryFn: listRooms,
  refetchInterval: 15_000,
})

const liveRooms = computed(() => (rooms.value ?? []).filter((r) => r.listeners > 0))
const quietRooms = computed(() => (rooms.value ?? []).filter((r) => r.listeners === 0))
</script>

<template>
  <div class="page">
    <header class="head">
      <h1>Salas</h1>
      <p class="subtitle">Escucha en sincronía con tus amigos: una cola, el mismo segundo.</p>
    </header>

    <div class="actions">
      <button class="btn btn--accent" @click="newRoom()"><Plus :size="18" /> Crear sala</button>
    </div>

    <EmptyState
      v-if="isError"
      :icon="ServerCrash"
      title="No se pudieron cargar las salas"
      hint="¿Está corriendo el backend en :8000?"
    />

    <template v-else>
      <section v-if="isLoading" class="grid">
        <div v-for="n in 4" :key="n" class="skel sk" />
      </section>

      <section v-if="liveRooms.length">
        <div class="sec-head">
          <h2><span class="live-dot" /> En vivo ahora</h2>
        </div>
        <div class="grid">
          <RoomCard v-for="r in liveRooms" :key="r.id" :room="r" fluid @open="openRoom(r)" />
        </div>
      </section>

      <section v-if="quietRooms.length || !isLoading">
        <div class="sec-head">
          <h2>{{ liveRooms.length ? 'Otras salas' : 'Todas las salas' }}</h2>
        </div>
        <div class="grid">
          <RoomCard v-for="r in quietRooms" :key="r.id" :room="r" fluid @open="openRoom(r)" />
          <RoomCard create fluid @open="newRoom()" />
        </div>
      </section>

      <EmptyState
        v-if="!isLoading && !(rooms && rooms.length)"
        :icon="Radio"
        title="Aún no hay salas"
        hint="Crea la primera y comparte el enlace"
      />
    </template>
  </div>
</template>

<style scoped>
.actions {
  margin-top: var(--space-4);
}
.sec-head h2 {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-5) var(--space-3);
}
.sk {
  aspect-ratio: 1 / 1.25;
}
@media (min-width: 640px) {
  .grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: var(--space-6) var(--space-5);
  }
}
</style>

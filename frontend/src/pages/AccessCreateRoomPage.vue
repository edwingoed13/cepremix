<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQueryClient } from '@tanstack/vue-query'
import { Radio, ShieldAlert } from 'lucide-vue-next'
import EmptyState from '@/shared/ui/EmptyState.vue'
import { AccessRequiredError, createRoom } from '@/features/rooms/rooms.api'

/*
 * Se llega aquí DESPUÉS de pasar por Cloudflare Access (esta ruta está bajo /acceso/*).
 * Crea la sala con el nombre recibido y entra. No vuelve a redirigir a Access por su
 * cuenta (evita bucles si el correo no está autorizado).
 */
const route = useRoute()
const router = useRouter()
const qc = useQueryClient()
const failed = ref<'' | 'access' | 'other'>('')

onMounted(async () => {
  const name = typeof route.query.nombre === 'string' ? route.query.nombre.trim() : ''
  if (!name) {
    void router.replace('/rooms')
    return
  }
  try {
    const res = await createRoom(name)
    void qc.invalidateQueries({ queryKey: ['rooms'] })
    void router.replace({ name: 'room', params: { id: res.room_id } })
  } catch (e) {
    failed.value = e instanceof AccessRequiredError ? 'access' : 'other'
  }
})
</script>

<template>
  <div class="page state">
    <EmptyState
      v-if="failed === 'access'"
      :icon="ShieldAlert"
      title="Tu correo no tiene permiso para crear salas"
      hint="Pide que lo añadan a la lista de Cloudflare Access. Puedes seguir escuchando y unirte a salas."
    />
    <EmptyState
      v-else-if="failed === 'other'"
      :icon="ShieldAlert"
      title="No se pudo crear la sala"
      hint="Inténtalo de nuevo en un momento."
    />
    <EmptyState v-else :icon="Radio" title="Creando tu sala…" hint="Un segundo" />
    <div v-if="failed" class="actions">
      <button class="btn btn--accent" @click="router.replace('/rooms')">Ver salas</button>
    </div>
  </div>
</template>

<style scoped>
.state {
  max-width: 520px;
  margin: 0 auto;
}
.actions {
  display: flex;
  justify-content: center;
}
</style>

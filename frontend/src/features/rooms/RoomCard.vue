<script setup lang="ts">
import { computed } from 'vue'
import { Lock, Headphones, Plus } from 'lucide-vue-next'
import type { RoomSummary } from './rooms.api'
import { roomGradient } from './useRoomActions'
import { useRoomStore } from './room.store'
import { isLetterboxed } from '@/shared/lib/youtube'

const props = defineProps<{ room?: RoomSummary; create?: boolean; fluid?: boolean }>()
const emit = defineEmits<{ open: [] }>()

const store = useRoomStore()
const isMine = computed(() => !!props.room && store.roomId === props.room.id && store.active)
const live = computed(() => (props.room?.listeners ?? 0) > 0 || !!props.room?.now_playing)
const bg = computed(() => (props.room ? roomGradient(props.room.id) : undefined))
</script>

<template>
  <button v-if="create" class="rc rc--new" :class="{ fluid }" @click="emit('open')">
    <span class="plus"><Plus :size="26" /></span>
    <span class="new-t">Crear sala</span>
    <span class="new-s">Escuchen juntos, en sincronía</span>
  </button>

  <button v-else-if="room" class="rc" :class="{ fluid, mine: isMine }" @click="emit('open')">
    <span class="cover" :style="{ background: bg }">
      <img
        v-if="room.now_playing"
        class="cover-img"
        :class="{ lb: isLetterboxed(room.now_playing.thumbnail) }"
        :src="room.now_playing.thumbnail"
        alt=""
        loading="lazy"
      />
      <span class="shade" />
      <span class="badges">
        <span v-if="isMine" class="badge badge--mine"><span class="live-dot green" /> Estás aquí</span>
        <span v-else-if="live" class="badge"><span class="live-dot" /> EN VIVO</span>
        <span v-if="room.requires_password" class="badge badge--icon" title="Privada"><Lock :size="12" /></span>
      </span>
      <span class="cover-name">{{ room.name }}</span>
    </span>
    <span class="info">
      <span v-if="room.now_playing" class="np">{{ room.now_playing.title }}</span>
      <span v-else class="np muted">{{ room.requires_password ? 'Sala privada' : 'Sin música ahora' }}</span>
      <span class="ls"><Headphones :size="12" /> {{ room.listeners }} {{ room.listeners === 1 ? 'oyente' : 'oyentes' }}</span>
    </span>
  </button>
</template>

<style scoped>
.rc {
  --w: 172px;
  flex: 0 0 auto;
  width: var(--w);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  text-align: left;
}
.rc.fluid {
  width: 100%;
}
.rc:active {
  transform: scale(0.98);
}
.cover {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-1);
}
.mine .cover {
  box-shadow:
    0 0 0 2px var(--accent),
    var(--shadow-1);
}
.cover-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s var(--ease-out);
}
.shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.78), rgba(0, 0, 0, 0.05) 55%);
}
.badges {
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  display: flex;
  justify-content: space-between;
  gap: 6px;
}
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(10px);
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
}
.badge--mine {
  letter-spacing: 0;
  font-size: 11px;
}
.badge--icon {
  margin-left: auto;
  width: 22px;
  padding: 0;
  justify-content: center;
}
.cover-name {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 10px;
  color: #fff;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1.15;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
}
.info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: 0 2px;
}
.np {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.np.muted {
  color: var(--text-muted);
  font-weight: 500;
}
.ls {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-muted);
}

/* Tarjeta "Crear sala" */
.rc--new {
  aspect-ratio: auto;
  justify-content: center;
  align-items: center;
  text-align: center;
  height: calc(var(--w) + 44px);
  border: 1.5px dashed var(--border-strong);
  border-radius: var(--radius);
  color: var(--text-muted);
  transition:
    border-color 0.15s,
    color 0.15s;
}
.rc--new.fluid {
  height: auto;
  aspect-ratio: 1 / 1.25;
}
.rc--new:hover {
  border-color: var(--accent);
  color: var(--text);
}
.plus {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--accent);
  color: var(--accent-ink);
  margin-bottom: 4px;
}
.new-t {
  font-weight: 700;
  color: var(--text);
}
.new-s {
  font-size: 12px;
  padding: 0 var(--space-3);
}
@media (hover: hover) {
  .rc:hover .cover-img {
    transform: scale(1.05);
  }
}
@media (min-width: 1024px) {
  .rc {
    --w: 196px;
  }
}
</style>

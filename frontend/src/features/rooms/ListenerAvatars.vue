<script setup lang="ts">
import { computed } from 'vue'
import { Crown, User } from 'lucide-vue-next'
import { colorFor, initials } from '@/shared/lib/identity'

const props = defineProps<{
  members: string[]
  hostId: string | null
  selfId: string
  /** id -> nombre visible (solo quienes tienen cuenta) */
  names?: Record<string, string>
}>()

const MAX = 6
const shown = computed(() => props.members.slice(0, MAX))
const extra = computed(() => Math.max(0, props.members.length - MAX))

function label(id: string): string {
  const name = props.names?.[id]
  const who = id === props.selfId ? `${name ?? 'Tú'} (tú)` : (name ?? 'Oyente sin cuenta')
  return id === props.hostId ? `${who} · host` : who
}
</script>

<template>
  <div class="avatars">
    <div
      v-for="(m, i) in shown"
      :key="m + i"
      class="av"
      :class="{ self: m === selfId }"
      :style="{ background: colorFor(m), zIndex: shown.length - i }"
      :title="label(m)"
      :aria-label="label(m)"
    >
      <span v-if="names?.[m]" class="ini">{{ initials(names[m] as string) }}</span>
      <User v-else :size="14" />
      <span v-if="m === hostId" class="crown" title="Host"><Crown :size="10" /></span>
    </div>
    <div v-if="extra > 0" class="more">+{{ extra }}</div>
  </div>
</template>

<style scoped>
.avatars {
  display: flex;
  align-items: center;
}
.av {
  position: relative;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  border: 2px solid var(--bg);
  margin-left: -8px;
}
.av:first-child {
  margin-left: 0;
}
.av.self {
  box-shadow: 0 0 0 2px var(--accent);
}
.ini {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.02em;
}
.crown {
  position: absolute;
  top: -6px;
  right: -5px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--bg);
  color: var(--gold);
  display: grid;
  place-items: center;
}
.more {
  margin-left: -8px;
  min-width: 30px;
  height: 30px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--text-muted);
  border: 2px solid var(--bg);
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 600;
}
</style>

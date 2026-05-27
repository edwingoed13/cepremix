<script setup lang="ts">
/**
 * Texto que se desplaza (marquee de ida y vuelta) solo cuando no cabe — como el
 * título de "ahora suena" en Apple Music. Si cabe, se queda quieto.
 */
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'

const props = defineProps<{ text: string }>()

const root = ref<HTMLElement | null>(null)
const inner = ref<HTMLElement | null>(null)
const distance = ref(0)
let ro: ResizeObserver | null = null

function measure(): void {
  const r = root.value
  const i = inner.value
  if (!r || !i) return
  const d = i.scrollWidth - r.clientWidth
  distance.value = d > 4 ? d : 0
}

onMounted(() => {
  measure()
  ro = new ResizeObserver(() => measure())
  if (root.value) ro.observe(root.value)
})
onBeforeUnmount(() => ro?.disconnect())
watch(
  () => props.text,
  () => nextTick(measure),
)
</script>

<template>
  <div ref="root" class="mq">
    <span
      ref="inner"
      class="mq-in"
      :class="{ run: distance > 0 }"
      :style="{ '--mq-d': -distance + 'px' }"
      >{{ text }}</span
    >
  </div>
</template>

<style scoped>
.mq {
  overflow: hidden;
  white-space: nowrap;
  max-width: 100%;
}
.mq-in {
  display: inline-block;
  will-change: transform;
}
.mq-in.run {
  animation: mq 9s ease-in-out infinite alternate;
}
@keyframes mq {
  0%,
  12% {
    transform: translateX(0);
  }
  88%,
  100% {
    transform: translateX(var(--mq-d));
  }
}
@media (prefers-reduced-motion: reduce) {
  .mq-in.run {
    animation: none;
  }
}
</style>

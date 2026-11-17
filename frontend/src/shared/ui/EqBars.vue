<script setup lang="ts">
/** Barras de ecualizador animadas: marca la canción que está sonando. */
defineProps<{ playing?: boolean; size?: number }>()
</script>

<template>
  <span
    class="eq"
    :class="{ paused: !playing }"
    :style="{ '--s': (size ?? 14) + 'px' }"
    role="img"
    aria-label="Sonando ahora"
  >
    <i /><i /><i />
  </span>
</template>

<style scoped>
.eq {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  width: var(--s);
  height: var(--s);
  color: var(--accent);
}
.eq i {
  flex: 1;
  height: 100%;
  border-radius: 1px;
  background: currentColor;
  transform-origin: bottom;
  animation: eq 0.9s ease-in-out infinite;
}
.eq i:nth-child(2) {
  animation-delay: -0.3s;
  animation-duration: 0.7s;
}
.eq i:nth-child(3) {
  animation-delay: -0.55s;
  animation-duration: 1.05s;
}
.eq.paused i {
  animation-play-state: paused;
}
@keyframes eq {
  0%,
  100% {
    transform: scaleY(0.3);
  }
  50% {
    transform: scaleY(1);
  }
}
</style>

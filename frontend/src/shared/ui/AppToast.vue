<script setup lang="ts">
import { useUiStore } from '@/shared/lib/ui.store'

const ui = useUiStore()
</script>

<template>
  <Teleport to="body">
    <TransitionGroup name="toast" tag="div" class="toaster">
      <div v-for="t in ui.toasts" :key="t.id" class="toast">{{ t.message }}</div>
    </TransitionGroup>
  </Teleport>
</template>

<style scoped>
.toaster {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(var(--tabbar-h) + var(--mini-h) + env(safe-area-inset-bottom) + var(--space-3));
  z-index: 90;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  width: max-content;
  max-width: 90vw;
  pointer-events: none;
}
.toast {
  background: var(--text);
  color: var(--bg);
  font-size: 14px;
  font-weight: 500;
  padding: 10px 16px;
  border-radius: 999px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>

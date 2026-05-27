<script setup lang="ts">
defineProps<{ open: boolean; title?: string }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="open" class="overlay" @click.self="emit('close')">
        <div class="sheet" role="dialog" aria-modal="true">
          <div class="grip" />
          <h3 v-if="title" class="title">{{ title }}</h3>
          <div class="body"><slot /></div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: flex-end;
  background: rgba(0, 0, 0, 0.5);
}
.sheet {
  width: 100%;
  background: var(--surface);
  border-top-left-radius: var(--radius-lg);
  border-top-right-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-4) calc(env(safe-area-inset-bottom) + var(--space-6));
  max-height: 80dvh;
  overflow-y: auto;
}
.grip {
  width: 40px;
  height: 4px;
  border-radius: 999px;
  background: var(--border);
  margin: 0 auto var(--space-3);
}
.title {
  margin: 0 0 var(--space-3);
  font-size: 17px;
  font-weight: 700;
}
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.22s ease;
}
.sheet-enter-active .sheet,
.sheet-leave-active .sheet {
  transition: transform 0.26s ease;
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
.sheet-enter-from .sheet,
.sheet-leave-to .sheet {
  transform: translateY(100%);
}
</style>

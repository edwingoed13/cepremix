<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{ icon: Component; title: string; hint?: string }>()
</script>

<template>
  <div class="empty">
    <span class="ic"><component :is="icon" :size="30" :stroke-width="1.75" /></span>
    <p class="title">{{ title }}</p>
    <p v-if="hint" class="hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-2);
  color: var(--text-muted);
  padding: var(--space-10) var(--space-4);
}
.ic {
  display: grid;
  place-items: center;
  width: 68px;
  height: 68px;
  border-radius: 50%;
  background: var(--surface-2);
  color: var(--text-muted);
  margin-bottom: var(--space-2);
}
.title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
}
.hint {
  margin: 0;
  max-width: 320px;
  font-size: 14px;
  line-height: 1.45;
}
</style>

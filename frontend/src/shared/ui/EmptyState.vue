<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{ icon: Component; title: string; hint?: string }>()
</script>

<template>
  <div class="empty">
    <component :is="icon" :size="40" :stroke-width="1.5" />
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
  padding: var(--space-8) var(--space-4);
}
.title {
  margin: var(--space-2) 0 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}
.hint {
  margin: 0;
  font-size: 14px;
}
</style>

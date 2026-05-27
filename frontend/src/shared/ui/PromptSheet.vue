<script setup lang="ts">
import { ref, watch } from 'vue'
import AppSheet from './AppSheet.vue'
import { useUiStore } from '@/shared/lib/ui.store'

const ui = useUiStore()
const value = ref('')

watch(
  () => ui.prompt,
  () => {
    value.value = ''
  },
)

function confirm(): void {
  ui.resolvePrompt(value.value.trim() || null)
}
function cancel(): void {
  ui.resolvePrompt(null)
}
</script>

<template>
  <AppSheet :open="!!ui.prompt" :title="ui.prompt?.title" @close="cancel">
    <input
      v-model="value"
      class="inp"
      :placeholder="ui.prompt?.placeholder"
      @keydown.enter="confirm"
    />
    <div class="actions">
      <button class="ghost" @click="cancel">Cancelar</button>
      <button class="primary" @click="confirm">Aceptar</button>
    </div>
  </AppSheet>
</template>

<style scoped>
.inp {
  width: 100%;
  height: 46px;
  padding: 0 var(--space-3);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  outline: none;
  font-size: 15px;
}
.actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-4);
}
.actions button {
  flex: 1;
  height: 44px;
  border-radius: var(--radius);
  border: 0;
  font-weight: 600;
}
.ghost {
  background: var(--surface-2);
  color: var(--text);
}
.primary {
  background: var(--accent);
  color: #fff;
}
</style>

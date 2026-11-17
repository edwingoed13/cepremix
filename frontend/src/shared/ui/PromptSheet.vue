<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import AppSheet from './AppSheet.vue'
import { useUiStore } from '@/shared/lib/ui.store'

const ui = useUiStore()
const value = ref('')
const input = ref<HTMLInputElement | null>(null)

watch(
  () => ui.prompt,
  async (p) => {
    value.value = ''
    if (p?.kind === 'text') {
      await nextTick()
      input.value?.focus()
    }
  },
)

function confirm(): void {
  if (ui.prompt?.kind === 'confirm') ui.resolvePrompt('ok')
  else ui.resolvePrompt(value.value.trim() || null)
}
function cancel(): void {
  ui.resolvePrompt(null)
}
</script>

<template>
  <AppSheet :open="!!ui.prompt" :title="ui.prompt?.title" @close="cancel">
    <p v-if="ui.prompt?.message" class="msg">{{ ui.prompt.message }}</p>
    <input
      v-if="ui.prompt?.kind === 'text'"
      ref="input"
      v-model="value"
      class="inp"
      :type="ui.prompt?.inputType ?? 'text'"
      :placeholder="ui.prompt?.placeholder"
      @keydown.enter="confirm"
    />
    <div class="actions">
      <button class="btn ghost" @click="cancel">Cancelar</button>
      <button
        class="btn"
        :class="ui.prompt?.danger ? 'danger' : 'btn--accent'"
        @click="confirm"
      >
        {{ ui.prompt?.confirmLabel ?? 'Aceptar' }}
      </button>
    </div>
  </AppSheet>
</template>

<style scoped>
.msg {
  margin: 0 0 var(--space-4);
  font-size: 14px;
  line-height: 1.45;
  color: var(--text-muted);
}
.inp {
  width: 100%;
  height: 48px;
  padding: 0 var(--space-3);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  outline: none;
  font-size: 15px;
  font-family: inherit;
}
.inp:focus {
  border-color: var(--border-strong);
}
.actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-4);
}
.actions .btn {
  flex: 1;
  height: 46px;
}
.ghost {
  background: var(--surface-2);
  border-color: transparent;
}
.danger {
  background: var(--danger);
  border-color: transparent;
  color: #fff;
}
</style>

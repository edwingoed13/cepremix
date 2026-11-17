<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'

const props = defineProps<{ open: boolean; title?: string }>()
const emit = defineEmits<{ close: [] }>()

/*
 * Teclado en móvil: Chrome Android (y Safari iOS) NO mueven los elementos fijos al abrir
 * el teclado: solo encogen el "visual viewport". Medimos cuánto tapa el teclado y subimos
 * la hoja esa altura, para que los botones (Crear / Aceptar) queden siempre visibles.
 */
const kb = ref(0) // px que tapa el teclado
const vvHeight = ref<number | null>(null)

function measure(): void {
  const vv = window.visualViewport
  if (!vv) return
  kb.value = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))
  vvHeight.value = vv.height
}
function listen(on: boolean): void {
  const vv = window.visualViewport
  if (!vv) return
  const fn = on ? vv.addEventListener.bind(vv) : vv.removeEventListener.bind(vv)
  fn('resize', measure)
  fn('scroll', measure)
}
watch(
  () => props.open,
  (open) => {
    listen(open)
    if (open) measure()
    else kb.value = 0
  },
  { immediate: true },
)
onBeforeUnmount(() => listen(false))
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div
        v-if="open"
        class="overlay"
        :style="kb ? { paddingBottom: kb + 'px' } : undefined"
        @click.self="emit('close')"
      >
        <div
          class="sheet"
          :class="{ 'kb-open': kb > 0 }"
          role="dialog"
          aria-modal="true"
          :style="kb && vvHeight ? { maxHeight: vvHeight - 16 + 'px' } : undefined"
        >
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
  transition: max-height 0.15s ease;
}
/* Con el teclado abierto la hoja queda pegada a él: sobra el margen de la barra de gestos */
.sheet.kb-open {
  padding-bottom: var(--space-4);
}
.overlay {
  transition: padding-bottom 0.15s ease;
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
.overlay {
  backdrop-filter: blur(4px);
}
.sheet {
  border: 1px solid var(--border);
  border-bottom: 0;
}
/* Desktop: diálogo centrado en vez de hoja inferior */
@media (min-width: 1024px) {
  .overlay {
    align-items: center;
    justify-content: center;
  }
  .sheet {
    width: 420px;
    border-radius: var(--radius-lg);
    border-bottom: 1px solid var(--border);
    padding: var(--space-6);
    box-shadow: var(--shadow-2);
  }
  .grip {
    display: none;
  }
  .sheet-enter-from .sheet,
  .sheet-leave-to .sheet {
    transform: scale(0.96);
  }
}
</style>

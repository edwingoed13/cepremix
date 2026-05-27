<script setup lang="ts">
import { ref } from 'vue'
import { Sun, Moon, Waves, BarChart3 } from 'lucide-vue-next'
import { theme, toggleTheme } from '@/shared/lib/theme'
import { useUiStore } from '@/shared/lib/ui.store'
import { usePlayerStore } from '@/features/player/player.store'

const ui = useUiStore()
const player = usePlayerStore()
const audioEngine = ref(localStorage.getItem('engine') !== 'youtube')
function toggleEngine(): void {
  audioEngine.value = !audioEngine.value
  localStorage.setItem('engine', audioEngine.value ? 'audio' : 'youtube')
  ui.toast('Recarga la página para aplicar el motor de audio')
}

const realSpectrum = ref(localStorage.getItem('spectrum') === 'real')
function toggleSpectrum(): void {
  realSpectrum.value = !realSpectrum.value
  localStorage.setItem('spectrum', realSpectrum.value ? 'real' : 'off')
  if (realSpectrum.value) player.enableAnalyser() // engancha al instante al audio en curso
  ui.toast(realSpectrum.value ? 'Espectro real activado' : 'Espectro estilizado')
}
</script>

<template>
  <div class="page">
    <header class="head"><h1>Perfil</h1></header>

    <ul class="settings">
      <li class="item" role="button" tabindex="0" @click="toggleTheme()" @keydown.enter="toggleTheme()">
        <component :is="theme === 'dark' ? Moon : Sun" :size="20" />
        <span class="label">Tema</span>
        <span class="val">{{ theme === 'dark' ? 'Oscuro' : 'Claro' }}</span>
      </li>
      <li class="item" role="button" tabindex="0" @click="toggleEngine()" @keydown.enter="toggleEngine()">
        <Waves :size="20" />
        <span class="label">Motor de audio (experimental)</span>
        <span class="val">{{ audioEngine ? '<audio> real' : 'YouTube iframe' }}</span>
      </li>
      <li class="item" role="button" tabindex="0" @click="toggleSpectrum()" @keydown.enter="toggleSpectrum()">
        <BarChart3 :size="20" />
        <span class="label">Espectro real (Web Audio)</span>
        <span class="val">{{ realSpectrum ? 'Activado' : 'Estilizado' }}</span>
      </li>
    </ul>

    <p class="ver">CEPREMIX · v0.1.0</p>
  </div>
</template>

<style scoped>
.settings {
  list-style: none;
  margin: var(--space-4) 0 0;
  padding: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}
.item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  color: var(--text);
}
.item + .item {
  border-top: 1px solid var(--border);
}
.item:active {
  background: var(--surface-2);
}
.label {
  flex: 1;
}
.val {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-muted);
  font-size: 14px;
}
.ver {
  margin-top: var(--space-6);
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
}
</style>

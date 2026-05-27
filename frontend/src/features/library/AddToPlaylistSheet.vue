<script setup lang="ts">
import { Plus } from 'lucide-vue-next'
import AppSheet from '@/shared/ui/AppSheet.vue'
import { useUiStore } from '@/shared/lib/ui.store'
import { useLibraryStore } from '@/features/library/library.store'

const ui = useUiStore()
const lib = useLibraryStore()

function add(playlistId: string): void {
  if (!ui.addTarget) return
  const ok = lib.addTrackToPlaylist(playlistId, ui.addTarget)
  ui.toast(ok ? 'Añadida a la playlist' : 'Ya estaba en la playlist')
  ui.closeAddToPlaylist()
}

async function createAndAdd(): Promise<void> {
  const target = ui.addTarget
  ui.closeAddToPlaylist() // cerrar esta hoja primero para que el prompt salga al frente
  const name = await ui.promptText('Nombre de la playlist', 'Mi playlist')
  if (!name || !target) return
  const p = lib.createPlaylist(name)
  lib.addTrackToPlaylist(p.id, target)
  ui.toast('Playlist creada')
}
</script>

<template>
  <AppSheet :open="!!ui.addTarget" title="Añadir a playlist" @close="ui.closeAddToPlaylist()">
    <button class="opt new" @click="createAndAdd()">
      <Plus :size="18" /> Nueva playlist
    </button>
    <button v-for="p in lib.playlists" :key="p.id" class="opt" @click="add(p.id)">
      <span class="name">{{ p.name }}</span>
      <span class="cnt">{{ p.tracks.length }}</span>
    </button>
  </AppSheet>
</template>

<style scoped>
.opt {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-3);
  background: none;
  border: 0;
  border-radius: var(--radius);
  color: var(--text);
  font-size: 15px;
  text-align: left;
}
.opt:active {
  background: var(--surface-2);
}
.opt .name {
  flex: 1;
}
.cnt {
  color: var(--text-muted);
  font-size: 13px;
}
.new {
  color: var(--accent);
  font-weight: 600;
}
</style>

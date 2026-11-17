import { ref, watch } from 'vue'
import { usePlayerStore } from './player.store'
import { getDominantColor } from '@/shared/lib/color'

/** Color dominante del arte que suena (null = sin color / CORS). */
export const ambientColor = ref<string | null>(null)

let started = false

/**
 * Tiñe la app con el color de la carátula actual (como Spotify/YouTube Music):
 * expone `--ambient` en :root para degradados de cabecera, mini-player, etc.
 * Llamar una sola vez (App.vue).
 */
export function useAmbientColor(): void {
  if (started) return
  started = true
  const player = usePlayerStore()
  watch(
    () => player.current?.thumbnail,
    async (url) => {
      const color = url ? await getDominantColor(url) : null
      if (url !== player.current?.thumbnail) return // llegó tarde: ya suena otra
      ambientColor.value = color
      const root = document.documentElement.style
      if (color) root.setProperty('--ambient', color)
      else root.removeProperty('--ambient')
    },
    { immediate: true },
  )
}

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Track } from '@/entities/track'

interface Toast {
  id: number
  message: string
}
interface PromptRequest {
  title: string
  placeholder: string
  resolve: (value: string | null) => void
}

/** Estado de UI global: toasts y hojas (sheets) — reemplaza alert()/prompt(). */
export const useUiStore = defineStore('ui', () => {
  const toasts = ref<Toast[]>([])
  let nextId = 1
  function toast(message: string): void {
    const id = nextId++
    toasts.value.push({ id, message })
    window.setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id)
    }, 2600)
  }

  // Prompt de texto como Promise (sustituye a window.prompt)
  const prompt = ref<PromptRequest | null>(null)
  function promptText(title: string, placeholder = ''): Promise<string | null> {
    return new Promise((resolve) => {
      prompt.value = { title, placeholder, resolve }
    })
  }
  function resolvePrompt(value: string | null): void {
    prompt.value?.resolve(value)
    prompt.value = null
  }

  // Hoja "añadir a playlist"
  const addTarget = ref<Track | null>(null)
  function openAddToPlaylist(track: Track): void {
    addTarget.value = track
  }
  function closeAddToPlaylist(): void {
    addTarget.value = null
  }

  return {
    toasts,
    toast,
    prompt,
    promptText,
    resolvePrompt,
    addTarget,
    openAddToPlaylist,
    closeAddToPlaylist,
  }
})

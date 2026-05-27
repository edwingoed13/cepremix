import { ref } from 'vue'

export type ThemeName = 'dark' | 'light'

const stored = (localStorage.getItem('theme') as ThemeName | null) ?? 'dark'
export const theme = ref<ThemeName>(stored)

function apply(name: ThemeName) {
  document.documentElement.dataset.theme = name
  localStorage.setItem('theme', name)
}
apply(theme.value)

export function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  apply(theme.value)
}

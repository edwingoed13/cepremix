import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import './style.css'
import App from '@/app/App.vue'
import { router } from '@/app/router'

createApp(App).use(createPinia()).use(router).use(VueQueryPlugin).mount('#app')

// PWA: registrar el service worker solo en producción (en dev interferiría con el HMR)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

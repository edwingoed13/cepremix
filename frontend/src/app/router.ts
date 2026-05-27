import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('@/pages/HomePage.vue') },
    { path: '/search', name: 'search', component: () => import('@/pages/SearchPage.vue') },
    { path: '/room/:id', name: 'room', component: () => import('@/pages/RoomPage.vue') },
    { path: '/playlist/:id', name: 'playlist', component: () => import('@/pages/PlaylistPage.vue') },
    { path: '/library', name: 'library', component: () => import('@/pages/LibraryPage.vue') },
    { path: '/settings', name: 'settings', component: () => import('@/pages/SettingsPage.vue') },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

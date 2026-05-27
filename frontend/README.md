# CEPREMIX — Frontend

SPA mobile-first en **Vue 3 + Vite + TypeScript** que reemplaza al monolito `index.html` (Vue 2 por CDN).
Arquitectura **feature-based**, dark-first, **iconos Lucide (sin emojis)** y un **motor de audio abstracto**
(`PlaybackEngine`) hoy implementado sobre el reproductor de YouTube.

## Requisitos
- Node ≥ 18 (probado con Node 24)

## Comandos
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # vue-tsc (typecheck) + vite build -> dist/
npm run preview  # sirve el build de producción
```
El catálogo de muestra (`src/features/search/mock.ts`) reproduce videos reales de YouTube,
por lo que la app **corre sin backend** en Fase 0.

## Integración con FastAPI
En desarrollo, Vite hace proxy de `/api`, `/ws` y `/stream` hacia `http://127.0.0.1:8000`
(ver `vite.config.ts`). En producción, FastAPI puede servir el build:
```python
from fastapi.staticfiles import StaticFiles
app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="spa")
```

## Estructura
```
src/
├── app/          # App.vue (layout persistente) + router
├── shared/       # ui/ (design system), lib/ (api, format, theme), styles
├── features/     # player/ (núcleo), search/ ...  (verticales autocontenidas)
├── pages/        # Home, Search, Library, Settings
└── entities/     # modelos de dominio (Track, Playlist, Room, User)
```

## Decisiones clave
- **Player persistente:** el motor de audio vive en `player.store` (Pinia), fuera del árbol de
  rutas. El `<div id="yt-player">` está montado en `App.vue` → el audio nunca se reinicia al navegar.
- **`PlaybackEngine` abstracto:** hoy `YouTubeEngine`; mañana, si se hospeda audio propio, basta crear
  `HtmlAudioEngine` con la misma interfaz sin tocar la UI.
- **Tokens de diseño:** todo color es `var(--*)` en `style.css`; tema vía `data-theme` (dark/light).
- **Media Session API:** controles en pantalla de bloqueo / notificación.

## Pendiente (siguientes fases)
- Wiring real de búsqueda y **salas en tiempo real (WebSocket)** contra FastAPI.
- Biblioteca (playlists/favoritos/historial), drag-to-reorder, PWA, tests (Vitest/Playwright).
- Limitación conocida: reproducción en **background en mobile** con iframe de YouTube es frágil
  (suspensión de iframe + ToS de YouTube); a futuro evaluar audio propio.

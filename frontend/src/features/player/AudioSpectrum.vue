<script setup lang="ts">
/**
 * Visualizador del reproductor ampliado — estilo "barras clásicas" (ecualizador):
 * barritas verticales desde abajo, con punta redondeada y degradado teñido con el
 * color del arte del álbum.
 *
 * - Con motor <audio> + "Espectro real" activado → FFT real (getFrequencyData).
 * - Si no hay FFT → animación estilizada según el estado de reproducción.
 */
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { usePlayerStore } from './player.store'

const props = defineProps<{ playing: boolean; color?: string }>()
const player = usePlayerStore()

const canvas = ref<HTMLCanvasElement | null>(null)
const BARS = 40
const heights = new Array<number>(BARS).fill(0)
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

let ctx: CanvasRenderingContext2D | null = null
let raf = 0
let energy = 0
let grad: CanvasGradient | null = null
let ro: ResizeObserver | null = null

function baseColor(): string {
  return (
    props.color ||
    getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() ||
    '#7c5cff'
  )
}

function buildGradient(h: number): void {
  if (!ctx) return
  const c = baseColor()
  // De abajo (color pleno) hacia arriba (se desvanece en la punta)
  grad = ctx.createLinearGradient(0, h, 0, 0)
  grad.addColorStop(0, c)
  grad.addColorStop(0.7, c)
  grad.addColorStop(1, 'transparent')
}

function resize(): void {
  const el = canvas.value
  if (!el) return
  const dpr = window.devicePixelRatio || 1
  const w = el.clientWidth
  const h = el.clientHeight
  if (!w || !h) return
  el.width = Math.floor(w * dpr)
  el.height = Math.floor(h * dpr)
  ctx = el.getContext('2d')
  if (!ctx) return
  ctx.scale(dpr, dpr)
  buildGradient(h)
  if (reduced) drawFrame(0, true)
}

function rrect(x: number, y: number, w: number, h: number, r: number): void {
  if (!ctx) return
  const rr = Math.min(r, w / 2, Math.abs(h) / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
  ctx.fill()
}

function drawFrame(t: number, staticOnly = false): void {
  const el = canvas.value
  if (!el || !ctx) return
  const w = el.clientWidth
  const h = el.clientHeight
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = grad ?? baseColor()

  energy += ((props.playing ? 1 : 0) - energy) * 0.08
  const freq = player.getFrequencyData()
  const time = t / 1000
  const gap = Math.max(3, w / BARS / 3)
  const bw = (w - gap * (BARS - 1)) / BARS

  for (let i = 0; i < BARS; i++) {
    let level: number
    if (staticOnly) {
      level = (props.playing ? 0.4 : 0.12) * (0.5 + 0.5 * Math.sin((i / BARS) * Math.PI))
    } else if (freq) {
      // Espectro REAL: altura desde los bins del AnalyserNode
      const bin = Math.floor((i / BARS) * freq.length * 0.7)
      level = (freq[bin] ?? 0) / 255
    } else {
      // Estilizado (sin FFT): movimiento orgánico por sinusoides
      const phase = i * 0.5
      const env = 0.45 + 0.55 * Math.sin((i / BARS) * Math.PI)
      const wob =
        Math.sin(time * 2.5 + phase) * 0.5 +
        Math.sin(time * 6 + phase * 1.7) * 0.3 +
        Math.sin(time * 11 + i) * 0.2
      level = (0.12 + 0.88 * (0.5 + 0.5 * wob)) * env * energy
    }
    const cur = heights[i] ?? 0
    const next = cur + (Math.max(0.02, level) - cur) * 0.35
    heights[i] = next
    const bh = Math.max(2, next * h)
    rrect(i * (bw + gap), h - bh, bw, bh, Math.min(bw / 2, 4))
  }

  if (!staticOnly) raf = requestAnimationFrame(drawFrame)
}

onMounted(() => {
  resize()
  ro = new ResizeObserver(() => resize())
  if (canvas.value) ro.observe(canvas.value)
  if (!reduced) raf = requestAnimationFrame(drawFrame)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  ro?.disconnect()
})

watch(
  () => props.color,
  () => {
    const el = canvas.value
    if (el) buildGradient(el.clientHeight)
  },
)
watch(
  () => props.playing,
  () => {
    if (reduced) drawFrame(0, true)
  },
)
</script>

<template>
  <canvas ref="canvas" class="spectrum" aria-hidden="true" />
</template>

<style scoped>
.spectrum {
  width: 100%;
  height: 80px;
  display: block;
}
</style>

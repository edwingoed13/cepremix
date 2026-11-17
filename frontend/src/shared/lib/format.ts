/** Segundos -> "m:ss" (o "h:mm:ss" desde una hora: mixes largos de YouTube) */
export function mmss(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

/** "3:45" o "1:02:03" -> segundos. Acepta también un número ya en segundos. */
export function parseDurationLabel(label: string | number): number {
  if (typeof label === 'number') return label
  if (!label) return 0
  const parts = label.split(':').map((n) => parseInt(n, 10))
  if (parts.some((n) => Number.isNaN(n))) return 0
  return parts.reduce((acc, n) => acc * 60 + n, 0)
}

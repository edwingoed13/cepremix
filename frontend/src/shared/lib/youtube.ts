/** Extrae el id de video de una URL de YouTube; si ya es un id (11 chars), lo devuelve. */
export function extractVideoId(input: string): string {
  const s = input.trim()
  const m = s.match(/(?:v=|youtu\.be\/|\/embed\/|\/shorts\/)([\w-]{11})/)
  if (m) return m[1]
  return s
}

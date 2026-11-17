/**
 * Las miniaturas 4:3 de YouTube (hqdefault/sddefault/0.jpg) traen bandas negras
 * arriba y abajo en videos 16:9. Las marcamos para recortarlas con CSS (.lb).
 */
export function isLetterboxed(url: string | undefined | null): boolean {
  return !!url && /\/(hqdefault|sddefault|0)\.jpg(\?|$)/.test(url)
}

/** Extrae el id de video de una URL de YouTube; si ya es un id (11 chars), lo devuelve. */
export function extractVideoId(input: string): string {
  const s = input.trim()
  const m = s.match(/(?:v=|youtu\.be\/|\/embed\/|\/shorts\/)([\w-]{11})/)
  if (m) return m[1]
  return s
}

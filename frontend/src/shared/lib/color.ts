/**
 * Color dominante (promedio, con saturación realzada) de una imagen, para teñir la UI
 * con los colores del arte del álbum. Devuelve null si no se puede leer por CORS;
 * el llamador usa el color de acento como fallback.
 */
export async function getDominantColor(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const size = 16
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(null)
        ctx.drawImage(img, 0, 0, size, size)
        const { data } = ctx.getImageData(0, 0, size, size)
        let r = 0
        let g = 0
        let b = 0
        let n = 0
        for (let i = 0; i < data.length; i += 4) {
          r += data[i] ?? 0
          g += data[i + 1] ?? 0
          b += data[i + 2] ?? 0
          n++
        }
        resolve(boostSaturation(r / n, g / n, b / n))
      } catch {
        resolve(null) // imagen "tainted" por CORS
      }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

/** rgb promedio -> hsl con saturación realzada y luminosidad acotada (tinte vivo). */
function boostSaturation(r: number, g: number, b: number): string {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const d = max - min
  let h = 0
  let s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  s = Math.min(1, s * 1.6 + 0.12)
  const ll = Math.min(0.66, Math.max(0.46, l))
  return `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(ll * 100)}%)`
}

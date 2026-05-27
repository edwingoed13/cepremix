import { describe, it, expect } from 'vitest'
import { mmss, parseDurationLabel } from './format'
import { extractVideoId } from './youtube'

describe('mmss', () => {
  it('formatea segundos como m:ss', () => {
    expect(mmss(0)).toBe('0:00')
    expect(mmss(65)).toBe('1:05')
    expect(mmss(3599)).toBe('59:59')
  })
  it('nunca devuelve negativos', () => {
    expect(mmss(-10)).toBe('0:00')
  })
})

describe('parseDurationLabel', () => {
  it('parsea "m:ss" y "h:mm:ss"', () => {
    expect(parseDurationLabel('3:45')).toBe(225)
    expect(parseDurationLabel('1:02:03')).toBe(3723)
  })
  it('acepta un número ya en segundos y maneja vacío', () => {
    expect(parseDurationLabel(200)).toBe(200)
    expect(parseDurationLabel('')).toBe(0)
  })
})

describe('extractVideoId', () => {
  it('extrae el id de distintas URLs de YouTube', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=bdz90srbneU')).toBe('bdz90srbneU')
    expect(extractVideoId('https://youtu.be/bdz90srbneU')).toBe('bdz90srbneU')
    expect(extractVideoId('https://www.youtube.com/shorts/bdz90srbneU')).toBe('bdz90srbneU')
  })
  it('devuelve la entrada si ya es un id', () => {
    expect(extractVideoId('bdz90srbneU')).toBe('bdz90srbneU')
  })
})

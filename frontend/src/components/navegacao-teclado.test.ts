import { describe, expect, it } from 'vitest'
import { proximoIndice } from './navegacao-teclado'

const todos = [true, true, true]

describe('proximoIndice', () => {
  it('seta direita avança e volta ao início no fim (circular)', () => {
    expect(proximoIndice('ArrowRight', 0, todos, 'horizontal')).toBe(1)
    expect(proximoIndice('ArrowRight', 2, todos, 'horizontal')).toBe(0)
  })
  it('seta esquerda recua e vai ao fim no início (circular)', () => {
    expect(proximoIndice('ArrowLeft', 1, todos, 'horizontal')).toBe(0)
    expect(proximoIndice('ArrowLeft', 0, todos, 'horizontal')).toBe(2)
  })
  it('Home e End vão aos extremos', () => {
    expect(proximoIndice('Home', 2, todos, 'horizontal')).toBe(0)
    expect(proximoIndice('End', 0, todos, 'horizontal')).toBe(2)
  })
  it('setas verticais só valem quando o eixo é "ambos"', () => {
    expect(proximoIndice('ArrowDown', 0, todos, 'horizontal')).toBeNull()
    expect(proximoIndice('ArrowDown', 0, todos, 'ambos')).toBe(1)
    expect(proximoIndice('ArrowUp', 0, todos, 'ambos')).toBe(2)
  })
  it('pula itens desabilitados', () => {
    expect(proximoIndice('ArrowRight', 0, [true, false, true], 'ambos')).toBe(2)
    expect(proximoIndice('ArrowLeft', 0, [true, false, true], 'ambos')).toBe(2)
    expect(proximoIndice('Home', 2, [false, true, true], 'ambos')).toBe(1)
    expect(proximoIndice('End', 0, [true, true, false], 'ambos')).toBe(1)
  })
  it('ignora outras teclas e lista sem itens habilitados', () => {
    expect(proximoIndice('a', 0, todos, 'ambos')).toBeNull()
    expect(proximoIndice('ArrowRight', 0, [false, false], 'ambos')).toBeNull()
  })
  it('sem item atual (-1) a seta direita vai ao primeiro habilitado', () => {
    expect(proximoIndice('ArrowRight', -1, [false, true, true], 'ambos')).toBe(1)
  })
})

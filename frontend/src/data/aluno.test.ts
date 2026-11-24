import { describe, expect, it } from 'vitest'
import { calcularMediaAvaliacoes } from './aluno'

describe('média das avaliações do aluno', () => {
  it('calcula a média com uma casa decimal', () => {
    expect(calcularMediaAvaliacoes([9, 9, 3.3])).toBe(7.1)
  })

  it('retorna indefinido quando não há avaliações', () => {
    expect(calcularMediaAvaliacoes([])).toBeUndefined()
  })

  it('calcula a média geral das notas exibidas no resultado', () => {
    expect(calcularMediaAvaliacoes([8.5, 9, 8.5, 8.5, 8, 9])).toBe(8.6)
  })
})

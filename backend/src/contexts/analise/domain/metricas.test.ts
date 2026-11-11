import { describe, expect, it } from 'vitest'
import { dificuldadesGerais, distribuicao, dominioMedio, maiorDificuldade, taxaDeResposta } from './metricas.ts'

describe('métricas de domínio', () => {
  it('R-50 maior dificuldade é o nível mais frequente; empate vai para o pior', () => {
    expect(maiorDificuldade(['I', 'P', 'P', 'C'])).toBe('P')
    expect(maiorDificuldade(['I', 'P'])).toBe('P')
    expect(maiorDificuldade(['I', 'C', 'P', 'C', 'P'])).toBe('C')
    expect(maiorDificuldade([])).toBeNull()
  })
  it('R-51 domínio médio é a média das notas × 10 arredondada', () => {
    expect(dominioMedio([10, 5, 7.5])).toBe(75)
    expect(dominioMedio([])).toBeNull()
  })
  it('R-52 taxa de resposta é enviados ÷ esperados', () => {
    expect(taxaDeResposta(3, 4)).toBe(75)
    expect(taxaDeResposta(0, 0)).toBe(0)
  })
  it('R-53 distribuição em % por nível', () => {
    expect(distribuicao(['I', 'P', 'P', 'C'])).toEqual({ I: 25, P: 50, C: 25 })
    expect(distribuicao([])).toEqual({ I: 0, P: 0, C: 0 })
  })
  it('R-53 dificuldades gerais contam alunos que erraram cada pergunta, em ordem decrescente', () => {
    const perguntas = [
      { id: 'q1', enunciado: 'Média', tipo: 'unica' as const, opcoes: ['a', 'b'], gabarito: [0] },
      { id: 'q2', enunciado: 'Moda', tipo: 'unica' as const, opcoes: ['a', 'b'], gabarito: [0] },
    ]
    const respostas = [{ q1: [1], q2: [0] }, { q1: [1], q2: [1] }, { q1: [0], q2: [0] }]
    expect(dificuldadesGerais(perguntas, respostas)).toEqual([
      { titulo: 'Média', total: 2 },
      { titulo: 'Moda', total: 1 },
    ])
  })
})

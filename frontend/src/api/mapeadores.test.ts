import { describe, expect, it } from 'vitest'
import { paraAutoavaliacao } from './mapeadores'

describe('mapeamento da nota do aluno', () => {
  it('usa notaGeral como nota final quando a API não envia nota separada', () => {
    const autoavaliacao = paraAutoavaliacao({
      id: 'avaliacao-1',
      titulo: 'Conteúdo',
      turmaId: 'turma-1',
      status: 'respondido',
      enviadoEm: '2026-11-23T23:00:00.000Z',
      notaGeral: 8.5,
      mostrarGabarito: false,
      perguntas: [],
      respostas: {},
    })

    expect(autoavaliacao.nota).toBe(8.5)
  })
})

import { describe, expect, it } from 'vitest'
import { filtrarEOrdenarAlunos } from './alunos-turma'

const alunos = [
  { id: '1', nome: 'João Silva', dominio: 80, enviados: '3 / 5' },
  { id: '2', nome: 'Ana Costa', dominio: null, enviados: '1 / 5' },
  { id: '3', nome: 'Bruno Lima', dominio: 60, enviados: '4 / 5' },
]

describe('busca e ordenação dos alunos da equipe', () => {
  it('busca nomes sem diferenciar acentos ou maiúsculas', () => {
    expect(filtrarEOrdenarAlunos(alunos, 'JOAO', 'nome', true).map((aluno) => aluno.id)).toEqual(['1'])
  })

  it('ordena os nomes alfabeticamente', () => {
    expect(filtrarEOrdenarAlunos(alunos, '', 'nome', true).map((aluno) => aluno.id)).toEqual(['2', '3', '1'])
  })

  it('ordena pelos formulários enviados, usando a quantidade respondida', () => {
    expect(filtrarEOrdenarAlunos(alunos, '', 'enviados', false).map((aluno) => aluno.id)).toEqual(['3', '1', '2'])
  })

  it('mantém domínio não disponível no fim, mesmo em ordem decrescente', () => {
    expect(filtrarEOrdenarAlunos(alunos, '', 'dominio', false).map((aluno) => aluno.id)).toEqual(['1', '3', '2'])
  })
})

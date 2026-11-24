import { describe, expect, it } from 'vitest'
import type { Pergunta } from '../../autoavaliacoes/domain/pergunta.ts'
import { calcularNota, classificarCompreensao } from './nota.ts'
import { enviarEnvio, novoEnvio, registrarResposta, statusParaAluno } from './envio.ts'

const agora = new Date('2026-09-10T12:00:00Z')
const perguntas: Pergunta[] = [
  { id: 'q1', enunciado: 'a', tipo: 'unica', opcoes: ['x', 'y'], gabarito: [0] },
  { id: 'q2', enunciado: 'b', tipo: 'multipla', opcoes: ['x', 'y', 'z'], gabarito: [0, 2] },
  { id: 'q3', enunciado: 'c', tipo: 'unica', opcoes: ['x', 'y'] },
]
const envio = () => novoEnvio({ id: 'e1', formularioId: 'f1', alunoId: 'a1', turmaId: 't1' }, agora)

describe('Nota e compreensão', () => {
  it('R-45 calcula acertos sobre perguntas com gabarito (ordem das marcações não importa)', () => {
    expect(calcularNota(perguntas, { q1: [0], q2: [2, 0], q3: [1] })).toBe(10)
    expect(calcularNota(perguntas, { q1: [0], q2: [0], q3: [1] })).toBe(5)
  })
  it('R-45 sem gabarito não há nota', () => {
    expect(calcularNota([perguntas[2]!], { q3: [0] })).toBeUndefined()
  })
  it('R-46 classifica I/P/C pela nota', () => {
    expect(classificarCompreensao(8)).toBe('I')
    expect(classificarCompreensao(7.5)).toBe('P')
    expect(classificarCompreensao(6)).toBe('P')
    expect(classificarCompreensao(5.5)).toBe('C')
    expect(classificarCompreensao(undefined)).toBeUndefined()
  })
})

describe('Envio', () => {
  it('R-43 resposta com índice inexistente é rejeitada', () => {
    expect(() => registrarResposta(envio(), perguntas[0]!, [7], agora)).toThrowError(/opção/i)
  })
  it('R-43 pergunta única aceita só uma opção', () => {
    expect(() => registrarResposta(envio(), perguntas[0]!, [0, 1], agora)).toThrowError(/uma opção/i)
  })
  it('R-42 salvar resposta mantém rascunho e registra a marcação', () => {
    const e = registrarResposta(envio(), perguntas[0]!, [1], agora)
    expect(e.status).toBe('rascunho')
    expect(e.respostas.q1).toEqual([1])
  })
  it('R-44 enviar exige todas as perguntas respondidas', () => {
    const e = registrarResposta(envio(), perguntas[0]!, [0], agora)
    expect(() => enviarEnvio(e, perguntas, undefined, agora)).toThrowError(/todas/i)
  })
  it('R-44/R-45/R-46 enviar calcula nota e nível, e o envio fica imutável', () => {
    let e = envio()
    e = registrarResposta(e, perguntas[0]!, [0], agora)
    e = registrarResposta(e, perguntas[1]!, [0, 2], agora)
    e = registrarResposta(e, perguntas[2]!, [1], agora)
    const enviado = enviarEnvio(e, perguntas, 'Gostei', agora)
    expect(enviado).toMatchObject({ status: 'enviado', nota: 10, compreensao: 'I', observacao: 'Gostei', enviadoEm: agora })
    expect(() => registrarResposta(enviado, perguntas[0]!, [1], agora)).toThrowError(/enviad/i)
    expect(() => enviarEnvio(enviado, perguntas, undefined, agora)).toThrowError(/enviad/i)
  })
  it('R-48 nota geral aceita 0–10 em intervalos de 0,5 e guarda o valor', () => {
    let e = envio()
    e = registrarResposta(e, perguntas[0]!, [0], agora)
    e = registrarResposta(e, perguntas[1]!, [0, 2], agora)
    e = registrarResposta(e, perguntas[2]!, [1], agora)
    const enviado = enviarEnvio(e, perguntas, undefined, agora, 7.5)
    expect(enviado).toMatchObject({ nota: 7.5, notaGeral: 7.5 })
    expect(() => enviarEnvio(e, perguntas, undefined, agora, 7.3)).toThrowError(/nota geral/i)
  })
  it('R-46 opções fixas IPC prevalecem pela pior categoria marcada', () => {
    const fixa: Pergunta = {
      id: 'ipc',
      enunciado: 'Qual foi a principal dificuldade?',
      tipo: 'multipla',
      opcoes: ['Interpretação', 'Procedimento', 'Cálculo', 'Não tive tempo / Deixei em branco'],
      categoriasOpcao: ['I', 'P', 'C', null],
    }
    let e = registrarResposta(envio(), fixa, [0, 1], agora)
    expect(enviarEnvio(e, [fixa], undefined, agora).compreensao).toBe('P')
    e = registrarResposta(e, fixa, [0, 2, 3], agora)
    expect(enviarEnvio(e, [fixa], undefined, agora).compreensao).toBe('C')
  })
  it('R-46 opção fixa sem categoria IPC não gera nível', () => {
    const fixa: Pergunta = {
      id: 'ipc',
      enunciado: 'Qual foi a principal dificuldade?',
      tipo: 'multipla',
      opcoes: ['Interpretação', 'Procedimento', 'Cálculo', 'Não tive tempo / Deixei em branco'],
      categoriasOpcao: ['I', 'P', 'C', null],
    }
    const e = registrarResposta(envio(), fixa, [3], agora)
    expect(enviarEnvio(e, [fixa], undefined, agora).compreensao).toBeUndefined()
  })
})

describe('Status para o aluno', () => {
  it('R-41 pendente / andamento / respondido / encerrado', () => {
    expect(statusParaAluno(undefined, true)).toBe('pendente')
    expect(statusParaAluno(envio(), true)).toBe('andamento')
    expect(statusParaAluno({ ...envio(), status: 'enviado' }, false)).toBe('respondido')
    expect(statusParaAluno(undefined, false)).toBe('encerrado')
    expect(statusParaAluno(envio(), false)).toBe('encerrado')
  })
})

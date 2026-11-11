import { describe, expect, it } from 'vitest'
import { aceitaRespostas, alterarStatus, atualizarFormulario, criarFormulario, materializarAgendamento } from './formulario.ts'
import type { Pergunta } from './pergunta.ts'

const agora = new Date('2026-09-10T12:00:00Z')
const amanha = new Date('2026-09-11T12:00:00Z')
const ontem = new Date('2026-09-09T12:00:00Z')
const pergunta = (id = 'p1'): Pergunta => ({ id, enunciado: 'Qual a média de 2 e 4?', tipo: 'unica', opcoes: ['3', '4'], gabarito: [0] })
const base = { id: 'f1', titulo: 'Quiz', turmaId: 't1' }

describe('Formulario — criação', () => {
  it('R-20 exige título', () => {
    expect(() => criarFormulario({ ...base, titulo: ' ', perguntas: [] }, agora)).toThrowError(/título/i)
  })
  it('R-22 sem postar nem data fica em rascunho', () => {
    expect(criarFormulario({ ...base, perguntas: [] }, agora).status).toBe('rascunho')
  })
  it('R-22 postar publica como aberto', () => {
    const f = criarFormulario({ ...base, postar: true, perguntas: [pergunta()] }, agora)
    expect(f.status).toBe('aberto')
    expect(f.publicadoEm).toEqual(agora)
  })
  it('R-22 com data futura fica agendado', () => {
    const f = criarFormulario({ ...base, publicarEm: amanha, perguntas: [pergunta()] }, agora)
    expect(f.status).toBe('agendado')
  })
  it('R-23 não publica sem perguntas', () => {
    expect(() => criarFormulario({ ...base, postar: true, perguntas: [] }, agora)).toThrowError(/pergunta/i)
  })
  it('R-24 não agenda para o passado', () => {
    expect(() => criarFormulario({ ...base, publicarEm: ontem, perguntas: [pergunta()] }, agora)).toThrowError(/passado/i)
  })
})

describe('Formulario — perguntas', () => {
  it('R-27 exige enunciado e ao menos 2 opções', () => {
    expect(() => criarFormulario({ ...base, perguntas: [{ ...pergunta(), enunciado: '' }] }, agora)).toThrowError(/enunciado/i)
    expect(() => criarFormulario({ ...base, perguntas: [{ ...pergunta(), opcoes: ['só uma'] }] }, agora)).toThrowError(/opções/i)
  })
  it('R-27 gabarito com índice inexistente é inválido', () => {
    expect(() => criarFormulario({ ...base, perguntas: [{ ...pergunta(), gabarito: [5] }] }, agora)).toThrowError(/gabarito/i)
  })
  it('R-27 pergunta única aceita só um item no gabarito', () => {
    expect(() => criarFormulario({ ...base, perguntas: [{ ...pergunta(), gabarito: [0, 1] }] }, agora)).toThrowError(/gabarito/i)
  })
})

describe('Formulario — ciclo de vida', () => {
  const rascunho = () => criarFormulario({ ...base, perguntas: [pergunta()] }, agora)
  const aberto = () => alterarStatus(rascunho(), 'aberto', agora)

  it('R-25 rascunho → aberto → fechado → aberto → concluído', () => {
    const f = alterarStatus(alterarStatus(aberto(), 'fechado', agora), 'aberto', agora)
    expect(alterarStatus(f, 'concluido', agora).status).toBe('concluido')
  })
  it('R-25 concluído é final', () => {
    const c = alterarStatus(aberto(), 'concluido', agora)
    expect(() => alterarStatus(c, 'aberto', agora)).toThrowError(/transição/i)
  })
  it('R-25 rascunho não pode ir direto para fechado', () => {
    expect(() => alterarStatus(rascunho(), 'fechado', agora)).toThrowError(/transição/i)
  })
  it('R-23 publicar rascunho sem perguntas falha', () => {
    const vazio = criarFormulario({ ...base, perguntas: [] }, agora)
    expect(() => alterarStatus(vazio, 'aberto', agora)).toThrowError(/pergunta/i)
  })
  it('R-26 agendado vencido é materializado como aberto', () => {
    const ag = criarFormulario({ ...base, publicarEm: amanha, perguntas: [pergunta()] }, agora)
    expect(materializarAgendamento(ag, new Date('2026-09-11T12:00:01Z')).status).toBe('aberto')
    expect(materializarAgendamento(ag, agora).status).toBe('agendado')
  })
  it('R-28 perguntas só mudam em rascunho/agendado', () => {
    expect(atualizarFormulario(rascunho(), { perguntas: [pergunta('p9')] }, agora).perguntas[0]?.id).toBe('p9')
    expect(() => atualizarFormulario(aberto(), { perguntas: [pergunta('p9')] }, agora)).toThrowError(/publicado/i)
  })
  it('R-28 título e gabarito visível mudam mesmo publicado', () => {
    const f = atualizarFormulario(aberto(), { titulo: 'Novo', mostrarGabarito: true }, agora)
    expect(f.titulo).toBe('Novo')
    expect(f.mostrarGabarito).toBe(true)
  })
  it('R-42 só aceita respostas quando aberto e dentro do prazo', () => {
    const f = aberto()
    expect(aceitaRespostas(f, agora)).toBe(true)
    expect(aceitaRespostas({ ...f, prazo: ontem }, agora)).toBe(false)
    expect(aceitaRespostas({ ...f, status: 'fechado' }, agora)).toBe(false)
  })
})

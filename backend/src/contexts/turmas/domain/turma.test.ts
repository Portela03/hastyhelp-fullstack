import { describe, expect, it } from 'vitest'
import { criarPeriodoLetivo } from './periodo-letivo.ts'
import { gerarSigla } from './sigla.ts'
import { criarTurma, editarTurma } from './turma.ts'

const base = { id: 't1', docenteId: 'd1', codigoConvite: 'abc123', criadaEm: new Date('2026-08-01T10:00:00Z') }

describe('PeriodoLetivo', () => {
  it('R-10 aceita o formato AAAA/NN', () => {
    expect(criarPeriodoLetivo('2026/02')).toBe('2026/02')
  })
  it('R-10 rejeita formato inválido', () => {
    expect(() => criarPeriodoLetivo('2026-2')).toThrowError(/período/i)
    expect(() => criarPeriodoLetivo('2026/00')).toThrowError(/período/i)
  })
})

describe('Sigla', () => {
  it('R-11 gera sigla das iniciais ignorando conectivos', () => {
    expect(gerarSigla('Programação para Dispositivos Móveis')).toBe('PDM')
    expect(gerarSigla('Banco de Dados')).toBe('BD')
  })
  it('R-11 limita a 3 letras', () => {
    expect(gerarSigla('Engenharia de Software Avançada Turma Um')).toHaveLength(3)
  })
})

describe('Turma', () => {
  it('R-10 exige nome', () => {
    expect(() => criarTurma({ ...base, nome: '  ', periodo: '2026/02' })).toThrowError(/nome/i)
  })
  it('R-11 usa cor padrão e sigla gerada quando não informadas', () => {
    const t = criarTurma({ ...base, nome: 'Banco de Dados', periodo: '2026/02' })
    expect(t.sigla).toBe('BD')
    expect(t.cor).toMatch(/^#[0-9a-fA-F]{6}$/)
    expect(t.oculta).toBe(false)
  })
  it('R-11 rejeita cor que não é hex', () => {
    expect(() => criarTurma({ ...base, nome: 'X', periodo: '2026/02', cor: 'vermelho' })).toThrowError(/cor/i)
  })
  it('R-14 editar permite ocultar sem alterar o resto', () => {
    const t = criarTurma({ ...base, nome: 'Banco de Dados', periodo: '2026/02' })
    const o = editarTurma(t, { oculta: true })
    expect(o.oculta).toBe(true)
    expect(o.nome).toBe('Banco de Dados')
  })
  it('R-11 sigla editada vai para maiúsculas', () => {
    const t = criarTurma({ ...base, nome: 'Banco de Dados', periodo: '2026/02' })
    expect(editarTurma(t, { sigla: 'bx' }).sigla).toBe('BX')
  })
})

import { describe, expect, it } from 'vitest'
import * as satisfacao from './satisfacao'
import { calcularResumoSatisfacao, classificarNps, isPesquisaTrimestralPendente, restaurarPesquisas, validarPesquisa } from './satisfacao'
import type { PesquisaSatisfacao } from './satisfacao'

const resposta = (extra: Partial<PesquisaSatisfacao> = {}): PesquisaSatisfacao => ({
  id: 'p1',
  perfil: 'aluno',
  data: '2026-11-01T12:00:00.000Z',
  csat: 5,
  nps: 10,
  gatilho: 'continua',
  ...extra,
})

describe('pesquisa de satisfação — sem dados de demonstração', () => {
  it('não embute respostas de demonstração que apareceriam como dados reais nas Métricas', () => {
    expect('DADOS_DEMO_PESQUISAS' in satisfacao).toBe(false)
  })

  it('sem nada salvo, começa vazia (conta nova não vê NPS/CSAT inventados)', () => {
    expect(restaurarPesquisas(null)).toEqual([])
    expect(calcularResumoSatisfacao(restaurarPesquisas(null))).toMatchObject({ total: 0, npsScore: 0, csatMedio: 0 })
  })

  it('restaura as respostas salvas e ignora conteúdo corrompido ou de formato errado', () => {
    const salvas = [resposta()]
    expect(restaurarPesquisas(JSON.stringify(salvas))).toEqual(salvas)
    expect(restaurarPesquisas('{ isso não é json')).toEqual([])
    expect(restaurarPesquisas(JSON.stringify({ id: 'x' }))).toEqual([])
    expect(restaurarPesquisas('[]')).toEqual([])
  })
})

describe('pesquisa de satisfação — regras de cálculo', () => {
  it('classifica o NPS em promotor, neutro e detrator', () => {
    expect(classificarNps(10)).toBe('promotor')
    expect(classificarNps(9)).toBe('promotor')
    expect(classificarNps(8)).toBe('neutro')
    expect(classificarNps(7)).toBe('neutro')
    expect(classificarNps(6)).toBe('detrator')
    expect(classificarNps(0)).toBe('detrator')
  })

  it('NPS = % promotores − % detratores; CSAT médio e % de satisfeitos (nota ≥ 4)', () => {
    const r = calcularResumoSatisfacao([resposta({ nps: 10, csat: 5 }), resposta({ nps: 8, csat: 4 }), resposta({ nps: 3, csat: 2 }), resposta({ nps: 9, csat: 5 })])
    expect(r).toMatchObject({ total: 4, npsScore: 25, percentualPromotores: 50, percentualNeutros: 25, percentualDetratores: 25, csatMedio: 4, percentualSatisfeitos: 75 })
  })

  it('valida as notas e o tamanho do comentário', () => {
    const base = { perfil: 'aluno' as const, csat: 4, nps: 8, gatilho: 'continua' as const }
    expect(validarPesquisa(base).valido).toBe(true)
    expect(validarPesquisa({ ...base, csat: 0 }).valido).toBe(false)
    expect(validarPesquisa({ ...base, csat: 6 }).valido).toBe(false)
    expect(validarPesquisa({ ...base, nps: 11 }).valido).toBe(false)
    expect(validarPesquisa({ ...base, nps: 7.5 }).valido).toBe(false)
    expect(validarPesquisa({ ...base, comentario: 'x'.repeat(501) }).valido).toBe(false)
  })

  it('a pesquisa trimestral fica pendente sem respostas ou após 90 dias', () => {
    const agora = new Date('2026-11-13T12:00:00.000Z')
    expect(isPesquisaTrimestralPendente([], agora)).toBe(true)
    expect(isPesquisaTrimestralPendente([resposta({ data: '2026-11-03T12:00:00.000Z' })], agora)).toBe(false)
    expect(isPesquisaTrimestralPendente([resposta({ data: '2026-08-01T12:00:00.000Z' })], agora)).toBe(true)
  })
})

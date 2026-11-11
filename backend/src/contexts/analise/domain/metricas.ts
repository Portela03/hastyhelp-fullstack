import type { Pergunta } from '../../autoavaliacoes/domain/pergunta.ts'
import { acertou } from '../../respostas/domain/nota.ts'
import type { NivelDeCompreensao, Respostas } from '../../respostas/domain/nota.ts'

/** Do pior para o melhor: usado para desempatar a "maior dificuldade". */
const PIOR_PRIMEIRO: NivelDeCompreensao[] = ['C', 'P', 'I']

export function maiorDificuldade(niveis: NivelDeCompreensao[]): NivelDeCompreensao | null {
  if (niveis.length === 0) return null
  const contagem = { I: 0, P: 0, C: 0 }
  for (const n of niveis) contagem[n]++
  return PIOR_PRIMEIRO.reduce((melhor, n) => (contagem[n] > contagem[melhor] ? n : melhor), 'C' as NivelDeCompreensao)
}

export const media = (valores: number[]): number | null =>
  valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null

export function dominioMedio(notas: number[]): number | null {
  const m = media(notas)
  return m === null ? null : Math.round(m * 10)
}

export function taxaDeResposta(enviados: number, esperados: number): number {
  return esperados > 0 ? Math.round((enviados / esperados) * 100) : 0
}

export function distribuicao(niveis: NivelDeCompreensao[]): Record<NivelDeCompreensao, number> {
  const total = niveis.length
  const pct = (n: NivelDeCompreensao) => (total ? Math.round((niveis.filter((x) => x === n).length / total) * 100) : 0)
  return { I: pct('I'), P: pct('P'), C: pct('C') }
}

export function dificuldadesGerais(perguntas: Pergunta[], respostasPorAluno: Respostas[]): Array<{ titulo: string; total: number }> {
  return perguntas
    .filter((p) => (p.gabarito?.length ?? 0) > 0)
    .map((p) => ({ titulo: p.enunciado, total: respostasPorAluno.filter((r) => !acertou(p, r)).length }))
    .filter((d) => d.total > 0)
    .sort((a, b) => b.total - a.total)
}

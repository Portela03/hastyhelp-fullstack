import type { Pergunta } from '../../autoavaliacoes/domain/pergunta.ts'

export type NivelDeCompreensao = 'I' | 'P' | 'C'
export type Respostas = Record<string, number[]>

const temGabarito = (p: Pergunta) => (p.gabarito?.length ?? 0) > 0

export function acertou(p: Pergunta, respostas: Respostas): boolean {
  const marcadas = [...(respostas[p.id] ?? [])].sort((a, b) => a - b)
  const gabarito = [...(p.gabarito ?? [])].sort((a, b) => a - b)
  return marcadas.length === gabarito.length && marcadas.every((v, i) => v === gabarito[i])
}

/** Nota de 0 a 10 com uma casa decimal; `undefined` quando nenhuma pergunta tem gabarito. */
export function calcularNota(perguntas: Pergunta[], respostas: Respostas): number | undefined {
  const comGabarito = perguntas.filter(temGabarito)
  if (comGabarito.length === 0) return undefined
  const acertos = comGabarito.filter((p) => acertou(p, respostas)).length
  return Math.round((acertos / comGabarito.length) * 100) / 10
}

/** I/P/C derivado da nota (significado exato das letras a confirmar com a equipe). */
export function classificarCompreensao(nota: number | undefined): NivelDeCompreensao | undefined {
  if (nota === undefined) return undefined
  if (nota >= 8) return 'I'
  if (nota >= 6) return 'P'
  return 'C'
}

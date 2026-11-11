import type { Dificuldade, Pergunta } from './tipos'

export type Papel = 'professor' | 'aluno'

export interface Sessao {
  papel: Papel
  nome: string
  email: string
  token: string
}

/** Status da autoavaliação do ponto de vista do aluno. */
export type StatusAluno = 'pendente' | 'andamento' | 'respondido' | 'encerrado'

export const ROTULO_STATUS_ALUNO: Record<StatusAluno, string> = {
  pendente: 'Pendente',
  andamento: 'Em andamento',
  respondido: 'Respondido',
  encerrado: 'Encerrado',
}

export interface AutoavaliacaoAluno {
  id: string
  titulo: string
  turmaId: string
  status: StatusAluno
  /** Definido pelo professor; opcional. */
  prazo?: string
  enviadoEm?: string
  nota?: number
  compreensao?: Dificuldade
  /** O professor decide se o gabarito aparece para o aluno. */
  mostrarGabarito: boolean
  perguntas: Pergunta[]
  respostas: Record<string, number[]>
}

/* Regras (puras) */

export function formatarNota(nota: number) {
  return nota.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

export function respondida(p: Pergunta, respostas: Record<string, number[]>) {
  return (respostas[p.id]?.length ?? 0) > 0
}

export function totalRespondidas(a: Pick<AutoavaliacaoAluno, 'perguntas' | 'respostas'>) {
  return a.perguntas.filter((p) => respondida(p, a.respostas)).length
}

export function completa(a: Pick<AutoavaliacaoAluno, 'perguntas' | 'respostas'>) {
  return a.perguntas.length > 0 && totalRespondidas(a) === a.perguntas.length
}

export function acertou(p: Pergunta, respostas: Record<string, number[]>) {
  const marcadas = [...(respostas[p.id] ?? [])].sort()
  const gabarito = [...(p.gabarito ?? [])].sort()
  return marcadas.length === gabarito.length && marcadas.every((v, i) => v === gabarito[i])
}

export function calcularNota(a: Pick<AutoavaliacaoAluno, 'perguntas' | 'respostas'>) {
  const comGabarito = a.perguntas.filter((p) => p.gabarito)
  if (comGabarito.length === 0) return undefined
  const acertos = comGabarito.filter((p) => acertou(p, a.respostas)).length
  return Math.round((acertos / comGabarito.length) * 100) / 10
}

/** O aluno só pode alterar enquanto não enviou nem encerrou. */
export function editavel(status: StatusAluno) {
  return status === 'pendente' || status === 'andamento'
}

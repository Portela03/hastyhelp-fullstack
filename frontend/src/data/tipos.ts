/** Tipos e constantes de apresentação. Os dados vêm da API (`src/api`). */

export const CORES_EQUIPE = [
  '#62B7D7',
  '#f3ae8d',
  '#f27c7e',
  '#6AD890',
  '#df8bb3',
  '#b98fcb',
] as const

export const PERIODOS = ['2026/01', '2026/02', '2025/02'] as const

export type StatusFormulario = 'agendado' | 'rascunho' | 'fechado' | 'aberto' | 'concluido'
export type Dificuldade = 'I' | 'P' | 'C'

export interface Equipe {
  id: string
  nome: string
  sigla: string
  cor: string
  periodo: string
  docente: string
  totalAlunos: number
  ultimoFormulario: string
  taxaResposta: number
  dominioMedio: number
  engajamento: number
  oculta?: boolean
  /** Código do link de convite (só o professor vê). */
  codigoConvite?: string
  /** Entrada por código/link só vale depois do aceite do professor (só o professor vê). */
  aprovacaoManual?: boolean
}

export interface Formulario {
  id: string
  titulo: string
  equipeId: string
  periodo: string
  status: StatusFormulario
  respostas: number
  total: number
  /** Data de criação (dd/mm/aa). */
  data: string
  /** Data de publicação (dd/mm/aa). */
  publicadoEm?: string
  /** Prazo de resposta (dd/mm/aa). */
  prazo?: string
  mostrarGabarito?: boolean
  perguntas: Pergunta[]
  dominioMedio?: number
  maiorDificuldade?: Dificuldade
}

export interface Pergunta {
  id: string
  enunciado: string
  tipo: 'unica' | 'multipla'
  opcoes: string[]
  marcadas: number[]
  categoriasOpcao?: Array<Dificuldade | null>
  /** Opções corretas, definidas pelo professor. Só é mostrado ao aluno se o professor liberar o gabarito. */
  gabarito?: number[]
}

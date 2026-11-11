import { ErroDeDominio } from '../../../shared/erros.ts'
import { validarPergunta } from './pergunta.ts'
import type { Pergunta } from './pergunta.ts'

export type StatusFormulario = 'agendado' | 'rascunho' | 'fechado' | 'aberto' | 'concluido'

export interface Formulario {
  id: string
  titulo: string
  turmaId: string
  status: StatusFormulario
  publicarEm?: Date
  publicadoEm?: Date
  prazo?: Date
  mostrarGabarito: boolean
  perguntas: Pergunta[]
  criadoEm: Date
}

export interface NovoFormulario {
  id: string
  titulo: string
  turmaId: string
  perguntas: Pergunta[]
  postar?: boolean
  publicarEm?: Date
  prazo?: Date
  mostrarGabarito?: boolean
}

const TRANSICOES: Record<StatusFormulario, StatusFormulario[]> = {
  rascunho: ['aberto', 'agendado'],
  agendado: ['aberto', 'rascunho'],
  aberto: ['fechado', 'concluido'],
  fechado: ['aberto', 'concluido'],
  concluido: [],
}

function validarTitulo(titulo: string): string {
  const limpo = titulo.trim()
  if (!limpo) throw new ErroDeDominio('TITULO_OBRIGATORIO', 'Informe o título do formulário.', 400)
  return limpo
}

function exigirPerguntas(perguntas: Pergunta[]) {
  if (perguntas.length === 0) throw new ErroDeDominio('SEM_PERGUNTAS', 'Adicione ao menos uma pergunta antes de publicar.')
}

function exigirFuturo(data: Date, agora: Date) {
  if (data.getTime() <= agora.getTime()) {
    throw new ErroDeDominio('DATA_NO_PASSADO', 'A data de publicação não pode estar no passado.')
  }
}

export function criarFormulario(dados: NovoFormulario, agora: Date): Formulario {
  const perguntas = dados.perguntas.map(validarPergunta)
  const base: Formulario = {
    id: dados.id,
    titulo: validarTitulo(dados.titulo),
    turmaId: dados.turmaId,
    status: 'rascunho',
    mostrarGabarito: dados.mostrarGabarito ?? false,
    perguntas,
    criadoEm: agora,
    ...(dados.prazo ? { prazo: dados.prazo } : {}),
  }
  if (dados.postar) {
    exigirPerguntas(perguntas)
    return { ...base, status: 'aberto', publicadoEm: agora }
  }
  if (dados.publicarEm) {
    exigirFuturo(dados.publicarEm, agora)
    exigirPerguntas(perguntas)
    return { ...base, status: 'agendado', publicarEm: dados.publicarEm }
  }
  return base
}

export function alterarStatus(f: Formulario, novo: StatusFormulario, agora: Date, publicarEm?: Date): Formulario {
  if (novo === f.status) return f
  if (!TRANSICOES[f.status].includes(novo)) {
    throw new ErroDeDominio('TRANSICAO_INVALIDA', `Transição de status inválida: ${f.status} → ${novo}.`)
  }
  const { publicarEm: _antiga, ...semAgendamento } = f
  if (novo === 'aberto') {
    exigirPerguntas(f.perguntas)
    return { ...semAgendamento, status: 'aberto', publicadoEm: f.publicadoEm ?? agora }
  }
  if (novo === 'agendado') {
    if (!publicarEm) throw new ErroDeDominio('DATA_OBRIGATORIA', 'Informe a data de publicação para agendar.', 400)
    exigirFuturo(publicarEm, agora)
    exigirPerguntas(f.perguntas)
    return { ...semAgendamento, status: 'agendado', publicarEm }
  }
  return { ...semAgendamento, status: novo }
}

/** Agendado cuja data já chegou passa a aberto (R-26). */
export function materializarAgendamento(f: Formulario, agora: Date): Formulario {
  if (f.status !== 'agendado' || !f.publicarEm || f.publicarEm.getTime() > agora.getTime()) return f
  const { publicarEm, ...resto } = f
  return { ...resto, status: 'aberto', publicadoEm: publicarEm }
}

export interface EdicaoFormulario {
  titulo?: string
  prazo?: Date | null
  mostrarGabarito?: boolean
  perguntas?: Pergunta[]
}

export function atualizarFormulario(f: Formulario, mudancas: EdicaoFormulario, _agora: Date): Formulario {
  let atual = f
  if (mudancas.perguntas) {
    if (f.status !== 'rascunho' && f.status !== 'agendado') {
      throw new ErroDeDominio('FORMULARIO_PUBLICADO', 'O formulário já foi publicado: as perguntas não podem ser alteradas.')
    }
    atual = { ...atual, perguntas: mudancas.perguntas.map(validarPergunta) }
  }
  if (mudancas.titulo !== undefined) atual = { ...atual, titulo: validarTitulo(mudancas.titulo) }
  if (mudancas.mostrarGabarito !== undefined) atual = { ...atual, mostrarGabarito: mudancas.mostrarGabarito }
  if (mudancas.prazo !== undefined) {
    const { prazo: _prazo, ...resto } = atual
    atual = mudancas.prazo ? { ...resto, prazo: mudancas.prazo } : resto
  }
  return atual
}

/** O aluno só responde enquanto o formulário está aberto e dentro do prazo (R-42). */
export function aceitaRespostas(f: Formulario, agora: Date): boolean {
  return f.status === 'aberto' && (!f.prazo || agora.getTime() <= f.prazo.getTime())
}

export function visivelParaAluno(f: Formulario): boolean {
  return f.status === 'aberto' || f.status === 'fechado' || f.status === 'concluido'
}

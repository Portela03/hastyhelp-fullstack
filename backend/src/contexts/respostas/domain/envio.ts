import { ErroDeDominio, conflito } from '../../../shared/erros.ts'
import type { Pergunta } from '../../autoavaliacoes/domain/pergunta.ts'
import { calcularNota, classificarCompreensao } from './nota.ts'
import type { NivelDeCompreensao, Respostas } from './nota.ts'

export type StatusEnvio = 'rascunho' | 'enviado'
export type StatusParaAluno = 'pendente' | 'andamento' | 'respondido' | 'encerrado'

export interface Envio {
  id: string
  formularioId: string
  alunoId: string
  turmaId: string
  status: StatusEnvio
  respostas: Respostas
  nota?: number
  compreensao?: NivelDeCompreensao
  observacao?: string
  /** Moderação do professor (R-95, R-96). */
  observacaoOculta?: boolean
  respostaProfessor?: string
  respondidaEm?: Date
  enviadoEm?: Date
  atualizadoEm: Date
}

export function novoEnvio(dados: Pick<Envio, 'id' | 'formularioId' | 'alunoId' | 'turmaId'>, agora: Date): Envio {
  return { ...dados, status: 'rascunho', respostas: {}, atualizadoEm: agora }
}

function exigirEditavel(envio: Envio) {
  if (envio.status === 'enviado') throw conflito('ENVIO_JA_ENVIADO', 'Esta autoavaliação já foi enviada e não pode ser alterada.')
}

export function registrarResposta(envio: Envio, pergunta: Pergunta, marcadas: number[], agora: Date): Envio {
  exigirEditavel(envio)
  const unicas = [...new Set(marcadas)]
  if (!unicas.every((i) => Number.isInteger(i) && i >= 0 && i < pergunta.opcoes.length)) {
    throw new ErroDeDominio('OPCAO_INVALIDA', 'Opção inválida para esta pergunta.', 400)
  }
  if (pergunta.tipo === 'unica' && unicas.length > 1) {
    throw new ErroDeDominio('OPCAO_INVALIDA', 'Esta pergunta aceita apenas uma opção.', 400)
  }
  return { ...envio, respostas: { ...envio.respostas, [pergunta.id]: unicas.sort((a, b) => a - b) }, atualizadoEm: agora }
}

export function enviarEnvio(envio: Envio, perguntas: Pergunta[], observacao: string | undefined, agora: Date): Envio {
  exigirEditavel(envio)
  const completo = perguntas.length > 0 && perguntas.every((p) => (envio.respostas[p.id]?.length ?? 0) > 0)
  if (!completo) throw new ErroDeDominio('RESPOSTAS_INCOMPLETAS', 'Responda todas as perguntas antes de enviar.')
  const nota = calcularNota(perguntas, envio.respostas)
  const categoriasMarcadas = perguntas.flatMap((pergunta) =>
    (envio.respostas[pergunta.id] ?? []).flatMap((indice) => {
      const categoria = pergunta.categoriasOpcao?.[indice]
      return categoria ? [categoria] : []
    }),
  )
  const compreensao = categoriasMarcadas.length
    ? (categoriasMarcadas.includes('C') ? 'C' : categoriasMarcadas.includes('P') ? 'P' : 'I')
    : classificarCompreensao(nota)
  const obs = observacao?.trim()
  return {
    ...envio,
    status: 'enviado',
    enviadoEm: agora,
    atualizadoEm: agora,
    ...(nota !== undefined ? { nota } : {}),
    ...(compreensao ? { compreensao } : {}),
    ...(obs ? { observacao: obs } : {}),
  }
}

export const LIMITE_RESPOSTA_PROFESSOR = 500

/** R-95/R-96: o professor responde e/ou oculta a observação de um envio. */
export function moderarObservacao(envio: Envio, mudanca: { resposta?: string | null; oculta?: boolean }, agora: Date): Envio {
  if (!envio.observacao) throw new ErroDeDominio('SEM_OBSERVACAO', 'Este envio não tem observação.')
  let atual = envio
  if (mudanca.oculta !== undefined) atual = { ...atual, observacaoOculta: mudanca.oculta }
  if (mudanca.resposta !== undefined) {
    const texto = (mudanca.resposta ?? '').trim()
    if (texto.length > LIMITE_RESPOSTA_PROFESSOR) {
      throw new ErroDeDominio('RESPOSTA_INVALIDA', `A resposta pode ter no máximo ${LIMITE_RESPOSTA_PROFESSOR} caracteres.`, 400)
    }
    const { respostaProfessor: _r, respondidaEm: _d, ...resto } = atual
    atual = texto ? { ...resto, respostaProfessor: texto, respondidaEm: agora } : resto
  }
  return atual
}

export function statusParaAluno(envio: Envio | undefined, aceitaRespostas: boolean): StatusParaAluno {
  if (envio?.status === 'enviado') return 'respondido'
  if (!aceitaRespostas) return 'encerrado'
  return envio ? 'andamento' : 'pendente'
}

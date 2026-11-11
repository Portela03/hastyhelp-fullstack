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
  const compreensao = classificarCompreensao(nota)
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

export function statusParaAluno(envio: Envio | undefined, aceitaRespostas: boolean): StatusParaAluno {
  if (envio?.status === 'enviado') return 'respondido'
  if (!aceitaRespostas) return 'encerrado'
  return envio ? 'andamento' : 'pendente'
}

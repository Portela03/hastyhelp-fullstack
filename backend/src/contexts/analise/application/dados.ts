import type { Relogio } from '../../../shared/portas.ts'
import { materializarTodos } from '../../autoavaliacoes/application/acesso.ts'
import { visivelParaAluno } from '../../autoavaliacoes/domain/formulario.ts'
import type { Formulario } from '../../autoavaliacoes/domain/formulario.ts'
import type { FormularioRepositorio } from '../../autoavaliacoes/domain/repositorio.ts'
import type { AvisoDePublicacao } from '../../autoavaliacoes/application/acesso.ts'
import type { EmissorDeNotificacoes } from '../../notificacoes/application/emissor.ts'
import type { Usuario, UsuarioRepositorio } from '../../identidade/domain/usuario.ts'
import type { Envio } from '../../respostas/domain/envio.ts'
import type { EnvioRepositorio } from '../../respostas/domain/repositorio.ts'
import type { TurmaRepositorio } from '../../turmas/domain/repositorio.ts'
import type { Turma } from '../../turmas/domain/turma.ts'
import { dominioMedio, maiorDificuldade, media, taxaDeResposta } from '../domain/metricas.ts'

export interface DepsAnalise {
  usuarios: UsuarioRepositorio
  turmas: TurmaRepositorio
  formularios: FormularioRepositorio
  envios: EnvioRepositorio
  emissor: EmissorDeNotificacoes
  relogio: Relogio
  publicacao?: AvisoDePublicacao
}

export interface DadosDaTurma {
  turma: Turma
  alunos: Usuario[]
  formularios: Formulario[]
  /** aberto + fechado + concluído: os que contam para taxas e médias. */
  publicados: Formulario[]
  /** só envios enviados, de formulários publicados. */
  enviados: Envio[]
  todosEnvios: Envio[]
}

export async function carregarDadosDaTurma(d: DepsAnalise, turma: Turma): Promise<DadosDaTurma> {
  const [alunosIds, formularios] = await Promise.all([d.turmas.alunosIds(turma.id), d.formularios.listarPorTurmas([turma.id])])
  const alunos = (await d.usuarios.porIds(alunosIds)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  const lista = (await materializarTodos(d, formularios)).sort((a, b) => a.criadoEm.getTime() - b.criadoEm.getTime())
  const publicados = lista.filter(visivelParaAluno)
  const todosEnvios = await d.envios.listarPorFormularios(lista.map((f) => f.id))
  const idsPublicados = new Set(publicados.map((f) => f.id))
  const enviados = todosEnvios.filter((e) => e.status === 'enviado' && idsPublicados.has(e.formularioId))
  return { turma, alunos, formularios: lista, publicados, enviados, todosEnvios }
}

export const notasDe = (envios: Envio[]): number[] =>
  envios.flatMap((e) => {
    const notaFinal = e.notaGeral ?? e.nota
    return notaFinal === undefined ? [] : [notaFinal]
  })
export const notasGeraisDe = (envios: Envio[]): number[] => envios.flatMap((e) => (e.notaGeral === undefined ? [] : [e.notaGeral]))
export const niveisDe = (envios: Envio[]) => envios.flatMap((e) => (e.compreensao ? [e.compreensao] : []))
export const arredondar1 = (n: number | null) => (n === null ? null : Math.round(n * 10) / 10)

export function estatisticasDaTurma(dados: DadosDaTurma) {
  const totalAlunos = dados.alunos.length
  const alunosQueRespondeuTudo = dados.publicados.length
    ? dados.alunos.filter((a) => dados.enviados.filter((e) => e.alunoId === a.id).length === dados.publicados.length).length
    : 0
  const ultimo = dados.formularios.at(-1)
  return {
    totalAlunos,
    taxaResposta: taxaDeResposta(dados.enviados.length, totalAlunos * dados.publicados.length),
    dominioMedio: dominioMedio(notasDe(dados.enviados)),
    engajamento: taxaDeResposta(alunosQueRespondeuTudo, totalAlunos),
    alunosQueRespondeuTudo,
    maiorDificuldade: maiorDificuldade(niveisDe(dados.enviados)),
    ultimoFormularioEm: ultimo ? ultimo.criadoEm.toISOString() : null,
  }
}

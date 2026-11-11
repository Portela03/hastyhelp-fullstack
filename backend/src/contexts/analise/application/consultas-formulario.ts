import { ErroDeDominio } from '../../../shared/erros.ts'
import type { Ator } from '../../../shared/ator.ts'
import { formularioDoDocente } from '../../autoavaliacoes/application/acesso.ts'
import { dificuldadesGerais, distribuicao, maiorDificuldade, media, taxaDeResposta } from '../domain/metricas.ts'
import { arredondar1, niveisDe, notasDe } from './dados.ts'
import type { DepsAnalise } from './dados.ts'

async function carregar(d: DepsAnalise, ator: Ator, formularioId: string) {
  const { formulario } = await formularioDoDocente(d, ator, formularioId)
  const alunosIds = await d.turmas.alunosIds(formulario.turmaId)
  const alunos = (await d.usuarios.porIds(alunosIds)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  const envios = await d.envios.listarPorFormulario(formularioId)
  return { formulario, alunos, envios, enviados: envios.filter((e) => e.status === 'enviado') }
}

/** R-53 */
export class ResumoDoFormulario {
  constructor(private readonly d: DepsAnalise) {}

  async executar(ator: Ator, formularioId: string) {
    const { formulario, alunos, enviados } = await carregar(this.d, ator, formularioId)
    const dificuldades = dificuldadesGerais(formulario.perguntas, enviados.map((e) => e.respostas))
    const topo = dificuldades[0]
    const indice = topo ? formulario.perguntas.findIndex((p) => p.enunciado === topo.titulo) : -1
    const agrupadas = new Map<string, number>()
    for (const e of enviados) if (e.observacao) agrupadas.set(e.observacao, (agrupadas.get(e.observacao) ?? 0) + 1)
    return {
      respondidos: enviados.length,
      total: alunos.length,
      taxaResposta: taxaDeResposta(enviados.length, alunos.length),
      notaMedia: arredondar1(media(notasDe(enviados))),
      totalObservacoes: [...agrupadas.values()].reduce((a, b) => a + b, 0),
      observacoes: [...agrupadas].map(([texto, qtd]) => ({ texto, alunos: qtd })).sort((a, b) => b.alunos - a.alunos),
      distribuicao: distribuicao(niveisDe(enviados)),
      maiorDificuldade: maiorDificuldade(niveisDe(enviados)),
      dificuldadesGerais: dificuldades,
      maiorDificuldadePergunta: topo ? { numero: indice + 1, enunciado: topo.titulo } : null,
    }
  }
}

/** R-54 */
export class AlunosDoFormulario {
  constructor(private readonly d: DepsAnalise) {}

  async executar(ator: Ator, formularioId: string) {
    const { alunos, envios } = await carregar(this.d, ator, formularioId)
    const porAluno = new Map(envios.map((e) => [e.alunoId, e]))
    const responderam = alunos.flatMap((a) => {
      const e = porAluno.get(a.id)
      return e?.status === 'enviado' ? [{ id: a.id, nome: a.nome, nota: e.nota ?? null, nivel: e.compreensao ?? null }] : []
    })
    const simples = (a: { id: string; nome: string }) => ({ id: a.id, nome: a.nome })
    return {
      responderam,
      visualizaram: alunos.filter((a) => porAluno.get(a.id)?.status === 'rascunho').map(simples),
      pendentes: alunos.filter((a) => !porAluno.has(a.id)).map(simples),
    }
  }
}

/** R-58 */
export class NotificarPendentes {
  constructor(private readonly d: DepsAnalise) {}

  async executar(ator: Ator, formularioId: string) {
    const { formulario, alunos, enviados } = await carregar(this.d, ator, formularioId)
    if (formulario.status !== 'aberto') throw new ErroDeDominio('FORMULARIO_NAO_ABERTO', 'Só é possível notificar alunos de um formulário aberto.')
    const jaEnviaram = new Set(enviados.map((e) => e.alunoId))
    const pendentes = alunos.filter((a) => !jaEnviaram.has(a.id))
    for (const a of pendentes) await this.d.notificador.notificarPendente({ alunoId: a.id, nome: a.nome, email: a.email }, { id: formulario.id, titulo: formulario.titulo })
    return { notificados: pendentes.length }
  }
}

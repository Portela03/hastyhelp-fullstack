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
    const nomes = new Map(alunos.map((a) => [a.id, a.nome]))
    const observacoes = enviados.flatMap((e) =>
      e.observacao
        ? [{ envioId: e.id, alunoId: e.alunoId, aluno: nomes.get(e.alunoId) ?? '', texto: e.observacao, resposta: e.respostaProfessor ?? null, oculta: e.observacaoOculta ?? false }]
        : [],
    )
    return {
      respondidos: enviados.length,
      total: alunos.length,
      taxaResposta: taxaDeResposta(enviados.length, alunos.length),
      notaMedia: arredondar1(media(notasDe(enviados))),
      totalObservacoes: observacoes.filter((o) => !o.oculta).length,
      observacoes: observacoes.sort((a, b) => a.aluno.localeCompare(b.aluno, 'pt-BR')),
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
    const notificados = await this.d.emissor.emitir(
      pendentes.map((a) => a.id),
      { tipo: 'lembrete', titulo: `Autoavaliação pendente: ${formulario.titulo}`, mensagem: 'Você ainda não enviou esta autoavaliação.', link: `/aluno/autoavaliacoes/${formulario.id}` },
    )
    return { notificados }
  }
}

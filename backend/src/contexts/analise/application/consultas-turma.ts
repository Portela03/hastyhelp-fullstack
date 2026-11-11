import type { Ator } from '../../../shared/ator.ts'
import { turmaDoDocente } from '../../turmas/application/acesso.ts'
import { dominioMedio, distribuicao, maiorDificuldade, media } from '../domain/metricas.ts'
import { arredondar1, carregarDadosDaTurma, estatisticasDaTurma, niveisDe, notasDe } from './dados.ts'
import type { DepsAnalise } from './dados.ts'

/** R-55: alunos da turma com domínio médio e formulários enviados. */
export class AlunosDaTurma {
  constructor(private readonly d: DepsAnalise) {}

  async executar(ator: Ator, turmaId: string) {
    const turma = await turmaDoDocente(this.d.turmas, ator, turmaId)
    const dados = await carregarDadosDaTurma(this.d, turma)
    const docente = await this.d.usuarios.porId(turma.docenteId)
    return {
      docentes: docente ? [{ id: docente.id, nome: docente.nome }] : [],
      alunos: dados.alunos.map((a) => {
        const dele = dados.enviados.filter((e) => e.alunoId === a.id)
        return { id: a.id, nome: a.nome, dominio: dominioMedio(notasDe(dele)), enviados: `${dele.length} / ${dados.publicados.length}` }
      }),
    }
  }
}

/** R-56: visão coletiva da turma. */
export class ResumoDaTurma {
  constructor(private readonly d: DepsAnalise) {}

  async executar(ator: Ator, turmaId: string) {
    const turma = await turmaDoDocente(this.d.turmas, ator, turmaId)
    const dados = await carregarDadosDaTurma(this.d, turma)
    const est = estatisticasDaTurma(dados)
    const ultimos = dados.publicados.slice(-5).map((f) => {
      const enviados = dados.enviados.filter((e) => e.formularioId === f.id)
      return { titulo: f.titulo, valor: dominioMedio(notasDe(enviados)), nivel: maiorDificuldade(niveisDe(enviados)) }
    })
    const comDados = dados.publicados
      .map((f) => dominioMedio(notasDe(dados.enviados.filter((e) => e.formularioId === f.id))))
      .filter((v): v is number => v !== null)
    return {
      engajamento: est.engajamento,
      alunosQueRespondeuTudo: est.alunosQueRespondeuTudo,
      notaMedia: arredondar1(media(notasDe(dados.enviados))),
      desempenhoGeral: comDados.length >= 2 ? comDados.at(-1)! - comDados[0]! : null,
      maiorDificuldade: est.maiorDificuldade,
      distribuicao: distribuicao(niveisDe(dados.enviados)),
      evolucao: ultimos.filter((u) => u.valor !== null).map((u) => ({ titulo: u.titulo, valor: u.valor })),
      maiorDificuldadePorFormulario: ultimos.flatMap((u) => (u.nivel ? [{ titulo: u.titulo, nivel: u.nivel }] : [])),
    }
  }
}

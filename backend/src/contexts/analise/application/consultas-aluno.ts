import { naoEncontrado } from '../../../shared/erros.ts'
import type { Ator } from '../../../shared/ator.ts'
import { formularioDoDocente, materializarTodos } from '../../autoavaliacoes/application/acesso.ts'
import { visivelParaAluno } from '../../autoavaliacoes/domain/formulario.ts'
import type { Formulario } from '../../autoavaliacoes/domain/formulario.ts'
import type { Envio } from '../../respostas/domain/envio.ts'
import { alunoDaTurma } from '../../turmas/application/alunos-da-turma.ts'
import type { DepsAnalise } from './dados.ts'

/** R-90: respostas de um aluno em um formulário, com enunciados e gabarito (visão do professor). */
function detalheDoEnvio(f: Formulario, envio: Envio | undefined) {
  return {
    formularioId: f.id,
    titulo: f.titulo,
    status: envio?.status === 'enviado' ? ('respondido' as const) : envio ? ('andamento' as const) : ('pendente' as const),
    nota: envio?.nota ?? null,
    nivel: envio?.compreensao ?? null,
    observacao: envio?.observacao ?? null,
    enviadoEm: envio?.enviadoEm?.toISOString() ?? null,
    perguntas: f.perguntas.map((p) => ({
      id: p.id,
      enunciado: p.enunciado,
      tipo: p.tipo,
      opcoes: p.opcoes,
      gabarito: p.gabarito ?? [],
      marcadas: envio?.respostas[p.id] ?? [],
    })),
  }
}

async function dadosDoAluno(d: DepsAnalise, alunoId: string) {
  const aluno = await d.usuarios.porId(alunoId)
  if (!aluno) throw naoEncontrado('ALUNO_NAO_ENCONTRADO', 'Este aluno não está na turma.')
  return { id: aluno.id, nome: aluno.nome }
}

export class AlunoNaTurma {
  constructor(private readonly d: DepsAnalise) {}

  async executar(ator: Ator, turmaId: string, alunoId: string) {
    await alunoDaTurma(this.d.turmas, ator, turmaId, alunoId)
    const formularios = (await materializarTodos(this.d, await this.d.formularios.listarPorTurmas([turmaId])))
      .filter(visivelParaAluno)
      .sort((a, b) => a.criadoEm.getTime() - b.criadoEm.getTime())
    const envios = await this.d.envios.listarPorAluno(alunoId)
    return {
      aluno: await dadosDoAluno(this.d, alunoId),
      formularios: formularios.map((f) => detalheDoEnvio(f, envios.find((e) => e.formularioId === f.id))),
    }
  }
}

export class AlunoNoFormulario {
  constructor(private readonly d: DepsAnalise) {}

  async executar(ator: Ator, formularioId: string, alunoId: string) {
    const { formulario, turma } = await formularioDoDocente(this.d, ator, formularioId)
    await alunoDaTurma(this.d.turmas, ator, turma.id, alunoId)
    const envio = await this.d.envios.porFormularioEAluno(formularioId, alunoId)
    return { aluno: await dadosDoAluno(this.d, alunoId), resposta: detalheDoEnvio(formulario, envio) }
  }
}

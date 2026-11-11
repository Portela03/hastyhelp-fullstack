import type { EmissorDeNotificacoes } from '../../notificacoes/application/emissor.ts'
import type { TurmaRepositorio } from '../../turmas/domain/repositorio.ts'
import type { Formulario } from '../domain/formulario.ts'
import type { AvisoDePublicacao } from './acesso.ts'

/** R-81: avisa os alunos da turma (que quiserem) que há autoavaliação nova. */
export class AvisarPublicacao implements AvisoDePublicacao {
  constructor(private readonly d: { turmas: TurmaRepositorio; emissor: EmissorDeNotificacoes }) {}

  async executar(f: Formulario): Promise<void> {
    const alunos = await this.d.turmas.alunosIds(f.turmaId)
    await this.d.emissor.emitir(
      alunos,
      { tipo: 'publicacao', titulo: `Nova autoavaliação: ${f.titulo}`, mensagem: 'Uma autoavaliação foi disponibilizada para a sua turma.', link: `/aluno/autoavaliacoes/${f.id}` },
      'publicacaoFormularios',
    )
  }
}

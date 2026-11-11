import { naoEncontrado } from '../../../shared/erros.ts'
import type { Ator } from '../../../shared/ator.ts'
import type { EmitirRedefinicao } from '../../identidade/application/redefinicao-de-senha.ts'
import type { UsuarioRepositorio } from '../../identidade/domain/usuario.ts'
import type { EnvioRepositorio } from '../../respostas/domain/repositorio.ts'
import type { TurmaRepositorio } from '../domain/repositorio.ts'
import { turmaDoDocente } from './acesso.ts'

async function alunoDaTurma(turmas: TurmaRepositorio, ator: Ator, turmaId: string, alunoId: string) {
  const turma = await turmaDoDocente(turmas, ator, turmaId)
  if (!(await turmas.alunosIds(turmaId)).includes(alunoId)) throw naoEncontrado('ALUNO_NAO_ENCONTRADO', 'Este aluno não está na turma.')
  return turma
}
export { alunoDaTurma }

/** R-18 */
export class RemoverAlunoDaTurma {
  constructor(private readonly d: { turmas: TurmaRepositorio; envios: EnvioRepositorio }) {}

  async executar(ator: Ator, turmaId: string, alunoId: string): Promise<void> {
    await alunoDaTurma(this.d.turmas, ator, turmaId, alunoId)
    await this.d.envios.excluirDoAlunoNaTurma(turmaId, alunoId)
    await this.d.turmas.desmatricular(turmaId, alunoId)
  }
}

/** R-77: o professor gera o link de redefinição de senha de um aluno seu. */
export class GerarLinkDeRedefinicao {
  constructor(private readonly d: { turmas: TurmaRepositorio; usuarios: UsuarioRepositorio; emitirRedefinicao: EmitirRedefinicao }) {}

  async executar(ator: Ator, turmaId: string, alunoId: string): Promise<{ link: string }> {
    await alunoDaTurma(this.d.turmas, ator, turmaId, alunoId)
    const aluno = await this.d.usuarios.porId(alunoId)
    if (!aluno) throw naoEncontrado('ALUNO_NAO_ENCONTRADO', 'Este aluno não está na turma.')
    return this.d.emitirRedefinicao.executar(aluno)
  }
}

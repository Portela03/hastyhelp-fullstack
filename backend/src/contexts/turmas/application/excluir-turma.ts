import type { Ator } from '../../../shared/ator.ts'
import type { FormularioRepositorio } from '../../autoavaliacoes/domain/repositorio.ts'
import type { EnvioRepositorio } from '../../respostas/domain/repositorio.ts'
import type { EntradaRepositorio } from '../domain/entrada.ts'
import type { TurmaRepositorio } from '../domain/repositorio.ts'
import { turmaDoDocente } from './acesso.ts'

/** R-15: apaga turma, matrículas, formulários e envios. */
export class ExcluirTurma {
  constructor(private readonly d: { turmas: TurmaRepositorio; formularios: FormularioRepositorio; envios: EnvioRepositorio; entradas: EntradaRepositorio }) {}

  async executar(ator: Ator, turmaId: string): Promise<void> {
    await turmaDoDocente(this.d.turmas, ator, turmaId)
    await this.d.envios.excluirDaTurma(turmaId)
    await this.d.formularios.excluirDaTurma(turmaId)
    await this.d.entradas.excluirDaTurma(turmaId)
    await this.d.turmas.excluir(turmaId)
  }
}

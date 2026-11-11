import type { Ator } from '../../../shared/ator.ts'
import type { Relogio } from '../../../shared/portas.ts'
import type { EnvioRepositorio } from '../../respostas/domain/repositorio.ts'
import type { TurmaRepositorio } from '../../turmas/domain/repositorio.ts'
import type { FormularioRepositorio } from '../domain/repositorio.ts'
import { formularioDoDocente } from './acesso.ts'

/** R-29 */
export class ExcluirFormulario {
  constructor(private readonly d: { formularios: FormularioRepositorio; turmas: TurmaRepositorio; envios: EnvioRepositorio; relogio: Relogio }) {}

  async executar(ator: Ator, formularioId: string): Promise<void> {
    await formularioDoDocente(this.d, ator, formularioId)
    await this.d.envios.excluirDoFormulario(formularioId)
    await this.d.formularios.excluir(formularioId)
  }
}

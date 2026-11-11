import type { Ator } from '../../../shared/ator.ts'
import type { Relogio } from '../../../shared/portas.ts'
import type { TurmaRepositorio } from '../../turmas/domain/repositorio.ts'
import type { FormularioRepositorio } from '../domain/repositorio.ts'
import { formularioDoDocente } from './acesso.ts'
import { formularioDTO } from './dto.ts'
import type { FormularioDTO } from './dto.ts'

export class ObterFormulario {
  constructor(private readonly d: { formularios: FormularioRepositorio; turmas: TurmaRepositorio; relogio: Relogio }) {}

  async executar(ator: Ator, formularioId: string): Promise<FormularioDTO> {
    const { formulario } = await formularioDoDocente(this.d, ator, formularioId)
    return formularioDTO(formulario)
  }
}

import type { Ator } from '../../../shared/ator.ts'
import type { UsuarioRepositorio } from '../../identidade/domain/usuario.ts'
import type { TurmaRepositorio } from '../domain/repositorio.ts'
import { editarTurma } from '../domain/turma.ts'
import type { EdicaoTurma } from '../domain/turma.ts'
import { turmaDoDocente } from './acesso.ts'
import { turmaDTO } from './dto.ts'
import type { TurmaDTO } from './dto.ts'

export class EditarTurma {
  constructor(private readonly d: { turmas: TurmaRepositorio; usuarios: UsuarioRepositorio }) {}

  async executar(ator: Ator, turmaId: string, mudancas: EdicaoTurma): Promise<TurmaDTO> {
    const turma = await turmaDoDocente(this.d.turmas, ator, turmaId)
    const atualizada = editarTurma(turma, mudancas)
    await this.d.turmas.salvar(atualizada)
    const docente = await this.d.usuarios.porId(atualizada.docenteId)
    return turmaDTO(atualizada, docente?.nome ?? '', true) as TurmaDTO
  }
}

import type { Ator } from '../../../shared/ator.ts'
import type { UsuarioRepositorio } from '../../identidade/domain/usuario.ts'
import type { TurmaRepositorio } from '../domain/repositorio.ts'
import { turmaDTO } from './dto.ts'
import type { TurmaDTO } from './dto.ts'

/** Professor: turmas que leciona. Aluno: turmas em que está matriculado (RNF03). */
export class ListarTurmas {
  constructor(private readonly d: { turmas: TurmaRepositorio; usuarios: UsuarioRepositorio }) {}

  async executar(ator: Ator): Promise<TurmaDTO[]> {
    const turmas = ator.papel === 'professor' ? await this.d.turmas.listarDoDocente(ator.id) : await this.d.turmas.listarDoAluno(ator.id)
    const docentes = await this.d.usuarios.porIds([...new Set(turmas.map((t) => t.docenteId))])
    const nome = (id: string) => docentes.find((u) => u.id === id)?.nome ?? ''
    return turmas
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .map((t) => turmaDTO(t, nome(t.docenteId), ator.papel === 'professor') as TurmaDTO)
  }
}

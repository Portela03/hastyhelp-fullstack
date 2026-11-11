import { acessoNegado, naoEncontrado } from '../../../shared/erros.ts'
import type { Ator } from '../../../shared/ator.ts'
import type { TurmaRepositorio } from '../domain/repositorio.ts'
import type { Turma } from '../domain/turma.ts'

/** R-13: só o docente dono acessa/altera a turma. */
export async function turmaDoDocente(turmas: TurmaRepositorio, ator: Ator, turmaId: string): Promise<Turma> {
  const turma = await turmas.porId(turmaId)
  if (!turma) throw naoEncontrado('TURMA_NAO_ENCONTRADA', 'Turma não encontrada.')
  if (ator.papel !== 'professor' || turma.docenteId !== ator.id) throw acessoNegado()
  return turma
}

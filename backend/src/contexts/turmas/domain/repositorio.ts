import type { Turma } from './turma.ts'

export interface TurmaRepositorio {
  salvar(turma: Turma): Promise<void>
  porId(id: string): Promise<Turma | undefined>
  porCodigo(codigo: string): Promise<Turma | undefined>
  listarDoDocente(docenteId: string): Promise<Turma[]>
  listarDoAluno(alunoId: string): Promise<Turma[]>
  /** Remove a turma e as matrículas (formulários e envios são limpos pelo caso de uso). */
  excluir(id: string): Promise<void>
  /** Idempotente (R-16). */
  matricular(turmaId: string, alunoId: string): Promise<void>
  /** R-18 */
  desmatricular(turmaId: string, alunoId: string): Promise<void>
  alunosIds(turmaId: string): Promise<string[]>
}

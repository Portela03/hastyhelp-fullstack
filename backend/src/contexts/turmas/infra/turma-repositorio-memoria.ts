import type { TurmaRepositorio } from '../domain/repositorio.ts'
import type { Turma } from '../domain/turma.ts'

export class TurmaRepositorioMemoria implements TurmaRepositorio {
  private readonly turmas = new Map<string, Turma>()
  private readonly matriculas = new Map<string, Set<string>>()

  async salvar(t: Turma) {
    this.turmas.set(t.id, { ...t })
  }
  async porId(id: string) {
    return this.turmas.get(id)
  }
  async porCodigo(codigo: string) {
    return [...this.turmas.values()].find((t) => t.codigoConvite === codigo)
  }
  async listarDoDocente(docenteId: string) {
    return [...this.turmas.values()].filter((t) => t.docenteId === docenteId)
  }
  async listarDoAluno(alunoId: string) {
    return [...this.turmas.values()].filter((t) => this.matriculas.get(t.id)?.has(alunoId))
  }
  async excluir(id: string) {
    this.turmas.delete(id)
    this.matriculas.delete(id)
  }
  async matricular(turmaId: string, alunoId: string) {
    const conjunto = this.matriculas.get(turmaId) ?? new Set<string>()
    conjunto.add(alunoId)
    this.matriculas.set(turmaId, conjunto)
  }
  async alunosIds(turmaId: string) {
    return [...(this.matriculas.get(turmaId) ?? [])]
  }
}

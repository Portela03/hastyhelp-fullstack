import type { Formulario } from '../domain/formulario.ts'
import type { FormularioRepositorio } from '../domain/repositorio.ts'

export class FormularioRepositorioMemoria implements FormularioRepositorio {
  private readonly itens = new Map<string, Formulario>()
  async salvar(f: Formulario) {
    this.itens.set(f.id, structuredClone(f))
  }
  async porId(id: string) {
    const f = this.itens.get(id)
    return f ? structuredClone(f) : undefined
  }
  async listarPorTurmas(turmaIds: string[]) {
    return [...this.itens.values()].filter((f) => turmaIds.includes(f.turmaId)).map((f) => structuredClone(f))
  }
  async excluir(id: string) {
    this.itens.delete(id)
  }
  async excluirDaTurma(turmaId: string) {
    for (const [id, f] of this.itens) if (f.turmaId === turmaId) this.itens.delete(id)
  }
}

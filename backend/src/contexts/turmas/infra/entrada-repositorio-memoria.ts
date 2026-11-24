import type { Entrada, EntradaRepositorio } from '../domain/entrada.ts'

export class EntradaRepositorioMemoria implements EntradaRepositorio {
  private readonly itens = new Map<string, Entrada>()

  /** Entradas somem junto com a turma (no Postgres é a cascata do banco). */
  async excluirDaTurma(turmaId: string) {
    for (const [id, e] of this.itens) if (e.turmaId === turmaId) this.itens.delete(id)
  }
  async salvar(e: Entrada) {
    this.itens.set(e.id, { ...e })
  }
  async porId(id: string) {
    return this.itens.get(id)
  }
  async pendente(turmaId: string, alunoId: string) {
    return [...this.itens.values()].find((e) => e.turmaId === turmaId && e.alunoId === alunoId && e.status === 'pendente')
  }
  async pendentesDaTurma(turmaId: string) {
    return [...this.itens.values()].filter((e) => e.turmaId === turmaId && e.status === 'pendente').sort((a, b) => a.criadaEm.getTime() - b.criadaEm.getTime())
  }
  async convitesPendentesDoAluno(alunoId: string) {
    return [...this.itens.values()]
      .filter((e) => e.alunoId === alunoId && e.origem === 'convite' && e.status === 'pendente')
      .sort((a, b) => b.criadaEm.getTime() - a.criadaEm.getTime())
  }
}

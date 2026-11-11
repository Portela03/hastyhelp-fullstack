import type { Envio } from '../domain/envio.ts'
import type { EnvioRepositorio } from '../domain/repositorio.ts'

export class EnvioRepositorioMemoria implements EnvioRepositorio {
  private readonly itens = new Map<string, Envio>()
  private chave = (formularioId: string, alunoId: string) => `${formularioId}:${alunoId}`

  async salvar(e: Envio) {
    this.itens.set(this.chave(e.formularioId, e.alunoId), structuredClone(e))
  }
  async porFormularioEAluno(formularioId: string, alunoId: string) {
    const e = this.itens.get(this.chave(formularioId, alunoId))
    return e ? structuredClone(e) : undefined
  }
  async listarPorFormulario(formularioId: string) {
    return [...this.itens.values()].filter((e) => e.formularioId === formularioId).map((e) => structuredClone(e))
  }
  async listarPorFormularios(formularioIds: string[]) {
    return [...this.itens.values()].filter((e) => formularioIds.includes(e.formularioId)).map((e) => structuredClone(e))
  }
  async listarPorAluno(alunoId: string) {
    return [...this.itens.values()].filter((e) => e.alunoId === alunoId).map((e) => structuredClone(e))
  }
  async excluirDoFormulario(formularioId: string) {
    for (const [k, e] of this.itens) if (e.formularioId === formularioId) this.itens.delete(k)
  }
  async excluirDaTurma(turmaId: string) {
    for (const [k, e] of this.itens) if (e.turmaId === turmaId) this.itens.delete(k)
  }
}

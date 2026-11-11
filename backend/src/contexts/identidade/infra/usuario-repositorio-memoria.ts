import type { Usuario, UsuarioRepositorio } from '../domain/usuario.ts'

export class UsuarioRepositorioMemoria implements UsuarioRepositorio {
  private readonly itens = new Map<string, Usuario>()
  async salvar(u: Usuario) {
    this.itens.set(u.id, { ...u })
  }
  async porId(id: string) {
    return this.itens.get(id)
  }
  async porEmail(email: string) {
    return [...this.itens.values()].find((u) => u.email === email)
  }
  async porIds(ids: string[]) {
    return ids.flatMap((id) => {
      const u = this.itens.get(id)
      return u ? [u] : []
    })
  }
}

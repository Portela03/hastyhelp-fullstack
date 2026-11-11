import type { Notificacao, NotificacaoRepositorio } from '../domain/notificacao.ts'

export class NotificacaoRepositorioMemoria implements NotificacaoRepositorio {
  private itens: Notificacao[] = []

  async salvar(n: Notificacao) {
    const i = this.itens.findIndex((x) => x.id === n.id)
    if (i >= 0) this.itens[i] = { ...n }
    else this.itens.push({ ...n })
  }
  async listarDoUsuario(usuarioId: string, limite: number) {
    // mais recentes primeiro; empate (mesmo instante) resolve pela ordem de inserção
    return this.itens
      .map((n, ordem) => ({ n, ordem }))
      .filter(({ n }) => n.usuarioId === usuarioId)
      .sort((a, b) => b.n.criadaEm.getTime() - a.n.criadaEm.getTime() || b.ordem - a.ordem)
      .slice(0, limite)
      .map(({ n }) => ({ ...n }))
  }
  async contarNaoLidas(usuarioId: string) {
    return this.itens.filter((n) => n.usuarioId === usuarioId && !n.lidaEm).length
  }
  async marcarLida(id: string, usuarioId: string, quando: Date) {
    const i = this.itens.findIndex((n) => n.id === id && n.usuarioId === usuarioId)
    if (i < 0) return false
    const atual = this.itens[i]!
    if (!atual.lidaEm) this.itens[i] = { ...atual, lidaEm: quando }
    return true
  }
  async marcarTodasLidas(usuarioId: string, quando: Date) {
    this.itens = this.itens.map((n) => (n.usuarioId === usuarioId && !n.lidaEm ? { ...n, lidaEm: quando } : n))
  }
}

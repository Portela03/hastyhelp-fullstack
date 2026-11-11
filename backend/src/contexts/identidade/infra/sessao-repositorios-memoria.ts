import type { CaixaDeSaida, MensagemSaida, Redefinicao, RedefinicaoRepositorio, Sessao, SessaoRepositorio } from '../domain/sessao.ts'

export class SessaoRepositorioMemoria implements SessaoRepositorio {
  private readonly itens = new Map<string, Sessao>()
  async salvar(s: Sessao) {
    this.itens.set(s.id, { ...s })
  }
  async porId(id: string) {
    const s = this.itens.get(id)
    return s ? { ...s } : undefined
  }
  async porRefreshHash(hash: string) {
    const s = [...this.itens.values()].find((x) => x.refreshHash === hash)
    return s ? { ...s } : undefined
  }
  async revogar(id: string, quando: Date) {
    const s = this.itens.get(id)
    if (s && !s.revogadaEm) this.itens.set(id, { ...s, revogadaEm: quando })
  }
  async revogarDoUsuario(usuarioId: string, quando: Date) {
    for (const [id, s] of this.itens) if (s.usuarioId === usuarioId && !s.revogadaEm) this.itens.set(id, { ...s, revogadaEm: quando })
  }
}

export class RedefinicaoRepositorioMemoria implements RedefinicaoRepositorio {
  private readonly itens = new Map<string, Redefinicao>()
  async salvar(r: Redefinicao) {
    this.itens.set(r.id, { ...r })
  }
  async porTokenHash(hash: string) {
    const r = [...this.itens.values()].find((x) => x.tokenHash === hash)
    return r ? { ...r } : undefined
  }
}

export class CaixaDeSaidaMemoria implements CaixaDeSaida {
  private readonly itens: MensagemSaida[] = []
  constructor(private readonly log = false) {}
  async registrar(m: MensagemSaida) {
    this.itens.push({ ...m })
    if (this.log) console.log(`[caixa de saída] para ${m.para}: ${m.assunto} — ${m.link ?? ''}`)
  }
  async porDestinatario(para: string) {
    return this.itens.filter((m) => m.para === para).reverse()
  }
}

import type pg from 'pg'
import type { CaixaDeSaida, MensagemSaida, Redefinicao, RedefinicaoRepositorio, Sessao, SessaoRepositorio } from '../domain/sessao.ts'

interface LinhaSessao {
  id: string
  usuario_id: string
  refresh_hash: string
  expira_em: Date
  revogada_em: Date | null
  criada_em: Date
}
const paraSessao = (l: LinhaSessao): Sessao => ({
  id: l.id,
  usuarioId: l.usuario_id,
  refreshHash: l.refresh_hash,
  expiraEm: l.expira_em,
  criadaEm: l.criada_em,
  ...(l.revogada_em ? { revogadaEm: l.revogada_em } : {}),
})

export class SessaoRepositorioPg implements SessaoRepositorio {
  constructor(private readonly pool: pg.Pool) {}

  async salvar(s: Sessao) {
    await this.pool.query(
      `INSERT INTO sessoes (id, usuario_id, refresh_hash, expira_em, revogada_em, criada_em)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET refresh_hash = $3, expira_em = $4, revogada_em = $5`,
      [s.id, s.usuarioId, s.refreshHash, s.expiraEm, s.revogadaEm ?? null, s.criadaEm],
    )
  }
  async porId(id: string) {
    const r = await this.pool.query<LinhaSessao>('SELECT * FROM sessoes WHERE id = $1', [id])
    return r.rows[0] ? paraSessao(r.rows[0]) : undefined
  }
  async porRefreshHash(hash: string) {
    const r = await this.pool.query<LinhaSessao>('SELECT * FROM sessoes WHERE refresh_hash = $1', [hash])
    return r.rows[0] ? paraSessao(r.rows[0]) : undefined
  }
  async revogar(id: string, quando: Date) {
    await this.pool.query('UPDATE sessoes SET revogada_em = $2 WHERE id = $1 AND revogada_em IS NULL', [id, quando])
  }
  async revogarDoUsuario(usuarioId: string, quando: Date) {
    await this.pool.query('UPDATE sessoes SET revogada_em = $2 WHERE usuario_id = $1 AND revogada_em IS NULL', [usuarioId, quando])
  }
}

interface LinhaRedefinicao {
  id: string
  usuario_id: string
  token_hash: string
  expira_em: Date
  usada_em: Date | null
  criada_em: Date
}

export class RedefinicaoRepositorioPg implements RedefinicaoRepositorio {
  constructor(private readonly pool: pg.Pool) {}

  async salvar(r: Redefinicao) {
    await this.pool.query(
      `INSERT INTO redefinicoes_senha (id, usuario_id, token_hash, expira_em, usada_em, criada_em)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET usada_em = $5`,
      [r.id, r.usuarioId, r.tokenHash, r.expiraEm, r.usadaEm ?? null, r.criadaEm],
    )
  }
  async porTokenHash(hash: string) {
    const r = await this.pool.query<LinhaRedefinicao>('SELECT * FROM redefinicoes_senha WHERE token_hash = $1', [hash])
    const l = r.rows[0]
    return l
      ? { id: l.id, usuarioId: l.usuario_id, tokenHash: l.token_hash, expiraEm: l.expira_em, criadaEm: l.criada_em, ...(l.usada_em ? { usadaEm: l.usada_em } : {}) }
      : undefined
  }
}

interface LinhaMensagem {
  id: string
  para: string
  assunto: string
  corpo: string
  link: string | null
  criada_em: Date
}

/** Guarda as mensagens e também as imprime no log do servidor (não há envio de e-mail). */
export class CaixaDeSaidaPg implements CaixaDeSaida {
  constructor(
    private readonly pool: pg.Pool,
    private readonly log = true,
  ) {}

  async registrar(m: MensagemSaida) {
    await this.pool.query('INSERT INTO caixa_de_saida (id, para, assunto, corpo, link, criada_em) VALUES ($1, $2, $3, $4, $5, $6)', [m.id, m.para, m.assunto, m.corpo, m.link ?? null, m.criadaEm])
    if (this.log) console.log(`[caixa de saída] para ${m.para}: ${m.assunto}${m.link ? ` — ${m.link}` : ''}`)
  }
  async porDestinatario(para: string) {
    const r = await this.pool.query<LinhaMensagem>('SELECT * FROM caixa_de_saida WHERE para = $1 ORDER BY criada_em DESC', [para])
    return r.rows.map((l) => ({ id: l.id, para: l.para, assunto: l.assunto, corpo: l.corpo, criadaEm: l.criada_em, ...(l.link ? { link: l.link } : {}) }))
  }
}

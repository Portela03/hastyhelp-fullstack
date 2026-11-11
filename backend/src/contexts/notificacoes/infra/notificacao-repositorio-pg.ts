import type pg from 'pg'
import type { Notificacao, NotificacaoRepositorio, TipoNotificacao } from '../domain/notificacao.ts'

interface Linha {
  id: string
  usuario_id: string
  tipo: TipoNotificacao
  titulo: string
  mensagem: string
  link: string | null
  criada_em: Date
  lida_em: Date | null
}

const paraNotificacao = (l: Linha): Notificacao => ({
  id: l.id,
  usuarioId: l.usuario_id,
  tipo: l.tipo,
  titulo: l.titulo,
  mensagem: l.mensagem,
  criadaEm: l.criada_em,
  ...(l.link ? { link: l.link } : {}),
  ...(l.lida_em ? { lidaEm: l.lida_em } : {}),
})

export class NotificacaoRepositorioPg implements NotificacaoRepositorio {
  constructor(private readonly pool: pg.Pool) {}

  async salvar(n: Notificacao) {
    await this.pool.query(
      `INSERT INTO notificacoes (id, usuario_id, tipo, titulo, mensagem, link, criada_em, lida_em)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET lida_em = $8`,
      [n.id, n.usuarioId, n.tipo, n.titulo, n.mensagem, n.link ?? null, n.criadaEm, n.lidaEm ?? null],
    )
  }
  async listarDoUsuario(usuarioId: string, limite: number) {
    const r = await this.pool.query<Linha>('SELECT * FROM notificacoes WHERE usuario_id = $1 ORDER BY criada_em DESC, id DESC LIMIT $2', [usuarioId, limite])
    return r.rows.map(paraNotificacao)
  }
  async contarNaoLidas(usuarioId: string) {
    const r = await this.pool.query<{ total: string }>('SELECT count(*) AS total FROM notificacoes WHERE usuario_id = $1 AND lida_em IS NULL', [usuarioId])
    return Number(r.rows[0]?.total ?? 0)
  }
  async marcarLida(id: string, usuarioId: string, quando: Date) {
    const r = await this.pool.query('UPDATE notificacoes SET lida_em = COALESCE(lida_em, $3) WHERE id = $1 AND usuario_id = $2', [id, usuarioId, quando])
    return (r.rowCount ?? 0) > 0
  }
  async marcarTodasLidas(usuarioId: string, quando: Date) {
    await this.pool.query('UPDATE notificacoes SET lida_em = $2 WHERE usuario_id = $1 AND lida_em IS NULL', [usuarioId, quando])
  }
}

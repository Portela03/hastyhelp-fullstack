import type pg from 'pg'
import type { Usuario, UsuarioRepositorio } from '../domain/usuario.ts'

interface Linha {
  id: string
  nome: string
  email: string
  senha_hash: string
  papel: Usuario['papel']
  preferencias: Usuario['preferencias']
  criado_em: Date
}

const paraUsuario = (l: Linha): Usuario => ({
  id: l.id, nome: l.nome, email: l.email, senhaHash: l.senha_hash, papel: l.papel, preferencias: l.preferencias, criadoEm: l.criado_em,
})

const COM_ACENTO = 'áàâãäéèêëíìîïóòôõöúùûüçñ'
const SEM_ACENTO = 'aaaaaeeeeiiiiooooouuuucn'
const SEM_ACENTOS_SQL = (coluna: string) => `translate(lower(${coluna}), '${COM_ACENTO}', '${SEM_ACENTO}')`

export class UsuarioRepositorioPg implements UsuarioRepositorio {
  constructor(private readonly pool: pg.Pool) {}

  async salvar(u: Usuario) {
    await this.pool.query(
      `INSERT INTO usuarios (id, nome, email, senha_hash, papel, preferencias, criado_em)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET nome = $2, email = $3, senha_hash = $4, papel = $5, preferencias = $6`,
      [u.id, u.nome, u.email, u.senhaHash, u.papel, JSON.stringify(u.preferencias), u.criadoEm],
    )
  }
  async porId(id: string) {
    const r = await this.pool.query<Linha>('SELECT * FROM usuarios WHERE id = $1', [id])
    return r.rows[0] ? paraUsuario(r.rows[0]) : undefined
  }
  async porEmail(email: string) {
    const r = await this.pool.query<Linha>('SELECT * FROM usuarios WHERE email = $1', [email])
    return r.rows[0] ? paraUsuario(r.rows[0]) : undefined
  }
  async porIds(ids: string[]) {
    if (ids.length === 0) return []
    const r = await this.pool.query<Linha>('SELECT * FROM usuarios WHERE id = ANY($1)', [ids])
    return r.rows.map(paraUsuario)
  }
  async buscarAlunos(termo: string, excluirIds: string[], limite: number) {
    const padrao = `%${termo.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
    const r = await this.pool.query<Linha>(
      `SELECT * FROM usuarios
       WHERE papel = 'aluno' AND NOT (id = ANY($2))
         AND (${SEM_ACENTOS_SQL('nome')} LIKE $1 OR ${SEM_ACENTOS_SQL('email')} LIKE $1)
       ORDER BY nome, id LIMIT $3`,
      [padrao, excluirIds, limite],
    )
    return r.rows.map(paraUsuario)
  }
}

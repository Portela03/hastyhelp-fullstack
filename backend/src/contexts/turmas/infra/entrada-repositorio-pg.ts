import type pg from 'pg'
import type { Entrada, EntradaRepositorio, OrigemEntrada, StatusEntrada } from '../domain/entrada.ts'

interface Linha {
  id: string
  turma_id: string
  aluno_id: string
  origem: OrigemEntrada
  status: StatusEntrada
  criada_em: Date
  resolvida_em: Date | null
}

const paraEntrada = (l: Linha): Entrada => ({
  id: l.id, turmaId: l.turma_id, alunoId: l.aluno_id, origem: l.origem, status: l.status, criadaEm: l.criada_em,
  ...(l.resolvida_em ? { resolvidaEm: l.resolvida_em } : {}),
})

export class EntradaRepositorioPg implements EntradaRepositorio {
  constructor(private readonly pool: pg.Pool) {}

  async salvar(e: Entrada) {
    await this.pool.query(
      `INSERT INTO entradas_turma (id, turma_id, aluno_id, origem, status, criada_em, resolvida_em)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET status = $5, resolvida_em = $7`,
      [e.id, e.turmaId, e.alunoId, e.origem, e.status, e.criadaEm, e.resolvidaEm ?? null],
    )
  }
  async porId(id: string) {
    const r = await this.pool.query<Linha>('SELECT * FROM entradas_turma WHERE id = $1', [id])
    return r.rows[0] ? paraEntrada(r.rows[0]) : undefined
  }
  async pendente(turmaId: string, alunoId: string) {
    const r = await this.pool.query<Linha>("SELECT * FROM entradas_turma WHERE turma_id = $1 AND aluno_id = $2 AND status = 'pendente'", [turmaId, alunoId])
    return r.rows[0] ? paraEntrada(r.rows[0]) : undefined
  }
  async pendentesDaTurma(turmaId: string) {
    const r = await this.pool.query<Linha>("SELECT * FROM entradas_turma WHERE turma_id = $1 AND status = 'pendente' ORDER BY criada_em, id", [turmaId])
    return r.rows.map(paraEntrada)
  }
  async excluirDaTurma(turmaId: string) {
    await this.pool.query('DELETE FROM entradas_turma WHERE turma_id = $1', [turmaId])
  }
  async convitesPendentesDoAluno(alunoId: string) {
    const r = await this.pool.query<Linha>("SELECT * FROM entradas_turma WHERE aluno_id = $1 AND origem = 'convite' AND status = 'pendente' ORDER BY criada_em DESC, id", [alunoId])
    return r.rows.map(paraEntrada)
  }
}

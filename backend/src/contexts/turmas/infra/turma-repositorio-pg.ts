import type pg from 'pg'
import type { TurmaRepositorio } from '../domain/repositorio.ts'
import type { PeriodoLetivo } from '../domain/periodo-letivo.ts'
import type { Turma } from '../domain/turma.ts'

interface Linha {
  id: string
  nome: string
  sigla: string
  cor: string
  periodo: string
  docente_id: string
  oculta: boolean
  aprovacao_manual: boolean
  codigo_convite: string
  criada_em: Date
}

const paraTurma = (l: Linha): Turma => ({
  id: l.id, nome: l.nome, sigla: l.sigla, cor: l.cor, periodo: l.periodo as PeriodoLetivo,
  docenteId: l.docente_id, oculta: l.oculta, aprovacaoManual: l.aprovacao_manual, codigoConvite: l.codigo_convite, criadaEm: l.criada_em,
})

export class TurmaRepositorioPg implements TurmaRepositorio {
  constructor(private readonly pool: pg.Pool) {}

  async salvar(t: Turma) {
    await this.pool.query(
      `INSERT INTO turmas (id, nome, sigla, cor, periodo, docente_id, oculta, codigo_convite, criada_em, aprovacao_manual)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET nome = $2, sigla = $3, cor = $4, periodo = $5, oculta = $7, aprovacao_manual = $10`,
      [t.id, t.nome, t.sigla, t.cor, t.periodo, t.docenteId, t.oculta, t.codigoConvite, t.criadaEm, t.aprovacaoManual],
    )
  }
  async trocarCodigo(turmaId: string, codigo: string) {
    try {
      const r = await this.pool.query('UPDATE turmas SET codigo_convite = $2 WHERE id = $1', [turmaId, codigo])
      return (r.rowCount ?? 0) > 0
    } catch (erro) {
      if (typeof erro === 'object' && erro !== null && 'code' in erro && erro.code === '23505') return false
      throw erro
    }
  }
  async porId(id: string) {
    const r = await this.pool.query<Linha>('SELECT * FROM turmas WHERE id = $1', [id])
    return r.rows[0] ? paraTurma(r.rows[0]) : undefined
  }
  async porCodigo(codigo: string) {
    const r = await this.pool.query<Linha>('SELECT * FROM turmas WHERE codigo_convite = $1', [codigo])
    return r.rows[0] ? paraTurma(r.rows[0]) : undefined
  }
  async listarDoDocente(docenteId: string) {
    const r = await this.pool.query<Linha>('SELECT * FROM turmas WHERE docente_id = $1', [docenteId])
    return r.rows.map(paraTurma)
  }
  async listarDoAluno(alunoId: string) {
    const r = await this.pool.query<Linha>('SELECT t.* FROM turmas t JOIN matriculas m ON m.turma_id = t.id WHERE m.aluno_id = $1', [alunoId])
    return r.rows.map(paraTurma)
  }
  async excluir(id: string) {
    await this.pool.query('DELETE FROM turmas WHERE id = $1', [id])
  }
  async matricular(turmaId: string, alunoId: string) {
    await this.pool.query('INSERT INTO matriculas (turma_id, aluno_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [turmaId, alunoId])
  }
  async desmatricular(turmaId: string, alunoId: string) {
    await this.pool.query('DELETE FROM matriculas WHERE turma_id = $1 AND aluno_id = $2', [turmaId, alunoId])
  }
  async alunosIds(turmaId: string) {
    const r = await this.pool.query<{ aluno_id: string }>('SELECT aluno_id FROM matriculas WHERE turma_id = $1', [turmaId])
    return r.rows.map((x) => x.aluno_id)
  }
}

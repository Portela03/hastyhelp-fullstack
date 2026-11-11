import type pg from 'pg'
import type { Envio } from '../domain/envio.ts'
import type { EnvioRepositorio } from '../domain/repositorio.ts'
import type { NivelDeCompreensao } from '../domain/nota.ts'

interface Linha {
  id: string
  formulario_id: string
  aluno_id: string
  turma_id: string
  status: Envio['status']
  respostas: Envio['respostas']
  nota: string | null
  compreensao: NivelDeCompreensao | null
  observacao: string | null
  enviado_em: Date | null
  atualizado_em: Date
}

const paraEnvio = (l: Linha): Envio => ({
  id: l.id,
  formularioId: l.formulario_id,
  alunoId: l.aluno_id,
  turmaId: l.turma_id,
  status: l.status,
  respostas: l.respostas,
  atualizadoEm: l.atualizado_em,
  ...(l.nota !== null ? { nota: Number(l.nota) } : {}),
  ...(l.compreensao ? { compreensao: l.compreensao } : {}),
  ...(l.observacao ? { observacao: l.observacao } : {}),
  ...(l.enviado_em ? { enviadoEm: l.enviado_em } : {}),
})

export class EnvioRepositorioPg implements EnvioRepositorio {
  constructor(private readonly pool: pg.Pool) {}

  async salvar(e: Envio) {
    await this.pool.query(
      `INSERT INTO envios (id, formulario_id, aluno_id, turma_id, status, respostas, nota, compreensao, observacao, enviado_em, atualizado_em)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (formulario_id, aluno_id) DO UPDATE
         SET status = $5, respostas = $6, nota = $7, compreensao = $8, observacao = $9, enviado_em = $10, atualizado_em = $11`,
      [e.id, e.formularioId, e.alunoId, e.turmaId, e.status, JSON.stringify(e.respostas), e.nota ?? null, e.compreensao ?? null, e.observacao ?? null, e.enviadoEm ?? null, e.atualizadoEm],
    )
  }
  async porFormularioEAluno(formularioId: string, alunoId: string) {
    const r = await this.pool.query<Linha>('SELECT * FROM envios WHERE formulario_id = $1 AND aluno_id = $2', [formularioId, alunoId])
    return r.rows[0] ? paraEnvio(r.rows[0]) : undefined
  }
  async listarPorFormulario(formularioId: string) {
    const r = await this.pool.query<Linha>('SELECT * FROM envios WHERE formulario_id = $1', [formularioId])
    return r.rows.map(paraEnvio)
  }
  async listarPorFormularios(formularioIds: string[]) {
    if (formularioIds.length === 0) return []
    const r = await this.pool.query<Linha>('SELECT * FROM envios WHERE formulario_id = ANY($1)', [formularioIds])
    return r.rows.map(paraEnvio)
  }
  async listarPorAluno(alunoId: string) {
    const r = await this.pool.query<Linha>('SELECT * FROM envios WHERE aluno_id = $1', [alunoId])
    return r.rows.map(paraEnvio)
  }
  async excluirDoFormulario(formularioId: string) {
    await this.pool.query('DELETE FROM envios WHERE formulario_id = $1', [formularioId])
  }
  async excluirDaTurma(turmaId: string) {
    await this.pool.query('DELETE FROM envios WHERE turma_id = $1', [turmaId])
  }
}

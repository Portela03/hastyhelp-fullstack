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
  nota_geral: string | null
  compreensao: NivelDeCompreensao | null
  observacao: string | null
  enviado_em: Date | null
  atualizado_em: Date
  observacao_oculta: boolean
  resposta_professor: string | null
  respondida_em: Date | null
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
  ...(l.nota_geral !== null ? { notaGeral: Number(l.nota_geral) } : {}),
  ...(l.compreensao ? { compreensao: l.compreensao } : {}),
  ...(l.observacao ? { observacao: l.observacao } : {}),
  ...(l.enviado_em ? { enviadoEm: l.enviado_em } : {}),
  ...(l.observacao_oculta ? { observacaoOculta: true } : {}),
  ...(l.resposta_professor ? { respostaProfessor: l.resposta_professor } : {}),
  ...(l.respondida_em ? { respondidaEm: l.respondida_em } : {}),
})

export class EnvioRepositorioPg implements EnvioRepositorio {
  constructor(private readonly pool: pg.Pool) {}

  async salvar(e: Envio) {
    await this.pool.query(
      `INSERT INTO envios (id, formulario_id, aluno_id, turma_id, status, respostas, nota, nota_geral, compreensao, observacao, enviado_em, atualizado_em, observacao_oculta, resposta_professor, respondida_em)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (formulario_id, aluno_id) DO UPDATE
         SET status = $5, respostas = $6, nota = $7, nota_geral = $8, compreensao = $9, observacao = $10, enviado_em = $11, atualizado_em = $12,
             observacao_oculta = $13, resposta_professor = $14, respondida_em = $15`,
      [e.id, e.formularioId, e.alunoId, e.turmaId, e.status, JSON.stringify(e.respostas), e.nota ?? null, e.notaGeral ?? null, e.compreensao ?? null, e.observacao ?? null, e.enviadoEm ?? null, e.atualizadoEm, e.observacaoOculta ?? false, e.respostaProfessor ?? null, e.respondidaEm ?? null],
    )
  }
  async porId(id: string) {
    const r = await this.pool.query<Linha>('SELECT * FROM envios WHERE id = $1', [id])
    return r.rows[0] ? paraEnvio(r.rows[0]) : undefined
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
  async excluirDoAlunoNaTurma(turmaId: string, alunoId: string) {
    await this.pool.query('DELETE FROM envios WHERE turma_id = $1 AND aluno_id = $2', [turmaId, alunoId])
  }
  async excluirDaTurma(turmaId: string) {
    await this.pool.query('DELETE FROM envios WHERE turma_id = $1', [turmaId])
  }
}

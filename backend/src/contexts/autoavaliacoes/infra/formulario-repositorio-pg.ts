import type pg from 'pg'
import type { Formulario, StatusFormulario } from '../domain/formulario.ts'
import type { Pergunta, TipoPergunta } from '../domain/pergunta.ts'
import type { FormularioRepositorio } from '../domain/repositorio.ts'

interface LinhaFormulario {
  id: string
  titulo: string
  turma_id: string
  status: StatusFormulario
  publicar_em: Date | null
  publicado_em: Date | null
  prazo: Date | null
  mostrar_gabarito: boolean
  criado_em: Date
}
interface LinhaPergunta {
  id: string
  formulario_id: string
  enunciado: string
  tipo: TipoPergunta
  opcoes: string[]
  gabarito: number[] | null
  categorias_opcao: Array<'I' | 'P' | 'C' | null> | null
}

const paraPergunta = (l: LinhaPergunta): Pergunta => ({
  id: l.id, enunciado: l.enunciado, tipo: l.tipo, opcoes: l.opcoes, ...(l.gabarito ? { gabarito: l.gabarito } : {}), ...(l.categorias_opcao ? { categoriasOpcao: l.categorias_opcao } : {}),
})
const paraFormulario = (l: LinhaFormulario, perguntas: Pergunta[]): Formulario => ({
  id: l.id,
  titulo: l.titulo,
  turmaId: l.turma_id,
  status: l.status,
  mostrarGabarito: l.mostrar_gabarito,
  criadoEm: l.criado_em,
  perguntas,
  ...(l.publicar_em ? { publicarEm: l.publicar_em } : {}),
  ...(l.publicado_em ? { publicadoEm: l.publicado_em } : {}),
  ...(l.prazo ? { prazo: l.prazo } : {}),
})

export class FormularioRepositorioPg implements FormularioRepositorio {
  constructor(private readonly pool: pg.Pool) {}

  async salvar(f: Formulario) {
    const c = await this.pool.connect()
    try {
      await c.query('BEGIN')
      await c.query(
        `INSERT INTO formularios (id, titulo, turma_id, status, publicar_em, publicado_em, prazo, mostrar_gabarito, criado_em)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET titulo = $2, status = $4, publicar_em = $5, publicado_em = $6, prazo = $7, mostrar_gabarito = $8`,
        [f.id, f.titulo, f.turmaId, f.status, f.publicarEm ?? null, f.publicadoEm ?? null, f.prazo ?? null, f.mostrarGabarito, f.criadoEm],
      )
      await c.query('DELETE FROM perguntas WHERE formulario_id = $1', [f.id])
      for (const [ordem, p] of f.perguntas.entries()) {
        await c.query(
          'INSERT INTO perguntas (id, formulario_id, ordem, enunciado, tipo, opcoes, gabarito, categorias_opcao) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [p.id, f.id, ordem, p.enunciado, p.tipo, JSON.stringify(p.opcoes), p.gabarito ? JSON.stringify(p.gabarito) : null, p.categoriasOpcao ? JSON.stringify(p.categoriasOpcao) : null],
        )
      }
      await c.query('COMMIT')
    } catch (erro) {
      await c.query('ROLLBACK')
      throw erro
    } finally {
      c.release()
    }
  }

  async porId(id: string) {
    return (await this.carregar('SELECT * FROM formularios WHERE id = $1', [id]))[0]
  }
  async listarPorTurmas(turmaIds: string[]) {
    if (turmaIds.length === 0) return []
    return this.carregar('SELECT * FROM formularios WHERE turma_id = ANY($1) ORDER BY criado_em', [turmaIds])
  }
  async excluir(id: string) {
    await this.pool.query('DELETE FROM formularios WHERE id = $1', [id])
  }
  async excluirDaTurma(turmaId: string) {
    await this.pool.query('DELETE FROM formularios WHERE turma_id = $1', [turmaId])
  }

  private async carregar(sql: string, params: unknown[]): Promise<Formulario[]> {
    const formularios = (await this.pool.query<LinhaFormulario>(sql, params)).rows
    if (formularios.length === 0) return []
    const perguntas = (
      await this.pool.query<LinhaPergunta>('SELECT * FROM perguntas WHERE formulario_id = ANY($1) ORDER BY formulario_id, ordem', [formularios.map((f) => f.id)])
    ).rows
    return formularios.map((f) => paraFormulario(f, perguntas.filter((p) => p.formulario_id === f.id).map(paraPergunta)))
  }
}

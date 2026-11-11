import { describe, expect, it } from 'vitest'
import { PERGUNTAS_EXEMPLO, cenarioPublicado, criarContexto } from '../../../app/testes/contexto.ts'

async function base() {
  const ctx = criarContexto()
  const prof = await ctx.usuario('professor', 'Alberto')
  const turma = await ctx.uc.turmas.criar.executar(prof, { nome: 'Estatística', periodo: '2026/02' })
  return { ctx, prof, turma }
}

describe('formulários', () => {
  it('R-22 cria rascunho, aberto e agendado conforme os dados', async () => {
    const { ctx, prof, turma } = await base()
    const f = (extra: object) => ctx.uc.formularios.criar.executar(prof, { titulo: 'Quiz', turmaId: turma.id, perguntas: PERGUNTAS_EXEMPLO, ...extra })
    expect((await f({})).status).toBe('rascunho')
    expect((await f({ postar: true })).status).toBe('aberto')
    expect((await f({ publicarEm: '2026-09-20T12:00:00Z' })).status).toBe('agendado')
  })
  it('R-23 não publica sem perguntas', async () => {
    const { ctx, prof, turma } = await base()
    await expect(ctx.uc.formularios.criar.executar(prof, { titulo: 'Quiz', turmaId: turma.id, postar: true, perguntas: [] })).rejects.toMatchObject({ codigo: 'SEM_PERGUNTAS' })
  })
  it('R-24 não agenda para o passado', async () => {
    const { ctx, prof, turma } = await base()
    await expect(ctx.uc.formularios.criar.executar(prof, { titulo: 'Quiz', turmaId: turma.id, publicarEm: '2026-09-01T12:00:00Z', perguntas: PERGUNTAS_EXEMPLO })).rejects.toMatchObject({ codigo: 'DATA_NO_PASSADO' })
  })
  it('R-20 só cria formulário em turma própria', async () => {
    const { ctx, turma } = await base()
    const outro = await ctx.usuario('professor', 'Maria Silva')
    await expect(ctx.uc.formularios.criar.executar(outro, { titulo: 'Quiz', turmaId: turma.id, perguntas: [] })).rejects.toMatchObject({ status: 403 })
  })
  it('R-25 edição de status segue as transições', async () => {
    const { ctx, prof, turma } = await base()
    const f = await ctx.uc.formularios.criar.executar(prof, { titulo: 'Quiz', turmaId: turma.id, postar: true, perguntas: PERGUNTAS_EXEMPLO })
    expect((await ctx.uc.formularios.editar.executar(prof, f.id, { status: 'fechado' })).status).toBe('fechado')
    expect((await ctx.uc.formularios.editar.executar(prof, f.id, { status: 'concluido' })).status).toBe('concluido')
    await expect(ctx.uc.formularios.editar.executar(prof, f.id, { status: 'aberto' })).rejects.toMatchObject({ codigo: 'TRANSICAO_INVALIDA' })
  })
  it('R-26 agendado vence e vira aberto na leitura', async () => {
    const { ctx, prof, turma } = await base()
    const f = await ctx.uc.formularios.criar.executar(prof, { titulo: 'Quiz', turmaId: turma.id, publicarEm: '2026-09-12T12:00:00Z', perguntas: PERGUNTAS_EXEMPLO })
    expect((await ctx.uc.formularios.obter.executar(prof, f.id)).status).toBe('agendado')
    ctx.relogio.avancarDias(3)
    expect((await ctx.uc.formularios.obter.executar(prof, f.id)).status).toBe('aberto')
  })
  it('R-28 perguntas de formulário publicado são imutáveis, o título não', async () => {
    const { ctx, prof, turma } = await base()
    const f = await ctx.uc.formularios.criar.executar(prof, { titulo: 'Quiz', turmaId: turma.id, postar: true, perguntas: PERGUNTAS_EXEMPLO })
    await expect(ctx.uc.formularios.editar.executar(prof, f.id, { perguntas: PERGUNTAS_EXEMPLO.slice(0, 1) })).rejects.toMatchObject({ codigo: 'FORMULARIO_PUBLICADO' })
    expect((await ctx.uc.formularios.editar.executar(prof, f.id, { titulo: 'Novo título' })).titulo).toBe('Novo título')
  })
  it('R-28 rascunho aceita trocar perguntas e mantém ids novos únicos', async () => {
    const { ctx, prof, turma } = await base()
    const f = await ctx.uc.formularios.criar.executar(prof, { titulo: 'Quiz', turmaId: turma.id, perguntas: PERGUNTAS_EXEMPLO })
    const e = await ctx.uc.formularios.editar.executar(prof, f.id, { perguntas: PERGUNTAS_EXEMPLO.slice(0, 1) })
    expect(e.perguntas).toHaveLength(1)
    expect(new Set(f.perguntas.map((p) => p.id)).size).toBe(2)
  })
  it('R-29 só o dono exclui; excluir remove os envios', async () => {
    const ctx = criarContexto()
    const { prof, alunos, formulario } = await cenarioPublicado(ctx)
    const outro = await ctx.usuario('professor', 'Maria Silva')
    await ctx.uc.respostas.salvar.executar(alunos[0]!, formulario.id, formulario.perguntas[0]!.id, [0])
    await expect(ctx.uc.formularios.excluir.executar(outro, formulario.id)).rejects.toMatchObject({ status: 403 })
    await ctx.uc.formularios.excluir.executar(prof, formulario.id)
    expect(await ctx.infra.envios.listarPorFormulario(formulario.id)).toEqual([])
    await expect(ctx.uc.formularios.obter.executar(prof, formulario.id)).rejects.toMatchObject({ status: 404 })
  })
  it('R-30 listagem filtra por turma, status e busca e traz estatísticas', async () => {
    const ctx = criarContexto()
    const { prof, turma } = await cenarioPublicado(ctx)
    await ctx.uc.formularios.criar.executar(prof, { titulo: 'Rascunho de git', turmaId: turma.id, perguntas: [] })
    const todos = await ctx.uc.analise.formularios.executar(prof, {})
    expect(todos).toHaveLength(2)
    expect((await ctx.uc.analise.formularios.executar(prof, { status: 'rascunho' })).map((f) => f.titulo)).toEqual(['Rascunho de git'])
    expect((await ctx.uc.analise.formularios.executar(prof, { busca: 'MÉDIA' })).map((f) => f.titulo)).toEqual(['Média, mediana e moda'])
    expect(todos.find((f) => f.status === 'aberto')).toMatchObject({ respostas: 0, total: 2, dominioMedio: null, maiorDificuldade: null })
    expect(await ctx.uc.analise.formularios.executar(prof, { turmaId: 'inexistente' })).toEqual([])
  })
})

import { describe, expect, it } from 'vitest'
import { cenarioPublicado, criarContexto, responderEEnviar } from '../../../app/testes/contexto.ts'
import type { Contexto } from '../../../app/testes/contexto.ts'

/** Sarah acerta tudo (nota 10, I); James erra a 1ª (nota 5, C); Lisa só começa; Michael fica pendente. */
async function cenarioComRespostas() {
  const ctx = criarContexto()
  const c = await cenarioPublicado(ctx, ['Sarah Chen', 'James Park', 'Lisa Anderson', 'Michael Torres'])
  const ids = c.formulario.perguntas.map((p) => p.id)
  await responderEEnviar(ctx, c.alunos[0]!, c.formulario.id, ids, true, 'Mais exemplos reais')
  await responderEEnviar(ctx, c.alunos[1]!, c.formulario.id, ids, false, 'Mais exemplos reais')
  await ctx.uc.respostas.salvar.executar(c.alunos[2]!, c.formulario.id, ids[0]!, [0])
  return { ctx, ...c, ids }
}

describe('análise do formulário', () => {
  it('R-30/R-51/R-52 estatísticas na listagem', async () => {
    const { ctx, prof } = await cenarioComRespostas()
    const [f] = await ctx.uc.analise.formularios.executar(prof, {})
    expect(f).toMatchObject({ respostas: 2, total: 4, dominioMedio: 75, maiorDificuldade: 'C' })
  })
  it('R-53 resumo do formulário', async () => {
    const { ctx, prof, formulario } = await cenarioComRespostas()
    const r = await ctx.uc.analise.resumoFormulario.executar(prof, formulario.id)
    expect(r).toMatchObject({
      respondidos: 2,
      total: 4,
      taxaResposta: 50,
      notaMedia: 7.5,
      totalObservacoes: 2,
      distribuicao: { I: 50, P: 0, C: 50 },
      maiorDificuldade: 'C',
    })
    expect(r.observacoes.map((o) => [o.aluno, o.texto]).sort()).toEqual([['James Park', 'Mais exemplos reais'], ['Sarah Chen', 'Mais exemplos reais']])
    expect(r.dificuldadesGerais).toEqual([{ titulo: 'Qual a média de 2 e 4?', total: 1 }])
    expect(r.maiorDificuldadePergunta).toMatchObject({ numero: 1, enunciado: 'Qual a média de 2 e 4?' })
  })
  it('R-54 alunos do formulário: responderam, visualizaram e pendentes', async () => {
    const { ctx, prof, formulario } = await cenarioComRespostas()
    const r = await ctx.uc.analise.alunosFormulario.executar(prof, formulario.id)
    expect(r.responderam.map((a) => [a.nome, a.nota, a.nivel])).toEqual([['James Park', 5, 'C'], ['Sarah Chen', 10, 'I']])
    expect(r.visualizaram.map((a) => a.nome)).toEqual(['Lisa Anderson'])
    expect(r.pendentes.map((a) => a.nome)).toEqual(['Michael Torres'])
  })
  it('RNF04 professor de outra turma não vê o resumo', async () => {
    const { ctx, formulario } = await cenarioComRespostas()
    const outro = await ctx.usuario('professor', 'Maria Silva')
    await expect(ctx.uc.analise.resumoFormulario.executar(outro, formulario.id)).rejects.toMatchObject({ status: 403 })
    await expect(ctx.uc.analise.alunosFormulario.executar(outro, formulario.id)).rejects.toMatchObject({ status: 403 })
  })
  it('R-58 notifica os alunos que ainda não enviaram', async () => {
    const { ctx, prof, formulario, alunos } = await cenarioComRespostas()
    const r = await ctx.uc.analise.notificarPendentes.executar(prof, formulario.id)
    expect(r).toEqual({ notificados: 2 })
    const lembretes = await Promise.all([alunos[2]!, alunos[3]!].map((a) => ctx.uc.notificacoes.listar.executar(a)))
    expect(lembretes.map((l) => l.itens.some((n) => n.tipo === 'lembrete'))).toEqual([true, true])
  })
})

describe('análise da turma', () => {
  it('R-52/R-56 estatísticas da turma na listagem', async () => {
    const { ctx, prof } = await cenarioComRespostas()
    const [t] = await ctx.uc.analise.turmas.executar(prof)
    expect(t).toMatchObject({ totalAlunos: 4, taxaResposta: 50, dominioMedio: 75, engajamento: 50, docente: 'Alberto' })
    expect(t?.ultimoFormularioEm).toBe('2026-09-10T12:00:00.000Z')
  })
  it('R-55 alunos da turma com domínio e enviados/publicados', async () => {
    const { ctx, prof, turma } = await cenarioComRespostas()
    const r = await ctx.uc.analise.alunosTurma.executar(prof, turma.id)
    expect(r.docentes.map((d) => d.nome)).toEqual(['Alberto'])
    expect(r.alunos.map((a) => [a.nome, a.dominio, a.enviados])).toEqual([
      ['James Park', 50, '1 / 1'],
      ['Lisa Anderson', null, '0 / 1'],
      ['Michael Torres', null, '0 / 1'],
      ['Sarah Chen', 100, '1 / 1'],
    ])
  })
  it('R-56 resumo da turma', async () => {
    const { ctx, prof, turma } = await cenarioComRespostas()
    const r = await ctx.uc.analise.resumoTurma.executar(prof, turma.id)
    expect(r).toMatchObject({ engajamento: 50, alunosQueRespondeuTudo: 2, notaMedia: 7.5, distribuicao: { I: 50, P: 0, C: 50 }, maiorDificuldade: 'C' })
    expect(r.evolucao).toEqual([{ titulo: 'Média, mediana e moda', valor: 75 }])
    expect(r.maiorDificuldadePorFormulario).toEqual([{ titulo: 'Média, mediana e moda', nivel: 'C' }])
  })
  it('R-56 turma sem dados devolve zeros e nulos', async () => {
    const ctx = criarContexto()
    const prof = await ctx.usuario('professor', 'Alberto')
    const t = await ctx.uc.turmas.criar.executar(prof, { nome: 'Vazia', periodo: '2026/02' })
    expect(await ctx.uc.analise.resumoTurma.executar(prof, t.id)).toMatchObject({ engajamento: 0, notaMedia: null, maiorDificuldade: null, evolucao: [] })
  })
})

describe('métricas do professor', () => {
  const metricas = (ctx: Contexto, prof: { id: string; papel: 'professor' | 'aluno' }, filtros = {}) => ctx.uc.analise.metricas.executar(prof, filtros)

  it('R-57 visão geral consolidada', async () => {
    const { ctx, prof } = await cenarioComRespostas()
    const m = await metricas(ctx, prof)
    expect(m).toMatchObject({
      desempenhoMedio: 75,
      taxaRespostas: { enviados: 2, esperados: 4, percentual: 50 },
      formularios: { publicados: 1, concluidos: 0 },
      maiorDificuldade: { nivel: 'C' },
    })
    expect(m.maiorDificuldade.percentualIncorretas).toBe(25)
    expect(m.porTurma).toEqual([{ turmaId: expect.any(String), nome: 'Estatística Aplicada', cor: expect.any(String), valor: 75 }])
    expect(m.turmasSemDados).toBe(0)
    expect(m.evolucaoMensal).toEqual([{ mes: 'Set', valor: 75 }])
  })
  it('R-57 filtros por aluno, período, status e turma', async () => {
    const { ctx, prof, alunos, turma, formulario } = await cenarioComRespostas()
    expect((await metricas(ctx, prof, { alunoId: alunos[0]!.id })).desempenhoMedio).toBe(100)
    expect((await metricas(ctx, prof, { periodo: '2025/01' })).desempenhoMedio).toBeNull()
    expect((await metricas(ctx, prof, { status: 'concluido' })).formularios.publicados).toBe(0)
    expect((await metricas(ctx, prof, { turmaId: turma.id, formularioId: formulario.id })).taxaRespostas.enviados).toBe(2)
    expect((await metricas(ctx, prof, { desde: '2026-09-11T00:00:00Z' })).desempenhoMedio).toBeNull()
  })
  it('R-57 turma sem dados é contada à parte e concluídos são somados', async () => {
    const { ctx, prof, formulario } = await cenarioComRespostas()
    await ctx.uc.turmas.criar.executar(prof, { nome: 'Vazia', periodo: '2026/02' })
    await ctx.uc.formularios.editar.executar(prof, formulario.id, { status: 'concluido' })
    const m = await metricas(ctx, prof)
    expect(m.turmasSemDados).toBe(1)
    expect(m.formularios).toEqual({ publicados: 1, concluidos: 1 })
  })
  it('RNF04 métricas só consideram turmas do próprio professor', async () => {
    const { ctx } = await cenarioComRespostas()
    const outro = await ctx.usuario('professor', 'Maria Silva')
    expect((await metricas(ctx, outro)).porTurma).toEqual([])
  })
})

import { describe, expect, it } from 'vitest'
import { cenarioPublicado, criarContexto, responderEEnviar } from '../../../app/testes/contexto.ts'

describe('respostas individuais do aluno (N09)', () => {
  it('R-90 por turma: cada formulário com enunciado, opções, marcadas, gabarito, nota e nível', async () => {
    const ctx = criarContexto()
    const { prof, turma, alunos, formulario } = await cenarioPublicado(ctx)
    const ids = formulario.perguntas.map((p) => p.id)
    await responderEEnviar(ctx, alunos[1]!, formulario.id, ids, false, 'Ajuda com média')

    const r = await ctx.uc.analise.alunoNaTurma.executar(prof, turma.id, alunos[1]!.id)
    expect(r.aluno).toEqual({ id: alunos[1]!.id, nome: 'James Park' })
    expect(r.formularios).toHaveLength(1)
    const f = r.formularios[0]!
    expect(f).toMatchObject({ formularioId: formulario.id, status: 'respondido', nota: 5, nivel: 'C', observacao: 'Ajuda com média' })
    expect(f.perguntas[0]).toMatchObject({ id: ids[0], enunciado: 'Qual a média de 2 e 4?', opcoes: ['3', '4'], gabarito: [0], marcadas: [1] })
    expect(f.perguntas[1]).toMatchObject({ marcadas: [0, 2], gabarito: [0, 2] })
  })

  it('R-90 mostra pendente e em andamento; formulários de rascunho/agendado não aparecem', async () => {
    const ctx = criarContexto()
    const { prof, turma, alunos, formulario } = await cenarioPublicado(ctx)
    await ctx.uc.formularios.criar.executar(prof, { titulo: 'Rascunho', turmaId: turma.id, perguntas: [] })
    expect((await ctx.uc.analise.alunoNaTurma.executar(prof, turma.id, alunos[0]!.id)).formularios[0]).toMatchObject({ status: 'pendente', nota: null, nivel: null })
    await ctx.uc.respostas.salvar.executar(alunos[0]!, formulario.id, formulario.perguntas[0]!.id, [0])
    const r = await ctx.uc.analise.alunoNaTurma.executar(prof, turma.id, alunos[0]!.id)
    expect(r.formularios).toHaveLength(1)
    expect(r.formularios[0]).toMatchObject({ status: 'andamento' })
    expect(r.formularios[0]?.perguntas[0]?.marcadas).toEqual([0])
  })

  it('R-90 por formulário', async () => {
    const ctx = criarContexto()
    const { prof, alunos, formulario } = await cenarioPublicado(ctx)
    await responderEEnviar(ctx, alunos[0]!, formulario.id, formulario.perguntas.map((p) => p.id))
    const r = await ctx.uc.analise.alunoNoFormulario.executar(prof, formulario.id, alunos[0]!.id)
    expect(r.aluno.nome).toBe('Sarah Chen')
    expect(r.resposta).toMatchObject({ formularioId: formulario.id, status: 'respondido', nota: 10, nivel: 'I' })
  })

  it('R-90 só o dono; aluno fora da turma é 404; aluno não consulta', async () => {
    const ctx = criarContexto()
    const { prof, turma, alunos, formulario } = await cenarioPublicado(ctx)
    const outro = await ctx.usuario('professor', 'Maria Silva')
    const forasteiro = await ctx.usuario('aluno', 'Michael Torres')
    await expect(ctx.uc.analise.alunoNaTurma.executar(outro, turma.id, alunos[0]!.id)).rejects.toMatchObject({ status: 403 })
    await expect(ctx.uc.analise.alunoNoFormulario.executar(outro, formulario.id, alunos[0]!.id)).rejects.toMatchObject({ status: 403 })
    await expect(ctx.uc.analise.alunoNaTurma.executar(prof, turma.id, forasteiro.id)).rejects.toMatchObject({ status: 404 })
    await expect(ctx.uc.analise.alunoNoFormulario.executar(prof, formulario.id, forasteiro.id)).rejects.toMatchObject({ status: 404 })
    await expect(ctx.uc.analise.alunoNaTurma.executar(alunos[0]!, turma.id, alunos[1]!.id)).rejects.toMatchObject({ status: 403 })
  })
})

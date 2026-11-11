import { describe, expect, it } from 'vitest'
import { cenarioPublicado, criarContexto, responderEEnviar } from '../../../app/testes/contexto.ts'

describe('remover aluno da turma', () => {
  it('R-18 remove matrícula e os envios do aluno nessa turma; o aluno deixa de ver a turma', async () => {
    const ctx = criarContexto()
    const { prof, turma, alunos, formulario } = await cenarioPublicado(ctx)
    await responderEEnviar(ctx, alunos[0]!, formulario.id, formulario.perguntas.map((p) => p.id))
    await ctx.uc.turmas.removerAluno.executar(prof, turma.id, alunos[0]!.id)

    expect(await ctx.uc.turmas.listar.executar(alunos[0]!)).toEqual([])
    expect(await ctx.uc.respostas.listar.executar(alunos[0]!)).toEqual([])
    expect(await ctx.infra.envios.listarPorAluno(alunos[0]!.id)).toEqual([])
    const lista = await ctx.uc.analise.alunosTurma.executar(prof, turma.id)
    expect(lista.alunos.map((a) => a.nome)).toEqual(['James Park'])
    // quem ficou não é afetado
    expect(await ctx.uc.turmas.listar.executar(alunos[1]!)).toHaveLength(1)
  })

  it('R-18 não apaga envios do mesmo aluno em outra turma', async () => {
    const ctx = criarContexto()
    const a = await cenarioPublicado(ctx, ['Sarah Chen'])
    const turmaB = await ctx.uc.turmas.criar.executar(a.prof, { nome: 'Outra', periodo: '2026/02' })
    await ctx.infra.turmas.matricular(turmaB.id, a.alunos[0]!.id)
    const formB = await ctx.uc.formularios.criar.executar(a.prof, { titulo: 'B', turmaId: turmaB.id, postar: true, perguntas: [{ enunciado: 'P?', tipo: 'unica', opcoes: ['x', 'y'], gabarito: [0] }] })
    await ctx.uc.respostas.salvar.executar(a.alunos[0]!, formB.id, formB.perguntas[0]!.id, [0])
    await ctx.uc.respostas.salvar.executar(a.alunos[0]!, a.formulario.id, a.formulario.perguntas[0]!.id, [0])

    await ctx.uc.turmas.removerAluno.executar(a.prof, a.turma.id, a.alunos[0]!.id)
    const restantes = await ctx.infra.envios.listarPorAluno(a.alunos[0]!.id)
    expect(restantes.map((e) => e.formularioId)).toEqual([formB.id])
  })

  it('R-18 só o dono remove; aluno que não está na turma é 404; aluno não remove', async () => {
    const ctx = criarContexto()
    const { prof, turma, alunos } = await cenarioPublicado(ctx)
    const outro = await ctx.usuario('professor', 'Maria Silva')
    const forasteiro = await ctx.usuario('aluno', 'Michael Torres')
    await expect(ctx.uc.turmas.removerAluno.executar(outro, turma.id, alunos[0]!.id)).rejects.toMatchObject({ status: 403 })
    await expect(ctx.uc.turmas.removerAluno.executar(alunos[1]!, turma.id, alunos[0]!.id)).rejects.toMatchObject({ status: 403 })
    await expect(ctx.uc.turmas.removerAluno.executar(prof, turma.id, forasteiro.id)).rejects.toMatchObject({ status: 404 })
    await ctx.uc.turmas.removerAluno.executar(prof, turma.id, alunos[0]!.id)
    await expect(ctx.uc.turmas.removerAluno.executar(prof, turma.id, alunos[0]!.id)).rejects.toMatchObject({ status: 404 })
  })
})

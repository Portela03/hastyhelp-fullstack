import { describe, expect, it } from 'vitest'
import { PERGUNTAS_EXEMPLO, cenarioPublicado, criarContexto, responderEEnviar } from '../../../app/testes/contexto.ts'

describe('respostas do aluno', () => {
  it('R-40 aluno só vê formulários de suas turmas e nunca rascunho/agendado', async () => {
    const ctx = criarContexto()
    const { prof, turma, alunos } = await cenarioPublicado(ctx)
    await ctx.uc.formularios.criar.executar(prof, { titulo: 'Rascunho', turmaId: turma.id, perguntas: PERGUNTAS_EXEMPLO })
    await ctx.uc.formularios.criar.executar(prof, { titulo: 'Agendado', turmaId: turma.id, publicarEm: '2026-09-20T12:00:00Z', perguntas: PERGUNTAS_EXEMPLO })
    const forasteiro = await ctx.usuario('aluno', 'Michael Torres')
    expect((await ctx.uc.respostas.listar.executar(alunos[0]!)).map((a) => a.titulo)).toEqual(['Média, mediana e moda'])
    expect(await ctx.uc.respostas.listar.executar(forasteiro)).toEqual([])
  })
  it('R-41 status pendente → andamento → respondido', async () => {
    const ctx = criarContexto()
    const { alunos, formulario } = await cenarioPublicado(ctx)
    const [p1, p2] = formulario.perguntas
    const status = async () => (await ctx.uc.respostas.listar.executar(alunos[0]!))[0]!.status
    expect(await status()).toBe('pendente')
    await ctx.uc.respostas.salvar.executar(alunos[0]!, formulario.id, p1!.id, [0])
    expect(await status()).toBe('andamento')
    await ctx.uc.respostas.salvar.executar(alunos[0]!, formulario.id, p2!.id, [0, 2])
    await ctx.uc.respostas.enviar.executar(alunos[0]!, formulario.id)
    expect(await status()).toBe('respondido')
  })
  it('R-41 sem envio, formulário fechado ou prazo vencido vira encerrado', async () => {
    const ctx = criarContexto()
    const { prof, alunos, formulario } = await cenarioPublicado(ctx)
    await ctx.uc.formularios.editar.executar(prof, formulario.id, { status: 'fechado' })
    expect((await ctx.uc.respostas.listar.executar(alunos[0]!))[0]?.status).toBe('encerrado')
    await ctx.uc.formularios.editar.executar(prof, formulario.id, { status: 'aberto', prazo: '2026-09-11' })
    expect((await ctx.uc.respostas.listar.executar(alunos[0]!))[0]?.status).toBe('pendente')
    ctx.relogio.avancarDias(5)
    expect((await ctx.uc.respostas.listar.executar(alunos[0]!))[0]?.status).toBe('encerrado')
  })
  it('R-42 não salva resposta fora do prazo nem em formulário fechado', async () => {
    const ctx = criarContexto()
    const { prof, alunos, formulario } = await cenarioPublicado(ctx)
    await ctx.uc.formularios.editar.executar(prof, formulario.id, { status: 'fechado' })
    await expect(ctx.uc.respostas.salvar.executar(alunos[0]!, formulario.id, formulario.perguntas[0]!.id, [0])).rejects.toMatchObject({ codigo: 'FORA_DO_PRAZO' })
  })
  it('R-40/RNF04 aluno de outra turma não acessa o formulário', async () => {
    const ctx = criarContexto()
    const { formulario } = await cenarioPublicado(ctx)
    const forasteiro = await ctx.usuario('aluno', 'Michael Torres')
    await expect(ctx.uc.respostas.salvar.executar(forasteiro, formulario.id, formulario.perguntas[0]!.id, [0])).rejects.toMatchObject({ status: 403 })
    await expect(ctx.uc.respostas.enviar.executar(forasteiro, formulario.id)).rejects.toMatchObject({ status: 403 })
  })
  it('R-43 valida a pergunta e as opções marcadas', async () => {
    const ctx = criarContexto()
    const { alunos, formulario } = await cenarioPublicado(ctx)
    const p1 = formulario.perguntas[0]!
    await expect(ctx.uc.respostas.salvar.executar(alunos[0]!, formulario.id, p1.id, [9])).rejects.toMatchObject({ codigo: 'OPCAO_INVALIDA' })
    await expect(ctx.uc.respostas.salvar.executar(alunos[0]!, formulario.id, 'pergunta-fantasma', [0])).rejects.toMatchObject({ status: 404 })
  })
  it('R-44 enviar exige tudo respondido e vira imutável', async () => {
    const ctx = criarContexto()
    const { alunos, formulario } = await cenarioPublicado(ctx)
    await ctx.uc.respostas.salvar.executar(alunos[0]!, formulario.id, formulario.perguntas[0]!.id, [0])
    await expect(ctx.uc.respostas.enviar.executar(alunos[0]!, formulario.id)).rejects.toMatchObject({ codigo: 'RESPOSTAS_INCOMPLETAS' })
    await responderEEnviar(ctx, alunos[1]!, formulario.id, formulario.perguntas.map((p) => p.id))
    await expect(ctx.uc.respostas.salvar.executar(alunos[1]!, formulario.id, formulario.perguntas[0]!.id, [1])).rejects.toMatchObject({ codigo: 'ENVIO_JA_ENVIADO', status: 409 })
  })
  it('R-45/R-46/R-48 envio calcula nota, nível e guarda aluno, turma e observação', async () => {
    const ctx = criarContexto()
    const { turma, alunos, formulario } = await cenarioPublicado(ctx)
    const ids = formulario.perguntas.map((p) => p.id)
    const certo = await responderEEnviar(ctx, alunos[0]!, formulario.id, ids, true, 'Gostei')
    const errado = await responderEEnviar(ctx, alunos[1]!, formulario.id, ids, false)
    expect(certo).toMatchObject({ status: 'respondido', nota: 10, compreensao: 'I' })
    expect(errado).toMatchObject({ nota: 5, compreensao: 'C' })
    const [envio] = await ctx.infra.envios.listarPorAluno(alunos[0]!.id)
    expect(envio).toMatchObject({ alunoId: alunos[0]!.id, turmaId: turma.id, formularioId: formulario.id, observacao: 'Gostei' })
  })
  it('R-47 gabarito só aparece quando liberado pelo professor e após enviar', async () => {
    const ctx = criarContexto()
    const { prof, alunos, formulario } = await cenarioPublicado(ctx)
    const ids = formulario.perguntas.map((p) => p.id)
    const vistoPeloAluno = async () => (await ctx.uc.respostas.listar.executar(alunos[0]!))[0]!
    expect((await vistoPeloAluno()).perguntas.every((p) => p.gabarito === undefined)).toBe(true)
    await ctx.uc.formularios.editar.executar(prof, formulario.id, { mostrarGabarito: true })
    expect((await vistoPeloAluno()).perguntas.every((p) => p.gabarito === undefined)).toBe(true)
    await responderEEnviar(ctx, alunos[0]!, formulario.id, ids)
    const enviado = await vistoPeloAluno()
    expect(enviado.perguntas[0]?.gabarito).toEqual([0])
    expect(enviado.respostas).toEqual({ [ids[0]!]: [0], [ids[1]!]: [0, 2] })
  })
  it('RNF04 um aluno nunca vê as respostas do outro', async () => {
    const ctx = criarContexto()
    const { alunos, formulario } = await cenarioPublicado(ctx)
    await responderEEnviar(ctx, alunos[0]!, formulario.id, formulario.perguntas.map((p) => p.id))
    const doOutro = (await ctx.uc.respostas.listar.executar(alunos[1]!))[0]!
    expect(doOutro).toMatchObject({ status: 'pendente', respostas: {} })
  })
})

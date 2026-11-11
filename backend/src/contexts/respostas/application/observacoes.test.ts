import { describe, expect, it } from 'vitest'
import { cenarioPublicado, criarContexto, responderEEnviar } from '../../../app/testes/contexto.ts'

async function comObservacoes() {
  const ctx = criarContexto()
  const c = await cenarioPublicado(ctx)
  const ids = c.formulario.perguntas.map((p) => p.id)
  await responderEEnviar(ctx, c.alunos[0]!, c.formulario.id, ids, true, 'Mais exemplos reais')
  await responderEEnviar(ctx, c.alunos[1]!, c.formulario.id, ids, false)
  const resumo = await ctx.uc.analise.resumoFormulario.executar(c.prof, c.formulario.id)
  return { ctx, ...c, resumo, envioId: resumo.observacoes[0]!.envioId }
}

describe('observações dos alunos', () => {
  it('R-53 o resumo lista cada observação com aluno, texto, resposta e se está oculta', async () => {
    const { resumo, alunos } = await comObservacoes()
    expect(resumo.totalObservacoes).toBe(1)
    expect(resumo.observacoes).toEqual([{ envioId: expect.any(String), alunoId: alunos[0]!.id, aluno: 'Sarah Chen', texto: 'Mais exemplos reais', resposta: null, oculta: false }])
  })

  it('R-95 professor responde; o aluno vê a resposta e é notificado', async () => {
    const { ctx, prof, alunos, formulario, envioId } = await comObservacoes()
    await ctx.uc.respostas.moderarObservacao.executar(prof, formulario.id, envioId, { resposta: '  Vou trazer na próxima aula.  ' })

    const resumo = await ctx.uc.analise.resumoFormulario.executar(prof, formulario.id)
    expect(resumo.observacoes[0]).toMatchObject({ resposta: 'Vou trazer na próxima aula.' })
    const aluno = (await ctx.uc.respostas.listar.executar(alunos[0]!))[0]!
    expect(aluno).toMatchObject({ observacao: 'Mais exemplos reais', respostaProfessor: 'Vou trazer na próxima aula.' })
    const notif = await ctx.uc.notificacoes.listar.executar(alunos[0]!)
    expect(notif.itens[0]).toMatchObject({ tipo: 'resposta-observacao', link: `/aluno/autoavaliacoes/${formulario.id}/resultado` })
  })

  it('R-95 resposta vazia limpa a resposta; passa de 500 caracteres é rejeitada', async () => {
    const { ctx, prof, formulario, envioId } = await comObservacoes()
    await ctx.uc.respostas.moderarObservacao.executar(prof, formulario.id, envioId, { resposta: 'ok' })
    await ctx.uc.respostas.moderarObservacao.executar(prof, formulario.id, envioId, { resposta: '   ' })
    expect((await ctx.uc.analise.resumoFormulario.executar(prof, formulario.id)).observacoes[0]?.resposta).toBeNull()
    await expect(ctx.uc.respostas.moderarObservacao.executar(prof, formulario.id, envioId, { resposta: 'x'.repeat(501) })).rejects.toMatchObject({ codigo: 'RESPOSTA_INVALIDA', status: 400 })
  })

  it('R-96 ocultar tira a observação da contagem do resumo, mas o aluno continua vendo a dele', async () => {
    const { ctx, prof, alunos, formulario, envioId } = await comObservacoes()
    await ctx.uc.respostas.moderarObservacao.executar(prof, formulario.id, envioId, { oculta: true })
    const resumo = await ctx.uc.analise.resumoFormulario.executar(prof, formulario.id)
    expect(resumo.totalObservacoes).toBe(0)
    expect(resumo.observacoes[0]).toMatchObject({ oculta: true })
    expect((await ctx.uc.respostas.listar.executar(alunos[0]!))[0]?.observacao).toBe('Mais exemplos reais')
    await ctx.uc.respostas.moderarObservacao.executar(prof, formulario.id, envioId, { oculta: false })
    expect((await ctx.uc.analise.resumoFormulario.executar(prof, formulario.id)).totalObservacoes).toBe(1)
  })

  it('R-97 só o dono modera; envio sem observação ou inexistente falha', async () => {
    const { ctx, prof, alunos, formulario, envioId } = await comObservacoes()
    const outro = await ctx.usuario('professor', 'Maria Silva')
    await expect(ctx.uc.respostas.moderarObservacao.executar(outro, formulario.id, envioId, { oculta: true })).rejects.toMatchObject({ status: 403 })
    await expect(ctx.uc.respostas.moderarObservacao.executar(alunos[0]!, formulario.id, envioId, { oculta: true })).rejects.toMatchObject({ status: 403 })
    const envioSemObs = (await ctx.infra.envios.listarPorAluno(alunos[1]!.id))[0]!
    await expect(ctx.uc.respostas.moderarObservacao.executar(prof, formulario.id, envioSemObs.id, { resposta: 'oi' })).rejects.toMatchObject({ codigo: 'SEM_OBSERVACAO', status: 422 })
    await expect(ctx.uc.respostas.moderarObservacao.executar(prof, formulario.id, 'inexistente', { oculta: true })).rejects.toMatchObject({ status: 404 })
  })
})

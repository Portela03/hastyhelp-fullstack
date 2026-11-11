import { describe, expect, it } from 'vitest'
import { PERGUNTAS_EXEMPLO, cenarioPublicado, criarContexto, responderEEnviar } from '../../../app/testes/contexto.ts'

describe('notificações', () => {
  it('R-81 publicar (postar ao criar) notifica os alunos da turma', async () => {
    const ctx = criarContexto()
    const { alunos, formulario } = await cenarioPublicado(ctx)
    const r = await ctx.uc.notificacoes.listar.executar(alunos[0]!)
    expect(r.naoLidas).toBe(1)
    expect(r.itens[0]).toMatchObject({ tipo: 'publicacao', lida: false, link: `/aluno/autoavaliacoes/${formulario.id}` })
    expect(r.itens[0]?.titulo).toMatch(/Média, mediana e moda/)
  })

  it('R-81 publicar rascunho, postar agora e agendamento vencido também notificam; rascunho não', async () => {
    const ctx = criarContexto()
    const prof = await ctx.usuario('professor', 'Alberto')
    const turma = await ctx.uc.turmas.criar.executar(prof, { nome: 'Estatística', periodo: '2026/02' })
    const aluno = await ctx.usuario('aluno', 'Sarah Chen', { codigoConvite: turma.codigoConvite })
    const rascunho = await ctx.uc.formularios.criar.executar(prof, { titulo: 'R', turmaId: turma.id, perguntas: PERGUNTAS_EXEMPLO })
    const agendado = await ctx.uc.formularios.criar.executar(prof, { titulo: 'A', turmaId: turma.id, publicarEm: '2026-09-12T12:00:00Z', perguntas: PERGUNTAS_EXEMPLO })
    expect((await ctx.uc.notificacoes.listar.executar(aluno)).itens).toHaveLength(0)
    await ctx.uc.formularios.editar.executar(prof, rascunho.id, { status: 'aberto' })
    expect((await ctx.uc.notificacoes.listar.executar(aluno)).itens).toHaveLength(1)
    ctx.relogio.avancarDias(3)
    await ctx.uc.formularios.obter.executar(prof, agendado.id) // materializa o agendamento
    expect((await ctx.uc.notificacoes.listar.executar(aluno)).itens).toHaveLength(2)
    await ctx.uc.formularios.obter.executar(prof, agendado.id) // não repete
    expect((await ctx.uc.notificacoes.listar.executar(aluno)).itens).toHaveLength(2)
  })

  it('R-81 respeita as preferências do aluno (e-mail desligado ou publicação desligada)', async () => {
    const ctx = criarContexto()
    const prof = await ctx.usuario('professor', 'Alberto')
    const turma = await ctx.uc.turmas.criar.executar(prof, { nome: 'Estatística', periodo: '2026/02' })
    const semNotif = await ctx.usuario('aluno', 'Sem Notificacao', { codigoConvite: turma.codigoConvite })
    const semPub = await ctx.usuario('aluno', 'Sem Publicacao', { codigoConvite: turma.codigoConvite })
    const comNotif = await ctx.usuario('aluno', 'Com Notificacao', { codigoConvite: turma.codigoConvite })
    await ctx.uc.identidade.atualizarPreferencias.executar(semNotif.id, { notificacoesEmail: false })
    await ctx.uc.identidade.atualizarPreferencias.executar(semPub.id, { publicacaoFormularios: false })
    await ctx.uc.formularios.criar.executar(prof, { titulo: 'Q', turmaId: turma.id, postar: true, perguntas: PERGUNTAS_EXEMPLO })
    expect((await ctx.uc.notificacoes.listar.executar(semNotif)).itens).toHaveLength(0)
    expect((await ctx.uc.notificacoes.listar.executar(semPub)).itens).toHaveLength(0)
    expect((await ctx.uc.notificacoes.listar.executar(comNotif)).itens).toHaveLength(1)
  })

  it('R-82 notificar pendentes gera lembrete só para quem não enviou', async () => {
    const ctx = criarContexto()
    const { prof, alunos, formulario } = await cenarioPublicado(ctx)
    await responderEEnviar(ctx, alunos[0]!, formulario.id, formulario.perguntas.map((p) => p.id))
    const r = await ctx.uc.analise.notificarPendentes.executar(prof, formulario.id)
    expect(r).toEqual({ notificados: 1 })
    const pendente = await ctx.uc.notificacoes.listar.executar(alunos[1]!)
    expect(pendente.itens.map((n) => n.tipo)).toContain('lembrete')
    const quemEnviou = await ctx.uc.notificacoes.listar.executar(alunos[0]!)
    expect(quemEnviou.itens.map((n) => n.tipo)).not.toContain('lembrete')
  })

  it('R-82 aluno com notificações desligadas não recebe lembrete', async () => {
    const ctx = criarContexto()
    const { prof, alunos, formulario } = await cenarioPublicado(ctx)
    await ctx.uc.identidade.atualizarPreferencias.executar(alunos[1]!.id, { notificacoesEmail: false })
    expect(await ctx.uc.analise.notificarPendentes.executar(prof, formulario.id)).toEqual({ notificados: 1 })
  })

  it('R-83 quando todos enviam, o professor recebe a conclusão (respeitando a preferência)', async () => {
    const ctx = criarContexto()
    const { prof, alunos, formulario } = await cenarioPublicado(ctx)
    const ids = formulario.perguntas.map((p) => p.id)
    await responderEEnviar(ctx, alunos[0]!, formulario.id, ids)
    expect((await ctx.uc.notificacoes.listar.executar(prof)).itens).toHaveLength(0)
    await responderEEnviar(ctx, alunos[1]!, formulario.id, ids)
    const r = await ctx.uc.notificacoes.listar.executar(prof)
    expect(r.itens[0]).toMatchObject({ tipo: 'conclusao', link: `/avaliacoes/${formulario.id}/resumo` })
  })

  it('R-83 conclusão desligada no perfil do professor não notifica', async () => {
    const ctx = criarContexto()
    const { prof, alunos, formulario } = await cenarioPublicado(ctx)
    await ctx.uc.identidade.atualizarPreferencias.executar(prof.id, { conclusaoFormularios: false })
    const ids = formulario.perguntas.map((p) => p.id)
    await responderEEnviar(ctx, alunos[0]!, formulario.id, ids)
    await responderEEnviar(ctx, alunos[1]!, formulario.id, ids)
    expect((await ctx.uc.notificacoes.listar.executar(prof)).itens).toHaveLength(0)
  })

  it('R-84 lista as mais recentes primeiro, marca uma ou todas como lidas e protege as de outros', async () => {
    const ctx = criarContexto()
    const { prof, alunos, formulario } = await cenarioPublicado(ctx)
    await ctx.uc.analise.notificarPendentes.executar(prof, formulario.id)
    const antes = await ctx.uc.notificacoes.listar.executar(alunos[0]!)
    expect(antes.naoLidas).toBe(2)
    expect(antes.itens.map((n) => n.tipo)).toEqual(['lembrete', 'publicacao'])

    await expect(ctx.uc.notificacoes.marcarLida.executar(alunos[1]!, antes.itens[0]!.id)).rejects.toMatchObject({ status: 404 })
    await ctx.uc.notificacoes.marcarLida.executar(alunos[0]!, antes.itens[0]!.id)
    expect((await ctx.uc.notificacoes.listar.executar(alunos[0]!)).naoLidas).toBe(1)
    await ctx.uc.notificacoes.marcarTodasLidas.executar(alunos[0]!)
    const depois = await ctx.uc.notificacoes.listar.executar(alunos[0]!)
    expect(depois.naoLidas).toBe(0)
    expect(depois.itens.every((n) => n.lida)).toBe(true)
    expect((await ctx.uc.notificacoes.listar.executar(alunos[1]!)).naoLidas).toBe(2)
  })
})

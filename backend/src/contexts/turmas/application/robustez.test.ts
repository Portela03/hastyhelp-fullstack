import { describe, expect, it } from 'vitest'
import { criarContexto } from '../../../app/testes/contexto.ts'
import type { Contexto } from '../../../app/testes/contexto.ts'
import { GerarNovoCodigo } from './gerar-novo-codigo.ts'

async function cenario(ctx: Contexto, opcoes: { manual?: boolean } = {}) {
  const prof = await ctx.usuario('professor', 'Alberto')
  const turma = await ctx.uc.turmas.criar.executar(prof, { nome: 'Estatística Aplicada', periodo: '2026/02' })
  if (opcoes.manual) await ctx.uc.turmas.editar.executar(prof, turma.id, { aprovacaoManual: true })
  const sarah = await ctx.usuario('aluno', 'Sarah Chen')
  const james = await ctx.usuario('aluno', 'James Park')
  return { prof, turma, sarah, james }
}

describe('R-115 concorrência na entrada em turmas', () => {
  it('R-115 dois pedidos simultâneos do mesmo aluno: um cria, o outro é 409 SOLICITACAO_PENDENTE', async () => {
    const ctx = criarContexto()
    const { prof, turma, sarah } = await cenario(ctx, { manual: true })
    const r = await Promise.allSettled([
      ctx.uc.turmas.entrarPorCodigo.executar(sarah, turma.codigoConvite),
      ctx.uc.turmas.entrarPorCodigo.executar(sarah, turma.codigoConvite),
    ])
    expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1)
    expect(r.find((x) => x.status === 'rejected')).toMatchObject({ reason: { status: 409, codigo: 'SOLICITACAO_PENDENTE' } })
    expect((await ctx.uc.turmas.listarEntradas.executar(prof, turma.id)).solicitacoes).toHaveLength(1)
  })

  it('R-115 dois convites simultâneos ao mesmo aluno: um cria, o outro é 409 CONVITE_JA_ENVIADO', async () => {
    const ctx = criarContexto()
    const { prof, turma, sarah } = await cenario(ctx)
    const r = await Promise.allSettled([
      ctx.uc.turmas.convidarAluno.executar(prof, turma.id, sarah.id),
      ctx.uc.turmas.convidarAluno.executar(prof, turma.id, sarah.id),
    ])
    expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1)
    expect(r.find((x) => x.status === 'rejected')).toMatchObject({ reason: { status: 409, codigo: 'CONVITE_JA_ENVIADO' } })
    expect((await ctx.uc.turmas.listarEntradas.executar(prof, turma.id)).convites).toHaveLength(1)
  })

  it('R-115 convite e pedido simultâneos: quem perde recebe 409, sem 500', async () => {
    const ctx = criarContexto()
    const { prof, turma, sarah } = await cenario(ctx, { manual: true })
    const r = await Promise.allSettled([
      ctx.uc.turmas.convidarAluno.executar(prof, turma.id, sarah.id),
      ctx.uc.turmas.entrarPorCodigo.executar(sarah, turma.codigoConvite),
    ])
    for (const x of r) if (x.status === 'rejected') expect(x.reason).toMatchObject({ status: 409 })
    const { solicitacoes, convites } = await ctx.uc.turmas.listarEntradas.executar(prof, turma.id)
    expect(solicitacoes.length + convites.length).toBe(1)
  })
})

describe('R-116 limite de buscas de alunos', () => {
  it('R-116 após 30 buscas no minuto vem 429 MUITAS_BUSCAS; depois da janela volta a liberar', async () => {
    const ctx = criarContexto()
    const { prof, turma } = await cenario(ctx)
    for (let i = 0; i < 30; i++) await ctx.uc.turmas.buscarAlunos.executar(prof, turma.id, 'sarah')
    await expect(ctx.uc.turmas.buscarAlunos.executar(prof, turma.id, 'sarah')).rejects.toMatchObject({ status: 429, codigo: 'MUITAS_BUSCAS' })
    ctx.relogio.definir(new Date(ctx.relogio.agora().getTime() + 61_000))
    expect(await ctx.uc.turmas.buscarAlunos.executar(prof, turma.id, 'sarah')).toHaveLength(1)
  })

  it('R-116 o limite é por professor', async () => {
    const ctx = criarContexto()
    const { prof, turma } = await cenario(ctx)
    const outro = await ctx.usuario('professor', 'Maria Silva')
    const turmaOutro = await ctx.uc.turmas.criar.executar(outro, { nome: 'Cálculo', periodo: '2026/02' })
    for (let i = 0; i < 30; i++) await ctx.uc.turmas.buscarAlunos.executar(prof, turma.id, 'sarah')
    await expect(ctx.uc.turmas.buscarAlunos.executar(prof, turma.id, 'sarah')).rejects.toMatchObject({ status: 429 })
    expect(await ctx.uc.turmas.buscarAlunos.executar(outro, turmaOutro.id, 'sarah')).toHaveLength(1)
  })

  it('R-116 buscas curtas demais ou negadas não consomem o limite', async () => {
    const ctx = criarContexto()
    const { prof, turma } = await cenario(ctx)
    const intruso = await ctx.usuario('professor', 'Maria Silva')
    for (let i = 0; i < 40; i++) {
      await expect(ctx.uc.turmas.buscarAlunos.executar(prof, turma.id, 'sa')).rejects.toMatchObject({ codigo: 'BUSCA_CURTA' })
      await expect(ctx.uc.turmas.buscarAlunos.executar(intruso, turma.id, 'sarah')).rejects.toMatchObject({ status: 403 })
    }
    expect(await ctx.uc.turmas.buscarAlunos.executar(prof, turma.id, 'sarah')).toHaveLength(1)
  })
})

describe('R-117 novo código da turma', () => {
  it('R-117 o dono gera novo código; o antigo deixa de valer e o novo entra', async () => {
    const ctx = criarContexto()
    const { prof, turma, sarah, james } = await cenario(ctx)
    const nova = await ctx.uc.turmas.gerarNovoCodigo.executar(prof, turma.id)
    expect(nova.codigoConvite).toMatch(/^[a-z0-9]{6}$/)
    expect(nova.codigoConvite).not.toBe(turma.codigoConvite)
    expect(nova.id).toBe(turma.id)
    await expect(ctx.uc.turmas.entrarPorCodigo.executar(sarah, turma.codigoConvite)).rejects.toMatchObject({ status: 404, codigo: 'CONVITE_INVALIDO' })
    await expect(ctx.uc.turmas.consultarConvite.executar(turma.codigoConvite)).rejects.toMatchObject({ status: 404 })
    expect((await ctx.uc.turmas.entrarPorCodigo.executar(james, nova.codigoConvite)).status).toBe('matriculado')
  })

  it('R-117 mantém matrículas e pedidos pendentes', async () => {
    const ctx = criarContexto()
    const { prof, turma, sarah } = await cenario(ctx, { manual: true })
    await ctx.uc.turmas.entrarPorCodigo.executar(sarah, turma.codigoConvite)
    await ctx.uc.turmas.gerarNovoCodigo.executar(prof, turma.id)
    expect((await ctx.uc.turmas.listarEntradas.executar(prof, turma.id)).solicitacoes).toHaveLength(1)
  })

  it('R-117 só o dono: outro professor 403, aluno 403, turma inexistente 404', async () => {
    const ctx = criarContexto()
    const { turma, sarah } = await cenario(ctx)
    const outro = await ctx.usuario('professor', 'Maria Silva')
    await expect(ctx.uc.turmas.gerarNovoCodigo.executar(outro, turma.id)).rejects.toMatchObject({ status: 403 })
    await expect(ctx.uc.turmas.gerarNovoCodigo.executar(sarah, turma.id)).rejects.toMatchObject({ status: 403 })
    await expect(ctx.uc.turmas.gerarNovoCodigo.executar(outro, 'nao-existe')).rejects.toMatchObject({ status: 404 })
  })

  it('R-117 colisão do UNIQUE sorteia de novo; esgotadas as tentativas é 503 CODIGO_INDISPONIVEL', async () => {
    const ctx = criarContexto()
    const { prof, turma } = await cenario(ctx)
    const outra = await ctx.uc.turmas.criar.executar(prof, { nome: 'Cálculo', periodo: '2026/02' })
    const sequencia = [outra.codigoConvite, outra.codigoConvite, 'abc234']
    const ids = { novo: () => 'x', codigo: () => sequencia.shift() ?? outra.codigoConvite }
    const uc = new GerarNovoCodigo({ turmas: ctx.infra.turmas, usuarios: ctx.infra.usuarios, ids })
    expect((await uc.executar(prof, turma.id)).codigoConvite).toBe('abc234')
    expect((await ctx.infra.turmas.porCodigo(outra.codigoConvite))?.id).toBe(outra.id)

    const sempreIgual = new GerarNovoCodigo({ turmas: ctx.infra.turmas, usuarios: ctx.infra.usuarios, ids: { novo: () => 'x', codigo: () => outra.codigoConvite } })
    await expect(sempreIgual.executar(prof, turma.id)).rejects.toMatchObject({ status: 503, codigo: 'CODIGO_INDISPONIVEL' })
    expect((await ctx.infra.turmas.porId(turma.id))?.codigoConvite).toBe('abc234')
  })
})

describe('R-118/R-119 pedidos pendentes do aluno', () => {
  it('R-118 lista só os próprios pedidos pendentes (nunca convites nem de outros)', async () => {
    const ctx = criarContexto()
    const { prof, turma, sarah, james } = await cenario(ctx, { manual: true })
    const outra = await ctx.uc.turmas.criar.executar(prof, { nome: 'Cálculo', periodo: '2026/02' })
    await ctx.uc.turmas.entrarPorCodigo.executar(sarah, turma.codigoConvite)
    await ctx.uc.turmas.entrarPorCodigo.executar(james, turma.codigoConvite)
    await ctx.uc.turmas.convidarAluno.executar(prof, outra.id, sarah.id)

    const itens = await ctx.uc.turmas.listarSolicitacoes.executar(sarah)
    expect(itens).toHaveLength(1)
    expect(itens[0]).toMatchObject({ turma: { id: turma.id, nome: 'Estatística Aplicada', periodo: '2026/02' }, docente: 'Alberto', criadoEm: '2026-09-10T12:00:00.000Z' })
    await expect(ctx.uc.turmas.listarSolicitacoes.executar(prof)).rejects.toMatchObject({ status: 403 })
  })

  it('R-119 cancelar some da lista e do docente; o aluno pode pedir de novo', async () => {
    const ctx = criarContexto()
    const { prof, turma, sarah } = await cenario(ctx, { manual: true })
    await ctx.uc.turmas.entrarPorCodigo.executar(sarah, turma.codigoConvite)
    const [pedido] = await ctx.uc.turmas.listarSolicitacoes.executar(sarah)
    await ctx.uc.turmas.cancelarSolicitacao.executar(sarah, pedido!.id)
    expect(await ctx.uc.turmas.listarSolicitacoes.executar(sarah)).toEqual([])
    expect((await ctx.uc.turmas.listarEntradas.executar(prof, turma.id)).solicitacoes).toEqual([])
    expect((await ctx.uc.turmas.entrarPorCodigo.executar(sarah, turma.codigoConvite)).status).toBe('pendente')
  })

  it('R-119 pedido de outro aluno, inexistente ou convite é 404; já resolvido é 409', async () => {
    const ctx = criarContexto()
    const { prof, turma, sarah, james } = await cenario(ctx, { manual: true })
    await ctx.uc.turmas.entrarPorCodigo.executar(sarah, turma.codigoConvite)
    const [pedido] = await ctx.uc.turmas.listarSolicitacoes.executar(sarah)
    await expect(ctx.uc.turmas.cancelarSolicitacao.executar(james, pedido!.id)).rejects.toMatchObject({ status: 404, codigo: 'ENTRADA_NAO_ENCONTRADA' })
    await expect(ctx.uc.turmas.cancelarSolicitacao.executar(sarah, 'nada')).rejects.toMatchObject({ status: 404 })
    await expect(ctx.uc.turmas.cancelarSolicitacao.executar(prof, pedido!.id)).rejects.toMatchObject({ status: 403 })

    const { id: conviteId } = await ctx.uc.turmas.convidarAluno.executar(prof, turma.id, james.id)
    await expect(ctx.uc.turmas.cancelarSolicitacao.executar(james, conviteId)).rejects.toMatchObject({ status: 404 })

    await ctx.uc.turmas.responderSolicitacao.executar(prof, turma.id, pedido!.id, 'recusar')
    await expect(ctx.uc.turmas.cancelarSolicitacao.executar(sarah, pedido!.id)).rejects.toMatchObject({ status: 409, codigo: 'ENTRADA_JA_RESOLVIDA' })
  })
})

import { describe, expect, it } from 'vitest'
import { criarContexto } from '../../../app/testes/contexto.ts'
import type { Contexto } from '../../../app/testes/contexto.ts'

async function cenario(ctx: Contexto, opcoes: { manual?: boolean } = {}) {
  const prof = await ctx.usuario('professor', 'Alberto')
  const turma = await ctx.uc.turmas.criar.executar(prof, { nome: 'Estatística Aplicada', periodo: '2026/02' })
  if (opcoes.manual) await ctx.uc.turmas.editar.executar(prof, turma.id, { aprovacaoManual: true })
  const sarah = await ctx.usuario('aluno', 'Sarah Chen')
  const james = await ctx.usuario('aluno', 'James Park')
  return { prof, turma, sarah, james }
}

const turmasDe = async (ctx: Contexto, ator: Parameters<Contexto['uc']['turmas']['listar']['executar']>[0]) => (await ctx.uc.turmas.listar.executar(ator)).map((t) => t.id)

describe('código da turma', () => {
  it('R-100 tem 6 caracteres', async () => {
    const ctx = criarContexto()
    const { turma } = await cenario(ctx)
    expect(turma.codigoConvite).toMatch(/^[a-z0-9]{6}$/)
  })

  it('R-100 ignora maiúsculas e espaços; código inexistente é CONVITE_INVALIDO', async () => {
    const ctx = criarContexto()
    const { turma, sarah } = await cenario(ctx)
    const r = await ctx.uc.turmas.entrarPorCodigo.executar(sarah, `  ${turma.codigoConvite.toUpperCase()} `)
    expect(r.status).toBe('matriculado')
    await expect(ctx.uc.turmas.entrarPorCodigo.executar(sarah, 'zzzzzz')).rejects.toMatchObject({ status: 404, codigo: 'CONVITE_INVALIDO' })
    await expect(ctx.uc.turmas.entrarPorCodigo.executar(sarah, '   ')).rejects.toMatchObject({ status: 404, codigo: 'CONVITE_INVALIDO' })
  })
})

describe('entrar por código (modo automático)', () => {
  it('R-101 aluno já com conta entra em mais de uma turma', async () => {
    const ctx = criarContexto()
    const { prof, turma, sarah } = await cenario(ctx)
    const outra = await ctx.uc.turmas.criar.executar(prof, { nome: 'Cálculo', periodo: '2026/02' })
    await ctx.uc.turmas.entrarPorCodigo.executar(sarah, turma.codigoConvite)
    const r = await ctx.uc.turmas.entrarPorCodigo.executar(sarah, outra.codigoConvite)
    expect(r).toMatchObject({ status: 'matriculado', turma: { id: outra.id, nome: 'Cálculo' } })
    expect((await turmasDe(ctx, sarah)).sort()).toEqual([turma.id, outra.id].sort())
  })

  it('R-101 já matriculado é 409 JA_NA_TURMA; professor não entra por código', async () => {
    const ctx = criarContexto()
    const { prof, turma, sarah } = await cenario(ctx)
    await ctx.uc.turmas.entrarPorCodigo.executar(sarah, turma.codigoConvite)
    await expect(ctx.uc.turmas.entrarPorCodigo.executar(sarah, turma.codigoConvite)).rejects.toMatchObject({ status: 409, codigo: 'JA_NA_TURMA' })
    await expect(ctx.uc.turmas.entrarPorCodigo.executar(prof, turma.codigoConvite)).rejects.toMatchObject({ status: 403 })
  })
})

describe('aprovação manual', () => {
  it('R-102 só o dono altera a aprovação; o aluno não vê código nem flag', async () => {
    const ctx = criarContexto()
    const { prof, turma, sarah } = await cenario(ctx)
    const outro = await ctx.usuario('professor', 'Maria Silva')
    await expect(ctx.uc.turmas.editar.executar(outro, turma.id, { aprovacaoManual: true })).rejects.toMatchObject({ status: 403 })
    const editada = await ctx.uc.turmas.editar.executar(prof, turma.id, { aprovacaoManual: true })
    expect(editada.aprovacaoManual).toBe(true)
    await ctx.uc.turmas.editar.executar(prof, turma.id, { aprovacaoManual: false })
    await ctx.uc.turmas.entrarPorCodigo.executar(sarah, turma.codigoConvite)
    const visto = (await ctx.uc.turmas.listar.executar(sarah))[0]!
    expect(visto).not.toHaveProperty('codigoConvite')
    expect(visto).not.toHaveProperty('aprovacaoManual')
  })

  it('R-103 entrar por código fica pendente e avisa o professor; não matricula', async () => {
    const ctx = criarContexto()
    const { prof, turma, sarah } = await cenario(ctx, { manual: true })
    const r = await ctx.uc.turmas.entrarPorCodigo.executar(sarah, turma.codigoConvite)
    expect(r.status).toBe('pendente')
    expect(await turmasDe(ctx, sarah)).toEqual([])
    const avisos = (await ctx.uc.notificacoes.listar.executar(prof)).itens
    expect(avisos).toHaveLength(1)
    expect(avisos[0]).toMatchObject({ tipo: 'solicitacao-entrada', link: `/equipes/${turma.id}` })
    expect(avisos[0]!.mensagem).toContain('Sarah Chen')
  })

  it('R-103 pedir de novo enquanto pendente é 409; depois de recusado pode pedir outra vez', async () => {
    const ctx = criarContexto()
    const { prof, turma, sarah } = await cenario(ctx, { manual: true })
    await ctx.uc.turmas.entrarPorCodigo.executar(sarah, turma.codigoConvite)
    await expect(ctx.uc.turmas.entrarPorCodigo.executar(sarah, turma.codigoConvite)).rejects.toMatchObject({ status: 409, codigo: 'SOLICITACAO_PENDENTE' })
    const { solicitacoes } = await ctx.uc.turmas.listarEntradas.executar(prof, turma.id)
    await ctx.uc.turmas.responderSolicitacao.executar(prof, turma.id, solicitacoes[0]!.id, 'recusar')
    expect((await ctx.uc.turmas.entrarPorCodigo.executar(sarah, turma.codigoConvite)).status).toBe('pendente')
  })

  it('R-103 cadastro por link com aprovação manual deixa a solicitação pendente (R-04)', async () => {
    const ctx = criarContexto()
    const { prof, turma } = await cenario(ctx, { manual: true })
    const nova = await ctx.usuario('aluno', 'Novo Aluno', { codigoConvite: turma.codigoConvite })
    expect(await turmasDe(ctx, nova)).toEqual([])
    const { solicitacoes } = await ctx.uc.turmas.listarEntradas.executar(prof, turma.id)
    expect(solicitacoes.map((s) => s.aluno.nome)).toEqual(['Novo Aluno'])
  })

  it('R-04 cadastro por link sem aprovação manual continua matriculando direto', async () => {
    const ctx = criarContexto()
    const { turma } = await cenario(ctx)
    const nova = await ctx.usuario('aluno', 'Novo Aluno', { codigoConvite: turma.codigoConvite })
    expect(await turmasDe(ctx, nova)).toEqual([turma.id])
  })

  it('R-104 só o dono lista as entradas pendentes, com nome e e-mail do aluno', async () => {
    const ctx = criarContexto()
    const { prof, turma, sarah, james } = await cenario(ctx, { manual: true })
    await ctx.uc.turmas.entrarPorCodigo.executar(sarah, turma.codigoConvite)
    await ctx.uc.turmas.convidarAluno.executar(prof, turma.id, james.id)
    const { solicitacoes, convites } = await ctx.uc.turmas.listarEntradas.executar(prof, turma.id)
    expect(solicitacoes).toHaveLength(1)
    expect(solicitacoes[0]!.aluno).toMatchObject({ id: sarah.id, nome: 'Sarah Chen', email: 'sarah.chen@escola.com' })
    expect(convites.map((c) => c.aluno.id)).toEqual([james.id])
    const outro = await ctx.usuario('professor', 'Maria Silva')
    await expect(ctx.uc.turmas.listarEntradas.executar(outro, turma.id)).rejects.toMatchObject({ status: 403 })
    await expect(ctx.uc.turmas.listarEntradas.executar(sarah, turma.id)).rejects.toMatchObject({ status: 403 })
  })

  it('R-105/R-106 aceitar matricula e avisa o aluno; recusar só avisa', async () => {
    const ctx = criarContexto()
    const { prof, turma, sarah, james } = await cenario(ctx, { manual: true })
    await ctx.uc.turmas.entrarPorCodigo.executar(sarah, turma.codigoConvite)
    await ctx.uc.turmas.entrarPorCodigo.executar(james, turma.codigoConvite)
    const { solicitacoes } = await ctx.uc.turmas.listarEntradas.executar(prof, turma.id)
    const deSarah = solicitacoes.find((s) => s.aluno.id === sarah.id)!
    const deJames = solicitacoes.find((s) => s.aluno.id === james.id)!
    await ctx.uc.turmas.responderSolicitacao.executar(prof, turma.id, deSarah.id, 'aceitar')
    await ctx.uc.turmas.responderSolicitacao.executar(prof, turma.id, deJames.id, 'recusar')
    expect(await turmasDe(ctx, sarah)).toEqual([turma.id])
    expect(await turmasDe(ctx, james)).toEqual([])
    expect((await ctx.uc.notificacoes.listar.executar(sarah)).itens[0]).toMatchObject({ tipo: 'entrada-resolvida' })
    expect((await ctx.uc.notificacoes.listar.executar(james)).itens[0]).toMatchObject({ tipo: 'entrada-resolvida' })
    expect((await ctx.uc.turmas.listarEntradas.executar(prof, turma.id)).solicitacoes).toEqual([])
  })

  it('R-105 erros: outra turma/inexistente 404, já resolvida 409, convite 422, outro professor 403', async () => {
    const ctx = criarContexto()
    const { prof, turma, sarah, james } = await cenario(ctx, { manual: true })
    const outraTurma = await ctx.uc.turmas.criar.executar(prof, { nome: 'Outra', periodo: '2026/02' })
    await ctx.uc.turmas.entrarPorCodigo.executar(sarah, turma.codigoConvite)
    await ctx.uc.turmas.convidarAluno.executar(prof, turma.id, james.id)
    const { solicitacoes, convites } = await ctx.uc.turmas.listarEntradas.executar(prof, turma.id)
    const sid = solicitacoes[0]!.id
    await expect(ctx.uc.turmas.responderSolicitacao.executar(prof, outraTurma.id, sid, 'aceitar')).rejects.toMatchObject({ status: 404, codigo: 'ENTRADA_NAO_ENCONTRADA' })
    await expect(ctx.uc.turmas.responderSolicitacao.executar(prof, turma.id, 'inexistente', 'aceitar')).rejects.toMatchObject({ status: 404 })
    await expect(ctx.uc.turmas.responderSolicitacao.executar(prof, turma.id, convites[0]!.id, 'aceitar')).rejects.toMatchObject({ status: 422, codigo: 'ORIGEM_INVALIDA' })
    const outro = await ctx.usuario('professor', 'Maria Silva')
    await expect(ctx.uc.turmas.responderSolicitacao.executar(outro, turma.id, sid, 'aceitar')).rejects.toMatchObject({ status: 403 })
    await ctx.uc.turmas.responderSolicitacao.executar(prof, turma.id, sid, 'aceitar')
    await expect(ctx.uc.turmas.responderSolicitacao.executar(prof, turma.id, sid, 'recusar')).rejects.toMatchObject({ status: 409, codigo: 'ENTRADA_JA_RESOLVIDA' })
  })
})

describe('convite por e-mail', () => {
  it('R-107 busca alunos por nome ou e-mail, sem acento/maiúsculas, mínimo 3 letras', async () => {
    const ctx = criarContexto()
    const { prof, turma, sarah } = await cenario(ctx)
    await ctx.usuario('aluno', 'Sarah Chen Dois')
    await ctx.usuario('professor', 'Sarah Professora')
    const porNome = await ctx.uc.turmas.buscarAlunos.executar(prof, turma.id, 'SARAH')
    expect(porNome.map((a) => a.nome).sort()).toEqual(['Sarah Chen', 'Sarah Chen Dois'])
    expect(porNome[0]).toEqual({ id: expect.any(String), nome: expect.any(String), email: expect.stringContaining('@'), convidado: false })
    const porEmail = await ctx.uc.turmas.buscarAlunos.executar(prof, turma.id, 'sarah.chen@escola')
    expect(porEmail.map((a) => a.id)).toEqual([sarah.id])
    // acentos e caixa não importam: "CHÉN" acha "Chen"
    expect((await ctx.uc.turmas.buscarAlunos.executar(prof, turma.id, 'CHÉN')).length).toBe(2)
  })

  it('R-107 busca curta é 422 BUSCA_CURTA; só o dono busca; limita a 10; exclui quem já está na turma e marca convidados', async () => {
    const ctx = criarContexto()
    const { prof, turma, sarah, james } = await cenario(ctx)
    await expect(ctx.uc.turmas.buscarAlunos.executar(prof, turma.id, 'sa')).rejects.toMatchObject({ status: 422, codigo: 'BUSCA_CURTA' })
    await expect(ctx.uc.turmas.buscarAlunos.executar(sarah, turma.id, 'jam')).rejects.toMatchObject({ status: 403 })
    await ctx.uc.turmas.entrarPorCodigo.executar(james, turma.codigoConvite)
    expect(await ctx.uc.turmas.buscarAlunos.executar(prof, turma.id, 'james')).toEqual([])
    await ctx.uc.turmas.convidarAluno.executar(prof, turma.id, sarah.id)
    expect((await ctx.uc.turmas.buscarAlunos.executar(prof, turma.id, 'sarah'))[0]).toMatchObject({ id: sarah.id, convidado: true })
    for (let i = 0; i < 12; i++) await ctx.usuario('aluno', `Turista ${String(i).padStart(2, '0')}`)
    expect(await ctx.uc.turmas.buscarAlunos.executar(prof, turma.id, 'turista')).toHaveLength(10)
  })

  it('R-108 convida, avisa o aluno e o aluno vê o convite; não vê convite de outro', async () => {
    const ctx = criarContexto()
    const { prof, turma, sarah, james } = await cenario(ctx)
    await ctx.uc.turmas.convidarAluno.executar(prof, turma.id, sarah.id)
    const aviso = (await ctx.uc.notificacoes.listar.executar(sarah)).itens[0]!
    expect(aviso).toMatchObject({ tipo: 'convite-turma', link: '/aluno/turmas' })
    expect(aviso.mensagem).toContain('Estatística Aplicada')
    const meus = await ctx.uc.turmas.listarConvites.executar(sarah)
    expect(meus).toHaveLength(1)
    expect(meus[0]).toMatchObject({ turma: { id: turma.id, nome: 'Estatística Aplicada', periodo: '2026/02' }, docente: 'Alberto' })
    expect(await ctx.uc.turmas.listarConvites.executar(james)).toEqual([])
    await expect(ctx.uc.turmas.listarConvites.executar(prof)).rejects.toMatchObject({ status: 403 })
  })

  it('R-108 erros: aluno inexistente/professor 404, já na turma 409, convite repetido 409, já pediu para entrar 409', async () => {
    const ctx = criarContexto()
    const { prof, turma, sarah, james } = await cenario(ctx, { manual: true })
    const outro = await ctx.usuario('professor', 'Maria Silva')
    await expect(ctx.uc.turmas.convidarAluno.executar(prof, turma.id, 'nao-existe')).rejects.toMatchObject({ status: 404, codigo: 'ALUNO_NAO_ENCONTRADO' })
    await expect(ctx.uc.turmas.convidarAluno.executar(prof, turma.id, outro.id)).rejects.toMatchObject({ status: 404, codigo: 'ALUNO_NAO_ENCONTRADO' })
    await expect(ctx.uc.turmas.convidarAluno.executar(outro, turma.id, sarah.id)).rejects.toMatchObject({ status: 403 })
    await ctx.uc.turmas.convidarAluno.executar(prof, turma.id, sarah.id)
    await expect(ctx.uc.turmas.convidarAluno.executar(prof, turma.id, sarah.id)).rejects.toMatchObject({ status: 409, codigo: 'CONVITE_JA_ENVIADO' })
    await ctx.uc.turmas.entrarPorCodigo.executar(james, turma.codigoConvite)
    await expect(ctx.uc.turmas.convidarAluno.executar(prof, turma.id, james.id)).rejects.toMatchObject({ status: 409, codigo: 'SOLICITACAO_PENDENTE' })
    const { convites } = await ctx.uc.turmas.listarEntradas.executar(prof, turma.id)
    await ctx.uc.turmas.responderConvite.executar(sarah, convites[0]!.id, 'aceitar')
    await expect(ctx.uc.turmas.convidarAluno.executar(prof, turma.id, sarah.id)).rejects.toMatchObject({ status: 409, codigo: 'JA_NA_TURMA' })
  })

  it('R-110 aceitar matricula e avisa o professor; recusar só avisa e o convite some', async () => {
    const ctx = criarContexto()
    const { prof, turma, sarah, james } = await cenario(ctx)
    await ctx.uc.turmas.convidarAluno.executar(prof, turma.id, sarah.id)
    await ctx.uc.turmas.convidarAluno.executar(prof, turma.id, james.id)
    const [cs] = await ctx.uc.turmas.listarConvites.executar(sarah)
    const [cj] = await ctx.uc.turmas.listarConvites.executar(james)
    await ctx.uc.turmas.responderConvite.executar(sarah, cs!.id, 'aceitar')
    await ctx.uc.turmas.responderConvite.executar(james, cj!.id, 'recusar')
    expect(await turmasDe(ctx, sarah)).toEqual([turma.id])
    expect(await turmasDe(ctx, james)).toEqual([])
    expect(await ctx.uc.turmas.listarConvites.executar(sarah)).toEqual([])
    expect(await ctx.uc.turmas.listarConvites.executar(james)).toEqual([])
    const avisos = (await ctx.uc.notificacoes.listar.executar(prof)).itens.map((n) => n.tipo)
    expect(avisos).toEqual(['entrada-resolvida', 'entrada-resolvida'])
    // quem recusou pode ser convidado de novo (R-112)
    await ctx.uc.turmas.convidarAluno.executar(prof, turma.id, james.id)
  })

  it('R-110 erros: convite de outro aluno 404, inexistente 404, já resolvido 409, professor 403', async () => {
    const ctx = criarContexto()
    const { prof, turma, sarah, james } = await cenario(ctx)
    await ctx.uc.turmas.convidarAluno.executar(prof, turma.id, sarah.id)
    const [c] = await ctx.uc.turmas.listarConvites.executar(sarah)
    await expect(ctx.uc.turmas.responderConvite.executar(james, c!.id, 'aceitar')).rejects.toMatchObject({ status: 404, codigo: 'ENTRADA_NAO_ENCONTRADA' })
    await expect(ctx.uc.turmas.responderConvite.executar(sarah, 'inexistente', 'aceitar')).rejects.toMatchObject({ status: 404 })
    await expect(ctx.uc.turmas.responderConvite.executar(prof, c!.id, 'aceitar')).rejects.toMatchObject({ status: 403 })
    await ctx.uc.turmas.responderConvite.executar(sarah, c!.id, 'aceitar')
    await expect(ctx.uc.turmas.responderConvite.executar(sarah, c!.id, 'recusar')).rejects.toMatchObject({ status: 409, codigo: 'ENTRADA_JA_RESOLVIDA' })
    expect(await turmasDe(ctx, james)).toEqual([])
  })

  it('R-111 o professor cancela um convite pendente; não cancela solicitação', async () => {
    const ctx = criarContexto()
    const { prof, turma, sarah, james } = await cenario(ctx, { manual: true })
    await ctx.uc.turmas.convidarAluno.executar(prof, turma.id, sarah.id)
    await ctx.uc.turmas.entrarPorCodigo.executar(james, turma.codigoConvite)
    const { solicitacoes, convites } = await ctx.uc.turmas.listarEntradas.executar(prof, turma.id)
    await expect(ctx.uc.turmas.cancelarConvite.executar(prof, turma.id, solicitacoes[0]!.id)).rejects.toMatchObject({ status: 422, codigo: 'ORIGEM_INVALIDA' })
    await ctx.uc.turmas.cancelarConvite.executar(prof, turma.id, convites[0]!.id)
    expect(await ctx.uc.turmas.listarConvites.executar(sarah)).toEqual([])
    await expect(ctx.uc.turmas.cancelarConvite.executar(prof, turma.id, convites[0]!.id)).rejects.toMatchObject({ status: 409, codigo: 'ENTRADA_JA_RESOLVIDA' })
  })

  it('R-112 excluir a turma apaga as entradas; sair/remover não bloqueia novo convite', async () => {
    const ctx = criarContexto()
    const { prof, turma, sarah, james } = await cenario(ctx)
    await ctx.uc.turmas.convidarAluno.executar(prof, turma.id, sarah.id)
    await ctx.uc.turmas.excluir.executar(prof, turma.id)
    expect(await ctx.uc.turmas.listarConvites.executar(sarah)).toEqual([])

    const t2 = await ctx.uc.turmas.criar.executar(prof, { nome: 'Nova', periodo: '2026/02' })
    await ctx.uc.turmas.entrarPorCodigo.executar(james, t2.codigoConvite)
    await ctx.uc.turmas.sairDaEquipe.executar(james, t2.id)
    await ctx.uc.turmas.convidarAluno.executar(prof, t2.id, james.id)
    expect((await ctx.uc.turmas.listarEntradas.executar(prof, t2.id)).convites).toHaveLength(1)
  })

  it('R-113 aluno com notificações desligadas não recebe aviso, mas o convite continua listado', async () => {
    const ctx = criarContexto()
    const { prof, turma, sarah } = await cenario(ctx)
    await ctx.uc.identidade.atualizarPreferencias.executar(sarah.id, { notificacoesEmail: false })
    await ctx.uc.turmas.convidarAluno.executar(prof, turma.id, sarah.id)
    expect((await ctx.uc.notificacoes.listar.executar(sarah)).itens).toEqual([])
    expect(await ctx.uc.turmas.listarConvites.executar(sarah)).toHaveLength(1)
  })
})

describe('consulta pública do convite', () => {
  it('R-17 informa nome, período e se a aprovação é manual', async () => {
    const ctx = criarContexto()
    const { turma } = await cenario(ctx, { manual: true })
    expect(await ctx.uc.turmas.consultarConvite.executar(turma.codigoConvite)).toEqual({ nome: 'Estatística Aplicada', periodo: '2026/02', aprovacaoManual: true })
    expect(await ctx.uc.turmas.consultarConvite.executar(turma.codigoConvite.toUpperCase())).toMatchObject({ nome: 'Estatística Aplicada' })
  })
})

import { describe, expect, it } from 'vitest'
import { criarContexto } from '../../../app/testes/contexto.ts'

const email = 'sarah.chen@escola.com'
const SENHA = 'senha1234'

async function logada() {
  const ctx = criarContexto()
  const aluno = await ctx.usuario('aluno', 'Sarah Chen')
  const login = await ctx.uc.identidade.autenticar.executar({ email, senha: SENHA })
  return { ctx, aluno, login }
}

describe('sessão (access + refresh)', () => {
  it('R-70 login devolve access token com sid e refresh token opaco', async () => {
    const { ctx, aluno, login } = await logada()
    const payload = ctx.infra.tokens.verificar(login.token)
    expect(payload).toMatchObject({ sub: aluno.id, papel: 'aluno' })
    expect(payload?.sid).toBeTruthy()
    expect(login.refreshToken).toHaveLength(64)
    expect(await ctx.uc.identidade.validarSessao.executar(login.token)).toEqual({ id: aluno.id, papel: 'aluno' })
  })

  it('R-70 o refresh token não é guardado em claro', async () => {
    const { ctx, login } = await logada()
    const payload = ctx.infra.tokens.verificar(login.token)!
    const sessao = await ctx.infra.sessoes.porId(payload.sid)
    expect(sessao?.refreshHash).toBeTruthy()
    expect(sessao?.refreshHash).not.toBe(login.refreshToken)
  })

  it('R-71 renovar troca o refresh por um novo par e o anterior deixa de valer', async () => {
    const { ctx, aluno, login } = await logada()
    const novo = await ctx.uc.identidade.renovarSessao.executar({ refreshToken: login.refreshToken })
    expect(novo.refreshToken).not.toBe(login.refreshToken)
    expect(novo.usuario.id).toBe(aluno.id)
    expect(await ctx.uc.identidade.validarSessao.executar(novo.token)).toEqual({ id: aluno.id, papel: 'aluno' })
    await expect(ctx.uc.identidade.renovarSessao.executar({ refreshToken: login.refreshToken })).rejects.toMatchObject({ codigo: 'SESSAO_INVALIDA', status: 401 })
  })

  it('R-71 refresh desconhecido ou expirado é recusado', async () => {
    const { ctx, login } = await logada()
    await expect(ctx.uc.identidade.renovarSessao.executar({ refreshToken: 'x'.repeat(64) })).rejects.toMatchObject({ codigo: 'SESSAO_INVALIDA' })
    ctx.relogio.avancarDias(31)
    await expect(ctx.uc.identidade.renovarSessao.executar({ refreshToken: login.refreshToken })).rejects.toMatchObject({ codigo: 'SESSAO_INVALIDA' })
  })

  it('R-72 logout revoga a sessão: o access token deixa de valer na hora e o refresh também', async () => {
    const { ctx, login } = await logada()
    await ctx.uc.identidade.encerrarSessao.executar({ refreshToken: login.refreshToken })
    expect(await ctx.uc.identidade.validarSessao.executar(login.token)).toBeNull()
    await expect(ctx.uc.identidade.renovarSessao.executar({ refreshToken: login.refreshToken })).rejects.toMatchObject({ codigo: 'SESSAO_INVALIDA' })
  })

  it('R-72 logout com refresh inválido não falha (idempotente)', async () => {
    const { ctx } = await logada()
    await expect(ctx.uc.identidade.encerrarSessao.executar({ refreshToken: 'nada' })).resolves.toBeUndefined()
  })

  it('R-70 token sem sessão correspondente ou adulterado não valida', async () => {
    const { ctx, login } = await logada()
    expect(await ctx.uc.identidade.validarSessao.executar(`${login.token}x`)).toBeNull()
    expect(await ctx.uc.identidade.validarSessao.executar('lixo')).toBeNull()
  })
})

describe('recuperação de senha', () => {
  const tokenDoLink = (link: string) => link.split('/redefinir-senha/')[1]!

  it('R-75 esqueci-senha registra a mensagem com link na caixa de saída e não devolve o token', async () => {
    const { ctx } = await logada()
    const r = await ctx.uc.identidade.esqueciSenha.executar({ email })
    expect(r).toBeUndefined()
    const [msg] = await ctx.infra.caixaDeSaida.porDestinatario(email)
    expect(msg?.link).toMatch(/\/redefinir-senha\/[0-9a-f]{64}$/)
    expect(msg?.assunto).toMatch(/senha/i)
  })

  it('R-75 e-mail desconhecido responde igual e não registra nada (sem enumeração)', async () => {
    const { ctx } = await logada()
    await expect(ctx.uc.identidade.esqueciSenha.executar({ email: 'ninguem@escola.com' })).resolves.toBeUndefined()
    expect(await ctx.infra.caixaDeSaida.porDestinatario('ninguem@escola.com')).toEqual([])
  })

  it('R-76 redefinir troca a senha, consome o token e revoga as sessões (R-73)', async () => {
    const { ctx, login } = await logada()
    await ctx.uc.identidade.esqueciSenha.executar({ email })
    const token = tokenDoLink((await ctx.infra.caixaDeSaida.porDestinatario(email))[0]!.link!)
    await ctx.uc.identidade.redefinirSenha.executar({ token, senha: 'nova-senha-99', confirmacaoSenha: 'nova-senha-99' })

    await expect(ctx.uc.identidade.autenticar.executar({ email, senha: SENHA })).rejects.toMatchObject({ codigo: 'CREDENCIAIS_INVALIDAS' })
    await expect(ctx.uc.identidade.autenticar.executar({ email, senha: 'nova-senha-99' })).resolves.toBeTruthy()
    expect(await ctx.uc.identidade.validarSessao.executar(login.token)).toBeNull()
    await expect(ctx.uc.identidade.redefinirSenha.executar({ token, senha: 'outra-senha-1' })).rejects.toMatchObject({ codigo: 'TOKEN_INVALIDO', status: 422 })
  })

  it('R-76 token expirado (30 min) ou inexistente é recusado', async () => {
    const { ctx } = await logada()
    await ctx.uc.identidade.esqueciSenha.executar({ email })
    const token = tokenDoLink((await ctx.infra.caixaDeSaida.porDestinatario(email))[0]!.link!)
    await expect(ctx.uc.identidade.redefinirSenha.executar({ token: 'a'.repeat(64), senha: 'nova-senha-99' })).rejects.toMatchObject({ codigo: 'TOKEN_INVALIDO' })
    ctx.relogio.avancarDias(1)
    await expect(ctx.uc.identidade.redefinirSenha.executar({ token, senha: 'nova-senha-99' })).rejects.toMatchObject({ codigo: 'TOKEN_INVALIDO' })
  })

  it('R-76 valida a senha nova (R-02) e a confirmação (R-03) sem consumir o token', async () => {
    const { ctx } = await logada()
    await ctx.uc.identidade.esqueciSenha.executar({ email })
    const token = tokenDoLink((await ctx.infra.caixaDeSaida.porDestinatario(email))[0]!.link!)
    await expect(ctx.uc.identidade.redefinirSenha.executar({ token, senha: '123' })).rejects.toMatchObject({ codigo: 'SENHA_FRACA' })
    await expect(ctx.uc.identidade.redefinirSenha.executar({ token, senha: 'nova-senha-99', confirmacaoSenha: 'diferente-99' })).rejects.toMatchObject({ codigo: 'SENHAS_DIFERENTES' })
    await expect(ctx.uc.identidade.redefinirSenha.executar({ token, senha: 'nova-senha-99' })).resolves.toBeUndefined()
  })

  it('R-77 professor gera o link para aluno da sua turma; link funciona como o de e-mail', async () => {
    const ctx = criarContexto()
    const prof = await ctx.usuario('professor', 'Alberto')
    const turma = await ctx.uc.turmas.criar.executar(prof, { nome: 'Banco de Dados', periodo: '2026/01' })
    const aluno = await ctx.usuario('aluno', 'Sarah Chen', { codigoConvite: turma.codigoConvite })
    const { link } = await ctx.uc.turmas.gerarLinkDeRedefinicao.executar(prof, turma.id, aluno.id)
    await ctx.uc.identidade.redefinirSenha.executar({ token: tokenDoLink(link), senha: 'nova-senha-99' })
    await expect(ctx.uc.identidade.autenticar.executar({ email, senha: 'nova-senha-99' })).resolves.toBeTruthy()
  })

  it('R-77 só o dono da turma gera; aluno que não está na turma é 404', async () => {
    const ctx = criarContexto()
    const prof = await ctx.usuario('professor', 'Alberto')
    const outro = await ctx.usuario('professor', 'Maria Silva')
    const turma = await ctx.uc.turmas.criar.executar(prof, { nome: 'Banco de Dados', periodo: '2026/01' })
    const aluno = await ctx.usuario('aluno', 'Sarah Chen', { codigoConvite: turma.codigoConvite })
    const forasteiro = await ctx.usuario('aluno', 'Michael Torres')
    await expect(ctx.uc.turmas.gerarLinkDeRedefinicao.executar(outro, turma.id, aluno.id)).rejects.toMatchObject({ status: 403 })
    await expect(ctx.uc.turmas.gerarLinkDeRedefinicao.executar(prof, turma.id, forasteiro.id)).rejects.toMatchObject({ status: 404 })
    const alunoLogado = await ctx.uc.identidade.autenticar.executar({ email, senha: SENHA })
    await expect(ctx.uc.turmas.gerarLinkDeRedefinicao.executar({ id: aluno.id, papel: 'aluno' }, turma.id, aluno.id)).rejects.toMatchObject({ status: 403 })
    expect(alunoLogado.token).toBeTruthy()
  })
})

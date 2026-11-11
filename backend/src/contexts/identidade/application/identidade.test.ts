import { describe, expect, it } from 'vitest'
import { criarContexto } from '../../../app/testes/contexto.ts'

const dadosAluno = { nome: 'Sarah Chen', email: 'sarah@escola.com', senha: 'senha1234', papel: 'aluno' as const }

describe('identidade — cadastro', () => {
  it('R-03 cadastra usuário sem expor o hash da senha', async () => {
    const { uc } = criarContexto()
    const { usuario } = await uc.identidade.cadastrar.executar(dadosAluno)
    expect(usuario).toMatchObject({ nome: 'Sarah Chen', email: 'sarah@escola.com', papel: 'aluno' })
    expect(JSON.stringify(usuario)).not.toMatch(/hash|senha1234/i)
  })
  it('R-01 e-mail duplicado é conflito', async () => {
    const { uc } = criarContexto()
    await uc.identidade.cadastrar.executar(dadosAluno)
    await expect(uc.identidade.cadastrar.executar({ ...dadosAluno, email: 'SARAH@escola.com' })).rejects.toMatchObject({ codigo: 'EMAIL_EM_USO', status: 409 })
  })
  it('R-02 rejeita senha curta', async () => {
    const { uc } = criarContexto()
    await expect(uc.identidade.cadastrar.executar({ ...dadosAluno, senha: '123' })).rejects.toMatchObject({ codigo: 'SENHA_FRACA' })
  })
  it('R-03 confirmação de senha diferente é rejeitada', async () => {
    const { uc } = criarContexto()
    await expect(uc.identidade.cadastrar.executar({ ...dadosAluno, confirmacaoSenha: 'outra-senha' })).rejects.toMatchObject({ codigo: 'SENHAS_DIFERENTES' })
  })
  it('R-04 aluno com convite válido é matriculado na turma', async () => {
    const ctx = criarContexto()
    const prof = await ctx.usuario('professor', 'Alberto')
    const turma = await ctx.uc.turmas.criar.executar(prof, { nome: 'Banco de Dados', periodo: '2026/01' })
    const aluno = await ctx.usuario('aluno', 'Sarah Chen', { codigoConvite: turma.codigoConvite })
    const turmas = await ctx.uc.turmas.listar.executar(aluno)
    expect(turmas.map((t) => t.id)).toEqual([turma.id])
  })
  it('R-04 convite inexistente impede o cadastro', async () => {
    const { uc } = criarContexto()
    await expect(uc.identidade.cadastrar.executar({ ...dadosAluno, codigoConvite: 'nao-existe' })).rejects.toMatchObject({ codigo: 'CONVITE_INVALIDO' })
    await expect(uc.identidade.autenticar.executar({ email: dadosAluno.email, senha: dadosAluno.senha })).rejects.toMatchObject({ codigo: 'CREDENCIAIS_INVALIDAS' })
  })
})

describe('identidade — login', () => {
  it('R-05 autentica e devolve token verificável', async () => {
    const ctx = criarContexto()
    await ctx.uc.identidade.cadastrar.executar(dadosAluno)
    const { token, usuario } = await ctx.uc.identidade.autenticar.executar({ email: 'sarah@escola.com', senha: 'senha1234', papel: 'aluno' })
    expect(ctx.infra.tokens.verificar(token)).toMatchObject({ sub: usuario.id, papel: 'aluno' })
  })
  it('R-05 senha errada, e-mail inexistente e papel trocado dão a mesma resposta', async () => {
    const ctx = criarContexto()
    await ctx.uc.identidade.cadastrar.executar(dadosAluno)
    for (const tentativa of [
      { email: 'sarah@escola.com', senha: 'errada123' },
      { email: 'ninguem@escola.com', senha: 'senha1234' },
      { email: 'sarah@escola.com', senha: 'senha1234', papel: 'professor' as const },
    ]) {
      await expect(ctx.uc.identidade.autenticar.executar(tentativa)).rejects.toMatchObject({ codigo: 'CREDENCIAIS_INVALIDAS', status: 401 })
    }
  })
})

describe('identidade — preferências', () => {
  it('R-06 atualiza parcialmente e persiste por usuário', async () => {
    const ctx = criarContexto()
    const aluno = await ctx.usuario('aluno', 'Sarah Chen')
    const outro = await ctx.usuario('aluno', 'James Park')
    expect((await ctx.uc.identidade.obterPerfil.executar(aluno.id)).preferencias).toMatchObject({ tema: 'claro', notificacoesEmail: true })
    await ctx.uc.identidade.atualizarPreferencias.executar(aluno.id, { tema: 'escuro', notificacoesEmail: false })
    expect((await ctx.uc.identidade.obterPerfil.executar(aluno.id)).preferencias).toMatchObject({ tema: 'escuro', notificacoesEmail: false, acessibilidade: true })
    expect((await ctx.uc.identidade.obterPerfil.executar(outro.id)).preferencias.tema).toBe('claro')
  })
  it('R-06 tema inválido é rejeitado', async () => {
    const ctx = criarContexto()
    const aluno = await ctx.usuario('aluno', 'Sarah Chen')
    await expect(ctx.uc.identidade.atualizarPreferencias.executar(aluno.id, { tema: 'neon' as never })).rejects.toMatchObject({ status: 400 })
  })
})

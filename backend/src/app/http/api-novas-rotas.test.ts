import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { criarContainer } from '../container.ts'
import { criarInfraMemoria } from '../infra-memoria.ts'
import { criarApp } from './servidor.ts'

const PERGUNTAS = [
  { enunciado: 'Qual a média de 2 e 4?', tipo: 'unica', opcoes: ['3', '4'], gabarito: [0] },
  { enunciado: 'Quais são pares?', tipo: 'multipla', opcoes: ['2', '3', '4'], gabarito: [0, 2] },
]

function novoApp(exporCaixaDeSaida = true) {
  const api = request(criarApp(criarContainer(criarInfraMemoria()), { exporCaixaDeSaida }))
  async function usuario(papel: 'professor' | 'aluno', nome: string, codigoConvite?: string) {
    const email = `${nome.toLowerCase().replace(/\s/g, '.')}@escola.com`
    await api.post('/api/auth/cadastro').send({ nome, email, senha: 'senha1234', papel, ...(codigoConvite ? { codigoConvite } : {}) }).expect(201)
    const { body } = await api.post('/api/auth/login').send({ email, senha: 'senha1234', papel }).expect(200)
    return { email, id: body.usuario.id as string, token: `Bearer ${body.token as string}`, refreshToken: body.refreshToken as string }
  }
  return { api, usuario }
}

describe('API — sessão (R-70…R-73)', () => {
  it('login devolve refresh token; refresh gira o par; o refresh antigo é recusado', async () => {
    const { api, usuario } = novoApp()
    const u = await usuario('aluno', 'Sarah Chen')
    expect(u.refreshToken).toHaveLength(64)
    const r = await api.post('/api/auth/refresh').send({ refreshToken: u.refreshToken }).expect(200)
    expect(r.body.refreshToken).not.toBe(u.refreshToken)
    await api.get('/api/perfil').set('Authorization', `Bearer ${r.body.token}`).expect(200)
    const reuso = await api.post('/api/auth/refresh').send({ refreshToken: u.refreshToken }).expect(401)
    expect(reuso.body.erro.codigo).toBe('SESSAO_INVALIDA')
  })

  it('logout revoga na hora: o access token e o refresh deixam de valer', async () => {
    const { api, usuario } = novoApp()
    const u = await usuario('aluno', 'Sarah Chen')
    await api.get('/api/perfil').set('Authorization', u.token).expect(200)
    await api.post('/api/auth/logout').send({ refreshToken: u.refreshToken }).expect(204)
    const r = await api.get('/api/perfil').set('Authorization', u.token).expect(401)
    expect(r.body.erro.codigo).toBe('NAO_AUTENTICADO')
    await api.post('/api/auth/refresh').send({ refreshToken: u.refreshToken }).expect(401)
    await api.post('/api/auth/logout').send({ refreshToken: 'qualquer' }).expect(204)
  })
})

describe('API — recuperação de senha (R-75…R-77)', () => {
  const tokenDe = (link: string) => link.split('/redefinir-senha/')[1]!

  it('esqueci-senha responde igual para conta existente e inexistente; o link só aparece na caixa de saída', async () => {
    const { api, usuario } = novoApp()
    const u = await usuario('aluno', 'Sarah Chen')
    const a = await api.post('/api/auth/esqueci-senha').send({ email: u.email }).expect(202)
    const b = await api.post('/api/auth/esqueci-senha').send({ email: 'ninguem@escola.com' }).expect(202)
    expect(a.body).toEqual(b.body)
    expect(JSON.stringify(a.body)).not.toMatch(/redefinir-senha/)
    const caixa = await api.get('/api/dev/caixa-de-saida').query({ para: u.email }).expect(200)
    expect(caixa.body[0].link).toMatch(/\/redefinir-senha\/[0-9a-f]{64}$/)
    expect((await api.get('/api/dev/caixa-de-saida').query({ para: 'ninguem@escola.com' })).body).toEqual([])
  })

  it('redefinir troca a senha, derruba as sessões e consome o link', async () => {
    const { api, usuario } = novoApp()
    const u = await usuario('aluno', 'Sarah Chen')
    await api.post('/api/auth/esqueci-senha').send({ email: u.email }).expect(202)
    const token = tokenDe((await api.get('/api/dev/caixa-de-saida').query({ para: u.email })).body[0].link)
    await api.post('/api/auth/redefinir-senha').send({ token, senha: 'nova-senha-99', confirmacaoSenha: 'nova-senha-99' }).expect(204)
    await api.get('/api/perfil').set('Authorization', u.token).expect(401)
    await api.post('/api/auth/login').send({ email: u.email, senha: 'senha1234' }).expect(401)
    await api.post('/api/auth/login').send({ email: u.email, senha: 'nova-senha-99' }).expect(200)
    const reuso = await api.post('/api/auth/redefinir-senha').send({ token, senha: 'outra-senha-1' }).expect(422)
    expect(reuso.body.erro.codigo).toBe('TOKEN_INVALIDO')
  })

  it('a caixa de saída de desenvolvimento fica desligada por padrão', async () => {
    const { api } = novoApp(false)
    await api.get('/api/dev/caixa-de-saida').query({ para: 'a@escola.com' }).expect(404)
  })

  it('R-77 professor gera o link do aluno da turma; outro professor não', async () => {
    const { api, usuario } = novoApp()
    const prof = await usuario('professor', 'Alberto')
    const outro = await usuario('professor', 'Maria Silva')
    const turma = (await api.post('/api/turmas').set('Authorization', prof.token).send({ nome: 'BD', periodo: '2026/01' })).body
    const aluno = await usuario('aluno', 'Sarah Chen', turma.codigoConvite)
    await api.post(`/api/turmas/${turma.id}/alunos/${aluno.id}/redefinir-senha`).set('Authorization', outro.token).expect(403)
    const r = await api.post(`/api/turmas/${turma.id}/alunos/${aluno.id}/redefinir-senha`).set('Authorization', prof.token).expect(200)
    await api.post('/api/auth/redefinir-senha').send({ token: tokenDe(r.body.link), senha: 'nova-senha-99' }).expect(204)
    await api.post('/api/auth/login').send({ email: aluno.email, senha: 'nova-senha-99' }).expect(200)
  })
})

describe('API — notificações, alunos e observações', () => {
  async function cenario() {
    const { api, usuario } = novoApp()
    const prof = await usuario('professor', 'Alberto')
    const turma = (await api.post('/api/turmas').set('Authorization', prof.token).send({ nome: 'Estatística', periodo: '2026/02' })).body
    const sarah = await usuario('aluno', 'Sarah Chen', turma.codigoConvite)
    const james = await usuario('aluno', 'James Park', turma.codigoConvite)
    const form = (await api.post('/api/formularios').set('Authorization', prof.token).send({ titulo: 'Média', turmaId: turma.id, postar: true, perguntas: PERGUNTAS })).body
    const [p1, p2] = form.perguntas as Array<{ id: string }>
    const responder = async (a: { token: string }, observacao?: string) => {
      await api.put(`/api/aluno/autoavaliacoes/${form.id}/respostas/${p1!.id}`).set('Authorization', a.token).send({ marcadas: [0] }).expect(200)
      await api.put(`/api/aluno/autoavaliacoes/${form.id}/respostas/${p2!.id}`).set('Authorization', a.token).send({ marcadas: [0, 2] }).expect(200)
      await api.post(`/api/aluno/autoavaliacoes/${form.id}/enviar`).set('Authorization', a.token).send(observacao ? { observacao } : {}).expect(200)
    }
    return { api, prof, turma, sarah, james, form, responder }
  }

  it('R-81/R-84 aluno recebe a publicação no sino e marca como lida', async () => {
    const { api, sarah } = await cenario()
    const r = await api.get('/api/notificacoes').set('Authorization', sarah.token).expect(200)
    expect(r.body.naoLidas).toBe(1)
    expect(r.body.itens[0]).toMatchObject({ tipo: 'publicacao', lida: false })
    await api.post(`/api/notificacoes/${r.body.itens[0].id}/lida`).set('Authorization', sarah.token).expect(204)
    expect((await api.get('/api/notificacoes').set('Authorization', sarah.token)).body.naoLidas).toBe(0)
    await api.post('/api/notificacoes/lidas').set('Authorization', sarah.token).expect(204)
    await api.get('/api/notificacoes').expect(401)
  })

  it('R-84 notificação de outra pessoa é 404', async () => {
    const { api, sarah, james } = await cenario()
    const doJames = (await api.get('/api/notificacoes').set('Authorization', james.token)).body.itens[0]
    await api.post(`/api/notificacoes/${doJames.id}/lida`).set('Authorization', sarah.token).expect(404)
  })

  it('R-90/R-18 professor vê respostas individuais e remove o aluno da turma', async () => {
    const { api, prof, turma, sarah, form, responder } = await cenario()
    await responder(sarah, 'Gostei')
    const porTurma = (await api.get(`/api/turmas/${turma.id}/alunos/${sarah.id}/respostas`).set('Authorization', prof.token).expect(200)).body
    expect(porTurma.aluno.nome).toBe('Sarah Chen')
    expect(porTurma.formularios[0]).toMatchObject({ status: 'respondido', nota: 10, observacao: 'Gostei' })
    const porForm = (await api.get(`/api/formularios/${form.id}/alunos/${sarah.id}`).set('Authorization', prof.token).expect(200)).body
    expect(porForm.resposta.perguntas[0]).toMatchObject({ marcadas: [0], gabarito: [0] })

    await api.get(`/api/turmas/${turma.id}/alunos/${sarah.id}/respostas`).set('Authorization', sarah.token).expect(403)
    await api.delete(`/api/turmas/${turma.id}/alunos/${sarah.id}`).set('Authorization', sarah.token).expect(403)
    await api.delete(`/api/turmas/${turma.id}/alunos/${sarah.id}`).set('Authorization', prof.token).expect(204)
    expect((await api.get('/api/aluno/turmas').set('Authorization', sarah.token)).body).toEqual([])
    await api.delete(`/api/turmas/${turma.id}/alunos/${sarah.id}`).set('Authorization', prof.token).expect(404)
  })

  it('R-95/R-96 professor responde e oculta a observação; o aluno vê a resposta', async () => {
    const { api, prof, sarah, form, responder } = await cenario()
    await responder(sarah, 'Mais exemplos, por favor')
    const resumo = (await api.get(`/api/formularios/${form.id}/resumo`).set('Authorization', prof.token)).body
    expect(resumo.totalObservacoes).toBe(1)
    const envioId = resumo.observacoes[0].envioId as string
    await api.patch(`/api/formularios/${form.id}/observacoes/${envioId}`).set('Authorization', prof.token).send({ resposta: 'Combinado!', oculta: true }).expect(204)
    const depois = (await api.get(`/api/formularios/${form.id}/resumo`).set('Authorization', prof.token)).body
    expect(depois.totalObservacoes).toBe(0)
    expect(depois.observacoes[0]).toMatchObject({ aluno: 'Sarah Chen', resposta: 'Combinado!', oculta: true })
    const minhas = (await api.get('/api/aluno/autoavaliacoes').set('Authorization', sarah.token)).body
    expect(minhas[0]).toMatchObject({ observacao: 'Mais exemplos, por favor', respostaProfessor: 'Combinado!' })
    expect((await api.get('/api/notificacoes').set('Authorization', sarah.token)).body.itens[0].tipo).toBe('resposta-observacao')

    await api.patch(`/api/formularios/${form.id}/observacoes/${envioId}`).set('Authorization', sarah.token).send({ oculta: false }).expect(403)
    await api.patch(`/api/formularios/${form.id}/observacoes/${envioId}`).set('Authorization', prof.token).send({ resposta: 'x'.repeat(501) }).expect(400)
    await api.patch(`/api/formularios/${form.id}/observacoes/${envioId}`).set('Authorization', prof.token).send({}).expect(400)
  })
})

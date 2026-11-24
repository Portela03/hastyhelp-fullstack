import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { criarContainer } from '../container.ts'
import { criarInfraMemoria } from '../infra-memoria.ts'
import { criarApp } from './servidor.ts'

function novoApp() {
  const api = request(criarApp(criarContainer(criarInfraMemoria())))
  async function usuario(papel: 'professor' | 'aluno', nome: string) {
    const email = `${nome.toLowerCase().replace(/\s/g, '.')}@escola.com`
    await api.post('/api/auth/cadastro').send({ nome, email, senha: 'senha1234', papel }).expect(201)
    const { body } = await api.post('/api/auth/login').send({ email, senha: 'senha1234', papel }).expect(200)
    return { id: body.usuario.id as string, auth: `Bearer ${body.token as string}` }
  }
  async function turma(prof: { auth: string }, manual = false) {
    const t = (await api.post('/api/turmas').set('Authorization', prof.auth).send({ nome: 'Estatística', periodo: '2026/02' }).expect(201)).body
    if (manual) await api.patch(`/api/turmas/${t.id}`).set('Authorization', prof.auth).send({ aprovacaoManual: true }).expect(200)
    return t as { id: string; codigoConvite: string }
  }
  return { api, usuario, turma }
}

describe('API — robustez da entrada em turmas (R-115…R-119)', () => {
  it('R-115 pedidos simultâneos viram 409 SOLICITACAO_PENDENTE, nunca 500', async () => {
    const { api, usuario, turma: criar } = novoApp()
    const prof = await usuario('professor', 'Alberto')
    const sarah = await usuario('aluno', 'Sarah Chen')
    const turma = await criar(prof, true)
    const pedir = () => api.post('/api/aluno/turmas/entrar').set('Authorization', sarah.auth).send({ codigo: turma.codigoConvite })
    const respostas = await Promise.all([pedir(), pedir(), pedir()])
    expect(respostas.map((r) => r.status).sort()).toEqual([202, 409, 409])
    expect(respostas.filter((r) => r.status === 409).every((r) => r.body.erro.codigo === 'SOLICITACAO_PENDENTE')).toBe(true)
  })

  it('R-115 convites simultâneos viram 409 CONVITE_JA_ENVIADO', async () => {
    const { api, usuario, turma: criar } = novoApp()
    const prof = await usuario('professor', 'Alberto')
    const sarah = await usuario('aluno', 'Sarah Chen')
    const turma = await criar(prof)
    const convidar = () => api.post(`/api/turmas/${turma.id}/convites`).set('Authorization', prof.auth).send({ alunoId: sarah.id })
    const respostas = await Promise.all([convidar(), convidar()])
    expect(respostas.map((r) => r.status).sort()).toEqual([201, 409])
    expect(respostas.find((r) => r.status === 409)?.body.erro.codigo).toBe('CONVITE_JA_ENVIADO')
  })

  it('R-116 excesso de buscas devolve 429 MUITAS_BUSCAS', async () => {
    const { api, usuario, turma: criar } = novoApp()
    const prof = await usuario('professor', 'Alberto')
    await usuario('aluno', 'Sarah Chen')
    const turma = await criar(prof)
    const buscar = () => api.get(`/api/turmas/${turma.id}/alunos-para-convite`).query({ busca: 'sarah' }).set('Authorization', prof.auth)
    for (let i = 0; i < 30; i++) await buscar().expect(200)
    expect((await buscar().expect(429)).body.erro.codigo).toBe('MUITAS_BUSCAS')
  })

  it('R-117 novo código: só o dono; o antigo para de valer', async () => {
    const { api, usuario, turma: criar } = novoApp()
    const prof = await usuario('professor', 'Alberto')
    const outro = await usuario('professor', 'Maria Silva')
    const sarah = await usuario('aluno', 'Sarah Chen')
    const turma = await criar(prof)
    await api.post(`/api/turmas/${turma.id}/codigo`).set('Authorization', outro.auth).expect(403)
    await api.post(`/api/turmas/${turma.id}/codigo`).set('Authorization', sarah.auth).expect(403)
    await api.post(`/api/turmas/${turma.id}/codigo`).expect(401)
    const nova = (await api.post(`/api/turmas/${turma.id}/codigo`).set('Authorization', prof.auth).expect(200)).body
    expect(nova.codigoConvite).toHaveLength(6)
    expect(nova.codigoConvite).not.toBe(turma.codigoConvite)
    await api.get(`/api/auth/convites/${turma.codigoConvite}`).expect(404)
    await api.get(`/api/auth/convites/${nova.codigoConvite}`).expect(200)
    await api.post('/api/aluno/turmas/entrar').set('Authorization', sarah.auth).send({ codigo: turma.codigoConvite }).expect(404)
    await api.post('/api/aluno/turmas/entrar').set('Authorization', sarah.auth).send({ codigo: nova.codigoConvite }).expect(201)
  })

  it('R-118/R-119 aluno lista e cancela o próprio pedido', async () => {
    const { api, usuario, turma: criar } = novoApp()
    const prof = await usuario('professor', 'Alberto')
    const sarah = await usuario('aluno', 'Sarah Chen')
    const james = await usuario('aluno', 'James Park')
    const turma = await criar(prof, true)
    await api.post('/api/aluno/turmas/entrar').set('Authorization', sarah.auth).send({ codigo: turma.codigoConvite }).expect(202)

    await api.get('/api/aluno/solicitacoes').set('Authorization', prof.auth).expect(403)
    await api.get('/api/aluno/solicitacoes').expect(401)
    expect((await api.get('/api/aluno/solicitacoes').set('Authorization', james.auth).expect(200)).body).toEqual([])
    const lista = (await api.get('/api/aluno/solicitacoes').set('Authorization', sarah.auth).expect(200)).body
    expect(lista).toHaveLength(1)
    expect(lista[0]).toMatchObject({ turma: { id: turma.id, nome: 'Estatística' }, docente: 'Alberto' })
    expect(typeof lista[0].criadoEm).toBe('string')

    await api.delete(`/api/aluno/solicitacoes/${lista[0].id}`).set('Authorization', james.auth).expect(404)
    await api.delete(`/api/aluno/solicitacoes/${lista[0].id}`).set('Authorization', sarah.auth).expect(204)
    expect((await api.delete(`/api/aluno/solicitacoes/${lista[0].id}`).set('Authorization', sarah.auth).expect(409)).body.erro.codigo).toBe('ENTRADA_JA_RESOLVIDA')
    expect((await api.get('/api/aluno/solicitacoes').set('Authorization', sarah.auth).expect(200)).body).toEqual([])
    expect((await api.get(`/api/turmas/${turma.id}/entradas`).set('Authorization', prof.auth).expect(200)).body.solicitacoes).toEqual([])
  })
})

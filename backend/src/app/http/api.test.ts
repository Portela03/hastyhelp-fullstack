import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { criarContainer } from '../container.ts'
import { criarInfraMemoria } from '../infra-memoria.ts'
import { criarApp } from './servidor.ts'

const PERGUNTAS = [
  { enunciado: 'Qual a média de 2 e 4?', tipo: 'unica', opcoes: ['3', '4'], gabarito: [0] },
  { enunciado: 'Quais são pares?', tipo: 'multipla', opcoes: ['2', '3', '4'], gabarito: [0, 2] },
]

function novoApp() {
  const app = criarApp(criarContainer(criarInfraMemoria()))
  const api = request(app)
  async function cadastrarELogar(papel: 'professor' | 'aluno', nome: string, codigoConvite?: string) {
    const email = `${nome.toLowerCase().replace(/\s/g, '.')}@escola.com`
    await api.post('/api/auth/cadastro').send({ nome, email, senha: 'senha1234', papel, ...(codigoConvite ? { codigoConvite } : {}) }).expect(201)
    const { body } = await api.post('/api/auth/login').send({ email, senha: 'senha1234', papel }).expect(200)
    return `Bearer ${body.token as string}`
  }
  return { api, cadastrarELogar }
}

describe('API — infraestrutura', () => {
  it('GET /api/health responde ok', async () => {
    const { api } = novoApp()
    await api.get('/api/health').expect(200, { status: 'ok' })
  })
  it('rotas protegidas exigem token (401) e rejeitam token inválido', async () => {
    const { api } = novoApp()
    await api.get('/api/turmas').expect(401)
    await api.get('/api/turmas').set('Authorization', 'Bearer lixo').expect(401)
  })
  it('dados inválidos viram 400 com mensagem em pt-BR', async () => {
    const { api } = novoApp()
    const r = await api.post('/api/auth/cadastro').send({ nome: 'X' }).expect(400)
    expect(r.body.erro.codigo).toBe('DADOS_INVALIDOS')
  })
  it('rota inexistente é 404 em JSON', async () => {
    const { api } = novoApp()
    const r = await api.get('/api/nada').expect(404)
    expect(r.body.erro.codigo).toBe('ROTA_NAO_ENCONTRADA')
  })
})

describe('API — identidade (RF01)', () => {
  it('R-03/R-05 cadastro e login devolvem token e perfil', async () => {
    const { api } = novoApp()
    const r = await api.post('/api/auth/cadastro').send({ nome: 'Alberto', email: 'a@escola.com', senha: 'senha1234', papel: 'professor' }).expect(201)
    expect(r.body.usuario).toMatchObject({ nome: 'Alberto', papel: 'professor' })
    const login = await api.post('/api/auth/login').send({ email: 'a@escola.com', senha: 'senha1234', papel: 'professor' }).expect(200)
    const perfil = await api.get('/api/perfil').set('Authorization', `Bearer ${login.body.token}`).expect(200)
    expect(perfil.body).toMatchObject({ nome: 'Alberto', email: 'a@escola.com' })
  })
  it('R-05 login errado é 401; e-mail repetido é 409', async () => {
    const { api } = novoApp()
    await api.post('/api/auth/cadastro').send({ nome: 'Alberto', email: 'a@escola.com', senha: 'senha1234', papel: 'professor' }).expect(201)
    await api.post('/api/auth/cadastro').send({ nome: 'Alberto', email: 'a@escola.com', senha: 'senha1234', papel: 'professor' }).expect(409)
    await api.post('/api/auth/login').send({ email: 'a@escola.com', senha: 'errada123' }).expect(401)
  })
  it('R-06 preferências persistem por usuário', async () => {
    const { api, cadastrarELogar } = novoApp()
    const auth = await cadastrarELogar('aluno', 'Sarah Chen')
    const r = await api.patch('/api/perfil/preferencias').set('Authorization', auth).send({ tema: 'alto-contraste', acessibilidade: false }).expect(200)
    expect(r.body.preferencias).toMatchObject({ tema: 'alto-contraste', acessibilidade: false })
    expect((await api.get('/api/perfil').set('Authorization', auth)).body.preferencias.tema).toBe('alto-contraste')
    await api.patch('/api/perfil/preferencias').set('Authorization', auth).send({ tema: 'neon' }).expect(400)
  })
})

describe('API — fluxo completo professor → aluno → análise', () => {
  it('RF02/RF03/RF05: cria turma, publica, aluno responde, professor vê resultados', async () => {
    const { api, cadastrarELogar } = novoApp()
    const prof = await cadastrarELogar('professor', 'Alberto')

    const turma = (await api.post('/api/turmas').set('Authorization', prof).send({ nome: 'Estatística Aplicada', periodo: '2026/02' }).expect(201)).body
    expect(turma.codigoConvite).toBeTruthy()
    expect((await api.get(`/api/auth/convites/${turma.codigoConvite}`).expect(200)).body).toEqual({ nome: 'Estatística Aplicada', periodo: '2026/02' })

    const aluno = await cadastrarELogar('aluno', 'Sarah Chen', turma.codigoConvite)
    const form = (await api.post('/api/formularios').set('Authorization', prof).send({ titulo: 'Média, mediana e moda', turmaId: turma.id, postar: true, perguntas: PERGUNTAS }).expect(201)).body
    expect(form.status).toBe('aberto')

    // aluno
    expect((await api.get('/api/aluno/turmas').set('Authorization', aluno).expect(200)).body.map((t: { id: string }) => t.id)).toEqual([turma.id])
    const lista = (await api.get('/api/aluno/autoavaliacoes').set('Authorization', aluno).expect(200)).body
    expect(lista[0]).toMatchObject({ id: form.id, status: 'pendente' })
    const [p1, p2] = form.perguntas as Array<{ id: string }>
    await api.put(`/api/aluno/autoavaliacoes/${form.id}/respostas/${p1!.id}`).set('Authorization', aluno).send({ marcadas: [0] }).expect(200)
    await api.post(`/api/aluno/autoavaliacoes/${form.id}/enviar`).set('Authorization', aluno).send({}).expect(422) // incompleto
    await api.put(`/api/aluno/autoavaliacoes/${form.id}/respostas/${p2!.id}`).set('Authorization', aluno).send({ marcadas: [0, 2] }).expect(200)
    const enviado = (await api.post(`/api/aluno/autoavaliacoes/${form.id}/enviar`).set('Authorization', aluno).send({ observacao: 'Muito bom' }).expect(200)).body
    expect(enviado).toMatchObject({ status: 'respondido', nota: 10, compreensao: 'I' })
    await api.put(`/api/aluno/autoavaliacoes/${form.id}/respostas/${p1!.id}`).set('Authorization', aluno).send({ marcadas: [1] }).expect(409)

    // professor
    const resumo = (await api.get(`/api/formularios/${form.id}/resumo`).set('Authorization', prof).expect(200)).body
    expect(resumo).toMatchObject({ respondidos: 1, total: 1, taxaResposta: 100, notaMedia: 10, totalObservacoes: 1 })
    const alunos = (await api.get(`/api/formularios/${form.id}/alunos`).set('Authorization', prof).expect(200)).body
    expect(alunos.responderam[0]).toMatchObject({ nome: 'Sarah Chen', nota: 10 })
    const turmas = (await api.get('/api/turmas').set('Authorization', prof).expect(200)).body
    expect(turmas[0]).toMatchObject({ totalAlunos: 1, taxaResposta: 100, dominioMedio: 100 })
    expect((await api.get(`/api/turmas/${turma.id}/alunos`).set('Authorization', prof).expect(200)).body.alunos[0]).toMatchObject({ nome: 'Sarah Chen', enviados: '1 / 1' })
    expect((await api.get(`/api/turmas/${turma.id}/resumo`).set('Authorization', prof).expect(200)).body).toMatchObject({ engajamento: 100 })
    expect((await api.get('/api/metricas?periodo=2026/02').set('Authorization', prof).expect(200)).body).toMatchObject({ desempenhoMedio: 100 })
    expect((await api.get('/api/formularios?status=aberto').set('Authorization', prof).expect(200)).body[0]).toMatchObject({ respostas: 1, total: 1 })
    expect((await api.post(`/api/formularios/${form.id}/notificar-pendentes`).set('Authorization', prof).expect(200)).body).toEqual({ notificados: 0 })
  })

  it('RF02 editar, fechar e excluir formulário e turma', async () => {
    const { api, cadastrarELogar } = novoApp()
    const prof = await cadastrarELogar('professor', 'Alberto')
    const turma = (await api.post('/api/turmas').set('Authorization', prof).send({ nome: 'Banco de Dados', periodo: '2026/01' }).expect(201)).body
    const form = (await api.post('/api/formularios').set('Authorization', prof).send({ titulo: 'Rascunho', turmaId: turma.id, perguntas: PERGUNTAS }).expect(201)).body
    expect(form.status).toBe('rascunho')
    expect((await api.patch(`/api/formularios/${form.id}`).set('Authorization', prof).send({ status: 'aberto' }).expect(200)).body.status).toBe('aberto')
    expect((await api.patch(`/api/formularios/${form.id}`).set('Authorization', prof).send({ status: 'fechado' }).expect(200)).body.status).toBe('fechado')
    await api.patch(`/api/formularios/${form.id}`).set('Authorization', prof).send({ status: 'rascunho' }).expect(422)
    expect((await api.get(`/api/formularios/${form.id}`).set('Authorization', prof).expect(200)).body).toMatchObject({ titulo: 'Rascunho', status: 'fechado' })
    await api.patch(`/api/turmas/${turma.id}`).set('Authorization', prof).send({ oculta: true, nome: 'BD' }).expect(200)
    expect((await api.get(`/api/turmas/${turma.id}`).set('Authorization', prof).expect(200)).body).toMatchObject({ oculta: true, nome: 'BD' })
    await api.delete(`/api/formularios/${form.id}`).set('Authorization', prof).expect(204)
    await api.get(`/api/formularios/${form.id}`).set('Authorization', prof).expect(404)
    await api.delete(`/api/turmas/${turma.id}`).set('Authorization', prof).expect(204)
    await api.get(`/api/turmas/${turma.id}`).set('Authorization', prof).expect(404)
  })
})

describe('API — autorização (RNF03/RNF04)', () => {
  it('aluno não acessa rotas do professor e vice-versa (403)', async () => {
    const { api, cadastrarELogar } = novoApp()
    const prof = await cadastrarELogar('professor', 'Alberto')
    const aluno = await cadastrarELogar('aluno', 'Sarah Chen')
    await api.get('/api/turmas').set('Authorization', aluno).expect(403)
    await api.post('/api/formularios').set('Authorization', aluno).send({}).expect(403)
    await api.get('/api/metricas').set('Authorization', aluno).expect(403)
    await api.get('/api/aluno/autoavaliacoes').set('Authorization', prof).expect(403)
  })
  it('professor não vê turma nem formulário de outro professor', async () => {
    const { api, cadastrarELogar } = novoApp()
    const dono = await cadastrarELogar('professor', 'Alberto')
    const outro = await cadastrarELogar('professor', 'Maria Silva')
    const turma = (await api.post('/api/turmas').set('Authorization', dono).send({ nome: 'Banco de Dados', periodo: '2026/01' })).body
    const form = (await api.post('/api/formularios').set('Authorization', dono).send({ titulo: 'Q', turmaId: turma.id, perguntas: PERGUNTAS })).body
    expect((await api.get('/api/turmas').set('Authorization', outro)).body).toEqual([])
    await api.get(`/api/turmas/${turma.id}`).set('Authorization', outro).expect(404)
    await api.get(`/api/turmas/${turma.id}/resumo`).set('Authorization', outro).expect(403)
    await api.get(`/api/formularios/${form.id}`).set('Authorization', outro).expect(403)
    await api.patch(`/api/formularios/${form.id}`).set('Authorization', outro).send({ titulo: 'Invadido' }).expect(403)
    await api.delete(`/api/turmas/${turma.id}`).set('Authorization', outro).expect(403)
  })
})

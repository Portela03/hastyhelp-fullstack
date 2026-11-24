import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { criarContainer } from '../container.ts'
import { criarInfraMemoria } from '../infra-memoria.ts'
import { criarApp } from './servidor.ts'

function novoApp() {
  const api = request(criarApp(criarContainer(criarInfraMemoria())))
  async function usuario(papel: 'professor' | 'aluno', nome: string, codigoConvite?: string) {
    const email = `${nome.toLowerCase().replace(/\s/g, '.')}@escola.com`
    const cad = await api.post('/api/auth/cadastro').send({ nome, email, senha: 'senha1234', papel, ...(codigoConvite ? { codigoConvite } : {}) }).expect(201)
    const { body } = await api.post('/api/auth/login').send({ email, senha: 'senha1234', papel }).expect(200)
    return { email, id: body.usuario.id as string, auth: `Bearer ${body.token as string}`, entrada: cad.body.entrada as string | undefined }
  }
  return { api, usuario }
}

describe('API — entrada em turmas (R-100…R-114)', () => {
  it('R-101 aluno logado entra em várias turmas pelo código; repetir é 409; professor é 403; código ruim é 404', async () => {
    const { api, usuario } = novoApp()
    const prof = await usuario('professor', 'Alberto')
    const sarah = await usuario('aluno', 'Sarah Chen')
    const t1 = (await api.post('/api/turmas').set('Authorization', prof.auth).send({ nome: 'Estatística', periodo: '2026/02' }).expect(201)).body
    const t2 = (await api.post('/api/turmas').set('Authorization', prof.auth).send({ nome: 'Cálculo', periodo: '2026/02' }).expect(201)).body
    expect(t1.codigoConvite).toHaveLength(6)
    expect(t1.aprovacaoManual).toBe(false)

    const r1 = await api.post('/api/aluno/turmas/entrar').set('Authorization', sarah.auth).send({ codigo: ` ${t1.codigoConvite.toUpperCase()} ` }).expect(201)
    expect(r1.body).toEqual({ status: 'matriculado', turma: { id: t1.id, nome: 'Estatística' } })
    await api.post('/api/aluno/turmas/entrar').set('Authorization', sarah.auth).send({ codigo: t2.codigoConvite }).expect(201)
    expect((await api.get('/api/aluno/turmas').set('Authorization', sarah.auth).expect(200)).body).toHaveLength(2)

    const repetido = await api.post('/api/aluno/turmas/entrar').set('Authorization', sarah.auth).send({ codigo: t1.codigoConvite }).expect(409)
    expect(repetido.body.erro.codigo).toBe('JA_NA_TURMA')
    await api.post('/api/aluno/turmas/entrar').set('Authorization', prof.auth).send({ codigo: t1.codigoConvite }).expect(403)
    const invalido = await api.post('/api/aluno/turmas/entrar').set('Authorization', sarah.auth).send({ codigo: 'xxxxxx' }).expect(404)
    expect(invalido.body.erro.codigo).toBe('CONVITE_INVALIDO')
    await api.post('/api/aluno/turmas/entrar').send({ codigo: t1.codigoConvite }).expect(401)
    await api.post('/api/aluno/turmas/entrar').set('Authorization', sarah.auth).send({}).expect(400)
  })

  it('R-102/R-103/R-105 aprovação manual: pedido pendente → professor aceita/recusa', async () => {
    const { api, usuario } = novoApp()
    const prof = await usuario('professor', 'Alberto')
    const sarah = await usuario('aluno', 'Sarah Chen')
    const james = await usuario('aluno', 'James Park')
    const turma = (await api.post('/api/turmas').set('Authorization', prof.auth).send({ nome: 'Estatística', periodo: '2026/02' }).expect(201)).body
    const editada = await api.patch(`/api/turmas/${turma.id}`).set('Authorization', prof.auth).send({ aprovacaoManual: true }).expect(200)
    expect(editada.body.aprovacaoManual).toBe(true)
    expect((await api.get(`/api/auth/convites/${turma.codigoConvite}`).expect(200)).body.aprovacaoManual).toBe(true)

    const pedido = await api.post('/api/aluno/turmas/entrar').set('Authorization', sarah.auth).send({ codigo: turma.codigoConvite }).expect(202)
    expect(pedido.body.status).toBe('pendente')
    await api.post('/api/aluno/turmas/entrar').set('Authorization', sarah.auth).send({ codigo: turma.codigoConvite }).expect(409)
    await api.post('/api/aluno/turmas/entrar').set('Authorization', james.auth).send({ codigo: turma.codigoConvite }).expect(202)
    expect((await api.get('/api/aluno/turmas').set('Authorization', sarah.auth).expect(200)).body).toEqual([])

    const { body } = await api.get(`/api/turmas/${turma.id}/entradas`).set('Authorization', prof.auth).expect(200)
    expect(body.solicitacoes.map((s: { aluno: { nome: string } }) => s.aluno.nome)).toEqual(['Sarah Chen', 'James Park'])
    await api.get(`/api/turmas/${turma.id}/entradas`).set('Authorization', sarah.auth).expect(403)

    await api.post(`/api/turmas/${turma.id}/entradas/${body.solicitacoes[0].id}/aceitar`).set('Authorization', prof.auth).expect(204)
    await api.post(`/api/turmas/${turma.id}/entradas/${body.solicitacoes[1].id}/recusar`).set('Authorization', prof.auth).expect(204)
    const de409 = await api.post(`/api/turmas/${turma.id}/entradas/${body.solicitacoes[0].id}/aceitar`).set('Authorization', prof.auth).expect(409)
    expect(de409.body.erro.codigo).toBe('ENTRADA_JA_RESOLVIDA')
    expect((await api.get('/api/aluno/turmas').set('Authorization', sarah.auth).expect(200)).body).toHaveLength(1)
    expect((await api.get('/api/aluno/turmas').set('Authorization', james.auth).expect(200)).body).toEqual([])
    const sino = (await api.get('/api/notificacoes').set('Authorization', sarah.auth).expect(200)).body
    expect(sino.itens[0]).toMatchObject({ tipo: 'entrada-resolvida', lida: false })
  })

  it('R-04/R-103 cadastro por link com aprovação manual devolve entrada pendente', async () => {
    const { api, usuario } = novoApp()
    const prof = await usuario('professor', 'Alberto')
    const turma = (await api.post('/api/turmas').set('Authorization', prof.auth).send({ nome: 'Estatística', periodo: '2026/02' }).expect(201)).body
    await api.patch(`/api/turmas/${turma.id}`).set('Authorization', prof.auth).send({ aprovacaoManual: true }).expect(200)
    const nova = await usuario('aluno', 'Sarah Chen', turma.codigoConvite)
    expect(nova.entrada).toBe('pendente')
    expect((await api.get('/api/aluno/turmas').set('Authorization', nova.auth).expect(200)).body).toEqual([])
  })

  it('R-107…R-111 convite por e-mail: busca, convida, aluno aceita/recusa, professor cancela', async () => {
    const { api, usuario } = novoApp()
    const prof = await usuario('professor', 'Alberto')
    const outroProf = await usuario('professor', 'Maria Silva')
    const sarah = await usuario('aluno', 'Sarah Chen')
    const james = await usuario('aluno', 'James Park')
    const turma = (await api.post('/api/turmas').set('Authorization', prof.auth).send({ nome: 'Estatística', periodo: '2026/02' }).expect(201)).body
    const busca = (q: string) => api.get(`/api/turmas/${turma.id}/alunos-para-convite`).query({ busca: q }).set('Authorization', prof.auth)

    expect((await busca('sa').expect(422)).body.erro.codigo).toBe('BUSCA_CURTA')
    expect((await busca('').expect(422)).body.erro.codigo).toBe('BUSCA_CURTA')
    const achados = (await busca('SARAH').expect(200)).body
    expect(achados).toEqual([{ id: sarah.id, nome: 'Sarah Chen', email: sarah.email, convidado: false }])
    expect((await busca('maria').expect(200)).body).toEqual([]) // professores nunca aparecem
    await api.get(`/api/turmas/${turma.id}/alunos-para-convite`).query({ busca: 'sarah' }).set('Authorization', outroProf.auth).expect(403)
    await api.get(`/api/turmas/${turma.id}/alunos-para-convite`).query({ busca: 'sarah' }).set('Authorization', sarah.auth).expect(403)

    await api.post(`/api/turmas/${turma.id}/convites`).set('Authorization', prof.auth).send({ alunoId: sarah.id }).expect(201)
    await api.post(`/api/turmas/${turma.id}/convites`).set('Authorization', prof.auth).send({ alunoId: james.id }).expect(201)
    expect((await api.post(`/api/turmas/${turma.id}/convites`).set('Authorization', prof.auth).send({ alunoId: sarah.id }).expect(409)).body.erro.codigo).toBe('CONVITE_JA_ENVIADO')
    await api.post(`/api/turmas/${turma.id}/convites`).set('Authorization', prof.auth).send({}).expect(400)
    expect((await busca('sarah').expect(200)).body[0].convidado).toBe(true)

    const convitesSarah = (await api.get('/api/aluno/convites').set('Authorization', sarah.auth).expect(200)).body
    expect(convitesSarah).toHaveLength(1)
    expect(convitesSarah[0]).toMatchObject({ turma: { id: turma.id, nome: 'Estatística' }, docente: 'Alberto' })
    await api.get('/api/aluno/convites').set('Authorization', prof.auth).expect(403)
    // um aluno não responde convite do outro
    await api.post(`/api/aluno/convites/${convitesSarah[0].id}/aceitar`).set('Authorization', james.auth).expect(404)

    await api.post(`/api/aluno/convites/${convitesSarah[0].id}/aceitar`).set('Authorization', sarah.auth).expect(204)
    expect((await api.get('/api/aluno/turmas').set('Authorization', sarah.auth).expect(200)).body).toHaveLength(1)
    expect((await api.post(`/api/aluno/convites/${convitesSarah[0].id}/recusar`).set('Authorization', sarah.auth).expect(409)).body.erro.codigo).toBe('ENTRADA_JA_RESOLVIDA')

    const { body } = await api.get(`/api/turmas/${turma.id}/entradas`).set('Authorization', prof.auth).expect(200)
    expect(body.convites).toHaveLength(1) // só o de James segue pendente
    await api.delete(`/api/turmas/${turma.id}/entradas/${body.convites[0].id}`).set('Authorization', prof.auth).expect(204)
    expect((await api.get('/api/aluno/convites').set('Authorization', james.auth).expect(200)).body).toEqual([])
  })
})

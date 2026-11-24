import cors from 'cors'
import express from 'express'
import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { ZodError, z } from 'zod'
import type { Ator, Papel } from '../../shared/ator.ts'
import { ErroDeDominio, naoEncontrado } from '../../shared/erros.ts'
import type { Container } from '../container.ts'

const STATUS = z.enum(['agendado', 'rascunho', 'fechado', 'aberto', 'concluido'])
const PERGUNTA = z.object({
  id: z.string().optional(),
  enunciado: z.string(),
  tipo: z.enum(['unica', 'multipla']),
  opcoes: z.array(z.string()),
  gabarito: z.array(z.number().int()).optional(),
  categoriasOpcao: z.array(z.enum(['I', 'P', 'C']).nullable()).optional(),
})
const ESQ = {
  cadastro: z.object({
    nome: z.string().min(1),
    email: z.string().min(1),
    senha: z.string().min(1),
    papel: z.enum(['professor', 'aluno']),
    confirmacaoSenha: z.string().optional(),
    codigoConvite: z.string().optional(),
  }),
  login: z.object({ email: z.string().min(1), senha: z.string().min(1), papel: z.enum(['professor', 'aluno']).optional() }),
  preferencias: z
    .object({
      notificacoesEmail: z.boolean(),
      conclusaoFormularios: z.boolean(),
      publicacaoFormularios: z.boolean(),
      metricasTrimestrais: z.boolean(),
      metricasSemestrais: z.boolean(),
      acessibilidade: z.boolean(),
      tema: z.string(),
    })
    .partial(),
  turma: z.object({ nome: z.string(), periodo: z.string(), sigla: z.string().optional(), cor: z.string().optional() }),
  turmaEdicao: z.object({ nome: z.string(), periodo: z.string(), sigla: z.string(), cor: z.string(), oculta: z.boolean(), aprovacaoManual: z.boolean() }).partial(),
  entrarPorCodigo: z.object({ codigo: z.string() }),
  convidarAluno: z.object({ alunoId: z.string().min(1) }),
  formulario: z.object({
    titulo: z.string(),
    turmaId: z.string(),
    perguntas: z.array(PERGUNTA).default([]),
    postar: z.boolean().optional(),
    publicarEm: z.string().optional(),
    prazo: z.string().optional(),
    mostrarGabarito: z.boolean().optional(),
  }),
  formularioEdicao: z
    .object({
      titulo: z.string(),
      prazo: z.string().nullable(),
      mostrarGabarito: z.boolean(),
      perguntas: z.array(PERGUNTA),
      status: STATUS,
      publicarEm: z.string(),
    })
    .partial(),
  filtroFormularios: z.object({ turmaId: z.string().optional(), status: STATUS.optional(), busca: z.string().optional() }),
  filtroMetricas: z.object({
    periodo: z.string().optional(),
    turmaId: z.string().optional(),
    alunoId: z.string().optional(),
    formularioId: z.string().optional(),
    status: STATUS.optional(),
    desde: z.string().optional(),
  }),
  resposta: z.object({ marcadas: z.array(z.number().int()) }),
  refresh: z.object({ refreshToken: z.string().min(1) }),
  esqueciSenha: z.object({ email: z.string().min(1) }),
  redefinirSenha: z.object({ token: z.string().min(1), senha: z.string().min(1), confirmacaoSenha: z.string().optional() }),
  moderacao: z
    .object({ resposta: z.string().nullable().optional(), oculta: z.boolean().optional() })
    .refine((m) => m.resposta !== undefined || m.oculta !== undefined, { message: 'Informe "resposta" e/ou "oculta".' }),
  envio: z.object({
    observacao: z.string().optional(),
    notaGeral: z.number().min(0).max(10).optional(),
  }).default({}),
}

/** Remove chaves `undefined` (exactOptionalPropertyTypes-friendly). */
const limpar = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T

type Handler = (req: Request, res: Response) => Promise<unknown> | unknown
const rota = (fn: Handler): RequestHandler => (req, res, next) => {
  Promise.resolve(fn(req, res)).catch(next)
}

const atorDe = (res: Response) => res.locals.ator as Ator
const param = (req: Request, nome: string) => String(req.params[nome] ?? '')

export function criarApp({ uc, infra }: Container, opcoes: { exporCaixaDeSaida?: boolean; origensPermitidas?: string[] } = {}) {
  const app = express()
  // Sem origens configuradas, nenhuma origem externa é liberada (o front usa a mesma origem via proxy/rewrite).
  app.use(cors({ origin: opcoes.origensPermitidas?.length ? opcoes.origensPermitidas : false }))
  app.use(express.json({ limit: '1mb' }))

  // Confere o token e se a sessão ainda está ativa (logout/redefinição de senha invalidam na hora).
  const autenticado: RequestHandler = async (req, res, next) => {
    const cabecalho = req.header('authorization') ?? ''
    const ator = cabecalho.startsWith('Bearer ') ? await uc.identidade.validarSessao.executar(cabecalho.slice(7)) : null
    if (!ator) return void res.status(401).json({ erro: { codigo: 'NAO_AUTENTICADO', mensagem: 'Faça login para continuar.' } })
    res.locals.ator = ator satisfies Ator
    next()
  }
  const apenas = (papel: Papel): RequestHandler => (_req, res, next) => {
    if (atorDe(res).papel !== papel) {
      return void res.status(403).json({ erro: { codigo: 'ACESSO_NEGADO', mensagem: `Esta área é exclusiva de ${papel === 'professor' ? 'professores' : 'alunos'}.` } })
    }
    next()
  }

  const api = express.Router()
  api.get('/health', (_req, res) => void res.json({ status: 'ok' }))

  // --- identidade ---
  api.post('/auth/cadastro', rota(async (req, res) => {
    res.status(201).json(await uc.identidade.cadastrar.executar(limpar(ESQ.cadastro.parse(req.body))))
  }))
  api.post('/auth/login', rota(async (req, res) => {
    res.json(await uc.identidade.autenticar.executar(limpar(ESQ.login.parse(req.body))))
  }))
  api.post('/auth/refresh', rota(async (req, res) => {
    res.json(await uc.identidade.renovarSessao.executar(ESQ.refresh.parse(req.body)))
  }))
  api.post('/auth/logout', rota(async (req, res) => {
    await uc.identidade.encerrarSessao.executar(ESQ.refresh.parse(req.body))
    res.status(204).end()
  }))
  api.post('/auth/esqueci-senha', rota(async (req, res) => {
    await uc.identidade.esqueciSenha.executar(ESQ.esqueciSenha.parse(req.body))
    res.status(202).json({ mensagem: 'Se existir uma conta com esse e-mail, um link de redefinição foi gerado.' })
  }))
  api.post('/auth/redefinir-senha', rota(async (req, res) => {
    await uc.identidade.redefinirSenha.executar(limpar(ESQ.redefinirSenha.parse(req.body)))
    res.status(204).end()
  }))
  if (opcoes.exporCaixaDeSaida) {
    // Só desenvolvimento/testes: não há envio de e-mail, então é aqui que se lê o link de redefinição.
    api.get('/dev/caixa-de-saida', rota(async (req, res) => {
      res.json(await infra.caixaDeSaida.porDestinatario(String(req.query.para ?? '')))
    }))
  }
  api.get('/auth/convites/:codigo', rota(async (req, res) => {
    res.json(await uc.turmas.consultarConvite.executar(param(req, 'codigo')))
  }))
  api.get('/perfil', autenticado, rota(async (_req, res) => {
    res.json(await uc.identidade.obterPerfil.executar(atorDe(res).id))
  }))
  api.patch('/perfil/preferencias', autenticado, rota(async (req, res) => {
    res.json(await uc.identidade.atualizarPreferencias.executar(atorDe(res).id, ESQ.preferencias.parse(req.body) as never))
  }))

  // --- notificações (sino) ---
  api.get('/notificacoes', autenticado, rota(async (_req, res) => void res.json(await uc.notificacoes.listar.executar(atorDe(res)))))
  api.post('/notificacoes/lidas', autenticado, rota(async (_req, res) => {
    await uc.notificacoes.marcarTodasLidas.executar(atorDe(res))
    res.status(204).end()
  }))
  api.post('/notificacoes/:id/lida', autenticado, rota(async (req, res) => {
    await uc.notificacoes.marcarLida.executar(atorDe(res), param(req, 'id'))
    res.status(204).end()
  }))

  // --- professor ---
  const professor = express.Router()
  professor.use(['/turmas', '/formularios', '/metricas'], autenticado, apenas('professor'))

  professor.get('/turmas', rota(async (_req, res) => void res.json(await uc.analise.turmas.executar(atorDe(res)))))
  professor.post('/turmas', rota(async (req, res) => {
    res.status(201).json(await uc.turmas.criar.executar(atorDe(res), limpar(ESQ.turma.parse(req.body))))
  }))
  professor.get('/turmas/:id', rota(async (req, res) => {
    const turma = (await uc.analise.turmas.executar(atorDe(res))).find((t) => t.id === param(req, 'id'))
    if (!turma) throw naoEncontrado('TURMA_NAO_ENCONTRADA', 'Turma não encontrada.')
    res.json(turma)
  }))
  professor.patch('/turmas/:id', rota(async (req, res) => {
    res.json(await uc.turmas.editar.executar(atorDe(res), param(req, 'id'), limpar(ESQ.turmaEdicao.parse(req.body))))
  }))
  professor.delete('/turmas/:id', rota(async (req, res) => {
    await uc.turmas.excluir.executar(atorDe(res), param(req, 'id'))
    res.status(204).end()
  }))
  professor.get('/turmas/:id/alunos', rota(async (req, res) => void res.json(await uc.analise.alunosTurma.executar(atorDe(res), param(req, 'id')))))
  professor.get('/turmas/:id/alunos/:alunoId/respostas', rota(async (req, res) => {
    res.json(await uc.analise.alunoNaTurma.executar(atorDe(res), param(req, 'id'), param(req, 'alunoId')))
  }))
  professor.delete('/turmas/:id/alunos/:alunoId', rota(async (req, res) => {
    await uc.turmas.removerAluno.executar(atorDe(res), param(req, 'id'), param(req, 'alunoId'))
    res.status(204).end()
  }))
  professor.post('/turmas/:id/alunos/:alunoId/redefinir-senha', rota(async (req, res) => {
    res.json(await uc.turmas.gerarLinkDeRedefinicao.executar(atorDe(res), param(req, 'id'), param(req, 'alunoId')))
  }))
  professor.get('/turmas/:id/entradas', rota(async (req, res) => void res.json(await uc.turmas.listarEntradas.executar(atorDe(res), param(req, 'id')))))
  professor.post('/turmas/:id/entradas/:entradaId/aceitar', rota(async (req, res) => {
    await uc.turmas.responderSolicitacao.executar(atorDe(res), param(req, 'id'), param(req, 'entradaId'), 'aceitar')
    res.status(204).end()
  }))
  professor.post('/turmas/:id/entradas/:entradaId/recusar', rota(async (req, res) => {
    await uc.turmas.responderSolicitacao.executar(atorDe(res), param(req, 'id'), param(req, 'entradaId'), 'recusar')
    res.status(204).end()
  }))
  professor.delete('/turmas/:id/entradas/:entradaId', rota(async (req, res) => {
    await uc.turmas.cancelarConvite.executar(atorDe(res), param(req, 'id'), param(req, 'entradaId'))
    res.status(204).end()
  }))
  professor.get('/turmas/:id/alunos-para-convite', rota(async (req, res) => {
    res.json(await uc.turmas.buscarAlunos.executar(atorDe(res), param(req, 'id'), String(req.query.busca ?? '')))
  }))
  professor.post('/turmas/:id/codigo', rota(async (req, res) => {
    res.json(await uc.turmas.gerarNovoCodigo.executar(atorDe(res), param(req, 'id')))
  }))
  professor.post('/turmas/:id/convites', rota(async (req, res) => {
    res.status(201).json(await uc.turmas.convidarAluno.executar(atorDe(res), param(req, 'id'), ESQ.convidarAluno.parse(req.body).alunoId))
  }))
  professor.get('/turmas/:id/resumo', rota(async (req, res) => void res.json(await uc.analise.resumoTurma.executar(atorDe(res), param(req, 'id')))))

  professor.get('/formularios', rota(async (req, res) => {
    res.json(await uc.analise.formularios.executar(atorDe(res), limpar(ESQ.filtroFormularios.parse(req.query))))
  }))
  professor.post('/formularios', rota(async (req, res) => {
    res.status(201).json(await uc.formularios.criar.executar(atorDe(res), limpar(ESQ.formulario.parse(req.body))))
  }))
  professor.get('/formularios/:id', rota(async (req, res) => void res.json(await uc.analise.formulario.executar(atorDe(res), param(req, 'id')))))
  professor.patch('/formularios/:id', rota(async (req, res) => {
    res.json(await uc.formularios.editar.executar(atorDe(res), param(req, 'id'), limpar(ESQ.formularioEdicao.parse(req.body))))
  }))
  professor.delete('/formularios/:id', rota(async (req, res) => {
    await uc.formularios.excluir.executar(atorDe(res), param(req, 'id'))
    res.status(204).end()
  }))
  professor.get('/formularios/:id/alunos', rota(async (req, res) => void res.json(await uc.analise.alunosFormulario.executar(atorDe(res), param(req, 'id')))))
  professor.get('/formularios/:id/resumo', rota(async (req, res) => void res.json(await uc.analise.resumoFormulario.executar(atorDe(res), param(req, 'id')))))
  professor.get('/formularios/:id/alunos/:alunoId', rota(async (req, res) => {
    res.json(await uc.analise.alunoNoFormulario.executar(atorDe(res), param(req, 'id'), param(req, 'alunoId')))
  }))
  professor.patch('/formularios/:id/observacoes/:envioId', rota(async (req, res) => {
    await uc.respostas.moderarObservacao.executar(atorDe(res), param(req, 'id'), param(req, 'envioId'), limpar(ESQ.moderacao.parse(req.body)))
    res.status(204).end()
  }))
  professor.post('/formularios/:id/notificar-pendentes', rota(async (req, res) => void res.json(await uc.analise.notificarPendentes.executar(atorDe(res), param(req, 'id')))))
  professor.get('/metricas', rota(async (req, res) => {
    res.json(await uc.analise.metricas.executar(atorDe(res), limpar(ESQ.filtroMetricas.parse(req.query))))
  }))
  api.use(professor)

  // --- aluno ---
  const aluno = express.Router()
  aluno.use('/aluno', autenticado, apenas('aluno'))
  aluno.get('/aluno/turmas', rota(async (_req, res) => void res.json(await uc.turmas.listar.executar(atorDe(res)))))
  aluno.post('/aluno/turmas/entrar', rota(async (req, res) => {
    const r = await uc.turmas.entrarPorCodigo.executar(atorDe(res), ESQ.entrarPorCodigo.parse(req.body).codigo)
    res.status(r.status === 'matriculado' ? 201 : 202).json(r)
  }))
  aluno.get('/aluno/convites', rota(async (_req, res) => void res.json(await uc.turmas.listarConvites.executar(atorDe(res)))))
  aluno.get('/aluno/solicitacoes', rota(async (_req, res) => void res.json(await uc.turmas.listarSolicitacoes.executar(atorDe(res)))))
  aluno.delete('/aluno/solicitacoes/:id', rota(async (req, res) => {
    await uc.turmas.cancelarSolicitacao.executar(atorDe(res), param(req, 'id'))
    res.status(204).end()
  }))
  aluno.post('/aluno/convites/:id/aceitar', rota(async (req, res) => {
    await uc.turmas.responderConvite.executar(atorDe(res), param(req, 'id'), 'aceitar')
    res.status(204).end()
  }))
  aluno.post('/aluno/convites/:id/recusar', rota(async (req, res) => {
    await uc.turmas.responderConvite.executar(atorDe(res), param(req, 'id'), 'recusar')
    res.status(204).end()
  }))
  aluno.delete('/aluno/turmas/:id', rota(async (req, res) => {
    await uc.turmas.sairDaEquipe.executar(atorDe(res), param(req, 'id'))
    res.status(204).end()
  }))
  aluno.get('/aluno/autoavaliacoes', rota(async (_req, res) => void res.json(await uc.respostas.listar.executar(atorDe(res)))))
  aluno.put('/aluno/autoavaliacoes/:id/respostas/:perguntaId', rota(async (req, res) => {
    const { marcadas } = ESQ.resposta.parse(req.body)
    res.json(await uc.respostas.salvar.executar(atorDe(res), param(req, 'id'), param(req, 'perguntaId'), marcadas))
  }))
  aluno.post('/aluno/autoavaliacoes/:id/enviar', rota(async (req, res) => {
    const { observacao, notaGeral } = ESQ.envio.parse(req.body)
    res.json(await uc.respostas.enviar.executar(atorDe(res), param(req, 'id'), observacao, notaGeral))
  }))
  api.use(aluno)

  api.use((_req, res) => void res.status(404).json({ erro: { codigo: 'ROTA_NAO_ENCONTRADA', mensagem: 'Rota não encontrada.' } }))
  app.use('/api', api)

  app.use((erro: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (erro instanceof ErroDeDominio) return void res.status(erro.status).json({ erro: { codigo: erro.codigo, mensagem: erro.message } })
    if (erro instanceof ZodError) {
      return void res.status(400).json({ erro: { codigo: 'DADOS_INVALIDOS', mensagem: 'Dados inválidos na requisição.', detalhes: erro.issues.map((i) => ({ campo: i.path.join('.'), mensagem: i.message })) } })
    }
    if (erro instanceof SyntaxError) return void res.status(400).json({ erro: { codigo: 'JSON_INVALIDO', mensagem: 'Corpo da requisição não é um JSON válido.' } })
    console.error(erro)
    res.status(500).json({ erro: { codigo: 'ERRO_INTERNO', mensagem: 'Erro interno do servidor.' } })
  })
  return app
}

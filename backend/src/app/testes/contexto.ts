import { criarContainer } from '../container.ts'
import { criarInfraMemoria } from '../infra-memoria.ts'
import type { Ator } from '../../shared/ator.ts'
import type { Relogio } from '../../shared/portas.ts'

export class RelogioFalso implements Relogio {
  constructor(private atual: Date) {}
  agora() {
    return new Date(this.atual)
  }
  definir(data: Date) {
    this.atual = data
  }
  avancarDias(dias: number) {
    this.atual = new Date(this.atual.getTime() + dias * 86_400_000)
  }
}

/** Monta o sistema inteiro com repositórios em memória e relógio controlável. */
export function criarContexto() {
  const relogio = new RelogioFalso(new Date('2026-09-10T12:00:00Z'))
  const infra = criarInfraMemoria({ relogio })
  const { uc } = criarContainer(infra)

  async function usuario(papel: 'professor' | 'aluno', nome: string, extra: { codigoConvite?: string } = {}): Promise<Ator & { nome: string }> {
    const email = `${nome.toLowerCase().replace(/\s+/g, '.')}@escola.com`
    const { usuario: u } = await uc.identidade.cadastrar.executar({ nome, email, senha: 'senha1234', papel, ...extra })
    return { id: u.id, papel, nome }
  }

  return { uc, infra, relogio, usuario }
}

export type Contexto = ReturnType<typeof criarContexto>

export const PERGUNTAS_EXEMPLO = [
  { enunciado: 'Qual a média de 2 e 4?', tipo: 'unica' as const, opcoes: ['3', '4'], gabarito: [0] },
  { enunciado: 'Quais são pares?', tipo: 'multipla' as const, opcoes: ['2', '3', '4'], gabarito: [0, 2] },
]

/** Cria turma, matricula alunos e publica um formulário aberto. */
export async function cenarioPublicado(ctx: Contexto, nomesAlunos: string[] = ['Sarah Chen', 'James Park']) {
  const prof = await ctx.usuario('professor', 'Alberto')
  const turma = await ctx.uc.turmas.criar.executar(prof, { nome: 'Estatística Aplicada', periodo: '2026/02' })
  const alunos = []
  for (const nome of nomesAlunos) alunos.push(await ctx.usuario('aluno', nome, { codigoConvite: turma.codigoConvite }))
  const formulario = await ctx.uc.formularios.criar.executar(prof, { titulo: 'Média, mediana e moda', turmaId: turma.id, postar: true, perguntas: PERGUNTAS_EXEMPLO })
  return { prof, turma, alunos, formulario }
}

/** Faz o aluno responder tudo certo (ou errar a primeira) e enviar. */
export async function responderEEnviar(ctx: Contexto, aluno: Ator, formularioId: string, perguntaIds: string[], certo = true, observacao?: string) {
  const [p1, p2] = perguntaIds
  await ctx.uc.respostas.salvar.executar(aluno, formularioId, p1!, certo ? [0] : [1])
  await ctx.uc.respostas.salvar.executar(aluno, formularioId, p2!, [0, 2])
  return ctx.uc.respostas.enviar.executar(aluno, formularioId, observacao)
}

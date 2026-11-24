import { ErroDeDominio, conflito, naoEncontrado } from '../../../shared/erros.ts'
import type { Ator } from '../../../shared/ator.ts'
import type { Relogio } from '../../../shared/portas.ts'
import type { UsuarioRepositorio } from '../../identidade/domain/usuario.ts'
import type { EmissorDeNotificacoes } from '../../notificacoes/application/emissor.ts'
import { resolverEntrada } from '../domain/entrada.ts'
import type { Entrada, EntradaRepositorio } from '../domain/entrada.ts'
import type { TurmaRepositorio } from '../domain/repositorio.ts'
import { turmaDoDocente } from './acesso.ts'

const entradaNaoEncontrada = () => naoEncontrado('ENTRADA_NAO_ENCONTRADA', 'Pedido ou convite não encontrado.')
const jaResolvida = () => conflito('ENTRADA_JA_RESOLVIDA', 'Este pedido ou convite já foi respondido.')

async function entradaDaTurma(d: { entradas: EntradaRepositorio }, turmaId: string, entradaId: string): Promise<Entrada> {
  const entrada = await d.entradas.porId(entradaId)
  if (!entrada || entrada.turmaId !== turmaId) throw entradaNaoEncontrada()
  return entrada
}

/** R-104: pedidos (código) e convites (e-mail) pendentes da turma. */
export class ListarEntradas {
  constructor(private readonly d: { turmas: TurmaRepositorio; entradas: EntradaRepositorio; usuarios: UsuarioRepositorio }) {}

  async executar(ator: Ator, turmaId: string) {
    await turmaDoDocente(this.d.turmas, ator, turmaId)
    const pendentes = await this.d.entradas.pendentesDaTurma(turmaId)
    const alunos = await this.d.usuarios.porIds([...new Set(pendentes.map((e) => e.alunoId))])
    const dto = (e: Entrada) => {
      const aluno = alunos.find((a) => a.id === e.alunoId)
      return { id: e.id, aluno: { id: e.alunoId, nome: aluno?.nome ?? '', email: aluno?.email ?? '' }, criadaEm: e.criadaEm.toISOString() }
    }
    return {
      solicitacoes: pendentes.filter((e) => e.origem === 'codigo').map(dto),
      convites: pendentes.filter((e) => e.origem === 'convite').map(dto),
    }
  }
}

/** R-105/R-106: o docente aceita ou recusa o pedido de um aluno. */
export class ResponderSolicitacao {
  constructor(private readonly d: { turmas: TurmaRepositorio; entradas: EntradaRepositorio; relogio: Relogio; emissor: EmissorDeNotificacoes }) {}

  async executar(ator: Ator, turmaId: string, entradaId: string, acao: 'aceitar' | 'recusar'): Promise<void> {
    const turma = await turmaDoDocente(this.d.turmas, ator, turmaId)
    const entrada = await entradaDaTurma(this.d, turmaId, entradaId)
    if (entrada.origem !== 'codigo') throw new ErroDeDominio('ORIGEM_INVALIDA', 'Convites são respondidos pelo aluno convidado.', 422)
    if (entrada.status !== 'pendente') throw jaResolvida()

    const aceitar = acao === 'aceitar'
    await this.d.entradas.salvar(resolverEntrada(entrada, aceitar ? 'aceita' : 'recusada', this.d.relogio.agora()))
    if (aceitar) await this.d.turmas.matricular(turmaId, entrada.alunoId)
    await this.d.emissor.emitir([entrada.alunoId], {
      tipo: 'entrada-resolvida',
      titulo: aceitar ? 'Pedido aceito' : 'Pedido recusado',
      mensagem: aceitar ? `Você agora faz parte da equipe ${turma.nome}.` : `O professor não aceitou seu pedido para entrar na equipe ${turma.nome}.`,
      link: aceitar ? `/aluno/turmas/${turma.id}` : '/aluno/turmas',
    })
  }
}

/** R-111: o docente cancela um convite que ainda não foi respondido. */
export class CancelarConvite {
  constructor(private readonly d: { turmas: TurmaRepositorio; entradas: EntradaRepositorio; relogio: Relogio }) {}

  async executar(ator: Ator, turmaId: string, entradaId: string): Promise<void> {
    await turmaDoDocente(this.d.turmas, ator, turmaId)
    const entrada = await entradaDaTurma(this.d, turmaId, entradaId)
    if (entrada.origem !== 'convite') throw new ErroDeDominio('ORIGEM_INVALIDA', 'Pedidos de entrada são aceitos ou recusados, não cancelados.', 422)
    if (entrada.status !== 'pendente') throw jaResolvida()
    await this.d.entradas.salvar(resolverEntrada(entrada, 'cancelada', this.d.relogio.agora()))
  }
}

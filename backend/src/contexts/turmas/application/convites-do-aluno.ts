import { exigirPapel } from '../../../shared/ator.ts'
import type { Ator } from '../../../shared/ator.ts'
import { conflito, naoEncontrado } from '../../../shared/erros.ts'
import type { Relogio } from '../../../shared/portas.ts'
import type { UsuarioRepositorio } from '../../identidade/domain/usuario.ts'
import type { EmissorDeNotificacoes } from '../../notificacoes/application/emissor.ts'
import { resolverEntrada } from '../domain/entrada.ts'
import type { EntradaRepositorio } from '../domain/entrada.ts'
import type { TurmaRepositorio } from '../domain/repositorio.ts'

/** R-109: convites pendentes do próprio aluno. */
export class ListarConvites {
  constructor(private readonly d: { turmas: TurmaRepositorio; usuarios: UsuarioRepositorio; entradas: EntradaRepositorio }) {}

  async executar(ator: Ator) {
    exigirPapel(ator, 'aluno')
    const convites = await this.d.entradas.convitesPendentesDoAluno(ator.id)
    const itens = []
    for (const c of convites) {
      const turma = await this.d.turmas.porId(c.turmaId)
      if (!turma) continue
      const docente = await this.d.usuarios.porId(turma.docenteId)
      itens.push({
        id: c.id,
        turma: { id: turma.id, nome: turma.nome, periodo: turma.periodo as string, sigla: turma.sigla, cor: turma.cor },
        docente: docente?.nome ?? '',
        criadoEm: c.criadaEm.toISOString(),
      })
    }
    return itens
  }
}

/** R-110: o aluno aceita (matricula) ou recusa o convite; o docente é avisado. */
export class ResponderConvite {
  constructor(private readonly d: { turmas: TurmaRepositorio; usuarios: UsuarioRepositorio; entradas: EntradaRepositorio; relogio: Relogio; emissor: EmissorDeNotificacoes }) {}

  async executar(ator: Ator, entradaId: string, acao: 'aceitar' | 'recusar'): Promise<void> {
    exigirPapel(ator, 'aluno')
    const entrada = await this.d.entradas.porId(entradaId)
    if (!entrada || entrada.alunoId !== ator.id || entrada.origem !== 'convite') throw naoEncontrado('ENTRADA_NAO_ENCONTRADA', 'Convite não encontrado.')
    if (entrada.status !== 'pendente') throw conflito('ENTRADA_JA_RESOLVIDA', 'Este convite já foi respondido ou cancelado.')
    const turma = await this.d.turmas.porId(entrada.turmaId)
    if (!turma) throw naoEncontrado('ENTRADA_NAO_ENCONTRADA', 'Convite não encontrado.')

    const aceitar = acao === 'aceitar'
    await this.d.entradas.salvar(resolverEntrada(entrada, aceitar ? 'aceita' : 'recusada', this.d.relogio.agora()))
    if (aceitar) await this.d.turmas.matricular(turma.id, ator.id)
    const aluno = await this.d.usuarios.porId(ator.id)
    await this.d.emissor.emitir([turma.docenteId], {
      tipo: 'entrada-resolvida',
      titulo: aceitar ? 'Convite aceito' : 'Convite recusado',
      mensagem: `${aluno?.nome ?? 'O aluno'} ${aceitar ? 'aceitou' : 'recusou'} o convite para a equipe ${turma.nome}.`,
      link: `/equipes/${turma.id}`,
    })
  }
}

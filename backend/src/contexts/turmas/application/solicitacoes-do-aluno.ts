import { exigirPapel } from '../../../shared/ator.ts'
import type { Ator } from '../../../shared/ator.ts'
import { conflito, naoEncontrado } from '../../../shared/erros.ts'
import type { Relogio } from '../../../shared/portas.ts'
import type { UsuarioRepositorio } from '../../identidade/domain/usuario.ts'
import { resolverEntrada } from '../domain/entrada.ts'
import type { EntradaRepositorio } from '../domain/entrada.ts'
import type { TurmaRepositorio } from '../domain/repositorio.ts'

/** R-118: pedidos de entrada pendentes do próprio aluno. */
export class ListarSolicitacoes {
  constructor(private readonly d: { turmas: TurmaRepositorio; usuarios: UsuarioRepositorio; entradas: EntradaRepositorio }) {}

  async executar(ator: Ator) {
    exigirPapel(ator, 'aluno')
    const itens = []
    for (const s of await this.d.entradas.solicitacoesPendentesDoAluno(ator.id)) {
      const turma = await this.d.turmas.porId(s.turmaId)
      if (!turma) continue
      const docente = await this.d.usuarios.porId(turma.docenteId)
      itens.push({
        id: s.id,
        turma: { id: turma.id, nome: turma.nome, periodo: turma.periodo as string, sigla: turma.sigla, cor: turma.cor },
        docente: docente?.nome ?? '',
        criadoEm: s.criadaEm.toISOString(),
      })
    }
    return itens
  }
}

/** R-119: o aluno cancela o próprio pedido pendente. */
export class CancelarSolicitacao {
  constructor(private readonly d: { entradas: EntradaRepositorio; relogio: Relogio }) {}

  async executar(ator: Ator, entradaId: string): Promise<void> {
    exigirPapel(ator, 'aluno')
    const entrada = await this.d.entradas.porId(entradaId)
    if (!entrada || entrada.alunoId !== ator.id || entrada.origem !== 'codigo') throw naoEncontrado('ENTRADA_NAO_ENCONTRADA', 'Pedido não encontrado.')
    if (entrada.status !== 'pendente') throw conflito('ENTRADA_JA_RESOLVIDA', 'Este pedido já foi respondido ou cancelado.')
    await this.d.entradas.salvar(resolverEntrada(entrada, 'cancelada', this.d.relogio.agora()))
  }
}

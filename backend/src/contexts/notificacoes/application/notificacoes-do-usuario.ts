import { naoEncontrado } from '../../../shared/erros.ts'
import type { Ator } from '../../../shared/ator.ts'
import type { Relogio } from '../../../shared/portas.ts'
import type { Notificacao, NotificacaoRepositorio } from '../domain/notificacao.ts'

const LIMITE = 50

export const notificacaoDTO = (n: Notificacao) => ({
  id: n.id,
  tipo: n.tipo,
  titulo: n.titulo,
  mensagem: n.mensagem,
  link: n.link ?? null,
  criadaEm: n.criadaEm.toISOString(),
  lida: Boolean(n.lidaEm),
})

/** R-84 */
export class ListarNotificacoes {
  constructor(private readonly d: { notificacoes: NotificacaoRepositorio }) {}

  async executar(ator: Ator) {
    const [itens, naoLidas] = await Promise.all([this.d.notificacoes.listarDoUsuario(ator.id, LIMITE), this.d.notificacoes.contarNaoLidas(ator.id)])
    return { itens: itens.map(notificacaoDTO), naoLidas }
  }
}

export class MarcarNotificacaoLida {
  constructor(private readonly d: { notificacoes: NotificacaoRepositorio; relogio: Relogio }) {}

  async executar(ator: Ator, id: string): Promise<void> {
    if (!(await this.d.notificacoes.marcarLida(id, ator.id, this.d.relogio.agora()))) {
      throw naoEncontrado('NOTIFICACAO_NAO_ENCONTRADA', 'Notificação não encontrada.')
    }
  }
}

export class MarcarTodasComoLidas {
  constructor(private readonly d: { notificacoes: NotificacaoRepositorio; relogio: Relogio }) {}

  async executar(ator: Ator): Promise<void> {
    await this.d.notificacoes.marcarTodasLidas(ator.id, this.d.relogio.agora())
  }
}

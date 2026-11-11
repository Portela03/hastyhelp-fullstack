import type { GeradorId, Relogio } from '../../../shared/portas.ts'
import type { Preferencias, UsuarioRepositorio } from '../../identidade/domain/usuario.ts'
import type { NotificacaoRepositorio, TipoNotificacao } from '../domain/notificacao.ts'

type PreferenciaBooleana = Exclude<keyof Preferencias, 'tema'>

export interface NovaNotificacao {
  tipo: TipoNotificacao
  titulo: string
  mensagem: string
  link?: string
}

/**
 * Cria notificações respeitando o perfil de cada destinatário:
 * a chave geral `notificacoesEmail` e, opcionalmente, uma preferência específica (R-81, R-82, R-83).
 */
export class EmissorDeNotificacoes {
  constructor(private readonly d: { usuarios: UsuarioRepositorio; notificacoes: NotificacaoRepositorio; ids: GeradorId; relogio: Relogio }) {}

  /** Devolve quantas notificações foram de fato criadas. */
  async emitir(usuarioIds: string[], nova: NovaNotificacao, preferencia?: PreferenciaBooleana): Promise<number> {
    if (usuarioIds.length === 0) return 0
    const usuarios = await this.d.usuarios.porIds([...new Set(usuarioIds)])
    const agora = this.d.relogio.agora()
    let criadas = 0
    for (const u of usuarios) {
      if (!u.preferencias.notificacoesEmail) continue
      if (preferencia && !u.preferencias[preferencia]) continue
      await this.d.notificacoes.salvar({ id: this.d.ids.novo(), usuarioId: u.id, criadaEm: agora, ...nova })
      criadas++
    }
    return criadas
  }
}

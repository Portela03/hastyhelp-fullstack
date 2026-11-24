export type TipoNotificacao = 'publicacao' | 'lembrete' | 'conclusao' | 'resposta-observacao' | 'convite-turma' | 'solicitacao-entrada' | 'entrada-resolvida'

export interface Notificacao {
  id: string
  usuarioId: string
  tipo: TipoNotificacao
  titulo: string
  mensagem: string
  link?: string
  criadaEm: Date
  lidaEm?: Date
}

export interface NotificacaoRepositorio {
  salvar(n: Notificacao): Promise<void>
  /** Mais recentes primeiro. */
  listarDoUsuario(usuarioId: string, limite: number): Promise<Notificacao[]>
  contarNaoLidas(usuarioId: string): Promise<number>
  /** `false` se a notificação não existe ou é de outro usuário. */
  marcarLida(id: string, usuarioId: string, quando: Date): Promise<boolean>
  marcarTodasLidas(usuarioId: string, quando: Date): Promise<void>
}

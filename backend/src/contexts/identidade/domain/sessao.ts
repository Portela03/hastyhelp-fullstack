export const VALIDADE_REFRESH_DIAS = 30
export const VALIDADE_REDEFINICAO_MINUTOS = 30

export interface Sessao {
  id: string
  usuarioId: string
  /** Hash do refresh token atual (o token em claro só existe com o cliente). */
  refreshHash: string
  expiraEm: Date
  revogadaEm?: Date
  criadaEm: Date
}

export interface SessaoRepositorio {
  salvar(sessao: Sessao): Promise<void>
  porId(id: string): Promise<Sessao | undefined>
  porRefreshHash(hash: string): Promise<Sessao | undefined>
  revogar(id: string, quando: Date): Promise<void>
  revogarDoUsuario(usuarioId: string, quando: Date): Promise<void>
}

export const sessaoAtiva = (s: Sessao, agora: Date) => !s.revogadaEm && s.expiraEm.getTime() > agora.getTime()

export interface Redefinicao {
  id: string
  usuarioId: string
  tokenHash: string
  expiraEm: Date
  usadaEm?: Date
  criadaEm: Date
}

export interface RedefinicaoRepositorio {
  salvar(r: Redefinicao): Promise<void>
  porTokenHash(hash: string): Promise<Redefinicao | undefined>
}

export interface MensagemSaida {
  id: string
  para: string
  assunto: string
  corpo: string
  link?: string
  criadaEm: Date
}

/** E-mails que o sistema "enviaria". Trocar a implementação por SMTP não muda o domínio. */
export interface CaixaDeSaida {
  registrar(mensagem: MensagemSaida): Promise<void>
  porDestinatario(para: string): Promise<MensagemSaida[]>
}

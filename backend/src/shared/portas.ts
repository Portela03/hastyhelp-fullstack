export interface Relogio {
  agora(): Date
}
export interface GeradorId {
  novo(): string
  /** Código curto e legível (convites). */
  codigo(): string
}
export const relogioSistema: Relogio = { agora: () => new Date() }

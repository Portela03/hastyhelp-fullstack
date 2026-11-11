import type { Papel } from '../../../shared/ator.ts'

export interface Hasher {
  gerar(senha: string): Promise<string>
  conferir(senha: string, hash: string): Promise<boolean>
}

export interface PayloadToken {
  sub: string
  papel: Papel
  /** Id da sessão: revogar a sessão invalida o access token na hora. */
  sid: string
}

export interface EmissorToken {
  emitir(payload: PayloadToken): string
  verificar(token: string): PayloadToken | null
}

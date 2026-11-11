import type { Papel } from '../../../shared/ator.ts'

export interface Hasher {
  gerar(senha: string): Promise<string>
  conferir(senha: string, hash: string): Promise<boolean>
}

export interface PayloadToken {
  sub: string
  papel: Papel
}

export interface EmissorToken {
  emitir(payload: PayloadToken): string
  verificar(token: string): PayloadToken | null
}

export interface Notificador {
  /** Avisa um aluno que há autoavaliação pendente (implementação real enviaria e-mail). */
  notificarPendente(destino: { alunoId: string; nome: string; email: string }, formulario: { id: string; titulo: string }): Promise<void>
}

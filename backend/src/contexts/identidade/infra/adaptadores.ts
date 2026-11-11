import { randomBytes, randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { GeradorId } from '../../../shared/portas.ts'
import type { EmissorToken, Hasher, Notificador, PayloadToken } from '../application/portas.ts'

export class HasherBcrypt implements Hasher {
  constructor(private readonly custo = 10) {}
  gerar(senha: string) {
    return bcrypt.hash(senha, this.custo)
  }
  conferir(senha: string, hash: string) {
    return bcrypt.compare(senha, hash)
  }
}

export class TokenJwt implements EmissorToken {
  constructor(
    private readonly segredo: string,
    private readonly validade: string | number = '8h',
  ) {}
  emitir(payload: PayloadToken) {
    return jwt.sign(payload, this.segredo, { expiresIn: this.validade as never })
  }
  verificar(token: string): PayloadToken | null {
    try {
      const d = jwt.verify(token, this.segredo)
      if (typeof d === 'string') return null
      const { sub, papel } = d as { sub?: unknown; papel?: unknown }
      return typeof sub === 'string' && (papel === 'professor' || papel === 'aluno') ? { sub, papel } : null
    } catch {
      return null
    }
  }
}

const ALFABETO = 'abcdefghjkmnpqrstuvwxyz23456789'

export class GeradorIdSistema implements GeradorId {
  novo() {
    return randomUUID()
  }
  codigo() {
    const bytes = randomBytes(8)
    return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join('')
  }
}

/** Implementação de desenvolvimento: registra no console em vez de enviar e-mail. */
export class NotificadorEmMemoria implements Notificador {
  readonly enviadas: Array<{ alunoId: string; nome: string; email: string; formularioId: string; titulo: string }> = []
  constructor(private readonly log = false) {}
  async notificarPendente(destino: { alunoId: string; nome: string; email: string }, formulario: { id: string; titulo: string }) {
    this.enviadas.push({ ...destino, formularioId: formulario.id, titulo: formulario.titulo })
    if (this.log) console.log(`[notificador] ${destino.email}: autoavaliação pendente "${formulario.titulo}"`)
  }
}

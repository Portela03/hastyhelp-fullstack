import { randomBytes, randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { GeradorId } from '../../../shared/portas.ts'
import type { EmissorToken, Hasher, PayloadToken } from '../application/portas.ts'

export class HasherBcrypt implements Hasher {
  constructor(private readonly custo = 10) {}
  gerar(senha: string) {
    return bcrypt.hash(senha, this.custo)
  }
  conferir(senha: string, hash: string) {
    return bcrypt.compare(senha, hash)
  }
}

/** Access token curto (R-70). A validade real da sessão é conferida no servidor via `sid`. */
export class TokenJwt implements EmissorToken {
  constructor(
    private readonly segredo: string,
    private readonly validade: string | number = '15m',
  ) {}
  emitir(payload: PayloadToken) {
    return jwt.sign(payload, this.segredo, { expiresIn: this.validade as never })
  }
  verificar(token: string): PayloadToken | null {
    try {
      const d = jwt.verify(token, this.segredo)
      if (typeof d === 'string') return null
      const { sub, papel, sid } = d as { sub?: unknown; papel?: unknown; sid?: unknown }
      return typeof sub === 'string' && typeof sid === 'string' && (papel === 'professor' || papel === 'aluno') ? { sub, papel, sid } : null
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

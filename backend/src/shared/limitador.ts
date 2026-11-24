import type { Relogio } from './portas.ts'

/**
 * Limite de taxa em memória por chave (janela deslizante): no máximo `maximo` tentativas
 * dentro de `janelaMs`. O contador vive na instância da API (R-116).
 */
export class LimitadorDeTaxa {
  private readonly tentativas = new Map<string, number[]>()

  constructor(
    private readonly relogio: Relogio,
    private readonly maximo: number,
    private readonly janelaMs: number,
  ) {}

  /** Registra a tentativa e devolve `true`; `false` (sem registrar) se o limite estourou. */
  tentar(chave: string): boolean {
    const agora = this.relogio.agora().getTime()
    const recentes = (this.tentativas.get(chave) ?? []).filter((t) => agora - t < this.janelaMs)
    if (recentes.length >= this.maximo) {
      this.tentativas.set(chave, recentes)
      return false
    }
    recentes.push(agora)
    this.tentativas.set(chave, recentes)
    return true
  }
}

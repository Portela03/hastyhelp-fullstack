import { ErroDeDominio } from '../../../shared/erros.ts'
import type { Ator } from '../../../shared/ator.ts'
import type { Relogio } from '../../../shared/portas.ts'
import { gerarTokenOpaco, hashDeToken } from '../../../shared/seguranca.ts'
import { VALIDADE_REFRESH_DIAS, sessaoAtiva } from '../domain/sessao.ts'
import type { SessaoRepositorio } from '../domain/sessao.ts'
import type { UsuarioRepositorio } from '../domain/usuario.ts'
import { usuarioDTO } from './dto.ts'
import type { EmissorToken } from './portas.ts'

const sessaoInvalida = () => new ErroDeDominio('SESSAO_INVALIDA', 'Sua sessão expirou. Entre novamente.', 401)

/** R-71: troca o refresh por um novo par (rotação). */
export class RenovarSessao {
  constructor(private readonly d: { usuarios: UsuarioRepositorio; sessoes: SessaoRepositorio; tokens: EmissorToken; relogio: Relogio }) {}

  async executar(e: { refreshToken: string }) {
    const agora = this.d.relogio.agora()
    const sessao = await this.d.sessoes.porRefreshHash(hashDeToken(e.refreshToken))
    if (!sessao || !sessaoAtiva(sessao, agora)) throw sessaoInvalida()
    const usuario = await this.d.usuarios.porId(sessao.usuarioId)
    if (!usuario) throw sessaoInvalida()

    const refreshToken = gerarTokenOpaco()
    await this.d.sessoes.salvar({ ...sessao, refreshHash: hashDeToken(refreshToken), expiraEm: new Date(agora.getTime() + VALIDADE_REFRESH_DIAS * 86_400_000) })
    return {
      token: this.d.tokens.emitir({ sub: usuario.id, papel: usuario.papel, sid: sessao.id }),
      refreshToken,
      usuario: usuarioDTO(usuario),
    }
  }
}

/** R-72: revoga a sessão (idempotente: refresh desconhecido não é erro). */
export class EncerrarSessao {
  constructor(private readonly d: { sessoes: SessaoRepositorio; relogio: Relogio }) {}

  async executar(e: { refreshToken: string }): Promise<void> {
    const sessao = await this.d.sessoes.porRefreshHash(hashDeToken(e.refreshToken))
    if (sessao) await this.d.sessoes.revogar(sessao.id, this.d.relogio.agora())
  }
}

/** Usado em toda requisição autenticada: token íntegro + sessão ainda ativa. */
export class ValidarSessao {
  constructor(private readonly d: { sessoes: SessaoRepositorio; tokens: EmissorToken; relogio: Relogio }) {}

  async executar(token: string): Promise<Ator | null> {
    const payload = this.d.tokens.verificar(token)
    if (!payload) return null
    const sessao = await this.d.sessoes.porId(payload.sid)
    if (!sessao || sessao.usuarioId !== payload.sub || !sessaoAtiva(sessao, this.d.relogio.agora())) return null
    return { id: payload.sub, papel: payload.papel }
  }
}

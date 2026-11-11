import { ErroDeDominio } from '../../../shared/erros.ts'
import type { Papel } from '../../../shared/ator.ts'
import type { GeradorId, Relogio } from '../../../shared/portas.ts'
import { gerarTokenOpaco, hashDeToken } from '../../../shared/seguranca.ts'
import { VALIDADE_REFRESH_DIAS } from '../domain/sessao.ts'
import type { SessaoRepositorio } from '../domain/sessao.ts'
import type { UsuarioRepositorio } from '../domain/usuario.ts'
import { usuarioDTO } from './dto.ts'
import type { EmissorToken, Hasher } from './portas.ts'

const credenciaisInvalidas = () => new ErroDeDominio('CREDENCIAIS_INVALIDAS', 'E-mail ou senha incorretos.', 401)

export class AutenticarUsuario {
  constructor(private readonly d: { usuarios: UsuarioRepositorio; sessoes: SessaoRepositorio; hasher: Hasher; tokens: EmissorToken; ids: GeradorId; relogio: Relogio }) {}

  /** R-05/R-70: cria a sessão e devolve access + refresh token. */
  async executar(e: { email: string; senha: string; papel?: Papel }) {
    const usuario = await this.d.usuarios.porEmail(e.email.trim().toLowerCase())
    if (!usuario) throw credenciaisInvalidas()
    if (!(await this.d.hasher.conferir(e.senha, usuario.senhaHash))) throw credenciaisInvalidas()
    if (e.papel && e.papel !== usuario.papel) throw credenciaisInvalidas()

    const agora = this.d.relogio.agora()
    const refreshToken = gerarTokenOpaco()
    const sessao = {
      id: this.d.ids.novo(),
      usuarioId: usuario.id,
      refreshHash: hashDeToken(refreshToken),
      expiraEm: new Date(agora.getTime() + VALIDADE_REFRESH_DIAS * 86_400_000),
      criadaEm: agora,
    }
    await this.d.sessoes.salvar(sessao)
    return {
      token: this.d.tokens.emitir({ sub: usuario.id, papel: usuario.papel, sid: sessao.id }),
      refreshToken,
      usuario: usuarioDTO(usuario),
    }
  }
}

import { ErroDeDominio } from '../../../shared/erros.ts'
import type { Papel } from '../../../shared/ator.ts'
import type { UsuarioRepositorio } from '../domain/usuario.ts'
import { usuarioDTO } from './dto.ts'
import type { EmissorToken, Hasher } from './portas.ts'

const credenciaisInvalidas = () => new ErroDeDominio('CREDENCIAIS_INVALIDAS', 'E-mail ou senha incorretos.', 401)

export class AutenticarUsuario {
  constructor(private readonly d: { usuarios: UsuarioRepositorio; hasher: Hasher; tokens: EmissorToken }) {}

  async executar(e: { email: string; senha: string; papel?: Papel }) {
    const usuario = await this.d.usuarios.porEmail(e.email.trim().toLowerCase())
    if (!usuario) throw credenciaisInvalidas()
    if (!(await this.d.hasher.conferir(e.senha, usuario.senhaHash))) throw credenciaisInvalidas()
    if (e.papel && e.papel !== usuario.papel) throw credenciaisInvalidas()
    return { token: this.d.tokens.emitir({ sub: usuario.id, papel: usuario.papel }), usuario: usuarioDTO(usuario) }
  }
}

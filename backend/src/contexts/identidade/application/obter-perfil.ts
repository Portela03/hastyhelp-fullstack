import { naoEncontrado } from '../../../shared/erros.ts'
import type { UsuarioRepositorio } from '../domain/usuario.ts'
import { usuarioDTO } from './dto.ts'

export class ObterPerfil {
  constructor(private readonly d: { usuarios: UsuarioRepositorio }) {}

  async executar(usuarioId: string) {
    const u = await this.d.usuarios.porId(usuarioId)
    if (!u) throw naoEncontrado('USUARIO_NAO_ENCONTRADO', 'Usuário não encontrado.')
    return usuarioDTO(u)
  }
}

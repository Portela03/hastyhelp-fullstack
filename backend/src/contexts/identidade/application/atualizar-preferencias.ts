import { naoEncontrado } from '../../../shared/erros.ts'
import { mesclarPreferencias } from '../domain/usuario.ts'
import type { Preferencias, UsuarioRepositorio } from '../domain/usuario.ts'
import { usuarioDTO } from './dto.ts'

export class AtualizarPreferencias {
  constructor(private readonly d: { usuarios: UsuarioRepositorio }) {}

  async executar(usuarioId: string, parcial: Partial<Preferencias>) {
    const u = await this.d.usuarios.porId(usuarioId)
    if (!u) throw naoEncontrado('USUARIO_NAO_ENCONTRADO', 'Usuário não encontrado.')
    const atualizado = { ...u, preferencias: mesclarPreferencias(u.preferencias, parcial) }
    await this.d.usuarios.salvar(atualizado)
    return usuarioDTO(atualizado)
  }
}

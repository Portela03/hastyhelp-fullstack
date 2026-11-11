import type { Usuario } from '../domain/usuario.ts'

export function usuarioDTO(u: Usuario) {
  return { id: u.id, nome: u.nome, email: u.email, papel: u.papel, preferencias: u.preferencias }
}
export type UsuarioDTO = ReturnType<typeof usuarioDTO>

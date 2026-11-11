import type { FormularioRepositorio } from '../contexts/autoavaliacoes/domain/repositorio.ts'
import type { EmissorToken, Hasher, Notificador } from '../contexts/identidade/application/portas.ts'
import type { UsuarioRepositorio } from '../contexts/identidade/domain/usuario.ts'
import type { EnvioRepositorio } from '../contexts/respostas/domain/repositorio.ts'
import type { TurmaRepositorio } from '../contexts/turmas/domain/repositorio.ts'
import type { GeradorId, Relogio } from '../shared/portas.ts'

/** Tudo que o núcleo precisa do mundo externo. Memória (testes) ou Postgres (produção). */
export interface Infra {
  usuarios: UsuarioRepositorio
  turmas: TurmaRepositorio
  formularios: FormularioRepositorio
  envios: EnvioRepositorio
  hasher: Hasher
  tokens: EmissorToken
  notificador: Notificador
  relogio: Relogio
  ids: GeradorId
}

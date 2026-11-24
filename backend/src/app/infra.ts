import type { FormularioRepositorio } from '../contexts/autoavaliacoes/domain/repositorio.ts'
import type { EmissorToken, Hasher } from '../contexts/identidade/application/portas.ts'
import type { CaixaDeSaida, RedefinicaoRepositorio, SessaoRepositorio } from '../contexts/identidade/domain/sessao.ts'
import type { UsuarioRepositorio } from '../contexts/identidade/domain/usuario.ts'
import type { NotificacaoRepositorio } from '../contexts/notificacoes/domain/notificacao.ts'
import type { EnvioRepositorio } from '../contexts/respostas/domain/repositorio.ts'
import type { EntradaRepositorio } from '../contexts/turmas/domain/entrada.ts'
import type { TurmaRepositorio } from '../contexts/turmas/domain/repositorio.ts'
import type { GeradorId, Relogio } from '../shared/portas.ts'

/** Tudo que o núcleo precisa do mundo externo. Memória (testes) ou Postgres (produção). */
export interface Infra {
  usuarios: UsuarioRepositorio
  turmas: TurmaRepositorio
  entradas: EntradaRepositorio
  formularios: FormularioRepositorio
  envios: EnvioRepositorio
  sessoes: SessaoRepositorio
  redefinicoes: RedefinicaoRepositorio
  notificacoes: NotificacaoRepositorio
  caixaDeSaida: CaixaDeSaida
  hasher: Hasher
  tokens: EmissorToken
  relogio: Relogio
  ids: GeradorId
  /** Endereço público do front, usado nos links enviados (ex.: redefinição de senha). */
  urlApp: string
}

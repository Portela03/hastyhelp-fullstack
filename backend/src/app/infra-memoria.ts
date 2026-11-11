import { FormularioRepositorioMemoria } from '../contexts/autoavaliacoes/infra/formulario-repositorio-memoria.ts'
import { GeradorIdSistema, HasherBcrypt, NotificadorEmMemoria, TokenJwt } from '../contexts/identidade/infra/adaptadores.ts'
import { UsuarioRepositorioMemoria } from '../contexts/identidade/infra/usuario-repositorio-memoria.ts'
import { EnvioRepositorioMemoria } from '../contexts/respostas/infra/envio-repositorio-memoria.ts'
import { TurmaRepositorioMemoria } from '../contexts/turmas/infra/turma-repositorio-memoria.ts'
import { relogioSistema } from '../shared/portas.ts'
import type { Relogio } from '../shared/portas.ts'
import type { Infra } from './infra.ts'

export interface InfraMemoria extends Infra {
  notificador: NotificadorEmMemoria
}

export function criarInfraMemoria(opcoes: { relogio?: Relogio; segredo?: string } = {}): InfraMemoria {
  return {
    usuarios: new UsuarioRepositorioMemoria(),
    turmas: new TurmaRepositorioMemoria(),
    formularios: new FormularioRepositorioMemoria(),
    envios: new EnvioRepositorioMemoria(),
    hasher: new HasherBcrypt(4), // custo baixo: testes rápidos
    tokens: new TokenJwt(opcoes.segredo ?? 'segredo-de-teste'),
    notificador: new NotificadorEmMemoria(),
    relogio: opcoes.relogio ?? relogioSistema,
    ids: new GeradorIdSistema(),
  }
}

import type pg from 'pg'
import { FormularioRepositorioPg } from '../contexts/autoavaliacoes/infra/formulario-repositorio-pg.ts'
import { GeradorIdSistema, HasherBcrypt, NotificadorEmMemoria, TokenJwt } from '../contexts/identidade/infra/adaptadores.ts'
import { UsuarioRepositorioPg } from '../contexts/identidade/infra/usuario-repositorio-pg.ts'
import { EnvioRepositorioPg } from '../contexts/respostas/infra/envio-repositorio-pg.ts'
import { TurmaRepositorioPg } from '../contexts/turmas/infra/turma-repositorio-pg.ts'
import { relogioSistema } from '../shared/portas.ts'
import type { Relogio } from '../shared/portas.ts'
import type { Infra } from './infra.ts'

export function criarInfraPostgres(pool: pg.Pool, opcoes: { segredo: string; relogio?: Relogio; logNotificacoes?: boolean }): Infra {
  return {
    usuarios: new UsuarioRepositorioPg(pool),
    turmas: new TurmaRepositorioPg(pool),
    formularios: new FormularioRepositorioPg(pool),
    envios: new EnvioRepositorioPg(pool),
    hasher: new HasherBcrypt(10),
    tokens: new TokenJwt(opcoes.segredo),
    notificador: new NotificadorEmMemoria(opcoes.logNotificacoes ?? true),
    relogio: opcoes.relogio ?? relogioSistema,
    ids: new GeradorIdSistema(),
  }
}

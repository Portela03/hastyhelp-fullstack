import type pg from 'pg'
import { FormularioRepositorioPg } from '../contexts/autoavaliacoes/infra/formulario-repositorio-pg.ts'
import { GeradorIdSistema, HasherBcrypt, TokenJwt } from '../contexts/identidade/infra/adaptadores.ts'
import { CaixaDeSaidaPg, RedefinicaoRepositorioPg, SessaoRepositorioPg } from '../contexts/identidade/infra/sessao-repositorios-pg.ts'
import { UsuarioRepositorioPg } from '../contexts/identidade/infra/usuario-repositorio-pg.ts'
import { NotificacaoRepositorioPg } from '../contexts/notificacoes/infra/notificacao-repositorio-pg.ts'
import { EnvioRepositorioPg } from '../contexts/respostas/infra/envio-repositorio-pg.ts'
import { TurmaRepositorioPg } from '../contexts/turmas/infra/turma-repositorio-pg.ts'
import { relogioSistema } from '../shared/portas.ts'
import type { Relogio } from '../shared/portas.ts'
import type { Infra } from './infra.ts'

export function criarInfraPostgres(
  pool: pg.Pool,
  opcoes: { segredo: string; relogio?: Relogio; logCaixaDeSaida?: boolean; urlApp?: string; validadeAccessToken?: string },
): Infra {
  return {
    usuarios: new UsuarioRepositorioPg(pool),
    turmas: new TurmaRepositorioPg(pool),
    formularios: new FormularioRepositorioPg(pool),
    envios: new EnvioRepositorioPg(pool),
    sessoes: new SessaoRepositorioPg(pool),
    redefinicoes: new RedefinicaoRepositorioPg(pool),
    notificacoes: new NotificacaoRepositorioPg(pool),
    caixaDeSaida: new CaixaDeSaidaPg(pool, opcoes.logCaixaDeSaida ?? true),
    hasher: new HasherBcrypt(10),
    tokens: new TokenJwt(opcoes.segredo, opcoes.validadeAccessToken ?? '15m'),
    relogio: opcoes.relogio ?? relogioSistema,
    ids: new GeradorIdSistema(),
    urlApp: opcoes.urlApp ?? 'http://localhost:5173',
  }
}

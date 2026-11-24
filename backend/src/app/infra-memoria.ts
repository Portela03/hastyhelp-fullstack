import { FormularioRepositorioMemoria } from '../contexts/autoavaliacoes/infra/formulario-repositorio-memoria.ts'
import { GeradorIdSistema, HasherBcrypt, TokenJwt } from '../contexts/identidade/infra/adaptadores.ts'
import { CaixaDeSaidaMemoria, RedefinicaoRepositorioMemoria, SessaoRepositorioMemoria } from '../contexts/identidade/infra/sessao-repositorios-memoria.ts'
import { UsuarioRepositorioMemoria } from '../contexts/identidade/infra/usuario-repositorio-memoria.ts'
import { NotificacaoRepositorioMemoria } from '../contexts/notificacoes/infra/notificacao-repositorio-memoria.ts'
import { EnvioRepositorioMemoria } from '../contexts/respostas/infra/envio-repositorio-memoria.ts'
import { EntradaRepositorioMemoria } from '../contexts/turmas/infra/entrada-repositorio-memoria.ts'
import { TurmaRepositorioMemoria } from '../contexts/turmas/infra/turma-repositorio-memoria.ts'
import { relogioSistema } from '../shared/portas.ts'
import type { Relogio } from '../shared/portas.ts'
import type { Infra } from './infra.ts'

export interface InfraMemoria extends Infra {
  caixaDeSaida: CaixaDeSaidaMemoria
}

export function criarInfraMemoria(opcoes: { relogio?: Relogio; segredo?: string; urlApp?: string } = {}): InfraMemoria {
  return {
    usuarios: new UsuarioRepositorioMemoria(),
    turmas: new TurmaRepositorioMemoria(),
    entradas: new EntradaRepositorioMemoria(),
    formularios: new FormularioRepositorioMemoria(),
    envios: new EnvioRepositorioMemoria(),
    sessoes: new SessaoRepositorioMemoria(),
    redefinicoes: new RedefinicaoRepositorioMemoria(),
    notificacoes: new NotificacaoRepositorioMemoria(),
    caixaDeSaida: new CaixaDeSaidaMemoria(),
    hasher: new HasherBcrypt(4), // custo baixo: testes rápidos
    tokens: new TokenJwt(opcoes.segredo ?? 'segredo-de-teste'),
    relogio: opcoes.relogio ?? relogioSistema,
    ids: new GeradorIdSistema(),
    urlApp: opcoes.urlApp ?? 'http://localhost:5173',
  }
}

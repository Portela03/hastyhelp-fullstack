import { ErroDeDominio } from '../../../shared/erros.ts'
import { criarPeriodoLetivo } from './periodo-letivo.ts'
import type { PeriodoLetivo } from './periodo-letivo.ts'
import { gerarSigla, normalizarSigla } from './sigla.ts'

export const COR_PADRAO = '#62B7D7'

export interface Turma {
  id: string
  nome: string
  sigla: string
  cor: string
  periodo: PeriodoLetivo
  docenteId: string
  oculta: boolean
  /** `true`: quem entra pelo código/link fica pendente até o docente aceitar (R-102/R-103). */
  aprovacaoManual: boolean
  codigoConvite: string
  criadaEm: Date
}

export interface NovaTurma {
  id: string
  nome: string
  periodo: string
  docenteId: string
  codigoConvite: string
  criadaEm: Date
  sigla?: string
  cor?: string
}

function validarNome(nome: string): string {
  const limpo = nome.trim()
  if (!limpo) throw new ErroDeDominio('NOME_OBRIGATORIO', 'Informe o nome da turma.', 400)
  return limpo
}

function validarCor(cor: string): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(cor)) throw new ErroDeDominio('COR_INVALIDA', 'A cor deve estar no formato #RRGGBB.', 400)
  return cor
}

export function criarTurma(dados: NovaTurma): Turma {
  const nome = validarNome(dados.nome)
  return {
    id: dados.id,
    nome,
    sigla: normalizarSigla(dados.sigla ?? '') || gerarSigla(nome),
    cor: validarCor(dados.cor ?? COR_PADRAO),
    periodo: criarPeriodoLetivo(dados.periodo),
    docenteId: dados.docenteId,
    oculta: false,
    aprovacaoManual: false,
    codigoConvite: dados.codigoConvite,
    criadaEm: dados.criadaEm,
  }
}

export interface EdicaoTurma {
  nome?: string
  sigla?: string
  cor?: string
  periodo?: string
  oculta?: boolean
  aprovacaoManual?: boolean
}

export function editarTurma(turma: Turma, mudancas: EdicaoTurma): Turma {
  return {
    ...turma,
    nome: mudancas.nome !== undefined ? validarNome(mudancas.nome) : turma.nome,
    sigla: mudancas.sigla !== undefined ? normalizarSigla(mudancas.sigla) || turma.sigla : turma.sigla,
    cor: mudancas.cor !== undefined ? validarCor(mudancas.cor) : turma.cor,
    periodo: mudancas.periodo !== undefined ? criarPeriodoLetivo(mudancas.periodo) : turma.periodo,
    oculta: mudancas.oculta ?? turma.oculta,
    aprovacaoManual: mudancas.aprovacaoManual ?? turma.aprovacaoManual,
  }
}

import { ErroDeDominio } from '../../../shared/erros.ts'
import type { Papel } from '../../../shared/ator.ts'

export type Tema = 'claro' | 'escuro' | 'alto-contraste'

export interface Preferencias {
  notificacoesEmail: boolean
  conclusaoFormularios: boolean
  publicacaoFormularios: boolean
  metricasTrimestrais: boolean
  metricasSemestrais: boolean
  acessibilidade: boolean
  tema: Tema
}

export const PREFERENCIAS_PADRAO: Preferencias = {
  notificacoesEmail: true,
  conclusaoFormularios: true,
  publicacaoFormularios: true,
  metricasTrimestrais: true,
  metricasSemestrais: true,
  acessibilidade: true,
  tema: 'claro',
}

const TEMAS: Tema[] = ['claro', 'escuro', 'alto-contraste']
const CAMPOS_BOOLEANOS = ['notificacoesEmail', 'conclusaoFormularios', 'publicacaoFormularios', 'metricasTrimestrais', 'metricasSemestrais', 'acessibilidade'] as const

export interface Usuario {
  id: string
  nome: string
  email: string
  senhaHash: string
  papel: Papel
  preferencias: Preferencias
  criadoEm: Date
}

export interface UsuarioRepositorio {
  salvar(usuario: Usuario): Promise<void>
  porId(id: string): Promise<Usuario | undefined>
  porEmail(email: string): Promise<Usuario | undefined>
  porIds(ids: string[]): Promise<Usuario[]>
  /** Alunos cujo nome ou e-mail contém `termo` (já normalizado: minúsculas, sem acentos), ordenados por nome. */
  buscarAlunos(termo: string, excluirIds: string[], limite: number): Promise<Usuario[]>
}

/** Mescla parcialmente as preferências, validando tipos e tema (R-06). */
export function mesclarPreferencias(atual: Preferencias, parcial: Partial<Preferencias>): Preferencias {
  const novo = { ...atual }
  for (const campo of CAMPOS_BOOLEANOS) {
    const v = parcial[campo]
    if (v === undefined) continue
    if (typeof v !== 'boolean') throw new ErroDeDominio('PREFERENCIA_INVALIDA', `Valor inválido para "${campo}".`, 400)
    novo[campo] = v
  }
  if (parcial.tema !== undefined) {
    if (!TEMAS.includes(parcial.tema)) throw new ErroDeDominio('PREFERENCIA_INVALIDA', 'Tema inválido.', 400)
    novo.tema = parcial.tema
  }
  return novo
}

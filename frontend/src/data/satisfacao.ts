import type { Papel } from './aluno'

export type GatilhoPesquisa = 'pos-envio' | 'trimestral' | 'continua'

export interface PesquisaSatisfacao {
  id: string
  perfil: Papel
  data: string // ISO
  csat: number // 1 a 5
  nps: number // 0 a 10
  comentario?: string
  gatilho: GatilhoPesquisa
}

export interface NovaPesquisaInput {
  perfil: Papel
  csat: number
  nps: number
  comentario?: string
  gatilho: GatilhoPesquisa
}

export type ClassificacaoNps = 'promotor' | 'neutro' | 'detrator'

export function classificarNps(nps: number): ClassificacaoNps {
  if (nps >= 9) return 'promotor'
  if (nps >= 7) return 'neutro'
  return 'detrator'
}

export function interpretarNps(npsScore: number): string {
  if (npsScore < 0) return 'Crítico'
  if (npsScore < 50) return 'Razoável'
  if (npsScore < 75) return 'Muito bom'
  return 'Excelente'
}

export interface ResumoSatisfacao {
  total: number
  csatMedio: number
  percentualSatisfeitos: number
  npsScore: number
  percentualPromotores: number
  percentualNeutros: number
  percentualDetratores: number
}

export function calcularResumoSatisfacao(pesquisas: PesquisaSatisfacao[]): ResumoSatisfacao {
  if (pesquisas.length === 0) {
    return {
      total: 0,
      csatMedio: 0,
      percentualSatisfeitos: 0,
      npsScore: 0,
      percentualPromotores: 0,
      percentualNeutros: 0,
      percentualDetratores: 0,
    }
  }

  const total = pesquisas.length
  const somaCsat = pesquisas.reduce((acc, p) => acc + p.csat, 0)
  const satisfeitos = pesquisas.filter((p) => p.csat >= 4).length

  let promotores = 0
  let neutros = 0
  let detratores = 0

  for (const p of pesquisas) {
    const c = classificarNps(p.nps)
    if (c === 'promotor') promotores++
    else if (c === 'neutro') neutros++
    else detratores++
  }

  const percentualPromotores = Math.round((promotores / total) * 100)
  const percentualNeutros = Math.round((neutros / total) * 100)
  const percentualDetratores = Math.round((detratores / total) * 100)

  // NPS = % promotores - % detratores (-100 a +100)
  const npsScore = percentualPromotores - percentualDetratores

  return {
    total,
    csatMedio: Math.round((somaCsat / total) * 10) / 10,
    percentualSatisfeitos: Math.round((satisfeitos / total) * 100),
    npsScore,
    percentualPromotores,
    percentualNeutros,
    percentualDetratores,
  }
}

export function validarPesquisa(input: NovaPesquisaInput): { valido: boolean; erro?: string } {
  if (input.csat < 1 || input.csat > 5 || !Number.isInteger(input.csat)) {
    return { valido: false, erro: 'Avaliação de satisfação (CSAT) inválida. Escolha uma nota de 1 a 5.' }
  }
  if (input.nps < 0 || input.nps > 10 || !Number.isInteger(input.nps)) {
    return { valido: false, erro: 'Nota de recomendação (NPS) inválida. Escolha uma nota de 0 a 10.' }
  }
  if (input.comentario && input.comentario.trim().length > 500) {
    return { valido: false, erro: 'O comentário deve conter no máximo 500 caracteres.' }
  }
  return { valido: true }
}

export function formatarDataPesquisa(iso: string): string {
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    const dia = String(d.getDate()).padStart(2, '0')
    const mes = String(d.getMonth() + 1).padStart(2, '0')
    const ano = String(d.getFullYear()).slice(-2)
    return `${dia}/${mes}/${ano}`
  } catch {
    return iso
  }
}

/** Verifica se a pesquisa trimestral está pendente (nunca respondeu ou passaram 90 dias desde a última resposta deste perfil). */
export function isPesquisaTrimestralPendente(pesquisasDoPerfil: PesquisaSatisfacao[], agora: Date = new Date()): boolean {
  if (pesquisasDoPerfil.length === 0) return true
  const datas = pesquisasDoPerfil
    .map((p) => new Date(p.data).getTime())
    .filter((t) => !isNaN(t))
  if (datas.length === 0) return true
  const maisRecente = Math.max(...datas)
  const diasPassados = (agora.getTime() - maisRecente) / (1000 * 60 * 60 * 24)
  return diasPassados >= 90
}

/** Restaura as respostas salvas no navegador; sem nada salvo (ou conteúdo inválido) começa vazio. */
export function restaurarPesquisas(bruto: string | null): PesquisaSatisfacao[] {
  if (!bruto) return []
  try {
    const dados: unknown = JSON.parse(bruto)
    return Array.isArray(dados) ? (dados as PesquisaSatisfacao[]) : []
  } catch {
    return []
  }
}

import { ErroDeDominio } from '../../../shared/erros.ts'

export type PeriodoLetivo = string & { readonly __marca: 'PeriodoLetivo' }

export function criarPeriodoLetivo(bruto: string): PeriodoLetivo {
  const m = /^(\d{4})\/(\d{2})$/.exec(bruto.trim())
  const semestre = m ? Number(m[2]) : 0
  if (!m || semestre < 1 || semestre > 12) {
    throw new ErroDeDominio('PERIODO_INVALIDO', 'Informe o período letivo no formato AAAA/NN (ex.: 2026/02).', 400)
  }
  return `${m[1]}/${m[2]}` as PeriodoLetivo
}

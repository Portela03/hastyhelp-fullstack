const CONECTIVOS = new Set(['de', 'da', 'do', 'das', 'dos', 'para', 'e', 'a', 'o', 'em', 'com'])

const semAcento = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Iniciais das palavras relevantes do nome, em maiúsculas, no máximo 3 letras. */
export function gerarSigla(nome: string): string {
  return semAcento(nome)
    .split(/\s+/)
    .filter((p) => p && !CONECTIVOS.has(p.toLowerCase()))
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 3)
}

export function normalizarSigla(sigla: string): string {
  return semAcento(sigla).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3)
}

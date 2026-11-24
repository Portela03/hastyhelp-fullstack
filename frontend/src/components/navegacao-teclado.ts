/**
 * Navegação por setas para grupos com *roving tabindex* (abas e radiogroup, WAI-ARIA).
 * Devolve o índice que deve receber o foco ou `null` se a tecla não se aplica.
 */
export function proximoIndice(tecla: string, atual: number, habilitados: boolean[], eixos: 'horizontal' | 'ambos'): number | null {
  const total = habilitados.length
  if (!habilitados.some(Boolean)) return null
  const avanca = tecla === 'ArrowRight' || (eixos === 'ambos' && tecla === 'ArrowDown')
  const recua = tecla === 'ArrowLeft' || (eixos === 'ambos' && tecla === 'ArrowUp')

  if (tecla === 'Home') return habilitados.findIndex(Boolean)
  if (tecla === 'End') return habilitados.lastIndexOf(true)
  if (!avanca && !recua) return null

  const passo = avanca ? 1 : -1
  let i = atual
  for (let n = 0; n < total; n++) {
    i = (((i + passo) % total) + total) % total
    if (habilitados[i]) return i
  }
  return null
}

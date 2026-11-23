import { ErroDeDominio } from '../../../shared/erros.ts'
import type { NivelDeCompreensao } from '../../respostas/domain/nota.ts'

export type TipoPergunta = 'unica' | 'multipla'

export interface Pergunta {
  id: string
  enunciado: string
  tipo: TipoPergunta
  opcoes: string[]
  /** Índices das opções corretas; opcional (autoavaliação sem gabarito não gera nota). */
  gabarito?: number[]
  /** Categoria IPC associada a cada opção fixa de dificuldade; null significa sem categoria. */
  categoriasOpcao?: Array<NivelDeCompreensao | null>
}

export function validarPergunta(p: Pergunta): Pergunta {
  const enunciado = p.enunciado.trim()
  if (!enunciado) throw new ErroDeDominio('PERGUNTA_INVALIDA', 'Toda pergunta precisa de enunciado.', 422)
  const opcoes = p.opcoes.map((o) => o.trim())
  if (opcoes.length < 2 || opcoes.some((o) => !o)) {
    throw new ErroDeDominio('PERGUNTA_INVALIDA', 'Cada pergunta precisa de pelo menos 2 opções preenchidas.', 422)
  }
  const gabarito = p.gabarito
  if (gabarito) {
    const validos = gabarito.every((i) => Number.isInteger(i) && i >= 0 && i < opcoes.length)
    const unicos = new Set(gabarito).size === gabarito.length
    if (!validos || !unicos || (p.tipo === 'unica' && gabarito.length > 1)) {
      throw new ErroDeDominio('PERGUNTA_INVALIDA', 'Gabarito inválido para a pergunta.', 422)
    }
  }
  if (p.categoriasOpcao && (p.categoriasOpcao.length !== opcoes.length || p.categoriasOpcao.some((categoria) => categoria !== null && !['I', 'P', 'C'].includes(categoria)))) {
    throw new ErroDeDominio('PERGUNTA_INVALIDA', 'Categorias IPC inválidas para as opções.', 422)
  }
  return { id: p.id, enunciado, tipo: p.tipo, opcoes, ...(gabarito?.length ? { gabarito: [...gabarito].sort((a, b) => a - b) } : {}), ...(p.categoriasOpcao ? { categoriasOpcao: [...p.categoriasOpcao] } : {}) }
}

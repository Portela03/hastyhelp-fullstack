import type { Formulario } from '../domain/formulario.ts'
import type { Pergunta, TipoPergunta } from '../domain/pergunta.ts'

export interface PerguntaEntrada {
  id?: string
  enunciado: string
  tipo: TipoPergunta
  opcoes: string[]
  gabarito?: number[]
  categoriasOpcao?: Array<'I' | 'P' | 'C' | null>
}

export function perguntaDTO(p: Pergunta) {
  const gabarito = p.gabarito ?? []
  return { id: p.id, enunciado: p.enunciado, tipo: p.tipo, opcoes: p.opcoes, gabarito, marcadas: gabarito, ...(p.categoriasOpcao ? { categoriasOpcao: p.categoriasOpcao } : {}) }
}

export function formularioDTO(f: Formulario) {
  return {
    id: f.id,
    titulo: f.titulo,
    turmaId: f.turmaId,
    status: f.status,
    publicarEm: f.publicarEm?.toISOString() ?? null,
    publicadoEm: f.publicadoEm?.toISOString() ?? null,
    prazo: f.prazo?.toISOString() ?? null,
    mostrarGabarito: f.mostrarGabarito,
    criadoEm: f.criadoEm.toISOString(),
    perguntas: f.perguntas.map(perguntaDTO),
  }
}
export type FormularioDTO = ReturnType<typeof formularioDTO>

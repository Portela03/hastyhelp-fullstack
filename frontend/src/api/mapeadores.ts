/** Converte os DTOs da API para os tipos usados pelas telas. */
import type { AutoavaliacaoAluno, StatusAluno } from '../data/aluno'
import type { Dificuldade, Equipe, Formulario, Pergunta, StatusFormulario } from '../data/tipos'

export function formatarData(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function descreverUltimoFormulario(iso: string | null | undefined): string {
  if (!iso) return 'Nenhum formulário ainda'
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (dias <= 0) return 'Último formulário hoje'
  return `Último formulário a ${dias} ${dias === 1 ? 'dia' : 'dias'}`
}

/* ---- DTOs (forma devolvida pela API) ---- */

export interface PerguntaDTO {
  id: string
  enunciado: string
  tipo: 'unica' | 'multipla'
  opcoes: string[]
  gabarito?: number[]
  marcadas?: number[]
}

export interface TurmaDTO {
  id: string
  nome: string
  sigla: string
  cor: string
  periodo: string
  docente: string
  oculta: boolean
  codigoConvite?: string
  totalAlunos?: number
  taxaResposta?: number
  dominioMedio?: number | null
  engajamento?: number
  ultimoFormularioEm?: string | null
}

export interface FormularioDTO {
  id: string
  titulo: string
  turmaId: string
  status: StatusFormulario
  publicarEm: string | null
  publicadoEm: string | null
  prazo: string | null
  mostrarGabarito: boolean
  criadoEm: string
  perguntas: PerguntaDTO[]
  respostas?: number
  total?: number
  dominioMedio?: number | null
  maiorDificuldade?: Dificuldade | null
}

export interface AutoavaliacaoDTO {
  id: string
  titulo: string
  turmaId: string
  status: StatusAluno
  prazo?: string
  enviadoEm?: string
  nota?: number
  compreensao?: Dificuldade
  mostrarGabarito: boolean
  observacao?: string
  respostaProfessor?: string
  perguntas: PerguntaDTO[]
  respostas: Record<string, number[]>
}

/* ---- Mapeamento ---- */

export const paraPergunta = (p: PerguntaDTO): Pergunta => ({
  id: p.id,
  enunciado: p.enunciado,
  tipo: p.tipo,
  opcoes: p.opcoes,
  marcadas: p.marcadas ?? [],
  ...(p.gabarito?.length ? { gabarito: p.gabarito } : {}),
})

export const paraEquipe = (t: TurmaDTO): Equipe => ({
  id: t.id,
  nome: t.nome,
  sigla: t.sigla,
  cor: t.cor,
  periodo: t.periodo,
  docente: t.docente,
  totalAlunos: t.totalAlunos ?? 0,
  ultimoFormulario: descreverUltimoFormulario(t.ultimoFormularioEm),
  taxaResposta: t.taxaResposta ?? 0,
  dominioMedio: t.dominioMedio ?? 0,
  engajamento: t.engajamento ?? 0,
  oculta: t.oculta,
  ...(t.codigoConvite ? { codigoConvite: t.codigoConvite } : {}),
})

export const paraFormulario = (f: FormularioDTO, equipes: Equipe[]): Formulario => ({
  id: f.id,
  titulo: f.titulo,
  equipeId: f.turmaId,
  periodo: equipes.find((e) => e.id === f.turmaId)?.periodo ?? '',
  status: f.status,
  respostas: f.respostas ?? 0,
  total: f.total ?? 0,
  data: formatarData(f.criadoEm),
  publicadoEm: formatarData(f.publicadoEm ?? f.criadoEm),
  mostrarGabarito: f.mostrarGabarito,
  ...(f.prazo ? { prazo: formatarData(f.prazo) } : {}),
  perguntas: f.perguntas.map(paraPergunta),
  ...(f.dominioMedio != null ? { dominioMedio: f.dominioMedio } : {}),
  ...(f.maiorDificuldade ? { maiorDificuldade: f.maiorDificuldade } : {}),
})

export const paraAutoavaliacao = (a: AutoavaliacaoDTO): AutoavaliacaoAluno => ({
  id: a.id,
  titulo: a.titulo,
  turmaId: a.turmaId,
  status: a.status,
  mostrarGabarito: a.mostrarGabarito,
  perguntas: a.perguntas.map(paraPergunta),
  respostas: a.respostas,
  ...(a.prazo ? { prazo: formatarData(a.prazo) } : {}),
  ...(a.enviadoEm ? { enviadoEm: formatarData(a.enviadoEm) } : {}),
  ...(a.nota !== undefined ? { nota: a.nota } : {}),
  ...(a.compreensao ? { compreensao: a.compreensao } : {}),
  ...(a.observacao ? { observacao: a.observacao } : {}),
  ...(a.respostaProfessor ? { respostaProfessor: a.respostaProfessor } : {}),
})

/** Perguntas novas (criadas na tela) não têm id do servidor: a API gera. */
export const perguntaParaApi = (p: Pergunta) => ({
  ...(p.id.startsWith('novo-') ? {} : { id: p.id }),
  enunciado: p.enunciado,
  tipo: p.tipo,
  opcoes: p.opcoes,
  ...(p.gabarito?.length ? { gabarito: p.gabarito } : {}),
})

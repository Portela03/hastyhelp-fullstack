import { aceitaRespostas } from '../../autoavaliacoes/domain/formulario.ts'
import type { Formulario } from '../../autoavaliacoes/domain/formulario.ts'
import { statusParaAluno } from '../domain/envio.ts'
import type { Envio } from '../domain/envio.ts'

/** Forma esperada pelo front do aluno (AutoavaliacaoAluno). */
export function autoavaliacaoDTO(f: Formulario, envio: Envio | undefined, agora: Date) {
  const aceita = aceitaRespostas(f, agora)
  const status = statusParaAluno(envio, aceita)
  // R-47: gabarito só quando o professor liberou e o aluno já enviou ou o prazo encerrou.
  const gabaritoVisivel = f.mostrarGabarito && (envio?.status === 'enviado' || !aceita)
  return {
    id: f.id,
    titulo: f.titulo,
    turmaId: f.turmaId,
    status,
    ...(f.prazo ? { prazo: f.prazo.toISOString() } : {}),
    ...(envio?.enviadoEm ? { enviadoEm: envio.enviadoEm.toISOString() } : {}),
    ...(envio?.nota !== undefined ? { nota: envio.nota } : {}),
    ...(envio?.compreensao ? { compreensao: envio.compreensao } : {}),
    mostrarGabarito: f.mostrarGabarito,
    ...(envio?.observacao ? { observacao: envio.observacao } : {}),
    ...(envio?.respostaProfessor ? { respostaProfessor: envio.respostaProfessor } : {}),
    perguntas: f.perguntas.map((p) => ({
      id: p.id,
      enunciado: p.enunciado,
      tipo: p.tipo,
      opcoes: p.opcoes,
      marcadas: [] as number[],
      ...(gabaritoVisivel && p.gabarito ? { gabarito: p.gabarito } : {}),
    })),
    respostas: envio?.respostas ?? {},
  }
}
export type AutoavaliacaoDTO = ReturnType<typeof autoavaliacaoDTO>

import type { Envio } from './envio.ts'

export interface EnvioRepositorio {
  /** Insere ou atualiza (único por formulário + aluno). */
  salvar(envio: Envio): Promise<void>
  porFormularioEAluno(formularioId: string, alunoId: string): Promise<Envio | undefined>
  listarPorFormulario(formularioId: string): Promise<Envio[]>
  listarPorFormularios(formularioIds: string[]): Promise<Envio[]>
  listarPorAluno(alunoId: string): Promise<Envio[]>
  excluirDoFormulario(formularioId: string): Promise<void>
  excluirDaTurma(turmaId: string): Promise<void>
}

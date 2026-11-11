import type { Formulario } from './formulario.ts'

export interface FormularioRepositorio {
  salvar(formulario: Formulario): Promise<void>
  porId(id: string): Promise<Formulario | undefined>
  listarPorTurmas(turmaIds: string[]): Promise<Formulario[]>
  excluir(id: string): Promise<void>
  excluirDaTurma(turmaId: string): Promise<void>
}

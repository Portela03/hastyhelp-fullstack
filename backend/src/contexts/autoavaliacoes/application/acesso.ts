import { naoEncontrado } from '../../../shared/erros.ts'
import type { Ator } from '../../../shared/ator.ts'
import type { Relogio } from '../../../shared/portas.ts'
import { turmaDoDocente } from '../../turmas/application/acesso.ts'
import type { TurmaRepositorio } from '../../turmas/domain/repositorio.ts'
import { materializarAgendamento } from '../domain/formulario.ts'
import type { Formulario } from '../domain/formulario.ts'
import type { FormularioRepositorio } from '../domain/repositorio.ts'

/** Chamado quando um formulário passa a `aberto` (R-81). */
export interface AvisoDePublicacao {
  executar(formulario: Formulario): Promise<void>
}

export interface DepsLeitura {
  formularios: FormularioRepositorio
  relogio: Relogio
  publicacao?: AvisoDePublicacao
}

/** Lê o formulário aplicando R-26 (agendado vencido vira aberto), persistindo e avisando os alunos. */
export async function carregarFormulario(d: DepsLeitura, id: string): Promise<Formulario> {
  const f = await d.formularios.porId(id)
  if (!f) throw naoEncontrado('FORMULARIO_NAO_ENCONTRADO', 'Formulário não encontrado.')
  return materializar(d, f)
}

export async function materializar(d: DepsLeitura, f: Formulario): Promise<Formulario> {
  const atual = materializarAgendamento(f, d.relogio.agora())
  if (atual !== f) {
    await d.formularios.salvar(atual)
    await d.publicacao?.executar(atual)
  }
  return atual
}

export async function materializarTodos(d: DepsLeitura, lista: Formulario[]): Promise<Formulario[]> {
  return Promise.all(lista.map((f) => materializar(d, f)))
}

/** Formulário + verificação de que a turma pertence ao professor. */
export async function formularioDoDocente(d: DepsLeitura & { turmas: TurmaRepositorio }, ator: Ator, formularioId: string) {
  const formulario = await carregarFormulario(d, formularioId)
  const turma = await turmaDoDocente(d.turmas, ator, formulario.turmaId)
  return { formulario, turma }
}

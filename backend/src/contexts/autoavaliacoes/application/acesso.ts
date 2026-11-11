import { naoEncontrado } from '../../../shared/erros.ts'
import type { Ator } from '../../../shared/ator.ts'
import type { Relogio } from '../../../shared/portas.ts'
import { turmaDoDocente } from '../../turmas/application/acesso.ts'
import type { TurmaRepositorio } from '../../turmas/domain/repositorio.ts'
import { materializarAgendamento } from '../domain/formulario.ts'
import type { Formulario } from '../domain/formulario.ts'
import type { FormularioRepositorio } from '../domain/repositorio.ts'

/** Lê o formulário aplicando R-26 (agendado vencido vira aberto) e persistindo a mudança. */
export async function carregarFormulario(repo: FormularioRepositorio, relogio: Relogio, id: string): Promise<Formulario> {
  const f = await repo.porId(id)
  if (!f) throw naoEncontrado('FORMULARIO_NAO_ENCONTRADO', 'Formulário não encontrado.')
  return materializar(repo, relogio, f)
}

export async function materializar(repo: FormularioRepositorio, relogio: Relogio, f: Formulario): Promise<Formulario> {
  const atual = materializarAgendamento(f, relogio.agora())
  if (atual !== f) await repo.salvar(atual)
  return atual
}

export async function materializarTodos(repo: FormularioRepositorio, relogio: Relogio, lista: Formulario[]): Promise<Formulario[]> {
  return Promise.all(lista.map((f) => materializar(repo, relogio, f)))
}

/** Formulário + verificação de que a turma pertence ao professor. */
export async function formularioDoDocente(
  d: { formularios: FormularioRepositorio; turmas: TurmaRepositorio; relogio: Relogio },
  ator: Ator,
  formularioId: string,
) {
  const formulario = await carregarFormulario(d.formularios, d.relogio, formularioId)
  const turma = await turmaDoDocente(d.turmas, ator, formulario.turmaId)
  return { formulario, turma }
}

import { acessoNegado, naoEncontrado } from '../../../shared/erros.ts'
import { exigirPapel } from '../../../shared/ator.ts'
import type { Ator } from '../../../shared/ator.ts'
import type { Relogio } from '../../../shared/portas.ts'
import { carregarFormulario } from '../../autoavaliacoes/application/acesso.ts'
import { visivelParaAluno } from '../../autoavaliacoes/domain/formulario.ts'
import type { FormularioRepositorio } from '../../autoavaliacoes/domain/repositorio.ts'
import type { TurmaRepositorio } from '../../turmas/domain/repositorio.ts'

/** R-40: formulário visível ao aluno e de uma turma em que ele está matriculado. */
export async function formularioDoAluno(
  d: { formularios: FormularioRepositorio; turmas: TurmaRepositorio; relogio: Relogio },
  ator: Ator,
  formularioId: string,
) {
  exigirPapel(ator, 'aluno')
  const formulario = await carregarFormulario(d.formularios, d.relogio, formularioId)
  const matriculados = await d.turmas.alunosIds(formulario.turmaId)
  if (!matriculados.includes(ator.id)) throw acessoNegado('Você não está matriculado nesta turma.')
  if (!visivelParaAluno(formulario)) throw naoEncontrado('FORMULARIO_NAO_ENCONTRADO', 'Autoavaliação não encontrada.')
  return formulario
}

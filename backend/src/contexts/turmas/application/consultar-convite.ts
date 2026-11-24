import { naoEncontrado } from '../../../shared/erros.ts'
import { normalizarCodigo } from '../../../shared/texto.ts'
import type { TurmaRepositorio } from '../domain/repositorio.ts'

/** R-17: público, mostra só o necessário para o aluno reconhecer a turma. */
export class ConsultarConvite {
  constructor(private readonly d: { turmas: TurmaRepositorio }) {}

  async executar(codigo: string) {
    const turma = await this.d.turmas.porCodigo(normalizarCodigo(codigo))
    if (!turma) throw naoEncontrado('CONVITE_INVALIDO', 'Este link de convite é inválido ou expirou.')
    return { nome: turma.nome, periodo: turma.periodo as string, aprovacaoManual: turma.aprovacaoManual }
  }
}

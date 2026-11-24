export type OrigemEntrada = 'codigo' | 'convite'
export type StatusEntrada = 'pendente' | 'aceita' | 'recusada' | 'cancelada'

/**
 * Pedido (origem `codigo`, feito pelo aluno) ou convite (origem `convite`, feito pelo professor)
 * para um aluno entrar numa turma. Só nasce `pendente` e é resolvido uma única vez.
 */
export interface Entrada {
  id: string
  turmaId: string
  alunoId: string
  origem: OrigemEntrada
  status: StatusEntrada
  criadaEm: Date
  resolvidaEm?: Date
}

/** R-115: já existe entrada pendente desse aluno nessa turma (corrida entre duas requisições). */
export class EntradaPendenteDuplicada extends Error {
  constructor() {
    super('Já existe uma entrada pendente deste aluno nesta turma.')
    this.name = 'EntradaPendenteDuplicada'
  }
}

export interface EntradaRepositorio {
  /** Lança `EntradaPendenteDuplicada` ao inserir uma pendente quando já há outra do mesmo aluno+turma. */
  salvar(entrada: Entrada): Promise<void>
  porId(id: string): Promise<Entrada | undefined>
  /** A entrada pendente do aluno nessa turma, se houver (no máximo uma). */
  pendente(turmaId: string, alunoId: string): Promise<Entrada | undefined>
  pendentesDaTurma(turmaId: string): Promise<Entrada[]>
  /** Convites (origem `convite`) pendentes do aluno, mais recentes primeiro. */
  convitesPendentesDoAluno(alunoId: string): Promise<Entrada[]>
  /** Pedidos (origem `codigo`) pendentes do aluno, mais recentes primeiro (R-118). */
  solicitacoesPendentesDoAluno(alunoId: string): Promise<Entrada[]>
  /** Apaga as entradas da turma (R-112). */
  excluirDaTurma(turmaId: string): Promise<void>
}

export function resolverEntrada(entrada: Entrada, status: Exclude<StatusEntrada, 'pendente'>, quando: Date): Entrada {
  return { ...entrada, status, resolvidaEm: quando }
}

import { ErroDeDominio, acessoNegado } from './erros.ts'

export type Papel = 'professor' | 'aluno'

/** Quem executa o caso de uso (extraído do token). */
export interface Ator {
  id: string
  papel: Papel
}

export function exigirPapel(ator: Ator, papel: Papel): void {
  if (ator.papel !== papel) throw acessoNegado(`Esta operação é exclusiva de ${papel === 'professor' ? 'professores' : 'alunos'}.`)
}

/** Data ISO completa ou só AAAA-MM-DD (nesse caso vale até o fim do dia, horário de Brasília). */
export function lerData(texto: string, campo: string): Date {
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(texto) ? `${texto}T23:59:59.999-03:00` : texto
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) throw new ErroDeDominio('DATA_INVALIDA', `Data inválida em "${campo}".`, 400)
  return data
}

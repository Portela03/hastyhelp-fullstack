export interface AlunoDaTurma {
  id: string
  nome: string
  dominio: number | null
  enviados: string
}

export type OrdenacaoAluno = 'nome' | 'dominio' | 'enviados'

function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
}

function quantidadeEnviada(enviados: string) {
  return Number(enviados.split('/')[0]?.trim() || 0)
}

export function filtrarEOrdenarAlunos(
  alunos: readonly AlunoDaTurma[],
  busca: string,
  ordenarPor: OrdenacaoAluno,
  crescente: boolean,
) {
  const consulta = normalizar(busca.trim())
  const direcao = crescente ? 1 : -1

  return alunos
    .filter((aluno) => normalizar(aluno.nome).includes(consulta))
    .slice()
    .sort((a, b) => {
      if (ordenarPor === 'dominio') {
        if (a.dominio === null) return b.dominio === null ? 0 : 1
        if (b.dominio === null) return -1
      }

      const comparacao =
        ordenarPor === 'nome'
          ? a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
          : ordenarPor === 'dominio'
            ? a.dominio! - b.dominio!
            : quantidadeEnviada(a.enviados) - quantidadeEnviada(b.enviados)

      return comparacao === 0
        ? a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
        : comparacao * direcao
    })
}

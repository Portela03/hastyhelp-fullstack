import { exigirPapel } from '../../../shared/ator.ts'
import type { Ator } from '../../../shared/ator.ts'
import { turmaDTO } from '../../turmas/application/dto.ts'
import type { TurmaDTO } from '../../turmas/application/dto.ts'
import { carregarDadosDaTurma, estatisticasDaTurma } from './dados.ts'
import type { DepsAnalise } from './dados.ts'

export class ListarTurmasComEstatisticas {
  constructor(private readonly d: DepsAnalise) {}

  async executar(ator: Ator) {
    exigirPapel(ator, 'professor')
    const turmas = await this.d.turmas.listarDoDocente(ator.id)
    const docente = (await this.d.usuarios.porId(ator.id))?.nome ?? ''
    const itens = await Promise.all(
      turmas.map(async (t) => {
        const e = estatisticasDaTurma(await carregarDadosDaTurma(this.d, t))
        return {
          ...(turmaDTO(t, docente, true) as TurmaDTO),
          totalAlunos: e.totalAlunos,
          taxaResposta: e.taxaResposta,
          dominioMedio: e.dominioMedio,
          engajamento: e.engajamento,
          ultimoFormularioEm: e.ultimoFormularioEm,
        }
      }),
    )
    return itens.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }
}

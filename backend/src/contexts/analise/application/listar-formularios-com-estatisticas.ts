import { exigirPapel } from '../../../shared/ator.ts'
import type { Ator } from '../../../shared/ator.ts'
import { formularioDoDocente, materializarTodos } from '../../autoavaliacoes/application/acesso.ts'
import { formularioDTO } from '../../autoavaliacoes/application/dto.ts'
import type { Formulario, StatusFormulario } from '../../autoavaliacoes/domain/formulario.ts'
import { dominioMedio, maiorDificuldade } from '../domain/metricas.ts'
import { niveisDe, notasDe } from './dados.ts'
import type { DepsAnalise } from './dados.ts'

export interface FiltroFormularios {
  turmaId?: string
  status?: StatusFormulario
  busca?: string
}

export class ListarFormulariosComEstatisticas {
  constructor(private readonly d: DepsAnalise) {}

  /** R-30 */
  async executar(ator: Ator, filtro: FiltroFormularios) {
    exigirPapel(ator, 'professor')
    const turmas = (await this.d.turmas.listarDoDocente(ator.id)).filter((t) => !filtro.turmaId || t.id === filtro.turmaId)
    const bruto = await this.d.formularios.listarPorTurmas(turmas.map((t) => t.id))
    const busca = filtro.busca?.trim().toLowerCase()
    const formularios = (await materializarTodos(this.d.formularios, this.d.relogio, bruto))
      .filter((f) => !filtro.status || f.status === filtro.status)
      .filter((f) => !busca || f.titulo.toLowerCase().includes(busca))
      .sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime())
    return this.comEstatisticas(formularios, new Map(await Promise.all(turmas.map(async (t) => [t.id, (await this.d.turmas.alunosIds(t.id)).length] as const))))
  }

  async um(ator: Ator, formularioId: string) {
    const { formulario } = await formularioDoDocente(this.d, ator, formularioId)
    const total = (await this.d.turmas.alunosIds(formulario.turmaId)).length
    return (await this.comEstatisticas([formulario], new Map([[formulario.turmaId, total]])))[0]!
  }

  private async comEstatisticas(formularios: Formulario[], totais: Map<string, number>) {
    const envios = await this.d.envios.listarPorFormularios(formularios.map((f) => f.id))
    return formularios.map((f) => {
      const enviados = envios.filter((e) => e.formularioId === f.id && e.status === 'enviado')
      return {
        ...formularioDTO(f),
        respostas: enviados.length,
        total: totais.get(f.turmaId) ?? 0,
        dominioMedio: dominioMedio(notasDe(enviados)),
        maiorDificuldade: maiorDificuldade(niveisDe(enviados)),
      }
    })
  }
}

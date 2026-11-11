import { exigirPapel, lerData } from '../../../shared/ator.ts'
import type { Ator } from '../../../shared/ator.ts'
import { materializarTodos } from '../../autoavaliacoes/application/acesso.ts'
import { visivelParaAluno } from '../../autoavaliacoes/domain/formulario.ts'
import type { StatusFormulario } from '../../autoavaliacoes/domain/formulario.ts'
import { acertou } from '../../respostas/domain/nota.ts'
import { dominioMedio, maiorDificuldade, taxaDeResposta } from '../domain/metricas.ts'
import { niveisDe, notasDe } from './dados.ts'
import type { DepsAnalise } from './dados.ts'

export interface FiltroMetricas {
  periodo?: string
  turmaId?: string
  alunoId?: string
  formularioId?: string
  status?: StatusFormulario
  desde?: string
}

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

/** R-57 */
export class MetricasDoProfessor {
  constructor(private readonly d: DepsAnalise) {}

  async executar(ator: Ator, filtro: FiltroMetricas) {
    exigirPapel(ator, 'professor')
    const turmas = (await this.d.turmas.listarDoDocente(ator.id))
      .filter((t) => !filtro.periodo || t.periodo === filtro.periodo)
      .filter((t) => !filtro.turmaId || t.id === filtro.turmaId)
    const formularios = (await materializarTodos(this.d.formularios, this.d.relogio, await this.d.formularios.listarPorTurmas(turmas.map((t) => t.id))))
      .filter((f) => !filtro.formularioId || f.id === filtro.formularioId)
      .filter((f) => !filtro.status || f.status === filtro.status)
    const publicados = formularios.filter(visivelParaAluno)
    const desde = filtro.desde ? lerData(filtro.desde, 'desde') : undefined
    const idsPublicados = new Set(publicados.map((f) => f.id))
    const envios = (await this.d.envios.listarPorFormularios([...idsPublicados]))
      .filter((e) => e.status === 'enviado')
      .filter((e) => !filtro.alunoId || e.alunoId === filtro.alunoId)
      .filter((e) => !desde || (e.enviadoEm !== undefined && e.enviadoEm >= desde))

    let esperados = 0
    for (const t of turmas) {
      const alunos = await this.d.turmas.alunosIds(t.id)
      const alunosConsiderados = filtro.alunoId ? (alunos.includes(filtro.alunoId) ? 1 : 0) : alunos.length
      esperados += alunosConsiderados * publicados.filter((f) => f.turmaId === t.id).length
    }

    let corretas = 0
    let respondidasComGabarito = 0
    for (const e of envios) {
      const f = publicados.find((x) => x.id === e.formularioId)
      for (const p of f?.perguntas ?? []) {
        if (!p.gabarito?.length) continue
        respondidasComGabarito++
        if (acertou(p, e.respostas)) corretas++
      }
    }

    const porTurma = turmas.map((t) => ({ turmaId: t.id, nome: t.nome, cor: t.cor, valor: dominioMedio(notasDe(envios.filter((e) => e.turmaId === t.id))) }))
    const comDados = porTurma.filter((t): t is typeof t & { valor: number } => t.valor !== null)

    const porMes = new Map<string, number[]>()
    for (const e of envios) {
      if (!e.enviadoEm || e.nota === undefined) continue
      const chave = `${e.enviadoEm.getUTCFullYear()}-${String(e.enviadoEm.getUTCMonth()).padStart(2, '0')}`
      porMes.set(chave, [...(porMes.get(chave) ?? []), e.nota])
    }
    const evolucaoMensal = [...porMes]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-5)
      .map(([chave, notas]) => ({ mes: MESES[Number(chave.slice(5))] ?? chave, valor: dominioMedio(notas) }))

    return {
      desempenhoMedio: dominioMedio(notasDe(envios)),
      taxaRespostas: { enviados: envios.length, esperados, percentual: taxaDeResposta(envios.length, esperados) },
      formularios: { publicados: publicados.length, concluidos: formularios.filter((f) => f.status === 'concluido').length },
      maiorDificuldade: {
        nivel: maiorDificuldade(niveisDe(envios)),
        percentualIncorretas: respondidasComGabarito ? Math.round(((respondidasComGabarito - corretas) / respondidasComGabarito) * 100) : 0,
      },
      porTurma: comDados.map(({ turmaId, nome, cor, valor }) => ({ turmaId, nome, cor, valor })),
      turmasSemDados: porTurma.length - comDados.length,
      evolucaoMensal,
    }
  }
}

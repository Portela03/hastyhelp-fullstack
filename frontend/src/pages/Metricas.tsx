import { useMemo, useState } from 'react'
import { useApi } from '../api/use-api'
import { AppShell, Banner } from '../components/layout'
import { DifficultyLetter, FilterSelect, KpiCard } from '../components/ui'
import { PERIODOS } from '../data/tipos'
import type { Dificuldade, StatusFormulario } from '../data/tipos'
import { useStore } from '../store'
import { calcularResumoSatisfacao, formatarDataPesquisa, interpretarNps } from '../data/satisfacao'
import type { Papel } from '../data/aluno'

interface MetricasDTO {
  desempenhoMedio: number | null
  taxaRespostas: { enviados: number; esperados: number; percentual: number }
  formularios: { publicados: number; concluidos: number }
  maiorDificuldade: { nivel: Dificuldade | null; percentualIncorretas: number }
  porTurma: Array<{ turmaId: string; nome: string; cor: string; valor: number }>
  turmasSemDados: number
  evolucaoMensal: Array<{ mes: string; valor: number | null }>
}

interface AlunosTurmaDTO {
  alunos: Array<{ id: string; nome: string }>
}

const STATUS_POR_ROTULO: Record<string, StatusFormulario> = { Agendado: 'agendado', Rascunho: 'rascunho', Fechado: 'fechado', Aberto: 'aberto', Concluído: 'concluido' }
const ROTULOS_STATUS = Object.keys(STATUS_POR_ROTULO)
const OPCOES_DATA = ['Últimos 30 dias', 'Últimos 7 dias', 'Semestre']

/** Início do recorte de datas escolhido (ISO) ou `undefined` para "todos". */
function desdeDe(opcao: string): string | undefined {
  const agora = new Date()
  if (opcao === 'Últimos 30 dias') return new Date(agora.getTime() - 30 * 86_400_000).toISOString()
  if (opcao === 'Últimos 7 dias') return new Date(agora.getTime() - 7 * 86_400_000).toISOString()
  if (opcao === 'Semestre') return new Date(agora.getFullYear(), agora.getMonth() < 6 ? 0 : 6, 1).toISOString()
  return undefined
}

export function Metricas() {
  const { equipes, formularios, pesquisas } = useStore()
  const [periodo, setPeriodo] = useState('')
  const [turma, setTurma] = useState('')
  const [aluno, setAluno] = useState('')
  const [formulario, setFormulario] = useState('')
  const [status, setStatus] = useState('')
  const [data, setData] = useState('')
  const [filtroPublicoPesquisa, setFiltroPublicoPesquisa] = useState<string>('')

  const turmas = [...new Set(equipes.map((e) => e.nome))]
  const turmaSelecionada = equipes.find((e) => e.nome === turma)
  const { dados: alunosDaTurma } = useApi<AlunosTurmaDTO>(turmaSelecionada ? `/turmas/${turmaSelecionada.id}/alunos` : null, turmaSelecionada?.id)
  const alunos = turmaSelecionada ? (alunosDaTurma?.alunos ?? []) : []
  const formulariosDisponiveis = formularios.filter((f) => !turmaSelecionada || f.equipeId === turmaSelecionada.id)

  const consulta = useMemo(() => {
    const q = new URLSearchParams()
    if (periodo) q.set('periodo', periodo)
    if (turmaSelecionada) q.set('turmaId', turmaSelecionada.id)
    const alunoId = (alunosDaTurma?.alunos ?? []).find((a) => a.nome === aluno)?.id
    if (alunoId) q.set('alunoId', alunoId)
    const formularioId = formularios.find((f) => f.titulo === formulario && (!turmaSelecionada || f.equipeId === turmaSelecionada.id))?.id
    if (formularioId) q.set('formularioId', formularioId)
    if (status) q.set('status', STATUS_POR_ROTULO[status] ?? '')
    const desde = desdeDe(data)
    if (desde) q.set('desde', desde)
    return `/metricas?${q.toString()}`
  }, [periodo, turmaSelecionada, aluno, formulario, status, data, alunosDaTurma, formularios])

  const { dados: m, erro } = useApi<MetricasDTO>(consulta, equipes)

  return (
    <AppShell>
      <Banner variante="lista" titulo="Métricas" subtitulo="Aqui você acompanha o desempenho de todas suas turmas podendo escolher quais dados ver">
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <span className="text-[18px]">Visão atual</span>
          <strong className="text-[22px] font-bold">{turma || 'Todas as turmas'}</strong>
        </div>
      </Banner>

      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-line bg-white p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <FilterSelect label="Período" all="Todos" value={periodo} onChange={setPeriodo} options={[...PERIODOS]} />
            <FilterSelect
              label="Turma"
              all="Todas"
              value={turma}
              onChange={(v) => {
                setTurma(v)
                setAluno('')
                setFormulario('')
              }}
              options={turmas}
            />
            <FilterSelect label="Aluno" value={aluno} onChange={setAluno} disabled={!turma} options={alunos.map((a) => a.nome)} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <FilterSelect label="Formulário" value={formulario} onChange={setFormulario} options={[...new Set(formulariosDisponiveis.map((f) => f.titulo))]} />
            <FilterSelect label="Status do formulário" value={status} onChange={setStatus} options={ROTULOS_STATUS} />
          </div>
        </div>
        <FilterSelect label="Data" all="Todos" value={data} onChange={setData} options={OPCOES_DATA} />
      </div>

      {erro && (
        <p role="alert" className="text-[16px] text-diff-c">
          {erro}
        </p>
      )}

      <section className="flex flex-col gap-[18px] rounded-xl border border-line bg-white p-5">
        <header className="flex flex-col gap-[3px]">
          <h2 className="text-[22px] font-bold text-ink">Visão geral</h2>
          <p className="text-[13px] text-muted">{`Consolidado ${turma ? `da turma ${turma}` : 'de todas as turmas'} · semestre ${periodo || '—'}`}</p>
        </header>
        {m && (
          <>
            <div className="flex flex-wrap gap-3.5">
              <KpiCard className="min-w-[200px] gap-[7px] bg-panel" titulo="Desempenho médio" valor={m.desempenhoMedio === null ? '—' : `${m.desempenhoMedio}%`} destaque detalhe="Média de domínio nas autoavaliações enviadas" detalheTamanho={13} />
              <KpiCard className="min-w-[200px] gap-[7px]" titulo="Taxa de respostas" valor={`${m.taxaRespostas.percentual}%`} detalhe={`${m.taxaRespostas.enviados} de ${m.taxaRespostas.esperados} respostas`} detalheTamanho={13} />
              <KpiCard className="min-w-[200px] gap-[7px]" titulo="Formulários concluídos" valor={m.formularios.concluidos} detalhe={`de ${m.formularios.publicados} formulários publicados`} detalheTamanho={13} />
              <KpiCard
                className="min-w-[200px] gap-[7px]"
                titulo="Maior dificuldade"
                valor={m.maiorDificuldade.nivel ? <DifficultyLetter letra={m.maiorDificuldade.nivel} /> : '—'}
                detalhe={m.maiorDificuldade.nivel ? `${m.maiorDificuldade.percentualIncorretas}% das respostas incorretas` : 'Sem respostas enviadas'}
                detalheTamanho={13}
              />
            </div>
            <div className="flex flex-col gap-[18px] lg:flex-row">
              <section className="flex min-w-0 flex-1 flex-col gap-3.5 rounded-xl border border-line bg-panel p-[18px]">
                <header className="flex flex-col gap-[3px]">
                  <h3 className="text-[18px] font-bold text-ink">Desempenho por turma</h3>
                  <p className="text-[13px] text-muted">Média de domínio nos formulários respondidos</p>
                </header>
                <ul className="flex flex-col gap-3">
                  {m.porTurma.map((t) => (
                    <li key={t.turmaId} className="flex flex-col gap-1.5">
                      <div className="flex flex-col text-[13px] text-ink">
                        <span className="font-semibold">{t.nome}</span>
                        <strong>{t.valor}%</strong>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-track" role="progressbar" aria-label={t.nome} aria-valuenow={t.valor} aria-valuemin={0} aria-valuemax={100}>
                        <div className="h-full rounded-full" style={{ width: `${t.valor}%`, backgroundColor: t.cor }} />
                      </div>
                    </li>
                  ))}
                  {m.turmasSemDados > 0 && (
                    <li className="flex flex-col gap-1.5">
                      <div className="flex flex-col text-[13px] text-[#7f7f7f]">
                        <span className="font-semibold">{`${m.turmasSemDados} ${m.turmasSemDados === 1 ? 'turma sem dados' : 'turmas sem dados'}`}</span>
                        <strong>...</strong>
                      </div>
                      <div className="h-2.5 rounded-full bg-track" />
                    </li>
                  )}
                  {m.porTurma.length === 0 && m.turmasSemDados === 0 && <li className="text-[13px] text-muted">Nenhuma turma encontrada para estes filtros.</li>}
                </ul>
              </section>
              <section className="flex w-full shrink-0 flex-col gap-3.5 rounded-xl border border-line bg-panel p-[18px] lg:w-[390px]">
                <header className="flex flex-col gap-[3px]">
                  <h3 className="text-[18px] font-bold text-ink">Evolução do semestre</h3>
                  <p className="text-[13px] text-muted">Média consolidada por mês</p>
                </header>
                {m.evolucaoMensal.length === 0 ? (
                  <p className="text-[13px] text-muted">Ainda não há respostas enviadas neste recorte.</p>
                ) : (
                  <>
                    <div role="img" aria-label="Evolução mensal da média consolidada" className="flex h-[145px] items-end justify-between border-b border-line px-[22px] pb-0">
                      {m.evolucaoMensal.map((e, i) => (
                        <div key={e.mes} className="flex w-11 flex-col items-center gap-1">
                          <span className="text-[12px] font-bold text-ink">{e.valor ?? 0}%</span>
                          <div className="w-5 rounded-t-[5px]" style={{ height: Math.max((e.valor ?? 0) * 1.2, 2), backgroundColor: i === m.evolucaoMensal.length - 1 ? '#34785c' : '#8fcbc5' }} />
                        </div>
                      ))}
                    </div>
                    <div className="-mt-1.5 flex justify-between px-[22px] text-[12px] text-muted">
                      {m.evolucaoMensal.map((e) => (
                        <span key={e.mes} className="w-11 text-center">
                          {e.mes}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </section>
            </div>
          </>
        )}
      </section>

      {/* Painel Satisfação com o HastyHelp */}
      {(() => {
        const pesquisasFiltradas = pesquisas.filter((p) => {
          if (!filtroPublicoPesquisa) return true
          return p.perfil === (filtroPublicoPesquisa.toLowerCase() as Papel)
        })
        const resumo = calcularResumoSatisfacao(pesquisasFiltradas)
        const comentarios = pesquisasFiltradas
          .filter((p) => p.comentario && p.comentario.trim().length > 0)
          .slice(0, 5)

        return (
          <section className="flex flex-col gap-[18px] rounded-xl border border-line bg-white p-5">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-[3px]">
                <h2 className="text-[22px] font-bold text-ink">Satisfação com o HastyHelp</h2>
                <p className="text-[13px] text-muted">Pesquisa anônima de NPS e CSAT respondida por alunos e professores</p>
              </div>
              <FilterSelect
                label="Público"
                all="Todos"
                value={filtroPublicoPesquisa}
                onChange={setFiltroPublicoPesquisa}
                options={['Aluno', 'Professor']}
              />
            </header>

            <div className="flex flex-wrap gap-3.5">
              <KpiCard
                className="min-w-[200px] gap-1"
                titulo="NPS"
                valor={resumo.total === 0 ? '—' : resumo.npsScore}
                detalhe={resumo.total === 0 ? 'Sem respostas' : interpretarNps(resumo.npsScore)}
              />
              <KpiCard
                className="min-w-[200px] gap-1"
                titulo="CSAT médio"
                valor={resumo.total === 0 ? '—' : `${resumo.csatMedio.toLocaleString('pt-BR')}/5`}
                detalhe={`${resumo.percentualSatisfeitos}% satisfeitos (nota 4 ou 5)`}
              />
              <KpiCard
                className="min-w-[200px] gap-1"
                titulo="Respostas"
                valor={resumo.total}
                detalhe="Todas as coletas do período"
              />
            </div>

            <div className="flex flex-col gap-[18px] lg:flex-row">
              {/* Quem recomenda */}
              <section className="flex min-w-0 flex-1 flex-col gap-3.5 rounded-xl border border-line bg-panel p-[18px]">
                <header className="flex flex-col gap-[3px]">
                  <h3 className="text-[18px] font-bold text-ink">Quem recomenda</h3>
                  <p className="text-[13px] text-muted">Promotores (9-10), neutros (7-8) e detratores (0-6)</p>
                </header>
                {resumo.total === 0 ? (
                  <p className="text-[13px] text-muted">Nenhuma resposta registrada.</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div
                      role="img"
                      aria-label={`Distribuição de recomendação: ${resumo.percentualPromotores}% promotores, ${resumo.percentualNeutros}% neutros, ${resumo.percentualDetratores}% detratores`}
                      className="flex h-3.5 w-full overflow-hidden rounded-full bg-track"
                    >
                      <div
                        style={{ width: `${resumo.percentualPromotores}%` }}
                        className="h-full bg-ok transition-all"
                        title={`Promotores: ${resumo.percentualPromotores}%`}
                      />
                      <div
                        style={{ width: `${resumo.percentualNeutros}%` }}
                        className="h-full bg-[#8fcbc5] transition-all"
                        title={`Neutros: ${resumo.percentualNeutros}%`}
                      />
                      <div
                        style={{ width: `${resumo.percentualDetratores}%` }}
                        className="h-full bg-diff-c transition-all"
                        title={`Detratores: ${resumo.percentualDetratores}%`}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-[13px] text-ink">
                      <span className="font-semibold text-ok">
                        {resumo.percentualPromotores}% <span className="font-normal text-muted">promotores</span>
                      </span>
                      <span className="font-semibold text-[#2f5b7a]">
                        {resumo.percentualNeutros}% <span className="font-normal text-muted">neutros</span>
                      </span>
                      <span className="font-semibold text-diff-c">
                        {resumo.percentualDetratores}% <span className="font-normal text-muted">detratores</span>
                      </span>
                    </div>
                  </div>
                )}
              </section>

              {/* Comentários recentes */}
              <section className="flex w-full shrink-0 flex-col gap-3.5 rounded-xl border border-line bg-panel p-[18px] lg:w-[460px]">
                <header className="flex flex-col gap-[3px]">
                  <h3 className="text-[18px] font-bold text-ink">Comentários recentes</h3>
                  <p className="text-[13px] text-muted">Sem identificação de quem escreveu</p>
                </header>
                {comentarios.length === 0 ? (
                  <p className="text-[13px] text-muted">Ainda não há comentários registrados.</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {comentarios.map((p) => {
                      const gatilhoRotulo =
                        p.gatilho === 'pos-envio'
                          ? 'Após enviar autoavaliação'
                          : p.gatilho === 'trimestral'
                            ? 'Pesquisa trimestral'
                            : 'Botão "Avaliar o HastyHelp"'
                      const perfilRotulo = p.perfil === 'professor' ? 'Professor' : 'Aluno'
                      return (
                        <li key={p.id} className="flex flex-col gap-1 border-b border-line pb-3 last:border-b-0 last:pb-0">
                          <p className="text-[14px] text-ink font-medium leading-snug">"{p.comentario}"</p>
                          <span className="text-[12px] text-muted">
                            {`${perfilRotulo} · ${formatarDataPesquisa(p.data)} · ${gatilhoRotulo} · CSAT ${p.csat} · NPS ${p.nps}`}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            </div>
          </section>
        )
      })()}
    </AppShell>
  )
}

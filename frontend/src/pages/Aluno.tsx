import { useMemo, useState } from 'react'
import { Navigate, Outlet, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import sortIcon from '../assets/figma/sort.svg'
import { AppShell, Banner, BannerStat, Section, TabBar, Toolbar } from '../components/layout'
import { PerguntaCard } from '../components/PerguntaCard'
import {
  ButtonBrown,
  ButtonGhost,
  DifficultyLetter,
  FilterSelect,
  KpiCard,
  Modal,
  OptionsMenu,
  Panel,
  ProgressBar,
  SearchBox,
  SortButton,
  SliderNotaGeral,
  StatusAlunoPill,
  TeamBadge,
} from '../components/ui'
import { ExcluirModal } from '../components/modals'
import {
  ROTULO_STATUS_ALUNO,
  acertou,
  calcularMediaAvaliacoes,
  completa,
  editavel,
  formatarNota,
  respondida,
  totalRespondidas,
} from '../data/aluno'
import type { AutoavaliacaoAluno } from '../data/aluno'
import { PERIODOS } from '../data/tipos'
import { CartaoPosEnvioSatisfacao, PesquisaSatisfacaoModal } from '../components/PesquisaSatisfacao'
import type { Equipe } from '../data/tipos'
import { useStore } from '../store'

/* Auxiliares */

function paraData(s?: string) {
  if (!s) return Number.POSITIVE_INFINITY
  const [d, m, a] = s.split('/').map(Number)
  return new Date(2000 + a, m - 1, d).getTime()
}

function estatisticas(lista: AutoavaliacaoAluno[]) {
  const enviadas = lista.filter((a) => a.status === 'respondido')
  const notas = enviadas.flatMap((a) => (a.nota === undefined ? [] : [a.nota]))
  return {
    total: lista.length,
    respondidas: enviadas.length,
    abertas: lista.filter((a) => editavel(a.status)).length,
    participacao: lista.length ? Math.round((enviadas.length / lista.length) * 100) : 0,
    notaMedia: calcularMediaAvaliacoes(notas),
    evolucao: [...enviadas].sort((a, b) => paraData(a.enviadoEm) - paraData(b.enviadoEm)),
  }
}

const notaOuTraco = (n?: number) => (n === undefined ? '—' : formatarNota(n))

/* Linha de autoavaliação */

function AutoavaliacaoRow({ a, mostrarTurma }: { a: AutoavaliacaoAluno; mostrarTurma?: boolean }) {
  const { equipes: turmasAluno } = useStore()
  const turmaDe = (id: string): Equipe | undefined => turmasAluno.find((t) => t.id === id)
  const navigate = useNavigate()
  const turma = turmaDe(a.turmaId)
  const abrir = () => navigate(`/aluno/autoavaliacoes/${a.id}`)
  const detalhe =
    a.status === 'respondido'
      ? `Nota: ${a.nota === undefined ? 'em análise' : `${formatarNota(a.nota)}/10`}`
      : a.status === 'encerrado'
        ? 'Você não respondeu'
        : `${totalRespondidas(a)}/${a.perguntas.length} perguntas respondidas`
  const data =
    a.status === 'respondido' ? `Enviado em ${a.enviadoEm}` : a.prazo ? `Prazo: ${a.prazo}` : 'Sem prazo'
  return (
    <li
      role="link"
      tabIndex={0}
      aria-label={`Abrir autoavaliação ${a.titulo}`}
      onClick={abrir}
      onKeyDown={(e) => e.key === 'Enter' && abrir()}
      className="flex cursor-pointer items-center gap-3 rounded-lg border border-line-input bg-white p-3 transition duration-100 hover:bg-card-hover hover:shadow-card-hover active:shadow-none"
    >
      {turma && <TeamBadge sigla={turma.sigla} cor={turma.cor} size={68} fontSize={32} />}
      <div className="flex min-w-0 flex-1 items-stretch justify-between gap-3">
        <div className="flex min-w-0 flex-col justify-center gap-1">
          <h2 className="text-[16px] font-semibold text-ink">{a.titulo}</h2>
          {mostrarTurma && turma && (
            <p className="flex flex-wrap items-center gap-x-[5px] text-[16px] text-placeholder">
              {turma.nome}
              <span className="font-inter text-[12px]">•</span>
              {turma.periodo}
            </p>
          )}
          <p className="text-[16px] text-card-sec">{detalhe}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end justify-between gap-2">
          <StatusAlunoPill status={a.status} />
          <span className="text-[16px] text-ink">{data}</span>
        </div>
      </div>
    </li>
  )
}

function ListaAutoavaliacoes({ itens, mostrarTurma }: { itens: AutoavaliacaoAluno[]; mostrarTurma?: boolean }) {
  if (itens.length === 0) return <p className="text-[16px] text-muted">Nenhuma autoavaliação encontrada.</p>
  return (
    <ul className="flex flex-col gap-3">
      {itens.map((a) => (
        <AutoavaliacaoRow key={a.id} a={a} mostrarTurma={mostrarTurma} />
      ))}
    </ul>
  )
}

function useFiltroAutoavaliacoes(base: AutoavaliacaoAluno[]) {
  const { equipes: turmasAluno } = useStore()
  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState('')
  const [turma, setTurma] = useState('')
  const [asc, setAsc] = useState(true)
  const itens = useMemo(() => {
    const filtrados = base
      .filter((a) => a.titulo.toLowerCase().includes(busca.toLowerCase()))
      .filter((a) => !status || ROTULO_STATUS_ALUNO[a.status] === status)
      .filter((a) => !turma || turmasAluno.find((t) => t.id === a.turmaId)?.nome === turma)
    return filtrados.sort((a, b) => (asc ? 1 : -1) * (paraData(a.prazo ?? a.enviadoEm) - paraData(b.prazo ?? b.enviadoEm)))
  }, [base, busca, status, turma, asc, turmasAluno])
  return { busca, setBusca, status, setStatus, turma, setTurma, asc, setAsc, itens }
}

/* Turmas */

export function AlunoTurmas() {
  const { autoavaliacoes, equipes: turmasAluno, sairDaEquipe } = useStore()
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')
  const [periodo, setPeriodo] = useState('')
  const [asc, setAsc] = useState(true)
  const [equipeSaindo, setEquipeSaindo] = useState<Equipe | null>(null)

  const turmasVisiveis = turmasAluno
    .filter((t) => !t.oculta)
    .filter((t) => t.nome.toLowerCase().includes(busca.toLowerCase()))
    .filter((t) => !periodo || t.periodo === periodo)
    .sort((a, b) => (asc ? 1 : -1) * a.nome.localeCompare(b.nome, 'pt-BR'))

  const turmasOcultas = turmasAluno
    .filter((t) => t.oculta)
    .filter((t) => t.nome.toLowerCase().includes(busca.toLowerCase()))
    .filter((t) => !periodo || t.periodo === periodo)
    .sort((a, b) => (asc ? 1 : -1) * a.nome.localeCompare(b.nome, 'pt-BR'))

  return (
    <AppShell>
      <Banner titulo="Minhas Equipes" subtitulo="Bem-vindo(a)! Aqui você acompanha suas equipes e as autoavaliações que precisam da sua resposta." />
      <Toolbar>
        <div className="flex flex-wrap items-center gap-3">
          <SearchBox value={busca} onChange={setBusca} placeholder="Buscar equipes..." />
          <FilterSelect label="Período" value={periodo} onChange={setPeriodo} options={[...PERIODOS]} />
        </div>
        <SortButton icon={sortIcon} label={asc ? 'Alfabeticamente' : 'Alfabeticamente (Z-A)'} onClick={() => setAsc((v) => !v)} />
      </Toolbar>
      <Section titulo="Equipes">
        {turmasVisiveis.length === 0 ? (
          <p className="text-[16px] text-muted">
            Nenhuma equipe encontrada.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2 xl:grid-cols-3">
            {turmasVisiveis.map((t) => {
              const est = estatisticas(
                autoavaliacoes.filter((a) => a.turmaId === t.id),
              )
              const abrir = () => navigate(`/aluno/turmas/${t.id}`)

              return (
                <article
                  key={t.id}
                  role="link"
                  tabIndex={0}
                  aria-label={`Abrir equipe ${t.nome}`}
                  onClick={abrir}
                  onKeyDown={(e) => e.key === 'Enter' && abrir()}
                  className="flex cursor-pointer flex-col gap-5 self-start rounded-lg border border-card-line bg-white p-3 transition duration-100 drop-shadow-[0.5px_0.5px_0_#b7b7b7] hover:bg-card-hover hover:shadow-card-hover active:shadow-none"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2.5">
                      <TeamBadge sigla={t.sigla} cor={t.cor} size={60} fontSize={30} />
                      <h2 className="min-w-0 flex-1 text-[16px] font-semibold tracking-[-0.64px] text-ink">
                        {t.nome}
                      </h2>
                      <OptionsMenu
                        label={`Opções da equipe ${t.nome}`}
                        items={[
                          {
                            label: 'Sair da equipe',
                            icon: 'logout',
                            destructive: true,
                            onClick: () => setEquipeSaindo(t),
                          },
                        ]}
                      />
                    </div>
                    <p className="text-[16px] leading-4 text-card-sec">
                      Prof. {t.docente}
                    </p>
                    <p className="text-[16px] leading-4 text-card-sec">
                      {est.abertas === 0
                        ? 'Nenhuma autoavaliação pendente'
                        : `${est.abertas} autoavaliação(ões) para responder`}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[16px] leading-4 text-card-sec">
                      <span>Minha participação:</span>
                      <span>{est.participacao}%</span>
                    </div>
                    <ProgressBar
                      value={est.participacao}
                      label="Minha participação"
                    />
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </Section>

      {turmasOcultas.length > 0 && (
        <Section titulo="Equipes ocultas" inicialmenteAberta={false}>
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2 xl:grid-cols-3">
            {turmasOcultas.map((t) => {
              const est = estatisticas(
                autoavaliacoes.filter((a) => a.turmaId === t.id),
              )
              const abrir = () => navigate(`/aluno/turmas/${t.id}`)

              return (
                <article
                  key={t.id}
                  role="link"
                  tabIndex={0}
                  aria-label={`Abrir equipe ${t.nome}`}
                  onClick={abrir}
                  onKeyDown={(e) => e.key === 'Enter' && abrir()}
                  className="flex cursor-pointer flex-col gap-5 self-start rounded-lg border border-card-line bg-white p-3 transition duration-100 drop-shadow-[0.5px_0.5px_0_#b7b7b7] hover:bg-card-hover hover:shadow-card-hover active:shadow-none"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2.5">
                      <TeamBadge sigla={t.sigla} cor={t.cor} size={60} fontSize={30} />
                      <h2 className="min-w-0 flex-1 text-[16px] font-semibold tracking-[-0.64px] text-ink">
                        {t.nome}
                      </h2>
                      <OptionsMenu
                        label={`Opções da equipe ${t.nome}`}
                        items={[
                          {
                            label: 'Sair da equipe',
                            icon: 'logout',
                            destructive: true,
                            onClick: () => setEquipeSaindo(t),
                          },
                        ]}
                      />
                    </div>
                    <p className="text-[16px] leading-4 text-card-sec">
                      Prof. {t.docente}
                    </p>
                    <p className="text-[16px] leading-4 text-card-sec">
                      {est.abertas === 0
                        ? 'Nenhuma autoavaliação pendente'
                        : `${est.abertas} autoavaliação(ões) para responder`}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[16px] leading-4 text-card-sec">
                      <span>Minha participação:</span>
                      <span>{est.participacao}%</span>
                    </div>
                    <ProgressBar
                      value={est.participacao}
                      label="Minha participação"
                    />
                  </div>
                </article>
              )
            })}
          </div>
        </Section>
      )}
      {equipeSaindo && (
        <ExcluirModal
          tipo="sairEquipe"
          nome={equipeSaindo.nome}
          onClose={() => setEquipeSaindo(null)}
          onConfirmar={() => {
            void sairDaEquipe(equipeSaindo.id).then(() => setEquipeSaindo(null))
          }}
        />
      )}
    </AppShell>
  )
}

/* Detalhe da turma */

export function AlunoTurmaDetalhe() {
  const { id } = useParams()
  const { autoavaliacoes, equipes: turmasAluno, sairDaEquipe } = useStore()
  const navigate = useNavigate()
  const turmaDe = (id: string): Equipe | undefined => turmasAluno.find((t) => t.id === id)
  const turma = turmaDe(id ?? '')
  const [equipeSaindo, setEquipeSaindo] = useState(false)
  if (!turma) return <Navigate to="/aluno/turmas" replace />
  const minhas = autoavaliacoes.filter((a) => a.turmaId === turma.id)
  const est = estatisticas(minhas)
  const base = `/aluno/turmas/${turma.id}`
  return (
    <AppShell
      voltar={{ para: '/aluno/turmas', rotulo: 'Equipes' }}
      action={
        <OptionsMenu
          label={`Opções da equipe ${turma.nome}`}
          items={[
            {
              label: 'Sair da equipe',
              icon: 'logout',
              destructive: true,
              onClick: () => setEquipeSaindo(true),
            },
          ]}
        />
      }
    >
      <Banner
        titulo={turma.nome}
        leading={<TeamBadge sigla={turma.sigla} cor={turma.cor} size={75} fontSize={30} />}
        subtitulo={`Prof. ${turma.docente} • ${turma.periodo}`}
      >
        <BannerStat rotulo="Minha nota média" valor={notaOuTraco(est.notaMedia)} />
        <BannerStat rotulo="Participação" valor={`${est.participacao}%`} />
      </Banner>
      <TabBar
        tabs={[
          { to: base, label: 'Autoavaliações', end: true },
          { to: `${base}/resumo`, label: 'Meu resumo' },
        ]}
      />
      <Outlet context={turma} />
      {equipeSaindo && (
        <ExcluirModal
          tipo="sairEquipe"
          nome={turma.nome}
          onClose={() => setEquipeSaindo(false)}
          onConfirmar={() => {
            void sairDaEquipe(turma.id).then(() => {
              setEquipeSaindo(false)
              navigate('/aluno/turmas', { replace: true })
            })
          }}
        />
      )}
    </AppShell>
  )
}

export function AlunoTurmaAutoavaliacoes() {
  const turma = useOutletContext<Equipe>()
  const { autoavaliacoes } = useStore()
  const minhas = useMemo(() => autoavaliacoes.filter((a) => a.turmaId === turma.id), [autoavaliacoes, turma.id])
  const f = useFiltroAutoavaliacoes(minhas)
  return (
    <>
      <Toolbar>
        <div className="flex flex-wrap items-center gap-3">
          <SearchBox value={f.busca} onChange={f.setBusca} placeholder="Buscar autoavaliações..." />
          <FilterSelect label="Status" value={f.status} onChange={f.setStatus} options={Object.values(ROTULO_STATUS_ALUNO)} />
        </div>
        <SortButton icon={sortIcon} label="Prazo" onClick={() => f.setAsc((v) => !v)} />
      </Toolbar>
      <ListaAutoavaliacoes itens={f.itens} />
    </>
  )
}

/* Gráfico de colunas (notas 0–10) */

function ColunasNotas({ itens, rotuloAria }: { itens: Array<{ rotulo: string; valor: number; destaque?: boolean }>; rotuloAria: string }) {
  if (itens.length === 0) return <p className="text-[14px] text-muted">Ainda não há autoavaliações respondidas.</p>
  return (
    <div role="img" aria-label={rotuloAria} className="flex flex-col">
      <div className="flex h-[150px] items-end justify-around gap-2 border-b border-line">
        {itens.map((c, i) => (
          <div key={`${c.rotulo}-${i}`} className="flex w-[72px] flex-col items-center gap-1">
            <span className="text-[12px] font-bold text-ink">{formatarNota(c.valor)}</span>
            <div className="w-8 rounded-t-md" style={{ height: c.valor * 12, backgroundColor: c.destaque ? '#34785c' : '#8fcbc5' }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-around gap-2 text-[11px] text-muted">
        {itens.map((c, i) => (
          <span key={`${c.rotulo}-${i}`} className="w-[72px] text-center">
            {c.rotulo}
          </span>
        ))}
      </div>
    </div>
  )
}

function CompreensaoPorAutoavaliacao({ itens }: { itens: AutoavaliacaoAluno[] }) {
  return (
    <Panel titulo="Compreensão por autoavaliação" subtitulo="Onde você marcou mais dificuldade" tituloTamanho={19}>
      <ul className="-mt-2 flex flex-col gap-1.5 text-[13px] font-semibold text-ink">
        {itens.length === 0 && <li className="font-normal text-muted">Nada para mostrar ainda.</li>}
        {itens.map((a) => (
          <li key={a.id}>
            {`${a.titulo}: `}
            {a.compreensao ? <DifficultyLetter letra={a.compreensao} /> : 'em análise'}
          </li>
        ))}
      </ul>
    </Panel>
  )
}

export function AlunoTurmaResumo() {
  const turma = useOutletContext<Equipe>()
  const { autoavaliacoes } = useStore()
  const est = estatisticas(autoavaliacoes.filter((a) => a.turmaId === turma.id))
  const ultima = est.evolucao.at(-1)
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-line bg-white p-[22px]">
      <header className="flex flex-col gap-1">
        <h2 className="text-[24px] font-bold text-ink">Meu resumo</h2>
        <p className="text-[13px] text-muted">Seu desempenho, sua evolução e os pontos que merecem atenção nesta equipe.</p>
      </header>
      <div className="flex flex-wrap gap-3.5">
        <KpiCard className="min-w-[200px] gap-1" titulo="Participação" valor={`${est.participacao}%`} detalhe={`${est.respondidas} de ${est.total} respondidas`} />
        <KpiCard className="min-w-[200px] gap-1" titulo="Última nota" valor={ultima?.nota === undefined ? '—' : `${formatarNota(ultima.nota)}/10`} detalhe={ultima ? ultima.titulo : 'Nenhuma enviada'} />
        <KpiCard
          className="min-w-[200px] gap-1"
          titulo="Média das avaliações"
          valor={est.notaMedia === undefined ? '—' : `${formatarNota(est.notaMedia)}/10`}
          detalhe="Média das notas enviadas"
        />
      </div>
      <div className="flex flex-col gap-4 lg:flex-row">
        <section className="flex min-w-0 flex-1 flex-col gap-3 rounded-xl border border-line bg-panel p-[18px]">
          <header className="flex flex-col gap-1">
            <h3 className="text-[19px] font-bold text-ink">Minha evolução</h3>
            <p className="text-[13px] text-muted">Nota em cada autoavaliação enviada</p>
          </header>
          <ColunasNotas
            rotuloAria="Evolução das minhas notas nesta equipe"
            itens={est.evolucao.flatMap((a, i, l) => (a.nota === undefined ? [] : [{ rotulo: a.titulo, valor: a.nota, destaque: i === l.length - 1 }]))}
          />
        </section>
        <div className="w-full shrink-0 lg:w-[350px]">
          <CompreensaoPorAutoavaliacao itens={est.evolucao} />
        </div>
      </div>
    </section>
  )
}

/* Lista geral de autoavaliações */

export function AlunoAutoavaliacoes() {
  const { autoavaliacoes, equipes: turmasAluno } = useStore()
  const f = useFiltroAutoavaliacoes(autoavaliacoes)
  return (
    <AppShell>
      <Banner variante="lista" titulo="Autoavaliações" subtitulo="Aqui você responde às autoavaliações das suas equipes e acompanha as que já enviou." />
      <Toolbar>
        <div className="flex flex-wrap items-center gap-3">
          <SearchBox value={f.busca} onChange={f.setBusca} placeholder="Buscar autoavaliações..." />
          <FilterSelect label="Equipe" all="Todas" value={f.turma} onChange={f.setTurma} options={turmasAluno.map((t) => t.nome)} />
          <FilterSelect label="Status" value={f.status} onChange={f.setStatus} options={Object.values(ROTULO_STATUS_ALUNO)} />
        </div>
        <SortButton icon={sortIcon} label="Prazo" onClick={() => f.setAsc((v) => !v)} />
      </Toolbar>
      <ListaAutoavaliacoes itens={f.itens} mostrarTurma />
    </AppShell>
  )
}


function FaixaProgresso({ a }: { a: AutoavaliacaoAluno }) {
  const feitas = totalRespondidas(a)
  const pct = a.perguntas.length ? (feitas / a.perguntas.length) * 100 : 0
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white p-4">
      <StatusAlunoPill status={a.status} />
      <span className="text-[16px] text-muted">{a.prazo ? `Prazo: ${a.prazo}` : 'Sem prazo definido'}</span>
      <div className="relative h-8 min-w-[240px] flex-1 overflow-hidden rounded-lg border border-card-line bg-white">
        <div className="absolute inset-y-0 left-0 bg-[#e6dacd]" style={{ width: `${pct}%` }} />
        <span className="relative flex h-full items-center justify-center text-[14px] font-medium text-ink">{`${feitas}/${a.perguntas.length} perguntas respondidas`}</span>
      </div>
    </div>
  )
}

/* Detalhe da autoavaliação */

export function AlunoAutoavaliacaoDetalhe() {
  const { id } = useParams()
  const { autoavaliacoes, equipes: turmasAluno } = useStore()
  const turmaDe = (id: string): Equipe | undefined => turmasAluno.find((t) => t.id === id)
  const a = autoavaliacoes.find((x) => x.id === id)
  if (!a) return <Navigate to="/aluno/autoavaliacoes" replace />
  const turma = turmaDe(a.turmaId)
  const base = `/aluno/autoavaliacoes/${a.id}`
  return (
    <AppShell voltar={{ para: '/aluno/autoavaliacoes', rotulo: 'Autoavaliações' }}>
      <Banner titulo={a.titulo} subtitulo={turma ? `${turma.nome} - ${turma.periodo}` : undefined}>
        {a.status === 'respondido' ? (
          <BannerStat rotulo="Minha nota" valor={a.nota === undefined ? 'Em análise' : `${formatarNota(a.nota)}/10`} />
        ) : (
          <BannerStat rotulo="Prazo" valor={a.prazo ?? 'Sem prazo'} />
        )}
      </Banner>
      {a.status === 'respondido' && (
        <TabBar
          tabs={[
            { to: base, label: 'Minhas respostas', end: true },
            { to: `${base}/resultado`, label: 'Resultado' },
          ]}
        />
      )}
      <Outlet context={a} />
    </AppShell>
  )
}

export function AlunoRespostas() {
  const a = useOutletContext<AutoavaliacaoAluno>()
  if (editavel(a.status)) return <Responder a={a} />
  if (a.status === 'encerrado') {
    return (
      <div className="flex flex-col items-start gap-2 rounded-xl border border-line bg-white p-6">
        <StatusAlunoPill status="encerrado" />
        <p className="text-[16px] text-ink">
          {`O prazo desta autoavaliação terminou${a.prazo ? ` em ${a.prazo}` : ''} e ela ficou sem resposta.`}
        </p>
        <p className="text-[14px] text-muted">Se precisar responder, fale com o professor da equipe.</p>
      </div>
    )
  }
  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white p-4">
        <StatusAlunoPill status="respondido" />
        <span className="text-[16px] text-muted">{`Enviado em ${a.enviadoEm}. As respostas enviadas não podem ser alteradas.`}</span>
      </div>
      <div className="flex flex-col gap-6 rounded-xl border border-line bg-white p-6">
        {a.perguntas.map((p, i) => (
          <PerguntaCard key={p.id} pergunta={p} indice={i} marcadas={a.respostas[p.id] ?? []} mostrarGabarito={a.mostrarGabarito && !!p.gabarito} />
        ))}
        {a.notaGeral !== undefined && <SliderNotaGeral value={a.notaGeral} leitura />}
      </div>
    </>
  )
}

function Responder({ a }: { a: AutoavaliacaoAluno }) {
  const { salvarResposta, enviarAutoavaliacao } = useStore()
  const navigate = useNavigate()
  const [etapa, setEtapa] = useState<'responder' | 'revisar'>('responder')
  const [confirmar, setConfirmar] = useState(false)
  const [observacao, setObservacao] = useState('')
  const [notaGeral, setNotaGeral] = useState<number>()
  const pronta = completa(a) && notaGeral !== undefined

  async function enviar() {
    const ok = await enviarAutoavaliacao(a.id, observacao.trim() || undefined, notaGeral)
    setConfirmar(false)
    if (ok) navigate(`/aluno/autoavaliacoes/${a.id}/resultado`)
  }

  if (etapa === 'revisar') {
    return (
      <>
        <section className="flex flex-col gap-4 rounded-xl border border-line bg-white p-6">
          <header className="flex flex-col gap-1">
            <h2 className="text-[24px] font-bold text-ink">Revise suas respostas</h2>
            <p className="text-[14px] text-muted">Confira antes de enviar. Depois do envio não é possível alterar.</p>
          </header>
          <ol className="flex flex-col gap-3">
            {a.perguntas.map((p, i) => {
              const marcadas = a.respostas[p.id] ?? []
              return (
                <li key={p.id} className="flex flex-col gap-1 rounded-lg border border-line bg-page p-3">
                  <p className="text-[16px] font-semibold text-ink">{`${i + 1}. ${p.enunciado}`}</p>
                  {respondida(p, a.respostas) ? (
                    <p className="text-[16px] text-card-sec">{marcadas.map((j) => p.opcoes[j]).join(' • ')}</p>
                  ) : (
                    <p role="alert" className="text-[14px] font-semibold text-diff-c">
                      Sem resposta
                    </p>
                  )}
                </li>
              )
            })}
          </ol>
          <div className="flex flex-col gap-1">
            <label htmlFor="observacao" className="text-[16px] font-semibold text-ink">
              Observações (opcional)
            </label>
            <textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Comentários ou dúvidas para o professor"
              className="rounded-lg border border-line-input bg-white px-3 py-2 text-[16px] text-ink outline-none focus-visible:border-ink"
            />
          </div>
          <SliderNotaGeral value={notaGeral} leitura />
        </section>
        <div className="flex w-full max-w-[520px] flex-col gap-2">
          <div className="flex gap-3">
            <ButtonBrown disabled={!pronta} onClick={() => setConfirmar(true)} className="disabled:cursor-not-allowed disabled:opacity-50">
              Enviar
            </ButtonBrown>
            <ButtonGhost onClick={() => setEtapa('responder')}>Voltar e editar</ButtonGhost>
          </div>
          {!pronta && <p className="text-[14px] text-muted">Responda todas as perguntas para poder enviar.</p>}
        </div>
        {confirmar && (
          <Modal title="Enviar respostas" icon="send" onClose={() => setConfirmar(false)}>
            <p className="text-center text-[16px] text-[#555]">
              Depois de enviadas, as respostas não poderão ser alteradas. Deseja enviar agora?
            </p>
            <div className="flex w-full gap-3">
              <ButtonBrown onClick={enviar}>Enviar</ButtonBrown>
              <ButtonGhost onClick={() => setConfirmar(false)}>Cancelar</ButtonGhost>
            </div>
          </Modal>
        )}
      </>
    )
  }

  return (
    <>
      <FaixaProgresso a={a} />
      <div className="flex flex-col gap-6 rounded-xl border border-line bg-white p-6">
        {a.perguntas.map((p, i) => (
          <PerguntaCard key={p.id} pergunta={p} indice={i} marcadas={a.respostas[p.id] ?? []} onChange={(m) => salvarResposta(a.id, p.id, m)} />
        ))}
        <SliderNotaGeral value={notaGeral} onChange={setNotaGeral} />
      </div>
      <div className="flex w-full max-w-[520px] flex-col gap-2">
        <div className="flex gap-3">
          <ButtonBrown disabled={!pronta} onClick={() => setEtapa('revisar')}>Revisar respostas</ButtonBrown>
        </div>
        <p className="text-[14px] text-muted">
          {notaGeral === undefined ? 'Selecione sua nota geral antes de revisar.' : 'Suas respostas são salvas automaticamente enquanto você responde.'}
        </p>
      </div>
    </>
  )
}

export function AlunoResultado() {
  const a = useOutletContext<AutoavaliacaoAluno>()
  const { autoavaliacoes } = useStore()
  const [pesquisaAberta, setPesquisaAberta] = useState(false)
  if (a.status !== 'respondido') return <Navigate to={`/aluno/autoavaliacoes/${a.id}`} replace />
  const daTurma = estatisticas(autoavaliacoes.filter((x) => x.turmaId === a.turmaId)).evolucao
  const notasDaEquipe = daTurma.flatMap((item) => (item.nota === undefined ? [] : [item.nota]))
  const mediaGeral = calcularMediaAvaliacoes(notasDaEquipe)
  const acertos = a.perguntas.filter((p) => p.gabarito && acertou(p, a.respostas)).length
  const comGabarito = a.perguntas.filter((p) => p.gabarito).length
  return (
    <>
      <CartaoPosEnvioSatisfacao onAvaliar={() => setPesquisaAberta(true)} />
      {pesquisaAberta && (
        <PesquisaSatisfacaoModal
          onClose={() => setPesquisaAberta(false)}
          gatilho="pos-envio"
        />
      )}
      <section className="flex flex-col gap-4 rounded-xl border border-line bg-white p-[22px]">
      <header className="flex flex-col gap-1">
        <h2 className="text-[24px] font-bold text-ink">Meu resultado</h2>
        <p className="text-[13px] text-muted">{`Enviado em ${a.enviadoEm}`}</p>
      </header>
      <div className="flex flex-wrap gap-3.5">
        <KpiCard className="min-w-[200px] gap-1" titulo="Minha nota" valor={a.nota === undefined ? 'Em análise' : `${formatarNota(a.nota)}/10`} detalhe="Nota desta autoavaliação" />
        <KpiCard
          className="min-w-[200px] gap-1"
          titulo="Compreensão"
          valor={a.compreensao ? <DifficultyLetter letra={a.compreensao} className="text-[25px]" /> : 'Em análise'}
          detalhe="Nível de dificuldade identificado"
        />
        <KpiCard
          className="min-w-[200px] gap-1"
          titulo="Acertos"
          valor={a.mostrarGabarito ? `${acertos}/${comGabarito}` : 'Não liberado'}
          detalhe={a.mostrarGabarito ? 'Veja o gabarito em "Minhas respostas"' : 'O professor decide quando liberar o gabarito'}
        />
        <KpiCard
          className="min-w-[200px] gap-1"
          titulo="Média geral"
          valor={mediaGeral === undefined ? '—' : `${formatarNota(mediaGeral)}/10`}
          destaque
          detalhe="Média das suas notas na equipe"
        />
      </div>
      {a.observacao && (
        <section aria-label="Minha observação" className="flex flex-col gap-2 rounded-xl border border-line bg-white p-[18px]">
          <h3 className="text-[19px] font-bold text-ink">Minha observação</h3>
          <p className="text-[16px] text-ink">{`"${a.observacao}"`}</p>
          {a.respostaProfessor ? (
            <div className="rounded-lg border border-line-input bg-panel p-3">
              <p className="text-[14px] font-semibold text-ink">Resposta do professor</p>
              <p className="text-[16px] text-ink">{a.respostaProfessor}</p>
            </div>
          ) : (
            <p className="text-[14px] text-muted">O professor ainda não respondeu.</p>
          )}
        </section>
      )}
      <section className="flex flex-col gap-3 rounded-xl border border-line bg-panel p-[18px]">
        <header className="flex flex-col gap-1">
          <h3 className="text-[19px] font-bold text-ink">Minha evolução nesta equipe</h3>
          <p className="text-[13px] text-muted">Nota em cada autoavaliação enviada</p>
        </header>
        <ColunasNotas
          rotuloAria="Evolução das minhas notas nesta equipe"
          itens={daTurma.flatMap((x) => (x.nota === undefined ? [] : [{ rotulo: x.titulo, valor: x.nota, destaque: x.id === a.id }]))}
        />
      </section>
    </section>
    </>
  )
}

/* Desempenho (métricas do aluno) */

export function AlunoDesempenho() {
  const { autoavaliacoes, equipes: turmasAluno } = useStore()
  const turmaDe = (id: string): Equipe | undefined => turmasAluno.find((t) => t.id === id)
  const [periodo, setPeriodo] = useState('2026/02')
  const [turma, setTurma] = useState('')
  const escopo = autoavaliacoes
    .filter((a) => !turma || turmaDe(a.turmaId)?.nome === turma)
    .filter((a) => !periodo || turmaDe(a.turmaId)?.periodo === periodo)
  const est = estatisticas(escopo)
  const porTurma = turmasAluno.filter((t) => !turma || t.nome === turma).map((t) => {
    const e = estatisticas(escopo.filter((a) => a.turmaId === t.id))
    return { turma: t, nota: e.notaMedia }
  })
  return (
    <AppShell>
      <Banner variante="lista" titulo="Meu desempenho" subtitulo="Aqui você acompanha suas notas e sua evolução em todas as suas equipes, podendo escolher quais dados ver.">
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <span className="text-[18px]">Visão atual</span>
          <strong className="text-[22px] font-bold">{turma || 'Todas as equipes'}</strong>
        </div>
      </Banner>
      <Toolbar>
        <div className="flex flex-wrap items-center gap-3">
          <FilterSelect label="Período" value={periodo} onChange={setPeriodo} options={[...PERIODOS]} />
          <FilterSelect label="Equipe" all="Todas" value={turma} onChange={setTurma} options={turmasAluno.map((t) => t.nome)} />
        </div>
      </Toolbar>
      <section className="flex flex-col gap-[18px] rounded-xl border border-line bg-white p-5">
        <header className="flex flex-col gap-[3px]">
          <h2 className="text-[22px] font-bold text-ink">Visão geral</h2>
          <p className="text-[13px] text-muted">{`Consolidado das suas equipes · semestre ${periodo || '—'}`}</p>
        </header>
        <div className="flex flex-wrap gap-3.5">
          <KpiCard className="min-w-[200px] gap-[7px]" titulo="Participação" valor={`${est.participacao}%`} detalhe={`${est.respondidas} de ${est.total} respondidas`} detalheTamanho={13} />
          <KpiCard className="min-w-[200px] gap-[7px]" titulo="Para responder" valor={est.abertas} detalhe="Pendentes ou em andamento" detalheTamanho={13} />
          <KpiCard
            className="min-w-[200px] gap-[7px]"
            titulo="Média das avaliações"
            valor={est.notaMedia === undefined ? '—' : `${formatarNota(est.notaMedia)}/10`}
            detalhe="Média das notas enviadas"
            detalheTamanho={13}
          />
        </div>
        <div className="flex flex-col gap-[18px] lg:flex-row">
          <section className="flex min-w-0 flex-1 flex-col gap-3.5 rounded-xl border border-line bg-panel p-[18px]">
            <header className="flex flex-col gap-[3px]">
              <h3 className="text-[18px] font-bold text-ink">Desempenho por equipe</h3>
              <p className="text-[13px] text-muted">Sua nota média nas autoavaliações enviadas</p>
            </header>
            <ul className="flex flex-col gap-3">
              {porTurma.map(({ turma: t, nota }) => (
                <li key={t.id} className="flex flex-col gap-1.5">
                  <div className="flex flex-col text-[13px] text-ink">
                    <span className="font-semibold">{t.nome}</span>
                    <strong>{nota === undefined ? 'Sem dados' : `${formatarNota(nota)}/10`}</strong>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-track" role="progressbar" aria-label={t.nome} aria-valuenow={nota === undefined ? 0 : nota * 10} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full rounded-full" style={{ width: `${(nota ?? 0) * 10}%`, backgroundColor: t.cor }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <section className="flex w-full shrink-0 flex-col gap-3.5 rounded-xl border border-line bg-panel p-[18px] lg:w-[390px]">
            <header className="flex flex-col gap-[3px]">
              <h3 className="text-[18px] font-bold text-ink">Minha evolução</h3>
              <p className="text-[13px] text-muted">Nota em cada autoavaliação enviada</p>
            </header>
            <ColunasNotas
              rotuloAria="Evolução das minhas notas"
              itens={est.evolucao.flatMap((a, i, l) => (a.nota === undefined ? [] : [{ rotulo: a.titulo, valor: a.nota, destaque: i === l.length - 1 }]))}
            />
          </section>
        </div>
      </section>
    </AppShell>
  )
}

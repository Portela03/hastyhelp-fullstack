import { useMemo, useState } from 'react'
import { Navigate, Outlet, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import dotC from '../assets/figma/dot-c.svg'
import dotI from '../assets/figma/dot-i.svg'
import dotP from '../assets/figma/dot-p.svg'
import sortIcon from '../assets/figma/sort.svg'
import { AppShell, Banner, BannerStat, DataTable, Section, TabBar, Toolbar } from '../components/layout'
import { CriarEquipeModal, EditarEquipeModal, EditarFormularioModal } from '../components/modals'
import { Avatar, ButtonPrimary, DifficultyLetter, FilterSelect, KpiCard, Panel, ProgressBar, SearchBox, StatusPill, SortButton, TeamBadge, cx, OptionsMenu } from '../components/ui'
import { useApi } from '../api/use-api'
import { PERIODOS } from '../data/tipos'
import type { Dificuldade, Equipe, Formulario } from '../data/tipos'
import { useStore } from '../store'

/* Lista de equipes */
type TeamCardProps = {
  equipe: Equipe
  onEditar: (equipe: Equipe) => void
  onAlternarVisibilidade: (equipe: Equipe) => void
}

function TeamCard({ equipe, onEditar, onAlternarVisibilidade }: TeamCardProps) {
  const navigate = useNavigate()
  const { removerEquipe } = useStore()
  const abrir = () => navigate(`/equipes/${equipe.id}`)
  return (
    <article
      role="link"
      tabIndex={0}
      aria-label={`Abrir equipe ${equipe.nome}`}
      onClick={abrir}
      onKeyDown={(e) => e.key === 'Enter' && abrir()}
      className={cx(
        "team-card flex cursor-pointer flex-col gap-5 self-start rounded-lg border border-card-line bg-white p-3 drop-shadow-card",
        "transition duration-100",
        "hover:bg-card-hover hover:shadow-card-hover",
        "active:shadow-none"
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2.5">
          <span className="equipe-team-badge">
            <TeamBadge
              sigla={equipe.sigla}
              cor={equipe.cor}
              size={68}
              fontSize={32}
            />
          </span>
          <h2 className="min-w-0 flex-1 text-[16px] font-semibold tracking-[-0.64px] text-ink">{equipe.nome}</h2>
          <OptionsMenu
            label={`Opções da equipe ${equipe.nome}`}
            items={[
              {
                label: 'Editar',
                icon: 'edit',
                onClick: () => onEditar(equipe),
              },
              {
                label: equipe.oculta ? 'Desocultar' : 'Ocultar',
                icon: equipe.oculta ? 'visibility' : 'visibility_off',
                onClick: () => onAlternarVisibilidade(equipe),
              },
              {
                label: 'Excluir',
                icon: 'delete',
                destructive: true,
                onClick: () => {
                  if (window.confirm(`Excluir a equipe "${equipe.nome}"? Formulários e respostas dela serão apagados.`)) void removerEquipe(equipe.id)
                },
              },
            ]}
          />
        </div>
        <p className="text-[16px] leading-4 text-card-sec">{`${equipe.totalAlunos} Alunos • ${equipe.ultimoFormulario}`}</p>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-[16px] leading-4 text-card-sec">
          <span>Taxa de resposta:</span>
          <span>{equipe.taxaResposta}%</span>
        </div>
        <ProgressBar value={equipe.taxaResposta} label="Taxa de resposta" />
      </div>
    </article>
  )
}

export function Equipes() {
  const { equipes, atualizarEquipe } = useStore()  
  const [modal, setModal] = useState(false)
  const [busca, setBusca] = useState('')
  const [periodo, setPeriodo] = useState('')
  const [asc, setAsc] = useState(true)
  const [equipeEditando, setEquipeEditando] = useState<Equipe | null>(null)

  const equipesVisiveis = useMemo(() => {
    return equipes
      .filter((e) => !e.oculta)
      .filter((e) => e.nome.toLowerCase().includes(busca.toLowerCase()))
      .filter((e) => !periodo || e.periodo === periodo)
      .sort((a, b) => (asc ? 1 : -1) * a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [equipes, busca, periodo, asc])

  const equipesOcultas = useMemo(() => {
    return equipes
      .filter((e) => e.oculta)
      .filter((e) => e.nome.toLowerCase().includes(busca.toLowerCase()))
      .filter((e) => !periodo || e.periodo === periodo)
      .sort((a, b) => (asc ? 1 : -1) * a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [equipes, busca, periodo, asc])

  const alternarVisibilidade = (equipe: Equipe) => {
  atualizarEquipe(equipe.id, {
    oculta: !equipe.oculta,
  })
}

  return (
    <AppShell action={<ButtonPrimary icon="add" onClick={() => setModal(true)} className="!text-[18px]">Criar equipe</ButtonPrimary>}>
      <Banner titulo="Minhas Equipes" subtitulo="Bem-vindo(a) de volta! Aqui você acompanha o progresso e o engajamento das suas turmas com facilidade." />
      <Toolbar>
        <div className="flex flex-wrap items-center gap-3">
          <SearchBox value={busca} onChange={setBusca} placeholder="Buscar equipes..." />
          <FilterSelect label="Período" value={periodo} onChange={setPeriodo} options={[...PERIODOS]} />
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <SortButton icon={sortIcon} label={asc ? 'Alfabeticamente' : 'Alfabeticamente (Z-A)'} onClick={() => setAsc((v) => !v)} />
        </div>
      </Toolbar>
      <Section titulo="Equipes">
        {equipesVisiveis.length === 0 ? (
          <p className="text-[16px] text-muted">
            Nenhuma equipe encontrada.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2 xl:grid-cols-3">
            {equipesVisiveis.map((equipe) => (
              <TeamCard
                key={equipe.id}
                equipe={equipe}
                onEditar={setEquipeEditando}
                onAlternarVisibilidade={alternarVisibilidade}
              />
            ))}
          </div>
        )}
      </Section>
      {modal && (
        <CriarEquipeModal onClose={() => setModal(false)} />
      )}

      {equipesOcultas.length > 0 && (
      <Section
        titulo="Equipes ocultas"
        inicialmenteAberta={false}
      >
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2 xl:grid-cols-3">
          {equipesOcultas.map((equipe) => (
            <TeamCard
              key={equipe.id}
              equipe={equipe}
              onEditar={setEquipeEditando}
              onAlternarVisibilidade={alternarVisibilidade}
            />
          ))}
        </div>
      </Section>
)}

      {equipeEditando && (
        <EditarEquipeModal
          equipe={equipeEditando}
          onClose={() => setEquipeEditando(null)}
        />
      )}
    </AppShell>
  )
}

/* Detalhe da equipe */

export function EquipeDetalhe() {
  const { id } = useParams()
  const { equipes, atualizarEquipe, removerEquipe } = useStore()
  const navigate = useNavigate()
  const equipe = equipes.find((e) => e.id === id)
  const [editar, setEditar] = useState(false)
  if (!equipe) return <Navigate to="/equipes" replace />

  const base = `/equipes/${equipe.id}`
  return (
    <AppShell
      voltar={{ para: '/equipes', rotulo: 'Equipes' }}
      action={
        <div className="flex items-center gap-3">
          <ButtonPrimary icon="edit" onClick={() => setEditar(true)} className='!text-[16px]'> Editar equipe </ButtonPrimary>

          <OptionsMenu
            label={`Opções da equipe ${equipe.nome}`}
            items={[
              {
                label: equipe.oculta ? 'Desocultar equipe' : 'Ocultar equipe',
                icon: equipe.oculta ? 'visibility' : 'visibility_off',
                onClick: () => {
                  atualizarEquipe(equipe.id, {
                    oculta: !equipe.oculta,
                  })
                },
              },
              {
                label: 'Excluir equipe',
                icon: 'delete',
                destructive: true,
                onClick: async () => {
                  if (!window.confirm(`Excluir a equipe "${equipe.nome}"? Formulários e respostas dela serão apagados.`)) return
                  await removerEquipe(equipe.id)
                  navigate('/equipes', { replace: true })
                },
              },
            ]}
          />
        </div>
      }
    >   
    <Banner
        titulo={equipe.nome}
        leading={<TeamBadge sigla={equipe.sigla} cor={equipe.cor} size={75} fontSize={30} />}
        subtitulo={`${equipe.docente} • ${equipe.totalAlunos} alunos`}
      >
        <BannerStat rotulo="Domínio médio" valor={`${equipe.dominioMedio}%`} />
        <BannerStat rotulo="Engajamento" valor={`${equipe.engajamento}%`} />
      </Banner>
      <TabBar
        tabs={[
          { to: base, label: 'Formulários', end: true },
          { to: `${base}/alunos`, label: 'Alunos' },
          { to: `${base}/resumo`, label: 'Resumo' },
        ]}
      />
      <Outlet context={equipe} />
      {editar && <EditarEquipeModal equipe={equipe} onClose={() => setEditar(false)} />}
    </AppShell>
  )
}

function useEquipe() {
  return useOutletContext<Equipe>()
}

/** Itens de menu para mudar o status conforme as transições permitidas (R-25). */
export function acoesDeStatus(f: Formulario, mudar: (status: Formulario['status']) => void) {
  const item = (label: string, icon: string, status: Formulario['status']) => ({ label, icon, onClick: () => mudar(status) })
  switch (f.status) {
    case 'rascunho':
      return [item('Publicar agora', 'publish', 'aberto')]
    case 'agendado':
      return [item('Postar agora', 'publish', 'aberto')]
    case 'aberto':
      return [item('Fechar formulário', 'visibility_off', 'fechado'), item('Marcar como concluído', 'task_alt', 'concluido')]
    case 'fechado':
      return [item('Reabrir formulário', 'visibility', 'aberto'), item('Marcar como concluído', 'task_alt', 'concluido')]
    default:
      return []
  }
}

export function EquipeFormularios() {
  const equipe = useEquipe()
  const navigate = useNavigate()
  const { formularios, atualizarFormulario, removerFormulario, executar } = useStore()
  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState('')
  const [asc, setAsc] = useState(false)
  const [formularioEditando, setFormularioEditando] = useState<Formulario | null>(null)

  const linhas = formularios
    .filter((formulario) => formulario.equipeId === equipe.id)
    .filter((formulario) => formulario.titulo.toLowerCase().includes(busca.toLowerCase()))
    .filter((formulario) => !status || formulario.status === status)

  const ordenadas = asc ? [...linhas].reverse() : linhas

  const abrirFormulario = (id: string) => {
    navigate(`/avaliacoes/${id}`)
  }

  return (
    <>
      <Toolbar>
        <div className="flex flex-wrap items-center gap-3">
          <SearchBox
            value={busca}
            onChange={setBusca}
            placeholder="Buscar formulários..."
          />

          <FilterSelect
            label="Status"
            value={status}
            onChange={setStatus}
            options={['agendado', 'rascunho', 'fechado', 'aberto', 'concluido']}
          />
        </div>

        <SortButton
          icon={sortIcon}
          label="Data de publicação"
          onClick={() => setAsc((v) => !v)}
        />
      </Toolbar>

      {ordenadas.length === 0 ? (
        <p className="text-[16px] text-muted">
          Nenhum formulário encontrado para esta equipe.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {ordenadas.map((formulario) => {
            const percentual = formulario.total
              ? (formulario.respostas / formulario.total) * 100
              : 0

            return (
              <li
                key={formulario.id}
                role="link"
                tabIndex={0}
                aria-label={`Abrir formulário ${formulario.titulo}`}
                onClick={() => abrirFormulario(formulario.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    abrirFormulario(formulario.id)
                  }
                }}
                className={cx(
                  'flex cursor-pointer flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-card-line bg-white p-3',
                  'transition duration-100',
                  'hover:bg-card-hover hover:shadow-card-hover',
                  'active:shadow-none',
                )}
              >
                <div className="flex min-w-[240px] flex-1 flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <StatusPill status={formulario.status} />

                    <h3 className="min-w-0 text-[20px] font-semibold text-ink">
                      {formulario.titulo}
                    </h3>
                  </div>

                  <div className="flex max-w-[342px] flex-col gap-1">
                    <div className="flex justify-between text-[16px] text-muted">
                      <span>Taxa de resposta:</span>
                      <span>
                        {`${formulario.respostas}/${formulario.total}`}
                      </span>
                    </div>

                    <div className="h-3 overflow-hidden rounded-lg bg-white shadow-[inset_0_0_1px_rgba(0,0,0,0.45)]">
                      <div
                        className="h-full rounded-lg bg-[#dcd8d0]"
                        style={{ width: `${percentual}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-center text-[16px] text-ink">
                  <div>
                    <p>Domínio médio</p>
                    <p>{formulario.dominioMedio != null ? `${formulario.dominioMedio}%` : '—'}</p>
                  </div>

                  <div>
                    <p>Maior dificuldade</p>
                    {formulario.maiorDificuldade ? (
                      <DifficultyLetter 
                      letra={formulario.maiorDificuldade} 
                      className="!font-normal"/>
                    ) : (
                      <p>—</p>
                    )}
                  </div>

                  <div>
                    <p>Data de criação</p>
                    <p>{formulario.data}</p>
                  </div>

                  <OptionsMenu
                    label={`Opções do formulário ${formulario.titulo}`}
                    items={[
                      {
                        label: 'Editar',
                        icon: 'edit',
                        onClick: () => setFormularioEditando(formulario),
                      },

                      ...acoesDeStatus(formulario, (status) => executar(() => atualizarFormulario(formulario.id, { status }))),

                      {
                        label: 'Excluir',
                        icon: 'delete',
                        destructive: true,
                        onClick: () => {
                          if (window.confirm(`Excluir o formulário "${formulario.titulo}"? As respostas dos alunos também serão apagadas.`)) void removerFormulario(formulario.id)
                        },
                      },
                    ]}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {formularioEditando && (
        <EditarFormularioModal
          formulario={formularioEditando}
          onClose={() => setFormularioEditando(null)}
        />
      )}
    </>
  )
}

function Iniciais({ nome, cor, iniciais }: { nome: string; cor: string; iniciais: string }) {
  return (
    <div className="flex items-center gap-3 font-semibold">
      <Avatar letra={iniciais} cor={cor} size={32} />
      {nome}
    </div>
  )
}

function AlunosSecao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return <Section titulo={titulo}>{children}</Section>
}

const CORES_AVATAR = ['#a67b5b', '#3b82f6', '#ef4444', '#8b5cf6', '#15593c', '#df8bb3']

const iniciaisDe = (nome: string) =>
  nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

interface AlunosTurmaDTO {
  docentes: Array<{ id: string; nome: string }>
  alunos: Array<{ id: string; nome: string; dominio: number | null; enviados: string }>
}

function LinkDeConvite({ codigo }: { codigo: string }) {
  const [copiado, setCopiado] = useState(false)
  const link = `${window.location.origin}/convite/${codigo}`
  async function copiar() {
    try {
      await navigator.clipboard.writeText(link)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      /* sem permissão de área de transferência: o link continua visível para copiar à mão */
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line-input bg-white p-3">
      <code aria-label="Link de convite" className="min-w-0 flex-1 break-all text-[16px] text-ink">
        {link}
      </code>
      <button type="button" onClick={copiar} className="cursor-pointer rounded-lg border border-[#c9b8a0] bg-white px-3 py-1 text-[16px] text-[#a08d77]">
        {copiado ? 'Copiado!' : 'Copiar link'}
      </button>
    </div>
  )
}

export function EquipeAlunos() {
  const equipe = useEquipe()
  const { dados, erro } = useApi<AlunosTurmaDTO>(`/turmas/${equipe.id}/alunos`, equipe)
  if (erro) return <p role="alert" className="text-[16px] text-diff-c">{erro}</p>
  const docentes = dados?.docentes ?? []
  const alunos = dados?.alunos ?? []
  return (
    <div className="flex flex-col gap-4">
      {equipe.codigoConvite && (
        <AlunosSecao titulo="Convidar alunos">
          <LinkDeConvite codigo={equipe.codigoConvite} />
        </AlunosSecao>
      )}
      <AlunosSecao titulo={`Docentes (${docentes.length})`}>
        <DataTable colunas={[{ titulo: 'Aluno' }]} linhas={docentes.map((d) => [<Iniciais key={d.id} nome={d.nome} cor="#15593c" iniciais={iniciaisDe(d.nome)} />])} />
      </AlunosSecao>
      <AlunosSecao titulo={`Alunos (${alunos.length})`}>
        {alunos.length === 0 ? (
          <p className="text-[16px] text-muted">Nenhum aluno na equipe ainda. Compartilhe o link de convite acima.</p>
        ) : (
          <DataTable
            cabecalhoAlto
            colunas={[
              { titulo: 'Aluno' },
              { titulo: 'Domínio médio', largura: '200px', centro: true },
              { titulo: 'Formulários enviados', largura: '200px', centro: true },
            ]}
            linhas={alunos.map((a, i) => [
              <Iniciais key="n" nome={a.nome} cor={CORES_AVATAR[i % CORES_AVATAR.length] ?? '#a67b5b'} iniciais={iniciaisDe(a.nome)} />,
              <strong key="d">{a.dominio === null ? '—' : `${a.dominio}%`}</strong>,
              a.enviados,
            ])}
          />
        )}
      </AlunosSecao>
    </div>
  )
}

interface ResumoTurmaDTO {
  engajamento: number
  alunosQueRespondeuTudo: number
  notaMedia: number | null
  desempenhoGeral: number | null
  maiorDificuldade: Dificuldade | null
  distribuicao: Record<Dificuldade, number>
  evolucao: Array<{ titulo: string; valor: number | null }>
  maiorDificuldadePorFormulario: Array<{ titulo: string; nivel: Dificuldade }>
}

const formatarDecimal = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export function EquipeResumo() {
  const equipe = useEquipe()
  const { dados: r, erro } = useApi<ResumoTurmaDTO>(`/turmas/${equipe.id}/resumo`, equipe)
  const { formularios } = useStore()
  if (erro) return <p role="alert" className="text-[16px] text-diff-c">{erro}</p>
  if (!r) return <p role="status" className="text-[16px] text-muted">Carregando…</p>

  const atividades: Array<{ rotulo: string; valor?: number; cor?: string }> = r.evolucao.map((e, i) => ({
    rotulo: e.titulo,
    valor: e.valor ?? 0,
    cor: i === r.evolucao.length - 1 ? '#34785c' : '#8fcbc5',
  }))
  while (atividades.length < 5) atividades.push({ rotulo: 'A definir' })
  const { I, P, C } = r.distribuicao
  const temDistribuicao = I + P + C > 0
  const donutFundo = temDistribuicao
    ? `conic-gradient(var(--color-diff-i) 0 ${I}%, var(--color-diff-p) ${I}% ${I + P}%, var(--color-diff-c) ${I + P}% 100%)`
    : 'var(--color-track)'
  const ultimoComDados = formularios.filter((f) => f.equipeId === equipe.id && f.maiorDificuldade).at(0)

  return (
    <section className="flex flex-col gap-2 rounded-xl border border-line bg-white p-[22px]">
      <header className="flex flex-col gap-1">
        <h2 className="text-[24px] font-bold text-ink">Resumo da equipe</h2>
        <p className="text-[13px] text-muted">Visão coletiva com desempenho, evolução e pontos que precisam de atenção.</p>
      </header>
      <div className="flex flex-wrap gap-3.5">
        <KpiCard className="min-w-[200px] gap-1" titulo="Engajamento" valor={`${r.engajamento}%`} detalhe={`${r.alunosQueRespondeuTudo} alunos responderam tudo`} />
        <KpiCard className="min-w-[200px] gap-1" titulo="Valor médio da nota" valor={r.notaMedia === null ? '—' : `${formatarDecimal(r.notaMedia)}/10`} detalhe="Autoavaliação geral da turma" />
        <KpiCard className="min-w-[200px] gap-1" titulo="Desempenho geral" valor={r.desempenhoGeral === null ? '—' : `${r.desempenhoGeral > 0 ? '+' : ''}${r.desempenhoGeral}%`} detalhe="Variação entre o primeiro e o último formulário" />
        <KpiCard
          className="min-w-[200px] gap-1"
          titulo="Maior dificuldade"
          valor={r.maiorDificuldade ? <span className="font-plex-mono text-[25px]">{r.maiorDificuldade}</span> : '—'}
          detalhe={ultimoComDados ? `Formulário: ${ultimoComDados.titulo}` : 'Nível mais frequente'}
        />
      </div>
      <div className="flex flex-col gap-4 lg:flex-row">
        <section className="flex min-h-[290px] min-w-0 flex-1 flex-col gap-3 rounded-xl border border-line bg-panel p-[18px]">
          <header className="flex flex-col gap-1">
            <h3 className="text-[19px] font-bold text-ink">Evolução do desempenho</h3>
            <p className="text-[13px] text-muted">Média da equipe nas últimas cinco atividades</p>
          </header>
          <div role="img" aria-label="Evolução do desempenho nas últimas cinco atividades" className="flex flex-1 flex-col justify-end">
            <div className="flex h-[150px] items-end justify-around border-b border-line">
              {atividades.map((a, i) => (
                <div key={i} className="flex w-[72px] flex-col items-center gap-1">
                  <span className={cx('text-[12px] font-bold', a.valor !== undefined ? 'text-ink' : 'text-bar-gray')}>{a.valor !== undefined ? `${a.valor}%` : '??%'}</span>
                  <div className="w-8 rounded-t-md" style={{ height: a.valor !== undefined ? Math.max(a.valor, 2) : 9, backgroundColor: a.cor ?? '#bebebe' }} />
                </div>
              ))}
            </div>
            <div className="mt-1 flex justify-around text-[11px] text-muted">
              {atividades.map((a, i) => (
                <span key={i} className="w-[72px] truncate text-center" title={a.rotulo}>
                  {a.rotulo}
                </span>
              ))}
            </div>
          </div>
        </section>
        <div className="flex w-full shrink-0 flex-col gap-4 lg:w-[350px]">
          <section className="flex flex-col gap-1.5 rounded-xl border border-line bg-white p-[18px]">
            <h3 className="text-[16px] font-semibold text-ink">Distribuição de Dificuldade</h3>
            <div className="flex items-center justify-center gap-6">
              <div
                role="img"
                aria-label="Gráfico de rosca da distribuição de dificuldade"
                className="size-[100px] shrink-0 rounded-full"
                style={{ background: donutFundo, mask: 'radial-gradient(circle, transparent 38%, #000 39%)', WebkitMask: 'radial-gradient(circle, transparent 38%, #000 39%)' }}
              />
              <ul className="flex flex-col gap-2 text-[12px] text-ink">
                <li className="flex items-center gap-2">
                  <img src={dotI} alt="" className="size-2" />
                  <span>
                    <DifficultyLetter letra="I" className="font-plex-mono font-normal" /> ({I}%)
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <img src={dotP} alt="" className="size-2" />P ({P}%)
                </li>
                <li className="flex items-center gap-2">
                  <img src={dotC} alt="" className="size-2" />C ({C}%)
                </li>
              </ul>
            </div>
          </section>
          <Panel titulo="Maior dificuldade por formulário" subtitulo="Os cinco últimos serão considerados" tituloTamanho={19}>
            {r.maiorDificuldadePorFormulario.length === 0 ? (
              <p className="text-[13px] text-muted">Ainda não há respostas enviadas.</p>
            ) : (
              <ul className="-mt-2 flex flex-col gap-1.5 text-[13px] font-semibold text-ink">
                {r.maiorDificuldadePorFormulario.map((f) => (
                  <li key={f.titulo}>
                    {f.titulo}: <DifficultyLetter letra={f.nivel} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </section>
  )
}

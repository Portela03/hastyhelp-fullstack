import { useMemo, useState } from 'react'
import { Navigate, Outlet, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import sortIcon from '../assets/figma/sort.svg'
import { AppShell, Banner, DataTable, Section, TabBar, Toolbar } from '../components/layout'
import { CriarFormularioModal, EditarFormularioModal, ExcluirModal } from '../components/modals'
import { PreviaAlunoModal, RespostasDoAlunoModal } from '../components/modals-alunos'
import { Avatar, ButtonPrimary, DifficultyLetter, FilterSelect, KpiCard, Panel, SearchBox, SortButton, StatusPill, TeamBadge, cx, OptionsMenu } from '../components/ui'
import { api } from '../api/client'
import { useApi } from '../api/use-api'
import { PERIODOS } from '../data/tipos'
import type { Dificuldade, Formulario, StatusFormulario } from '../data/tipos'
import { acoesDeStatus } from './Equipes'
import { useStore } from '../store'

const ROTULO_STATUS: Record<StatusFormulario, string> = { agendado: 'Agendado', rascunho: 'Rascunho', fechado: 'Fechado', aberto: 'Aberto', concluido: 'Concluído' }

/* Lista */

function FormRow({ form }: { form: Formulario }) {
  const { equipes, atualizarFormulario, removerFormulario, executar } = useStore()
  const navigate = useNavigate()
  const equipe = equipes.find((e) => e.id === form.equipeId)
  const abrir = () => navigate(`/avaliacoes/${form.id}`)
  const [editar, setEditar] = useState(false)
  const rascunho = form.status === 'rascunho'
  const [formularioExcluindo, setFormularioExcluindo] = useState<Formulario | null>(null)
  
  return (
    <>
      <li
        role="link"
        tabIndex={0}
        aria-label={`Abrir formulário ${form.titulo}`}
        onClick={abrir}
        onKeyDown={(e) => e.key === 'Enter' && abrir()}
        className={cx(
          "form-card flex cursor-pointer items-center gap-3 rounded-lg border border-card-line bg-white p-3",
          "transition duration-100",
          "hover:bg-card-hover hover:shadow-card-hover",
          "active:shadow-none"
        )}
      >
        {!rascunho && equipe && (
          <span className="form-team-badge">
            <TeamBadge
              sigla={equipe.sigla}
              cor={equipe.cor}
              size={68}
              fontSize={32}
            />
          </span>
        )}      
        <div className="flex min-w-0 flex-1 items-stretch justify-between gap-3">
          <div className="flex min-w-0 flex-col justify-center gap-1">
            <h2 className="text-[16px] font-semibold text-ink">{form.titulo}</h2>
            {rascunho ? (
              <p className="text-[16px] text-card-sec">{`Última modificação: ${form.data}`}</p>
            ) : (
              <>
                <p className="flex flex-wrap items-center gap-x-[5px] text-[16px] text-placeholder">
                  {equipe?.nome}
                  <span className="font-inter text-[12px]">•</span>
                  {form.periodo}
                </p>
                <p className="text-[16px] text-card-sec">{`${form.respostas}/${form.total} respostas`}</p>
              </>
            )}
          </div>
          <div className="flex shrink-0 items-center justify-center gap-2">
            <div className="flex h-full flex-col items-center justify-between">
              <span className="form-status">
                <StatusPill status={form.status} />
              </span>

              {!rascunho && (
                <span className="mt-1 text-center text-[16px] text-ink">
                  {form.data}
                </span>
              )}
            </div>

            <OptionsMenu
              label={`Opções do formulário ${form.titulo}`}
              items={[
                {
                  label: 'Editar',
                  icon: 'edit',
                  onClick: () => setEditar(true),
                },
                ...acoesDeStatus(form, (status) =>
                  executar(() => atualizarFormulario(form.id, { status })),
                ),
                {
                  label: 'Excluir',
                  icon: 'delete',
                  destructive: true,
                  onClick: () => setFormularioExcluindo(form),
                },
              ]}
            />
          </div>
        </div>
      </li>

      {editar && (
        <EditarFormularioModal
          formulario={form}
          onClose={() => setEditar(false)}
        />
      )}

      {formularioExcluindo && (
        <ExcluirModal
          tipo="formulario"
          nome={formularioExcluindo.titulo}
          onClose={() => setFormularioExcluindo(null)}
          onConfirmar={() => {
            void removerFormulario(formularioExcluindo.id)
            setFormularioExcluindo(null)
          }}
        />
      )}
    </>
  )
}

export function Formularios() {
  const { formularios, equipes } = useStore()
  const [modal, setModal] = useState(false)
  const [busca, setBusca] = useState('')
  const [turma, setTurma] = useState('')
  const [status, setStatus] = useState('')
  const [periodo, setPeriodo] = useState('')
  const [asc, setAsc] = useState(false)

  const lista = useMemo(() => {
    const filtrados = formularios
      .filter((f) => f.titulo.toLowerCase().includes(busca.toLowerCase()))
      .filter((f) => !turma || equipes.find((e) => e.id === f.equipeId)?.nome === turma)
      .filter((f) => !status || ROTULO_STATUS[f.status] === status)
      .filter((f) => !periodo || equipes.find((e) => e.id === f.equipeId)?.periodo === periodo)
    return asc ? [...filtrados].reverse() : filtrados
  }, [formularios, equipes, busca, turma, status, periodo, asc])

  const turmas = [...new Set(equipes.map((e) => e.nome))]

  return (
    <AppShell action={<ButtonPrimary icon="add" onClick={() => setModal(true)}   className="!bg-btn-brown hover:!bg-btn-brown-hover !text-[16px]">Criar formulário</ButtonPrimary>}>
      <Banner variante="lista" titulo="Formulários" subtitulo="Aqui você acompanha o desempenho de cada formulário e pode acessar seus rascunhos e agendamentos." />
      {formularios.length > 0 && (
        <>
          <Toolbar>
            <div className="flex flex-wrap items-center gap-3">
              <SearchBox value={busca} onChange={setBusca} placeholder="Buscar formulários..." />
              <FilterSelect label="Turma" all="Todas" value={turma} onChange={setTurma} options={turmas} />
              <FilterSelect label="Status" value={status} onChange={setStatus} options={Object.values(ROTULO_STATUS)} />
              <FilterSelect label="Período" value={periodo} onChange={setPeriodo} options={[...PERIODOS]} />
            </div>
            <SortButton icon={sortIcon} label="Data de publicação" onClick={() => setAsc((v) => !v)} />
          </Toolbar>

          {lista.length === 0 ? (
                <p className="text-[16px] text-muted">
                  Nenhum formulário encontrado.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {lista.map((formulario) => (
                    <FormRow key={formulario.id} form={formulario} />
                  ))}
                </ul>
              )}
            </>
          )}

          {formularios.length === 0 && (
            <div className="flex min-h-[calc(100vh-260px)] flex-col items-center justify-center gap-4 p-6 text-center">
              <span
                className="material-icons-round !text-[56px] text-muted"
                aria-hidden="true"
              >
                description
              </span>

              <div className="flex max-w-[760px] flex-col gap-2">
                <h2 className="text-[20px] font-semibold text-ink">
                  Você ainda não possui formulários
                </h2>
                <p className="text-[16px] text-muted">
                  Crie seu primeiro formulário para avaliar a compreensão dos alunos
                  e acompanhar os resultados por equipe.
                </p>
              </div>

              <ButtonPrimary
                icon="add"
                onClick={() => setModal(true)}
                className="!bg-btn-brown hover:!bg-btn-brown-hover !text-[16px]"
              >
                Criar formulário
              </ButtonPrimary>
            </div>
          )}
      {modal && <CriarFormularioModal onClose={() => setModal(false)} />}
    </AppShell>
  )
}

/* Detalhe */

export function FormularioDetalhe() {
  const { id } = useParams()
  const { formularios, equipes, removerFormulario, atualizarFormulario, executar } = useStore()
  const navigate = useNavigate()
  const form = formularios.find((f) => f.id === id)
  const [editar, setEditar] = useState(false)
  const [previa, setPrevia] = useState(false)
  const [mensagem, setMensagem] = useState('')
  if (!form) return <Navigate to="/avaliacoes" replace />
  const equipe = equipes.find((e) => e.id === form.equipeId)
  const base = `/avaliacoes/${form.id}`
  const [formularioExcluindo, setFormularioExcluindo] = useState<Formulario | null>(null)

  const notificar = () =>
    executar(async () => {
      const r = await api<{ notificados: number }>('POST', `/formularios/${form.id}/notificar-pendentes`)
      setMensagem(r.notificados === 0 ? 'Nenhum aluno pendente para notificar.' : `${r.notificados} ${r.notificados === 1 ? 'aluno notificado' : 'alunos notificados'}.`)
    })

  return (
    <AppShell
      voltar={{ para: '/avaliacoes', rotulo: 'Avaliações' }}
      action={
        <div className="flex items-center gap-3">
          <ButtonPrimary icon="outgoing_mail" iconRound={false} className="!text-[18px]" aria-label="Notificar pendentes" onClick={notificar}>
            <span className="hidden sm:inline">Notificar pendentes</span>
          </ButtonPrimary>

          <OptionsMenu
            label={`Opções do formulário ${form.titulo}`}
            items={[
              {
                label: 'Editar formulário',
                icon: 'edit',
                onClick: () => setEditar(true),
              },
              { label: 'Ver como aluno', icon: 'visibility', onClick: () => setPrevia(true) },
              ...acoesDeStatus(form, (status) => executar(() => atualizarFormulario(form.id, { status }))),
              {
                label: 'Excluir formulário',
                icon: 'delete',
                destructive: true,
                onClick: () => setFormularioExcluindo(form),
              },
            ]}
          />
        </div>
      }
    >
      <Banner titulo={form.titulo} subtitulo={`${equipe?.nome ?? ''} - ${equipe?.periodo ?? form.periodo}`}>
        <div className="flex flex-col items-center text-[20px]">
          <span>Maior dificuldade</span>
          <strong>{form.maiorDificuldade ?? '—'}</strong>
        </div>
      </Banner>
      {mensagem && (
        <p role="status" className="text-[16px] text-ink">
          {mensagem}
        </p>
      )}
      <TabBar
        tabs={[
          { to: base, label: 'Formulário', end: true },
          { to: `${base}/alunos`, label: 'Alunos' },
          { to: `${base}/resumo`, label: 'Resumo' },
        ]}
      />
      <Outlet context={form} />
      {editar && <EditarFormularioModal formulario={form} onClose={() => setEditar(false)} />}
      {previa && <PreviaAlunoModal formulario={form} onClose={() => setPrevia(false)} />}
      {formularioExcluindo && (
        <ExcluirModal
          tipo="formulario"
          nome={formularioExcluindo.titulo}
          onClose={() => setFormularioExcluindo(null)}
          onConfirmar={async () => {
            await removerFormulario(formularioExcluindo.id)
            setFormularioExcluindo(null)
            navigate('/avaliacoes', { replace: true })
          }}
        />
      )}
    </AppShell>
  )
}

function useForm() {
  return useOutletContext<Formulario>()
}

export function FormularioPerguntas() {
  const form = useForm()
  const pct = form.total ? (form.respostas / form.total) * 100 : 0
  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white p-4">
        <StatusPill status={form.status} />
        <span className="text-[16px] text-muted">{form.status === 'rascunho' || form.status === 'agendado' ? 'Ainda não publicado' : `Publicado em ${form.publicadoEm ?? form.data}`}</span>
        <div className="relative h-8 min-w-[240px] flex-1 overflow-hidden rounded-lg border border-card-line bg-white">
          <div className="absolute inset-y-0 left-0 bg-[#e6dacd]" style={{ width: `${pct}%` }} />
          <span className="relative flex h-full items-center justify-center text-[14px] font-medium text-ink">
            {`${form.respostas}/${form.total} Alunos responderam`}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-6 rounded-xl border border-line bg-white p-6">
        {form.perguntas.map((p, i) => (
          <fieldset key={p.id} className="flex flex-col gap-3 rounded-xl border border-line bg-page p-4">
            <legend className="sr-only">{p.enunciado}</legend>
            <div className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-full bg-[#333] text-[16px] font-bold text-white">{i + 1}</span>
              <h2 className="text-[18px] font-semibold text-ink">{p.enunciado}</h2>
            </div>
            <ul className="flex flex-col gap-2">
              {p.opcoes.map((op, j) => (
                <li key={op}>
                  <label className="flex items-center gap-3 rounded-lg border border-line bg-white px-3 py-3 text-[16px] text-ink">
                    <input
                      type={p.tipo === 'unica' ? 'radio' : 'checkbox'}
                      name={p.id}
                      checked={p.marcadas.includes(j)}
                      readOnly
                      disabled
                      className="size-[18px] accent-[#333]"
                    />
                    {op}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        ))}
        {form.perguntas.length === 0 && <p className="text-[16px] text-muted">Este formulário ainda não tem perguntas.</p>}
      </div>
    </>
  )
}

function AlunoCell({ nome, cor, iniciais }: { nome: string; cor: string; iniciais: string }) {
  return (
    <div className="flex items-center gap-3 font-semibold">
      <Avatar letra={iniciais} cor={cor} size={32} />
      {nome}
    </div>
  )
}

const CORES_AVATAR = ['#a67b5b', '#3b82f6', '#ef4444', '#8b5cf6', '#15593c', '#df8bb3']
const corDe = (i: number) => CORES_AVATAR[i % CORES_AVATAR.length] ?? '#a67b5b'
const iniciaisDe = (nome: string) =>
  nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
const formatarNota = (n: number | null) => (n === null ? '—' : n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }))

interface AlunosFormularioDTO {
  responderam: Array<{ id: string; nome: string; nota: number | null; nivel: Dificuldade | null }>
  visualizaram: Array<{ id: string; nome: string }>
  pendentes: Array<{ id: string; nome: string }>
}

export function FormularioAlunos() {
  const navigate = useNavigate()
  const form = useForm()
  const { dados, erro } = useApi<AlunosFormularioDTO>(`/formularios/${form.id}/alunos`, form)
  const [respostasDe, setRespostasDe] = useState<{ id: string; nome: string } | null>(null)
  if (erro) return <p role="alert" className="text-[16px] text-diff-c">{erro}</p>
  if (!dados) return <p role="status" className="text-[16px] text-muted">Carregando…</p>
  const total = dados.responderam.length + dados.visualizaram.length + dados.pendentes.length
  const menu = (aluno: { id: string; nome: string }) => (
    <OptionsMenu key="m" label={`Ações de ${aluno.nome}`} items={[{ label: 'Ver respostas', icon: 'visibility', onClick: () => setRespostasDe(aluno) }]} />
  )
  const simples = (lista: Array<{ id: string; nome: string }>, deslocamento: number) =>
    lista.map((a, i) => [<AlunoCell key={a.id} nome={a.nome} cor={corDe(i + deslocamento)} iniciais={iniciaisDe(a.nome)} />, menu(a)])
    
    //Caso não haja alunos 
    if (total === 0) {
    return (
      <div className="flex min-h-[calc(100vh-420px)] flex-col items-center justify-center gap-4 p-6 text-center">
        <span
          className="material-icons-round !text-[56px] text-muted"
          aria-hidden="true"
        >
          group_add
        </span>

        <div className="flex max-w-[760px] flex-col gap-2">
          <h2 className="text-[20px] font-semibold text-ink">
            Esta turma ainda não possui alunos
          </h2>
          <p className="text-[15px] leading-relaxed text-muted max-w-md">
            Para convidar alunos, selecione uma equipe, abra a aba{" "}
            <span className="font-medium text-neutral-800">Alunos</span> e compartilhe o link de acesso.
          </p>
        </div>

        <ButtonPrimary
          icon="group_add"
          onClick={() => navigate(`/equipes/${form.equipeId}/alunos`)}
          className="!bg-btn-brown hover:!bg-btn-brown-hover !text-[18px]"
        >
          Adicionar alunos
        </ButtonPrimary>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {respostasDe && <RespostasDoAlunoModal nome={respostasDe.nome} caminho={`/formularios/${form.id}/alunos/${respostasDe.id}`} onClose={() => setRespostasDe(null)} />}
      <Section titulo={`Responderam (${dados.responderam.length}/${total})`}>
        {dados.responderam.length === 0 ? (
          <p className="px-3 py-2 text-[16px] text-muted">
            Nenhuma resposta enviada ainda.
          </p>
        ) : (
          <DataTable
            colunas={[
              { titulo: 'Aluno' },
              { titulo: 'Autoavaliação', largura: '200px', centro: true },
              { titulo: 'Maior Dificuldade', largura: '200px', centro: true },
              { titulo: 'Ação', largura: '120px', centro: true },
            ]}
            linhas={dados.responderam.map((a, i) => [
              <AlunoCell
                key={a.id}
                nome={a.nome}
                cor={corDe(i)}
                iniciais={iniciaisDe(a.nome)}
              />,
              <strong key="b">{formatarNota(a.nota)}</strong>,
              a.nivel
                ? <DifficultyLetter key="n" letra={a.nivel} className="!font-normal" />
                : '—',
              menu(a),
            ])}
          />
        )}
      </Section>

      <Section titulo={`Visualizaram (${dados.visualizaram.length}/${total})`}>
        {dados.visualizaram.length === 0 ? (
          <p className="px-3 py-2 text-[16px] text-muted">
            Nenhum aluno visualizou o formulário no momento.
          </p>
        ) : (
          <DataTable
            colunas={[
              { titulo: 'Aluno' },
              { titulo: 'Ação', largura: '120px', centro: true },
            ]}
            linhas={simples(dados.visualizaram, 2)}
          />
        )}
      </Section>

      <Section titulo={`Pendente (${dados.pendentes.length}/${total})`}>
        {dados.pendentes.length === 0 ? (
          <p className="px-3 py-2 text-[16px] text-muted">
            Nenhum aluno pendente.
          </p>
        ) : (
          <DataTable
            colunas={[
              { titulo: 'Aluno' },
              { titulo: 'Ação', largura: '120px', centro: true },
            ]}
            linhas={simples(dados.pendentes, 4)}
          />
        )}
      </Section>
    </div>
  )
}

const GRUPOS = [
  { letra: 'I', cor: 'bg-diff-i' },
  { letra: 'P', cor: 'bg-diff-p' },
  { letra: 'C', cor: 'bg-diff-c' },
] as const

interface ResumoFormularioDTO {
  respondidos: number
  total: number
  taxaResposta: number
  notaMedia: number | null
  totalObservacoes: number
  observacoes: Array<{ envioId: string; alunoId: string; aluno: string; texto: string; resposta: string | null; oculta: boolean }>
  distribuicao: Record<Dificuldade, number>
  maiorDificuldade: Dificuldade | null
  dificuldadesGerais: Array<{ titulo: string; total: number }>
  maiorDificuldadePergunta: { numero: number; enunciado: string } | null
}

type Observacao = ResumoFormularioDTO['observacoes'][number]

/** R-95/R-96: o professor responde e oculta/reexibe cada observação. */
function ObservacaoItem({ formularioId, o, aoMudar }: { formularioId: string; o: Observacao; aoMudar: () => Promise<void> }) {
  const { executar } = useStore()
  const [respondendo, setRespondendo] = useState(false)
  const [texto, setTexto] = useState(o.resposta ?? '')
  const moderar = (corpo: { resposta?: string | null; oculta?: boolean }) =>
    executar(async () => {
      await api('PATCH', `/formularios/${formularioId}/observacoes/${o.envioId}`, corpo)
      await aoMudar()
    })
  return (
    <li className={cx('flex flex-col gap-1.5 rounded-lg border border-line bg-white p-3', o.oculta && 'opacity-70')}>
      <p className="text-[12px] font-semibold text-muted">{o.aluno}</p>
      <p className="text-[14px] text-ink">{`"${o.texto}"`}</p>
      {o.resposta && !respondendo && (
        <p className="rounded-md bg-panel px-2 py-1 text-[13px] text-ink">
          <strong>Sua resposta:</strong> {o.resposta}
        </p>
      )}
      {respondendo && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`resp-${o.envioId}`} className="sr-only">
            {`Resposta para ${o.aluno}`}
          </label>
          <textarea
            id={`resp-${o.envioId}`}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Escreva uma resposta para o aluno"
            className="rounded-lg border border-line-input bg-white px-2 py-1.5 text-[14px] text-ink outline-none focus-visible:border-ink"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={async () => {
                await moderar({ resposta: texto })
                setRespondendo(false)
              }}
              className="cursor-pointer rounded-lg border border-ink bg-btn px-2 py-1 text-[14px] text-ink"
            >
              Enviar resposta
            </button>
            <button type="button" onClick={() => setRespondendo(false)} className="cursor-pointer px-2 py-1 text-[14px] text-muted">
              Cancelar
            </button>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3 text-[13px]">
        {!respondendo && (
          <button type="button" onClick={() => setRespondendo(true)} className="cursor-pointer text-muted underline">
            {o.resposta ? 'Editar resposta' : 'Responder'}
          </button>
        )}
        <button type="button" onClick={() => moderar({ oculta: !o.oculta })} className="cursor-pointer text-muted underline">
          {o.oculta ? 'Exibir' : 'Ocultar'}
        </button>
        {o.oculta && <span className="text-muted">Oculta do resumo</span>}
      </div>
    </li>
  )
}

export function FormularioResumo() {
  const form = useForm()
  const { dados: r, erro, recarregar } = useApi<ResumoFormularioDTO>(`/formularios/${form.id}/resumo`, form)
  const [verOcultas, setVerOcultas] = useState(false)
  if (erro) return <p role="alert" className="text-[16px] text-diff-c">{erro}</p>
  if (!r) return <p role="status" className="text-[16px] text-muted">Carregando…</p>
  return (
    <section className="flex flex-col gap-6 rounded-xl border border-line bg-white p-6">
      <h2 className="text-[24px] font-bold text-ink">Resumo da autoavaliação</h2>
      <div className="flex flex-wrap gap-4">
        <KpiCard className="min-w-[200px]" titulo="Taxa de respostas" valor={`${r.taxaResposta}%`} detalhe={`${r.respondidos}/${r.total} alunos responderam`} />
        <KpiCard className="min-w-[200px]" titulo="Valor médio da nota" valor={r.notaMedia === null ? '—' : `${formatarNota(r.notaMedia)}/10`} detalhe="Autoavaliação geral da turma" />
        <KpiCard className="min-w-[200px]" titulo="Observações enviadas" valor={r.totalObservacoes} detalhe="Comentários e dúvidas adicionais" />
        <KpiCard
          className="min-w-[200px]"
          titulo="Maior dificuldade"
          valor={r.maiorDificuldade ?? '—'}
          detalhe={r.maiorDificuldadePergunta ? `Pergunta ${r.maiorDificuldadePergunta.numero}: ${r.maiorDificuldadePergunta.enunciado}` : 'Sem respostas ainda'}
        />
      </div>
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <Panel titulo="Principal dificuldade dividida em 3 grupos" subtitulo="Distribuição das respostas com base na percepção de dificuldade relatada pelos alunos.">
            <ul className="flex flex-col gap-3">
              {GRUPOS.map((g) => (
                <li key={g.letra} className="flex items-center gap-3">
                  <DifficultyLetter letra={g.letra} className="w-[60px] text-center text-[16px] text-ink" />
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-label={`Grupo ${g.letra}`} aria-valuenow={r.distribuicao[g.letra]} aria-valuemin={0} aria-valuemax={100}>
                    <div className={cx('h-full rounded-full', g.cor)} style={{ width: `${r.distribuicao[g.letra]}%` }} />
                  </div>
                  <span className="text-[16px] font-semibold text-ink">{r.distribuicao[g.letra]}%</span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel titulo="Dificuldades gerais" subtitulo="Perguntas que mais alunos erraram na autoavaliação.">
            {r.dificuldadesGerais.length === 0 ? (
              <p className="text-[16px] text-muted">Nenhuma dificuldade registrada ainda.</p>
            ) : (
              <ul className="flex flex-col gap-3 text-[16px] font-semibold text-ink">
                {r.dificuldadesGerais.map((d) => (
                  <li key={d.titulo} className="flex items-center gap-3">
                    <span className="min-w-0 flex-1">{d.titulo}</span>
                    <span>{d.total}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
        <div className="w-full shrink-0 lg:w-[360px]">
          <Panel titulo="Observações dos alunos" subtitulo="Comentários recorrentes e sugestões enviadas pelos estudantes.">
            {(() => {
              const ocultas = r.observacoes.filter((o) => o.oculta)
              const visiveis = verOcultas ? r.observacoes : r.observacoes.filter((o) => !o.oculta)
              if (r.observacoes.length === 0) return <p className="text-[16px] text-muted">Nenhuma observação enviada.</p>
              return (
                <div className="flex flex-col gap-3">
                  {visiveis.length === 0 && <p className="text-[16px] text-muted">Todas as observações estão ocultas.</p>}
                  <ul className="flex flex-col gap-3">
                    {visiveis.map((o) => (
                      <ObservacaoItem key={o.envioId} formularioId={form.id} o={o} aoMudar={recarregar} />
                    ))}
                  </ul>
                  {ocultas.length > 0 && (
                    <button type="button" onClick={() => setVerOcultas((v) => !v)} className="w-fit cursor-pointer text-[13px] text-muted underline">
                      {verOcultas ? 'Esconder ocultas' : `Mostrar ocultas (${ocultas.length})`}
                    </button>
                  )}
                </div>
              )
            })()}
          </Panel>
        </div>
      </div>
    </section>
  )
}

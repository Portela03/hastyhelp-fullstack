import { useCallback, useId, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, mensagemDeErro } from '../api/client'
import { useApi } from '../api/use-api'
import type { Equipe } from '../data/tipos'
import { useStore } from '../store'
import type { ResultadoEntrada } from '../store'
import { Avatar, ButtonBrown, ButtonGhost, Icon, Modal, SegmentedTabs, TeamBadge, cx } from './ui'

/* Adicionar membros (professor): por código da equipe ou por e-mail de aluno já cadastrado (R-100…R-111) */

interface EntradaDTO {
  id: string
  aluno: { id: string; nome: string; email: string }
  criadaEm: string
}
interface EntradasDTO {
  solicitacoes: EntradaDTO[]
  convites: EntradaDTO[]
}
interface AlunoBuscaDTO {
  id: string
  nome: string
  email: string
  convidado: boolean
}

const CORES_AVATAR = ['#15593c', '#a8785a', '#4a6fa5', '#8a5a9e', '#b5533c', '#3c8a8a']
const corDoAvatar = (id: string) => CORES_AVATAR[[...id].reduce((soma, c) => soma + c.charCodeAt(0), 0) % CORES_AVATAR.length]
const iniciais = (nome: string) =>
  nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

function BotaoTexto({ onClick, children, destaque, desabilitado }: { onClick: () => void; children: string; destaque?: boolean; desabilitado?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desabilitado}
      className={cx(
        'cursor-pointer rounded-lg border px-3 py-1 text-[16px] disabled:cursor-not-allowed disabled:opacity-50',
        destaque ? 'border-ink bg-btn-brown text-ink' : 'border-line-input bg-white text-[#505050] hover:bg-page',
      )}
    >
      {children}
    </button>
  )
}

function LinhaAluno({ nome, email, id, acoes }: { nome: string; email: string; id: string; acoes?: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar letra={iniciais(nome)} cor={corDoAvatar(id)} size={40} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[16px] font-semibold text-ink">{nome}</span>
        <span className="truncate text-[16px] text-ink">{email}</span>
      </div>
      {acoes}
    </div>
  )
}

function AbaCodigo({ equipe }: { equipe: Equipe }) {
  const { equipes, recarregar, executar } = useStore()
  const viva = equipes.find((e) => e.id === equipe.id) ?? equipe
  const { dados, erro, recarregar: recarregarEntradas } = useApi<EntradasDTO>(`/turmas/${equipe.id}/entradas`)
  const [copiado, setCopiado] = useState<'codigo' | 'link' | null>(null)
  const [msg, setMsg] = useState('')
  // reage na hora ao clique; se o servidor recusar, volta ao valor anterior
  const [manual, setManual] = useState(viva.aprovacaoManual ?? false)
  const codigo = viva.codigoConvite ?? ''
  const link = `${window.location.origin}/convite/${codigo}`

  async function copiar(que: 'codigo' | 'link') {
    try {
      await navigator.clipboard.writeText(que === 'codigo' ? codigo.toUpperCase() : link)
      setCopiado(que)
      setTimeout(() => setCopiado(null), 2000)
    } catch {
      setMsg('Não foi possível copiar automaticamente. Selecione o texto e copie à mão.')
    }
  }

  const responder = (entrada: EntradaDTO, acao: 'aceitar' | 'recusar') =>
    executar(async () => {
      await api('POST', `/turmas/${equipe.id}/entradas/${entrada.id}/${acao}`)
      await Promise.all([recarregarEntradas(), recarregar()])
    })

  const pendentes = dados?.solicitacoes ?? []
  return (
    <div role="tabpanel" id="painel-membros" aria-labelledby="aba-codigo" className="flex w-full flex-col gap-4">
      <p className="text-[16px] text-ink">Passe o código para o aluno. Ele digita em <strong>Equipes → Entrar em equipe</strong>, mesmo já tendo conta.</p>
      <div className="flex flex-col items-center gap-3 rounded-lg border border-line-input bg-panel p-4">
        <span className="text-[14px] text-muted">Código da equipe</span>
        <code aria-label="Código da equipe" className="text-[40px] font-semibold tracking-[0.2em] text-ink">
          {codigo.toUpperCase()}
        </code>
        <div className="flex flex-wrap justify-center gap-2">
          <BotaoTexto onClick={() => copiar('codigo')}>{copiado === 'codigo' ? 'Código copiado!' : 'Copiar código'}</BotaoTexto>
          <BotaoTexto onClick={() => copiar('link')}>{copiado === 'link' ? 'Link copiado!' : 'Copiar link de convite'}</BotaoTexto>
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          role="switch"
          checked={manual}
          onChange={async (e) => {
            const novo = e.target.checked
            setManual(novo)
            try {
              await api('PATCH', `/turmas/${equipe.id}`, { aprovacaoManual: novo })
              await recarregar()
            } catch (err) {
              setManual(!novo)
              setMsg(mensagemDeErro(err))
            }
          }}
          className="mt-1 size-5 cursor-pointer accent-[#a08d77]"
        />
        <span className="flex flex-col">
          <span className="text-[18px] text-ink">Aprovar entradas manualmente</span>
          <span className="text-[14px] text-muted">
            {manual ? 'Quem usar o código ou o link fica em espera até você aceitar.' : 'Quem usar o código ou o link entra direto na equipe.'}
          </span>
        </span>
      </label>

      {msg && <p role="alert" className="text-[14px] text-diff-c">{msg}</p>}
      {erro && <p role="alert" className="text-[14px] text-diff-c">{erro}</p>}

      <section aria-label="Pedidos de entrada" className="flex flex-col gap-2">
        <h3 className="text-[18px] font-semibold text-ink">Pedidos de entrada {pendentes.length > 0 && `(${pendentes.length})`}</h3>
        {pendentes.length === 0 ? (
          <p className="text-[16px] text-muted">Nenhum pedido aguardando.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pendentes.map((p) => (
              <li key={p.id}>
                <LinhaAluno
                  {...p.aluno}
                  acoes={
                    <span className="flex shrink-0 gap-2">
                      <BotaoTexto destaque onClick={() => void responder(p, 'aceitar')}>Aceitar</BotaoTexto>
                      <BotaoTexto onClick={() => void responder(p, 'recusar')}>Recusar</BotaoTexto>
                    </span>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function AbaEmail({ equipe, onFechar }: { equipe: Equipe; onFechar: () => void }) {
  const { executar } = useStore()
  const { dados, recarregar: recarregarEntradas } = useApi<EntradasDTO>(`/turmas/${equipe.id}/entradas`)
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState<AlunoBuscaDTO[] | null>(null)
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const [info, setInfo] = useState('')
  const [pesquisando, setPesquisando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const idBusca = useId()

  async function pesquisar(e?: FormEvent) {
    e?.preventDefault()
    setErro('')
    setInfo('')
    setSelecionado(null)
    setPesquisando(true)
    try {
      setResultados(await api<AlunoBuscaDTO[]>('GET', `/turmas/${equipe.id}/alunos-para-convite?busca=${encodeURIComponent(busca.trim())}`))
    } catch (err) {
      setResultados(null)
      setErro(mensagemDeErro(err))
    } finally {
      setPesquisando(false)
    }
  }

  async function convidar() {
    const aluno = resultados?.find((a) => a.id === selecionado)
    if (!aluno) return
    setErro('')
    setEnviando(true)
    try {
      await api('POST', `/turmas/${equipe.id}/convites`, { alunoId: aluno.id })
      setInfo(`Convite enviado para ${aluno.nome}. Ele aparece para o aluno em Equipes e no sino de notificações.`)
      setResultados((lista) => lista?.map((a) => (a.id === aluno.id ? { ...a, convidado: true } : a)) ?? null)
      setSelecionado(null)
      await recarregarEntradas()
    } catch (err) {
      setErro(mensagemDeErro(err))
    } finally {
      setEnviando(false)
    }
  }

  const cancelar = (id: string) =>
    executar(async () => {
      await api('DELETE', `/turmas/${equipe.id}/entradas/${id}`)
      await recarregarEntradas()
    })

  const convites = dados?.convites ?? []
  const escolhido = resultados?.find((a) => a.id === selecionado)
  return (
    <div role="tabpanel" id="painel-membros" aria-labelledby="aba-email" className="flex w-full flex-col gap-4">
      <form onSubmit={pesquisar} role="search" className="flex w-full overflow-hidden rounded-lg border border-placeholder bg-white">
        <label htmlFor={idBusca} className="sr-only">Email ou nome do aluno</label>
        <input
          id={idBusca}
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Digite o email ou nome"
          autoComplete="off"
          className="min-w-0 flex-1 bg-white p-3 text-[18px] text-ink placeholder:text-placeholder"
        />
        <button type="submit" disabled={pesquisando} className="flex cursor-pointer items-center gap-1 border-l border-placeholder px-4 text-[18px] text-muted disabled:opacity-50">
          <Icon name="search" className="text-[20px]" />
          Pesquisar
        </button>
      </form>

      {erro && <p role="alert" className="text-[14px] text-diff-c">{erro}</p>}
      {info && <p role="status" className="rounded-lg border border-line-input bg-panel px-3 py-2 text-[14px] text-ink">{info}</p>}

      <div className="min-h-[120px]">
        {resultados !== null && resultados.length === 0 && <p role="status" className="py-2 text-[16px] text-muted">Nenhum aluno encontrado com “{busca.trim()}”. O aluno precisa já ter criado a conta.</p>}
        {resultados !== null && resultados.length > 0 && (
          <ul role="radiogroup" aria-label="Alunos encontrados" className="flex flex-col">
            {resultados.map((a) => (
              <li key={a.id} className="border-b border-line last:border-b-0">
                <button
                  type="button"
                  role="radio"
                  aria-checked={selecionado === a.id}
                  disabled={a.convidado}
                  onClick={() => setSelecionado(a.id)}
                  className={cx(
                    'flex w-full cursor-pointer items-center gap-3 px-1 py-3 text-left disabled:cursor-not-allowed disabled:opacity-60',
                    selecionado === a.id ? 'bg-btn-brown/40' : 'hover:bg-page',
                  )}
                >
                  <Avatar letra={iniciais(a.nome)} cor={corDoAvatar(a.id)} size={40} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[16px] font-semibold text-ink">{a.nome}</span>
                    <span className="truncate text-[16px] text-ink">{a.email}</span>
                  </span>
                  {a.convidado && <span className="shrink-0 text-[14px] text-muted">Convite enviado</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {convites.length > 0 && (
        <section aria-label="Convites enviados" className="flex flex-col gap-2">
          <h3 className="text-[18px] font-semibold text-ink">Convites aguardando resposta ({convites.length})</h3>
          <ul className="flex flex-col gap-3">
            {convites.map((c) => (
              <li key={c.id}>
                <LinhaAluno {...c.aluno} acoes={<BotaoTexto onClick={() => void cancelar(c.id)}>Cancelar convite</BotaoTexto>} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex w-full gap-3">
        <ButtonBrown onClick={() => void convidar()} disabled={!escolhido || escolhido.convidado || enviando}>
          Convidar
        </ButtonBrown>
        <ButtonGhost onClick={onFechar}>Cancelar</ButtonGhost>
      </div>
    </div>
  )
}

export function AdicionarMembrosModal({ equipe, onClose }: { equipe: Equipe; onClose: () => void }) {
  const [aba, setAba] = useState<'codigo' | 'email'>('codigo')
  return (
    <Modal title="Adicionar membros" icon="add" onClose={onClose} width={560}>
      <SegmentedTabs
        rotulo="Como adicionar membros"
        abas={[
          { id: 'codigo', label: 'Código' },
          { id: 'email', label: 'Email' },
        ]}
        ativa={aba}
        onChange={setAba}
        idPainel="painel-membros"
      />
      {aba === 'codigo' ? (
        <>
          <AbaCodigo equipe={equipe} />
          <div className="flex w-full">
            <ButtonBrown onClick={onClose}>Fechar</ButtonBrown>
          </div>
        </>
      ) : (
        <AbaEmail equipe={equipe} onFechar={onClose} />
      )}
    </Modal>
  )
}

/* Entrar em equipe (aluno): digita o código de 6 caracteres que o professor passou (R-101/R-103) */

export function EntrarEquipeModal({ onClose }: { onClose: () => void }) {
  const { entrarNaEquipe } = useStore()
  const navigate = useNavigate()
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoEntrada | null>(null)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!codigo.trim()) return setErro('Digite o código da equipe.')
    setErro('')
    setEnviando(true)
    try {
      setResultado(await entrarNaEquipe(codigo))
    } catch (err) {
      setErro(mensagemDeErro(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal title="Entrar em equipe" icon="group_add" onClose={onClose} width={480}>
      {resultado ? (
        <div className="flex w-full flex-col gap-4">
          <p role="status" className="text-[18px] text-ink">
            {resultado.status === 'matriculado' ? (
              <>Pronto! Você entrou na equipe <strong>{resultado.turma.nome}</strong>.</>
            ) : (
              <>Pedido enviado para a equipe <strong>{resultado.turma.nome}</strong>. O professor precisa aceitar; você será avisado no sino de notificações.</>
            )}
          </p>
          <div className="flex w-full gap-3">
            {resultado.status === 'matriculado' && (
              <ButtonBrown
                onClick={() => {
                  onClose()
                  navigate(`/aluno/turmas/${resultado.turma.id}`)
                }}
              >
                Abrir equipe
              </ButtonBrown>
            )}
            <ButtonGhost onClick={onClose}>Fechar</ButtonGhost>
          </div>
        </div>
      ) : (
        <form onSubmit={enviar} className="flex w-full flex-col gap-4">
          <div className="flex w-full flex-col gap-1">
            <label htmlFor="codigo-equipe" className="text-[18px] text-ink">Código da equipe</label>
            <input
              id="codigo-equipe"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Ex.: K7M2QX"
              maxLength={12}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="w-full rounded-lg border border-placeholder bg-white p-3 text-[24px] uppercase tracking-[0.2em] text-ink placeholder:text-placeholder placeholder:normal-case placeholder:tracking-normal"
            />
            <span className="text-[14px] text-muted">Peça o código ao seu professor (ele aparece em Equipes → ⋮ → Adicionar membros).</span>
          </div>
          {erro && <p role="alert" className="text-[14px] text-diff-c">{erro}</p>}
          <div className="flex w-full gap-3">
            <ButtonBrown type="submit" disabled={enviando}>Entrar</ButtonBrown>
            <ButtonGhost onClick={onClose}>Cancelar</ButtonGhost>
          </div>
        </form>
      )}
    </Modal>
  )
}

/* Convites recebidos (aluno): aparecem em Equipes; aceitar matricula, recusar descarta (R-109/R-110) */

interface ConviteDTO {
  id: string
  turma: { id: string; nome: string; periodo: string; sigla: string; cor: string }
  docente: string
  criadoEm: string
}

export function ConvitesRecebidos() {
  const { equipes, recarregar, executar } = useStore()
  const { dados, recarregar: recarregarConvites } = useApi<ConviteDTO[]>('/aluno/convites', equipes.length)
  const responder = useCallback(
    (convite: ConviteDTO, acao: 'aceitar' | 'recusar') =>
      executar(async () => {
        await api('POST', `/aluno/convites/${convite.id}/${acao}`)
        await Promise.all([recarregarConvites(), recarregar()])
      }),
    [executar, recarregar, recarregarConvites],
  )
  if (!dados || dados.length === 0) return null
  return (
    <section aria-label="Convites para equipes" className="flex flex-col gap-3 rounded-lg border border-line-input bg-panel p-4">
      <h2 className="text-[20px] font-semibold text-ink">Convites para equipes ({dados.length})</h2>
      <ul className="flex flex-col gap-3">
        {dados.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-card-line bg-white p-3">
            <TeamBadge sigla={c.turma.sigla} cor={c.turma.cor} size={48} fontSize={22} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-[16px] font-semibold text-ink">{c.turma.nome}</span>
              <span className="text-[14px] text-muted">
                Prof. {c.docente} • {c.turma.periodo}
              </span>
            </div>
            <div className="flex gap-2">
              <BotaoTexto destaque onClick={() => void responder(c, 'aceitar')}>Aceitar</BotaoTexto>
              <BotaoTexto onClick={() => void responder(c, 'recusar')}>Recusar</BotaoTexto>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

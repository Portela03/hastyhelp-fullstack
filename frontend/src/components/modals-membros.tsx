import { useCallback, useId, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, mensagemDeErro } from '../api/client'
import { useApi } from '../api/use-api'
import type { Equipe } from '../data/tipos'
import { useStore } from '../store'
import type { ResultadoEntrada } from '../store'
import { proximoIndice } from './navegacao-teclado'
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

// todas com contraste ≥ 4,5:1 para as iniciais claras
const CORES_AVATAR = ['#15593c', '#8a5a3c', '#3f5f94', '#7a4a8e', '#a3412c', '#2f7272']
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
        'flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg border px-3 py-1 text-[16px] disabled:cursor-not-allowed disabled:opacity-50',
        destaque ? 'border-ink bg-btn-brown text-ink' : 'border-line-input bg-white text-[#505050] hover:bg-page',
      )}
    >
      {children}
    </button>
  )
}

function LinhaAluno({ nome, email, id, acoes }: { nome: string; email: string; id: string; acoes?: ReactNode }) {
  return (
    // no mobile as ações descem para a linha de baixo, senão nome e e-mail ficam truncados
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <Avatar letra={iniciais(nome)} cor={corDoAvatar(id)} size={40} />
      <div className="flex min-w-[10rem] flex-1 flex-col">
        <span className="truncate text-[16px] font-semibold text-ink">{nome}</span>
        <span className="truncate text-[16px] text-ink">{email}</span>
      </div>
      {acoes && <div className="flex w-full justify-end sm:w-auto">{acoes}</div>}
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
    <div role="tabpanel" id="painel-membros" aria-labelledby="aba-codigo" className="flex w-full flex-col gap-3">
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
        {/* região sempre montada: leitores de tela anunciam a mudança do botão */}
        <span role="status" className="sr-only">{copiado === 'codigo' ? 'Código copiado.' : copiado === 'link' ? 'Link de convite copiado.' : ''}</span>
      </div>

      <label className="flex min-h-11 cursor-pointer items-center gap-3">
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
          className="size-5 cursor-pointer accent-[#a08d77]"
        />
        <span className="flex flex-col">
          <span className="text-[18px] text-ink">Aprovar entradas manualmente</span>
          <span className="text-[14px] text-muted">
            {manual ? 'Quem usar o código ou o link fica em espera até você aceitar.' : 'Quem usar o código ou o link entra direto na equipe.'}
          </span>
        </span>
      </label>

      {msg && <p role="alert" className="text-[14px] text-erro">{msg}</p>}
      {erro && <p role="alert" className="text-[14px] text-erro">{erro}</p>}

      <section aria-label="Pedidos de entrada" className="flex flex-col gap-2 mt-2">
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
  const radios = useRef<Array<HTMLButtonElement | null>>([])

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
  const primeiroLivre = resultados?.find((a) => !a.convidado)?.id

  // radiogroup (WAI-ARIA): setas movem a seleção entre alunos ainda não convidados
  function aoTeclarRadio(e: KeyboardEvent<HTMLButtonElement>, indice: number) {
    if (!resultados) return
    const destino = proximoIndice(e.key, indice, resultados.map((a) => !a.convidado), 'ambos')
    if (destino === null) return
    e.preventDefault()
    setSelecionado(resultados[destino]!.id)
    radios.current[destino]?.focus()
  }
  return (
    <div role="tabpanel" id="painel-membros" aria-labelledby="aba-email" className="flex w-full flex-1 flex-col gap-4">
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
        <button type="submit" disabled={pesquisando} className="flex min-h-11 cursor-pointer items-center gap-1 border-l border-placeholder px-4 text-[18px] text-muted disabled:opacity-50">
          <Icon name="search" className="text-[20px]" />
          Pesquisar
        </button>
      </form>

      {erro && <p role="alert" className="text-[14px] text-erro">{erro}</p>}
      {/* região viva sempre montada: anuncia resultado da busca e confirmação do convite */}
      <div role="status" className="flex flex-col gap-2 empty:hidden">
        {info && <p className="rounded-lg border border-line-input bg-panel px-3 py-2 text-[14px] text-ink">{info}</p>}
        {resultados !== null && resultados.length > 0 && <span className="sr-only">{resultados.length === 1 ? '1 aluno encontrado.' : `${resultados.length} alunos encontrados.`}</span>}
        {resultados !== null && resultados.length === 0 && <p className="py-2 text-[16px] text-muted">Nenhum aluno encontrado com “{busca.trim()}”. O aluno precisa já ter criado a conta.</p>}
      </div>

      <div className="min-h-[120px]">
        {resultados !== null && resultados.length > 0 && (
          <ul role="radiogroup" aria-label="Alunos encontrados" className="flex flex-col">
            {resultados.map((a, i) => (
              <li key={a.id} className="border-b border-line last:border-b-0">
                <button
                  ref={(el) => {
                    radios.current[i] = el
                  }}
                  type="button"
                  role="radio"
                  aria-checked={selecionado === a.id}
                  disabled={a.convidado}
                  tabIndex={selecionado === a.id || (selecionado === null && a.id === primeiroLivre) ? 0 : -1}
                  onKeyDown={(e) => aoTeclarRadio(e, i)}
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

      <div className="mt-auto flex w-full gap-3">
        <ButtonBrown className="min-h-11" onClick={() => void convidar()} disabled={!escolhido || escolhido.convidado || enviando} aria-busy={enviando}>
          {enviando ? 'Enviando convite…' : 'Convidar'}
        </ButtonBrown>
        <ButtonGhost className="min-h-11" onClick={onFechar}>Cancelar</ButtonGhost>
      </div>
    </div>
  )
}

export function AdicionarMembrosModal({ equipe, onClose }: { equipe: Equipe; onClose: () => void }) {
  const [aba, setAba] = useState<'codigo' | 'email'>('codigo')
  return (
    <Modal title="Adicionar membros" icon="add" onClose={onClose} width={520}>
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
<div className="flex w-full min-h-[380px] flex-col">
  {aba === 'codigo' ? (
    <>
      <AbaCodigo equipe={equipe} />
      <div className="flex w-full mt-4">
        <ButtonBrown className="min-h-11" onClick={onClose}>Fechar</ButtonBrown>
      </div>
    </>
  ) : (
    <AbaEmail equipe={equipe} onFechar={onClose} />
  )}
</div>
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
  const idErro = useId()

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
                className="min-h-11"
                onClick={() => {
                  onClose()
                  navigate(`/aluno/turmas/${resultado.turma.id}`)
                }}
              >
                Abrir equipe
              </ButtonBrown>
            )}
            <ButtonGhost className="min-h-11" onClick={onClose}>Fechar</ButtonGhost>
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
              aria-invalid={erro ? true : undefined}
              aria-describedby={erro ? idErro : undefined}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="w-full rounded-lg border border-placeholder bg-white p-3 text-[24px] uppercase tracking-[0.2em] text-ink placeholder:text-placeholder placeholder:normal-case placeholder:tracking-normal"
            />
            <span className="text-[14px] text-muted">Peça o código ao seu professor (ele aparece em Equipes → ⋮ → Adicionar membros).</span>
          </div>
          {erro && <p id={idErro} role="alert" className="text-[14px] text-erro">{erro}</p>}
          <div className="flex w-full gap-3">
            <ButtonBrown className="min-h-11" type="submit" disabled={enviando} aria-busy={enviando}>
              {enviando ? 'Entrando…' : 'Entrar'}
            </ButtonBrown>
            <ButtonGhost className="min-h-11" onClick={onClose}>Cancelar</ButtonGhost>
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

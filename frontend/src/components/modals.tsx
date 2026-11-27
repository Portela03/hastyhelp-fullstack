import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { FormEvent } from 'react'
import { mensagemDeErro } from '../api/client'
import { CORES_EQUIPE, PERIODOS } from '../data/tipos'
import type { Equipe, Formulario, Pergunta, StatusFormulario } from '../data/tipos'
import { useStore } from '../store'
import { Avatar, ButtonBrown, ButtonGhost, Field, Icon, Modal, SelectField, StatusPill, TeamBadge, cx } from './ui'

export function gerarSigla(nome: string) {
  const palavras = nome
    .split(/\s+/)
    .filter((p) => p.length > 2 && !/^(de|da|do|das|dos|para)$/i.test(p))
  const letras = palavras.length >= 2 ? palavras[0][0] + palavras[1][0] : nome.replace(/\s/g, '').slice(0, 2)
  return letras.toUpperCase()
}

function Acoes({ concluir, onClose, desabilitado, carregando = 'Salvando…' }: { concluir: string; onClose: () => void; desabilitado?: boolean; carregando?: string }) {
  return (
    <div className="flex w-full gap-3">
      <ButtonBrown type="submit" disabled={desabilitado} aria-busy={desabilitado}>
        {desabilitado ? carregando : concluir}
      </ButtonBrown>
      <ButtonGhost onClick={onClose}>Cancelar</ButtonGhost>
    </div>
  )
}

const opcoesPeriodo = PERIODOS.map((p) => ({ value: p, label: p }))

const OPCOES_FIXAS_IPC = [
  'Tive dificuldade na interpretação do texto / Não entendi o que pedia',
  'Sabia o que pedia, mas não soube qual fórmula ou passo usar',
  'Montei certo, mas errei na hora de fazer a conta',
  'Não tive tempo / Deixei em branco',
] as const

const CATEGORIAS_FIXAS_IPC = ['I', 'P', 'C', null] as const

function novaPerguntaFixa(): Pergunta {
  return {
    id: `novo-${Date.now()}`,
    enunciado: '',
    tipo: 'multipla',
    opcoes: [...OPCOES_FIXAS_IPC],
    marcadas: [],
    categoriasOpcao: [...CATEGORIAS_FIXAS_IPC],
  }
}

/* Equipes */

export function CriarEquipeModal({ onClose }: { onClose: () => void }) {
  const { adicionarEquipe, sessao } = useStore()
  const [nome, setNome] = useState('')
  const [periodo, setPeriodo] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim() || !periodo) return setErro('Informe o nome e o período letivo.')
    setEnviando(true)
    try {
      await adicionarEquipe({ nome: nome.trim(), periodo, cor: CORES_EQUIPE[0] })
      onClose()
    } catch (e) {
      setErro(mensagemDeErro(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal title="Criando Equipe" icon="add" onClose={onClose}>
      <form onSubmit={enviar} className="flex w-full flex-col items-center gap-6">
        <div className="flex w-full flex-col gap-3">
          <Field label="Nome da equipe" name="nome" placeholder="Ex: Engenharia de Software - 5° Semestre" value={nome} onChange={(e) => setNome(e.target.value)} />
          <SelectField label="Período letivo" placeholder="Selecione o período" value={periodo} onChange={setPeriodo} options={opcoesPeriodo} />
          <div className="flex w-full flex-col">
            <span className="text-lg text-ink">Docente</span>
            <div className="flex items-center gap-2.5 rounded-lg border border-placeholder bg-white p-3">
              <Avatar letra={(sessao?.nome ?? 'A')[0] ?? 'A'} />
              <span className="text-[16px] text-placeholder">{sessao?.nome ?? ''}</span>
            </div>
          </div>
          {erro && (
            <p role="alert" className="text-[14px] text-diff-c">
              {erro}
            </p>
          )}
        </div>
        <Acoes concluir="Concluir" onClose={onClose} desabilitado={enviando} carregando="Criando…" />
      </form>
    </Modal>
  )
}

export function EditarEquipeModal({ equipe, onClose }: { equipe: Equipe; onClose: () => void }) {
  const { atualizarEquipe } = useStore()
  const [nome, setNome] = useState(equipe.nome)
  const [periodo, setPeriodo] = useState(equipe.periodo)
  const [sigla, setSigla] = useState(equipe.sigla)
  const [cor, setCor] = useState(equipe.cor)
  const [erro, setErro] = useState('')

  async function enviar(e: FormEvent) {
    e.preventDefault()
    try {
      await atualizarEquipe(equipe.id, { nome: nome.trim() || equipe.nome, periodo, sigla: sigla.trim().toUpperCase() || equipe.sigla, cor })
      onClose()
    } catch (e) {
      setErro(mensagemDeErro(e))
    }
  }

  return (
    <Modal title="Editando Equipe" icon="edit" onClose={onClose}>
      <form onSubmit={enviar} className="flex w-full flex-col items-center gap-6">
        <div className="flex w-full flex-col gap-3">
          <Field label="Nome da equipe" name="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          <SelectField label="Período letivo" placeholder="Selecione o período" value={periodo} onChange={setPeriodo} options={opcoesPeriodo} />
          <Field label="Sigla" name="sigla" maxLength={3} value={sigla} onChange={(e) => setSigla(e.target.value)} />
          <div className="flex flex-col gap-1">
            <span className="text-[18px] text-ink">Cor</span>
            <div className="flex items-center gap-3">
              <TeamBadge sigla={sigla || '—'} cor={cor} size={80} fontSize={36} />
              <div role="radiogroup" aria-label="Cor da equipe" className="grid grid-cols-3 gap-2">
                {CORES_EQUIPE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={cor === c}
                    aria-label={`Cor ${c}`}
                    onClick={() => setCor(c)}
                    className={cx('size-[30px] cursor-pointer rounded-[4px] border-grey', cor === c && 'outline-2 outline-offset-0 outline-ink', cor !== c && 'hover:scale-105')}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          {erro && (
            <p role="alert" className="text-[14px] text-diff-c">
              {erro}
            </p>
          )}
        </div>
        <Acoes concluir="Concluir" onClose={onClose} />
      </form>
    </Modal>
  )
}

/* Formulários */

/** dd/mm/aa (ou dd/mm/aaaa) → [dia, mês, ano]; `null` se inválido. */
function lerDataBr(texto: string): [number, number, number] | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(texto.trim())
  if (!m) return null
  const ano = m[3]!.length === 2 ? 2000 + Number(m[3]) : Number(m[3])
  const data = new Date(ano, Number(m[2]) - 1, Number(m[1]))
  return data.getFullYear() === ano && data.getMonth() === Number(m[2]) - 1 && data.getDate() === Number(m[1]) ? [Number(m[1]), Number(m[2]), ano] : null
}

/** "24/09/26" + "08:30" → ISO; erro de validação vira `Error`. */
function dataHoraParaIso(data: string, hora: string): string {
  const d = lerDataBr(data)
  if (!d) throw new Error('Data inválida. Use o formato dd/mm/aa (ex.: 24/09/26).')
  const h = /^(\d{1,2}):(\d{2})$/.exec(hora.trim() || '00:00')
  if (!h || Number(h[1]) > 23 || Number(h[2]) > 59) throw new Error('Horário inválido. Use o formato hh:mm (ex.: 08:30).')
  return new Date(d[2], d[1] - 1, d[0], Number(h[1]), Number(h[2])).toISOString()
}

/** "20/09/26" → "2026-09-20" (o prazo vale até o fim do dia). */
function prazoParaApi(texto: string): string {
  const d = lerDataBr(texto)
  if (!d) throw new Error('Prazo inválido. Use o formato dd/mm/aa (ex.: 20/09/26).')
  return `${d[2]}-${String(d[1]).padStart(2, '0')}-${String(d[0]).padStart(2, '0')}`
}

/** Remove opções vazias e reindexa o gabarito. */
function normalizarPergunta(p: Pergunta): Pergunta {
  return {
    ...p,
    enunciado: p.enunciado.trim(),
    tipo: 'multipla',
    opcoes: [...OPCOES_FIXAS_IPC],
    marcadas: [],
    categoriasOpcao: [...CATEGORIAS_FIXAS_IPC],
  }
}

function PerguntasEditor({ perguntas, onChange, somenteLeitura }: { perguntas: Pergunta[]; onChange: (p: Pergunta[]) => void; somenteLeitura?: boolean }) {
  const [editando, setEditando] = useState<string | null>(null)
  const atualizarEnunciado = (id: string, enunciado: string) => onChange(perguntas.map((pergunta) => pergunta.id === id ? { ...pergunta, enunciado } : pergunta))
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [textoAntesDeEditar, setTextoAntesDeEditar] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!editando) return

    const textarea = textareaRef.current
    if (!textarea) return

    textarea.focus()
    const fim = textarea.value.length
    textarea.setSelectionRange(fim, fim)
  }, [editando])

  return (
    <fieldset className="flex w-full flex-col gap-1">
      <legend className="mb-1 text-lg text-ink">Perguntas</legend>
      <ul className="flex flex-col gap-1">
        {perguntas.map((pergunta, indice) => (
          <li
            key={pergunta.id}
            className={[
              'flex items-start gap-1 rounded-lg px-3 py-1 transition-all duration-150',
              editando === pergunta.id
                ? 'border border-[#c9b8a0] bg-white shadow-[0_0_0_3px_rgba(201,184,160,0.25)]'
                : 'border border-placeholder bg-white',
            ].join(' ')}
          >
            <span
              className="flex h-8 w-6 shrink-0 items-center justify-center leading-8"
              style={{
                color: editando === pergunta.id ? '#333333' : '#878787',
              }}
            >
              {indice + 1}.
            </span>

            <textarea
              ref={editando === pergunta.id ? textareaRef : undefined}
              autoFocus={false}
              aria-label={`Enunciado da pergunta ${indice + 1}`}
              value={pergunta.enunciado}
              placeholder="Nova pergunta"
              disabled={editando !== pergunta.id || somenteLeitura}
              rows={1}
              style={{ caretColor: '#333333' }}
              onChange={(event) =>
                atualizarEnunciado(pergunta.id, event.target.value)
              }
              onInput={(event) => {
                event.currentTarget.style.height = '32px'
                event.currentTarget.style.height =
                  `${event.currentTarget.scrollHeight}px`
              }}
              onBlur={() => setEditando(null)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  event.currentTarget.blur()
                }
              }}
              className={[
                'block h-8 min-w-0 flex-1 resize-none overflow-hidden',
                'border-0 bg-transparent p-0 text-[16px] leading-8',
                'text-placeholder outline-none caret-[#c9b8a0]',
                'enabled:text-ink',
              ].join(' ')}
            />

            {!somenteLeitura && (
              <div className="flex h-8 shrink-0 items-center gap-2">
                {editando === pergunta.id ? (
                  <>
                    <button
                      type="button"
                      aria-label={`Salvar pergunta ${indice + 1}`}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => setEditando(null)}
                      className="flex cursor-pointer items-center text-[18px] text-[#5F8F6B]"
                    >
                      <Icon name="check" />
                    </button>

                    <button
                      type="button"
                      aria-label={`Cancelar edição da pergunta ${indice + 1}`}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        const textoOriginal =
                          textoAntesDeEditar[pergunta.id] ?? pergunta.enunciado

                        atualizarEnunciado(pergunta.id, textoOriginal)
                        setEditando(null)
                      }}
                      className="flex cursor-pointer items-center text-[18px] text-muted"
                    >
                      <Icon name="close" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      aria-label={`Editar pergunta ${indice + 1}`}
                      onClick={() => {
                        setTextoAntesDeEditar((atuais) => ({
                          ...atuais,
                          [pergunta.id]: pergunta.enunciado,
                        }))
                        setEditando(pergunta.id)
                      }}
                      className="flex cursor-pointer items-center text-[18px] text-muted"
                    >
                      <Icon name="edit" />
                    </button>

                    <button
                      type="button"
                      aria-label={`Excluir pergunta ${indice + 1}`}
                      onClick={() =>
                        onChange(
                          perguntas.filter((item) => item.id !== pergunta.id),
                        )
                      }
                      className="flex cursor-pointer items-center text-[18px] text-muted"
                    >
                      <Icon name="delete" />
                    </button>
                  </>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
      {!somenteLeitura && (
        <button type="button" onClick={() => onChange([...perguntas, novaPerguntaFixa()])} className="mt-0.5 w-fit cursor-pointer rounded-lg border border-[#c9b8a0] bg-white px-2 py-1 text-[16px] text-[#a08d77]">
          + Adicionar
        </button>
      )}
    </fieldset>
  )
}

function CampoPrazo({ prazo, setPrazo }: { prazo: string; setPrazo: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <Field label="Prazo para responder (opcional)" name="prazo" placeholder="Ex: 30/09/26" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
    </div>
  )
}

export function CriarFormularioModal({ onClose, equipeIdInicial }: { onClose: () => void, equipeIdInicial?: string}) {
  const { equipes, adicionarFormulario } = useStore()
  const [nome, setNome] = useState('')
  const [equipeId, setEquipeId] = useState(equipeIdInicial ?? equipes[0]?.id ?? '')
  const [data, setData] = useState('')
  const [hora, setHora] = useState('')
  const [postar, setPostar] = useState(false)
  const [prazo, setPrazo] = useState('')
  const [perguntas, setPerguntas] = useState<Pergunta[]>([])
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const equipe = equipes.find((e) => e.id === equipeId)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim() || !equipe) return setErro('Informe o nome do formulário e a equipe.')
    setEnviando(true)
    try {
      await adicionarFormulario({
        titulo: nome.trim(),
        turmaId: equipe.id,
        perguntas: perguntas.filter((p) => p.enunciado.trim()).map(normalizarPergunta),
        ...(postar ? { postar: true } : data.trim() ? { publicarEm: dataHoraParaIso(data, hora) } : {}),
        ...(prazo.trim() ? { prazo: prazoParaApi(prazo) } : {}),
      })
      onClose()
    } catch (e) {
      setErro(mensagemDeErro(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal title="Criando Formulário" icon="add" onClose={onClose} width={500}>
      <form onSubmit={enviar} className="flex w-full flex-col items-center gap-5">
        <div className="flex w-full flex-col gap-3">
          <Field label="Nome do Formulário" name="nome" placeholder="Média, mediana e moda" value={nome} onChange={(e) => setNome(e.target.value)} />
          <SelectField
            label="Período letivo"
            placeholder="Selecione a equipe"
            value={equipeId}
            onChange={setEquipeId}
            options={equipes.map((e, i) => ({ value: e.id, label: `${e.nome}${i ? ` (${e.periodo})` : ''}` }))}
            leading={equipe && <TeamBadge sigla={equipe.sigla} cor={equipe.cor} size={24} fontSize={12} />}
            leadingPad={42}
          />
          <div className="flex flex-col gap-1.5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr]">
              <Field label="Data de publicação" name="data" placeholder="Ex: 24/09/26" value={data} onChange={(e) => setData(e.target.value)} disabled={postar} />
              <Field label="Horário" name="hora" placeholder="Ex: 00:00" value={hora} onChange={(e) => setHora(e.target.value)} disabled={postar} />
            </div>
            <label className="flex w-fit cursor-pointer items-center gap-2 text-base text-[#a08d77]">
              <input type="checkbox" checked={postar} onChange={(e) => setPostar(e.target.checked)} className="size-4 cursor-pointer accent-sidebar" />
              Postar ao criar formulário
            </label>
          </div>
          <CampoPrazo prazo={prazo} setPrazo={setPrazo} />
          <PerguntasEditor perguntas={perguntas} onChange={setPerguntas} />
          {erro && (
            <p role="alert" className="text-[14px] text-diff-c">
              {erro}
            </p>
          )}
        </div>
        <Acoes concluir="Criar" onClose={onClose} desabilitado={enviando} carregando="Criando…" />
      </form>
    </Modal>
  )
}

const DESCRICAO_STATUS: Record<StatusFormulario, string> = {
  agendado: 'Publicação agendada',
  rascunho: 'Ainda não publicado',
  fechado: 'Fechado para respostas',
  aberto: 'Aberto para alunos responderem',
  concluido: 'Avaliação concluída',
}

export function EditarFormularioModal({ formulario, onClose }: { formulario: Formulario; onClose: () => void }) {
  const { equipes, atualizarFormulario } = useStore()
  const equipe = equipes.find((e) => e.id === formulario.equipeId)
  const [nome, setNome] = useState(formulario.titulo)
  const [status, setStatus] = useState<StatusFormulario>(formulario.status)
  const [perguntas, setPerguntas] = useState<Pergunta[]>(formulario.perguntas.map((pergunta) => ({
    ...pergunta,
    tipo: 'multipla',
    opcoes: [...OPCOES_FIXAS_IPC],
    marcadas: [],
    categoriasOpcao: [...CATEGORIAS_FIXAS_IPC],
  })))
  const [data, setData] = useState('')
  const [hora, setHora] = useState('')
  const [prazo, setPrazo] = useState(formulario.prazo ?? '')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const perguntasEditaveis = formulario.status === 'rascunho' || formulario.status === 'agendado'
  const precisaData = status === 'agendado' && formulario.status !== 'agendado'

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    try {
      await atualizarFormulario(formulario.id, {
        titulo: nome.trim() || formulario.titulo,
        ...(status !== formulario.status ? { status } : {}),
        ...(precisaData ? { publicarEm: dataHoraParaIso(data, hora) } : {}),
        ...(perguntasEditaveis ? { perguntas: perguntas.filter((p) => p.enunciado.trim()).map(normalizarPergunta) } : {}),
        ...(prazo.trim() !== (formulario.prazo ?? '') ? { prazo: prazo.trim() ? prazoParaApi(prazo) : null } : {}),
      })
      onClose()
    } catch (e) {
      setErro(mensagemDeErro(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal title="Editando Formulário" icon="edit" onClose={onClose} width={500}>
      <form onSubmit={enviar} className="flex w-full flex-col items-center gap-5">
        <div className="flex w-full flex-col gap-3">
          <Field label="Nome do Formulário" name="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          <SelectField
            label="Status"
            placeholder="Selecione o status"
            value={status}
            onChange={(v) => setStatus(v as StatusFormulario)}
            options={(Object.keys(DESCRICAO_STATUS) as StatusFormulario[]).map((s) => ({ value: s, label: DESCRICAO_STATUS[s] }))}
            leading={<StatusPill status={status} />}
            leadingPad={96}
          />
          {precisaData && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr]">
              <Field label="Data de publicação" name="data" placeholder="Ex: 24/09/26" value={data} onChange={(e) => setData(e.target.value)} />
              <Field label="Horário" name="hora" placeholder="Ex: 00:00" value={hora} onChange={(e) => setHora(e.target.value)} />
            </div>
          )}
          <div className="flex w-full flex-col ">
            <span className="text-[18px] text-ink">Período letivo</span>
            <div className="flex h-10 items-center gap-2.5 rounded-lg border border-placeholder bg-white px-3 text-sm text-placeholder">
              {equipe && <TeamBadge sigla={equipe.sigla} cor={equipe.cor} size={22} fontSize={10} />}
              <span className="truncate">{equipe?.nome}</span>
            </div>
          </div>
          <CampoPrazo prazo={prazo} setPrazo={setPrazo} />
          <PerguntasEditor perguntas={perguntas} onChange={setPerguntas} somenteLeitura={!perguntasEditaveis} />
          {!perguntasEditaveis && <p className="text-[14px] text-muted">Formulários já publicados não podem ter as perguntas alteradas.</p>}
          {erro && (
            <p role="alert" className="text-[14px] text-diff-c">
              {erro}
            </p>
          )}
        </div>
        <Acoes concluir="Concluir" onClose={onClose} desabilitado={enviando} />
      </form>
    </Modal>
  )
}

type SwitchProps = {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  esconderLabel?: boolean
}

function PerfilSwitch({
  label,
  checked,
  onChange,
  esconderLabel = false,
}: SwitchProps) {
  return (
    <label
      className={cx(
        'flex cursor-pointer items-center gap-3 text-lg font-medium text-ink',
        esconderLabel ? 'w-11 justify-center' : 'w-full justify-between',
      )}
    >
      {!esconderLabel && <span>{label}</span>}

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-1 transition-colors',
          checked ? 'bg-ok' : 'bg-line',
        )}
      >
        <span
          className={cx(
            'size-4 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </button>
    </label>
  )
}

function PerfilCheck({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex w-full cursor-pointer items-center justify-between text-base text-muted">
      <span>{label}</span>

      <span className="flex w-11 shrink-0 justify-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="size-4 cursor-pointer accent-ok"
        />
      </span>
    </label>
  )
}

function iniciaisDoNome(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase()
}

export function PerfilModal({ onClose }: { onClose: () => void }) {
  const { sessao, sair, preferencias, atualizarPreferencias } = useStore()
  const navigate = useNavigate()

  const papel = sessao?.papel ?? 'professor'
  const nome = sessao?.nome ?? ''
  const email = sessao?.email ?? ''
  const ehAluno = papel === 'aluno'

  const [rascunho, setRascunho] = useState(preferencias)

  function atualizar<K extends keyof typeof rascunho>(campo: K, valor: (typeof rascunho)[K]) {
    setRascunho((atual) => ({
      ...atual,
      [campo]: valor,
    }))
  }

  const [erro, setErro] = useState('')

  async function concluir() {
    try {
      await atualizarPreferencias(rascunho)
      onClose()
    } catch (e) {
      setErro(mensagemDeErro(e))
    }
  }

  function encerrarSessao() {
    sair()
    onClose()
    navigate('/login', { replace: true })
  }

  return (
    <Modal
      title="Perfil"
      icon="person"
      onClose={onClose}
      width={500}
    >
      <div className="flex w-full flex-col gap-3">
        <section className="flex w-full items-center gap-3 rounded-2xl border border-card-line bg-banner-to px-4 py-4 sm:px-5">
          <Avatar
            letra={iniciaisDoNome(nome)}
            cor={ehAluno ? '#a67b5b' : '#15593c'}
            size={70}
            className="!text-[30px]"
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <h3 className="truncate text-2xl font-bold text-ink">
                {nome}
              </h3>

              <span className="w-fit px-1.5 border-1 border-card-line rounded-md bg-track text-[16px] text-muted">
                {ehAluno ? 'Aluno' : 'Professor'}
              </span>
            </div>

            <p className="truncate text-base text-muted">
              {email}
            </p>
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-ink">
              Notificações via Email
            </h3>

            <PerfilSwitch
              label="Ativar notificações via Email"
              checked={rascunho.notificacoesEmail}
              onChange={(valor) => atualizar('notificacoesEmail', valor)}
              esconderLabel
            />
          </div>

          <div
            className={cx(
              'grid transition-[grid-template-rows,opacity] duration-300 ease-in-out',
              rascunho.notificacoesEmail
                ? 'grid-rows-[1fr] opacity-100'
                : 'grid-rows-[0fr] opacity-0',
            )}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="flex flex-col gap-1.5 pl-3 pt-1 sm:pl-5">
                <PerfilCheck
                  label="Conclusão de formulários"
                  checked={rascunho.conclusaoFormularios}
                  onChange={(valor) => atualizar('conclusaoFormularios', valor)}
                />

                <PerfilCheck
                  label="Publicação de formulários"
                  checked={rascunho.publicacaoFormularios}
                  onChange={(valor) => atualizar('publicacaoFormularios', valor)}
                />

                <PerfilCheck
                  label="Métricas trimestrais"
                  checked={rascunho.metricasTrimestrais}
                  onChange={(valor) => atualizar('metricasTrimestrais', valor)}
                />

                <PerfilCheck
                  label="Métricas semestrais"
                  checked={rascunho.metricasSemestrais}
                  onChange={(valor) => atualizar('metricasSemestrais', valor)}
                />
              </div>
            </div>
          </div>
        </section>

        <div className="h-px w-full bg-card-line" />

        <PerfilSwitch
          label="Ícone de acessibilidade"
          checked={rascunho.acessibilidade}
          onChange={(valor) => {
            atualizar('acessibilidade', valor)
            atualizarPreferencias({ acessibilidade: valor }).catch((e) => setErro(mensagemDeErro(e)))
          }}
        />

        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
          <label htmlFor="tema-perfil" className="text-lg font-medium text-ink">
            Temas
          </label>

          <select
            id="tema-perfil"
            value={rascunho.tema}
            onChange={(event) => atualizar('tema', event.target.value as 'claro' | 'escuro' | 'alto-contraste')}
            className="w-full cursor-pointer rounded-lg border border-placeholder bg-white px-3 py-2 text-base text-placeholder outline-none focus-visible:border-ink sm:w-[180px]"
          >
            <option value="claro">Claro</option>
            <option value="escuro">Escuro</option>
            <option value="alto-contraste">Alto-contraste</option>
          </select>
        </div>

        {erro && (
          <p role="alert" className="text-[14px] text-diff-c">
            {erro}
          </p>
        )}

        <div className="mt-5 flex w-full flex-col items-center gap-2">
          <ButtonBrown type="button" onClick={concluir} className="w-full">
            Concluir
          </ButtonBrown>

          <button
            type="button"
            onClick={encerrarSessao}
            className="flex cursor-pointer items-center justify-center gap-1 py-1 text-sm font-medium text-diff-c transition hover:opacity-75"
          >
            <Icon name="logout" round={false} className="text-[18px]" />
            Sair da conta
          </button>
        </div>

      </div>
    </Modal>
  )
}

type ExcluirModalProps = {
  tipo: 'equipe' | 'formulario' | 'aluno' | 'sairEquipe'
  nome: string
  onClose: () => void
  onConfirmar: () => void
}

export function ExcluirModal({
  tipo,
  nome,
  onClose,
  onConfirmar,
}: ExcluirModalProps) {
  const [confirmado, setConfirmado] = useState(false)

  const ehEquipe = tipo === 'equipe'
  const ehAluno = tipo === 'aluno'
  const ehSairEquipe = tipo === 'sairEquipe'

  const titulo = ehSairEquipe
    ? 'Sair da equipe'
    : ehAluno
      ? 'Remover da equipe'
      : 'Excluir'

  const rotuloConfirmacao = ehSairEquipe
    ? 'Sair da equipe'
    : ehAluno
      ? 'Remover aluno'
      : 'Excluir'

  function confirmar(e: FormEvent) {
    e.preventDefault()

    if (!confirmado) return

    onConfirmar()
  }

  return (
    <Modal
      title={titulo}
      icon={ehSairEquipe || ehAluno ? 'person' : 'delete'}
      onClose={onClose}
      width={500}
      titleClassName="!text-diff-c !text-[22px] sm:!text-2xl"
    >
      <form onSubmit={confirmar} className="flex w-full flex-col gap-3">
        <p className="text-lg leading-7 text-ink text-pretty" >
          {ehSairEquipe ? (
            <>
              Você está prestes a sair da equipe <strong>{nome}</strong>.
              Suas respostas e sua participação nesta equipe serão apagadas.
            </>
          ) : ehAluno ? (
            <>
              Você está prestes a remover o aluno <strong>{nome}</strong> da equipe.
              As respostas dele(a) nesta equipe serão apagadas.
            </>
          ) : ehEquipe ? (
            <>
              Você está prestes a excluir a equipe de <strong>{nome}</strong>.
              Todos os formulários, respostas e métricas associadas serão apagados.
            </>
          ) : (
            <>
              Você está prestes a excluir o formulário <strong>{nome}</strong>.
              Todas as respostas e métricas associadas serão apagadas.
            </>
          )}
        </p>

        <label className="flex cursor-pointer items-center gap-3 text-lg text-ink">
          <input
            type="checkbox"
            checked={confirmado}
            onChange={(e) => setConfirmado(e.target.checked)}
            className="size-5 cursor-pointer accent-diff-c"
          />

          <span>
            Sim, entendo que esta ação é irreversível.
          </span>
        </label>

        <div className="mt-4 flex items-center justify-end gap-2">
          <ButtonBrown type="submit" disabled={!confirmado} className="bg-diff-c hover:bg-diff-c/80">
            {rotuloConfirmacao}
          </ButtonBrown>

          <ButtonGhost type="button" onClick={onClose}>
            Cancelar
          </ButtonGhost>
        </div>
      </form>
    </Modal>
  )
}
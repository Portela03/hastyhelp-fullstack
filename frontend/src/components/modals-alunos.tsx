import { useState } from 'react'
import { useApi } from '../api/use-api'
import type { StatusAluno } from '../data/aluno'
import type { Dificuldade, Formulario, Pergunta } from '../data/tipos'
import { PerguntaCard } from './PerguntaCard'
import { ButtonBrown, DifficultyLetter, Modal, StatusAlunoPill } from './ui'

/* Prévia: o professor vê a autoavaliação como o aluno a vê (nada é salvo) */

export function PreviaAlunoModal({ formulario, onClose }: { formulario: Formulario; onClose: () => void }) {
  const [marcadas, setMarcadas] = useState<Record<string, number[]>>({})
  return (
    <Modal title="Ver como aluno" icon="visibility" onClose={onClose} width={720}>
      <div className="flex w-full flex-col gap-4">
        <p role="note" className="rounded-lg border border-line-input bg-panel px-3 py-2 text-[14px] text-ink">
          Prévia de “{formulario.titulo}”. É assim que o aluno vê as perguntas — o que você marcar aqui <strong>não é salvo</strong>.
        </p>
        {formulario.perguntas.length === 0 && <p className="text-[16px] text-muted">Este formulário ainda não tem perguntas.</p>}
        {formulario.perguntas.map((p, i) => (
          <PerguntaCard
            key={p.id}
            pergunta={{ ...p, gabarito: undefined }}
            indice={i}
            marcadas={marcadas[p.id] ?? []}
            onChange={(m) => setMarcadas((atual) => ({ ...atual, [p.id]: m }))}
          />
        ))}
        <ButtonBrown onClick={onClose}>Fechar prévia</ButtonBrown>
      </div>
    </Modal>
  )
}

/* Respostas individuais de um aluno (N09, R-90) */

interface DetalheDTO {
  formularioId: string
  titulo: string
  status: Exclude<StatusAluno, 'encerrado'>
  nota: number | null
  nivel: Dificuldade | null
  observacao: string | null
  enviadoEm: string | null
  perguntas: Array<{ id: string; enunciado: string; tipo: Pergunta['tipo']; opcoes: string[]; gabarito: number[]; marcadas: number[] }>
}

interface RespostasDTO {
  aluno: { id: string; nome: string }
  formularios?: DetalheDTO[]
  resposta?: DetalheDTO
}

const nota = (n: number | null) => (n === null ? '—' : n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }))

function Detalhe({ d }: { d: DetalheDTO }) {
  return (
    <section aria-label={`Respostas em ${d.titulo}`} className="flex flex-col gap-3 rounded-xl border border-line bg-white p-4">
      <header className="flex flex-wrap items-center gap-3">
        <h3 className="min-w-0 flex-1 text-[18px] font-semibold text-ink">{d.titulo}</h3>
        <StatusAlunoPill status={d.status} />
      </header>
      {d.status === 'respondido' && (
        <p className="flex flex-wrap items-center gap-x-4 text-[16px] text-ink">
          <span>
            Nota: <strong>{nota(d.nota)}</strong>/10
          </span>
          <span className="flex items-center gap-1">
            Compreensão: {d.nivel ? <DifficultyLetter letra={d.nivel} /> : '—'}
          </span>
        </p>
      )}
      {d.observacao && (
        <p className="rounded-lg border border-line bg-panel px-3 py-2 text-[14px] text-ink">
          <strong>Observação:</strong> “{d.observacao}”
        </p>
      )}
      {d.status === 'pendente' ? (
        <p className="text-[16px] text-muted">O aluno ainda não começou a responder.</p>
      ) : (
        d.perguntas.map((p, i) => (
          <PerguntaCard
            key={p.id}
            pergunta={{ id: p.id, enunciado: p.enunciado, tipo: p.tipo, opcoes: p.opcoes, marcadas: [], ...(p.gabarito.length ? { gabarito: p.gabarito } : {}) }}
            indice={i}
            marcadas={p.marcadas}
            mostrarGabarito={p.gabarito.length > 0 && d.status === 'respondido'}
          />
        ))
      )}
    </section>
  )
}

export function RespostasDoAlunoModal({ nome, caminho, onClose }: { nome: string; caminho: string; onClose: () => void }) {
  const { dados, erro, carregando } = useApi<RespostasDTO>(caminho)
  const itens = dados?.formularios ?? (dados?.resposta ? [dados.resposta] : [])
  return (
    <Modal title={`Respostas de ${nome}`} icon="person" onClose={onClose} width={760}>
      <div className="flex w-full flex-col gap-4">
        {carregando && <p role="status" className="text-[16px] text-muted">Carregando…</p>}
        {erro && (
          <p role="alert" className="text-[14px] text-diff-c">
            {erro}
          </p>
        )}
        {!carregando && !erro && itens.length === 0 && <p className="text-[16px] text-muted">Nenhuma autoavaliação publicada para este aluno.</p>}
        {itens.map((d) => (
          <Detalhe key={d.formularioId} d={d} />
        ))}
        <ButtonBrown onClick={onClose}>Fechar</ButtonBrown>
      </div>
    </Modal>
  )
}

/* Link de redefinição de senha gerado pelo professor (R-77) */

export function LinkDeRedefinicaoModal({ nome, link, onClose }: { nome: string; link: string; onClose: () => void }) {
  const [copiado, setCopiado] = useState(false)
  async function copiar() {
    try {
      await navigator.clipboard.writeText(link)
      setCopiado(true)
    } catch {
      /* sem permissão de área de transferência: o link continua visível para copiar à mão */
    }
  }
  return (
    <Modal title="Link de redefinição de senha" icon="key" onClose={onClose} width={600}>
      <div className="flex w-full flex-col gap-4">
        <p className="text-[16px] text-ink">
          Envie este link para <strong>{nome}</strong>. Ele vale por 30 minutos e só pode ser usado uma vez.
        </p>
        <code aria-label="Link de redefinição" className="break-all rounded-lg border border-line-input bg-white p-3 text-[14px] text-ink">
          {link}
        </code>
        <div className="flex gap-3">
          <ButtonBrown onClick={copiar}>{copiado ? 'Copiado!' : 'Copiar link'}</ButtonBrown>
          <ButtonBrown onClick={onClose}>Fechar</ButtonBrown>
        </div>
      </div>
    </Modal>
  )
}

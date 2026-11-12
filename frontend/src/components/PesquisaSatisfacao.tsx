import { useState } from 'react'
import { Modal, ButtonBrown, ButtonGhost, cx, Icon } from './ui'
import { useStore } from '../store'
import type { GatilhoPesquisa } from '../data/satisfacao'

interface PesquisaModalProps {
  onClose: () => void
  gatilho?: GatilhoPesquisa
}

export function PesquisaSatisfacaoModal({ onClose, gatilho = 'continua' }: PesquisaModalProps) {
  const { sessao, registrarPesquisa } = useStore()
  const perfil = sessao?.papel ?? 'aluno'

  const [csat, setCsat] = useState<number | null>(null)
  const [nps, setNps] = useState<number | null>(null)
  const [comentario, setComentario] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    setErro(null)

    if (csat === null) {
      setErro('Por favor, indique quão satisfeito você está com o HastyHelp.')
      return
    }
    if (nps === null) {
      setErro('Por favor, indique a chance de recomendar o HastyHelp a um colega.')
      return
    }

    const resultado = registrarPesquisa({
      perfil,
      csat,
      nps,
      comentario,
      gatilho,
    })

    if (!resultado.sucesso) {
      setErro(resultado.erro ?? 'Erro ao salvar a resposta.')
      return
    }

    setSucesso(true)
    setTimeout(() => {
      onClose()
    }, 1500)
  }

  return (
    <Modal title="Avaliar o HastyHelp" icon="rate_review" onClose={onClose} width={560}>
      {sucesso ? (
        <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-[#eaf7ec] text-[#2f7a3f]">
            <Icon name="check" className="text-[28px]" />
          </div>
          <h3 className="text-[20px] font-bold text-ink">Obrigado pelo seu feedback!</h3>
          <p className="text-[15px] text-muted">Sua resposta nos ajuda a melhorar o sistema para todos.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-6">
          <p className="text-[14px] leading-relaxed text-muted">
            Leva menos de 1 minuto. Sua resposta é anônima: guardamos apenas se você é aluno ou professor.
          </p>

          {erro && (
            <div role="alert" className="rounded-lg border border-diff-c bg-diff-c/10 p-3 text-[14px] font-medium text-diff-c">
              {erro}
            </div>
          )}

          {/* CSAT: 1 a 5 */}
          <div className="flex flex-col gap-2">
            <label className="text-[16px] font-semibold text-ink">
              Quão satisfeito você está com o HastyHelp?
            </label>
            <div role="radiogroup" aria-label="Escala de satisfação" className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((nota) => {
                const selecionado = csat === nota
                return (
                  <button
                    key={nota}
                    type="button"
                    role="radio"
                    aria-checked={selecionado}
                    onClick={() => setCsat(nota)}
                    className={cx(
                      'flex size-10 cursor-pointer items-center justify-center rounded-lg border text-[16px] font-semibold transition',
                      selecionado
                        ? 'border-ink bg-btn-brown font-bold text-ink shadow-btn'
                        : 'border-placeholder bg-white text-ink hover:border-ink hover:bg-page',
                    )}
                  >
                    {nota}
                  </button>
                )
              })}
            </div>
            <div className="flex justify-between text-[12px] text-muted">
              <span>Muito insatisfeito</span>
              <span>Muito satisfeito</span>
            </div>
          </div>

          {/* NPS: 0 a 10 */}
          <div className="flex flex-col gap-2">
            <label className="text-[16px] font-semibold text-ink">
              Qual a chance de você recomendar o HastyHelp a um colega?
            </label>
            <div role="radiogroup" aria-label="Escala de recomendação" className="flex flex-wrap items-center gap-1.5 sm:flex-nowrap">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((nota) => {
                const selecionado = nps === nota
                return (
                  <button
                    key={nota}
                    type="button"
                    role="radio"
                    aria-checked={selecionado}
                    onClick={() => setNps(nota)}
                    className={cx(
                      'flex size-9 cursor-pointer items-center justify-center rounded-lg border text-[15px] font-semibold transition sm:size-10',
                      selecionado
                        ? 'border-ink bg-btn-brown font-bold text-ink shadow-btn'
                        : 'border-placeholder bg-white text-ink hover:border-ink hover:bg-page',
                    )}
                  >
                    {nota}
                  </button>
                )
              })}
            </div>
            <div className="flex justify-between text-[12px] text-muted">
              <span>Nenhuma chance</span>
              <span>Com certeza recomendaria</span>
            </div>
          </div>

          {/* Comentário aberto */}
          <div className="flex flex-col gap-1">
            <label htmlFor="comentario-pesquisa" className="text-[16px] font-semibold text-ink">
              O que podemos melhorar? <span className="text-[14px] font-normal text-muted">(opcional)</span>
            </label>
            <textarea
              id="comentario-pesquisa"
              rows={3}
              maxLength={500}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Conte o que funcionou bem ou o que foi difícil…"
              className="w-full resize-none rounded-lg border border-placeholder bg-white p-3 text-[15px] text-ink outline-none placeholder:text-placeholder focus-visible:border-ink"
            />
            <div className="flex justify-end text-[12px] text-muted">
              {comentario.length}/500
            </div>
          </div>

          <div className="flex w-full items-center justify-end gap-3 pt-2">
            <ButtonGhost onClick={onClose}>Agora não</ButtonGhost>
            <ButtonBrown type="submit" className="max-w-[160px]">
              Enviar
            </ButtonBrown>
          </div>
        </form>
      )}
    </Modal>
  )
}

/** Cartão pós-envio na tela Meu resultado do aluno */
export function CartaoPosEnvioSatisfacao({ onAvaliar }: { onAvaliar: () => void }) {
  const [ignorado, setIgnorado] = useState(false)

  if (ignorado) return null

  return (
    <section className="flex flex-col justify-between gap-4 rounded-xl border border-line bg-panel p-5 sm:flex-row sm:items-center">
      <div className="flex flex-col gap-1">
        <h3 className="flex items-center gap-2 text-[18px] font-bold text-ink">
          <Icon name="rate_review" className="text-ok text-[22px]" />
          Como foi responder esta autoavaliação?
        </h3>
        <p className="text-[14px] text-muted">
          Ajude-nos a entender sua experiência. Leva menos de 1 minuto e é totalmente anônimo.
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setIgnorado(true)}
          className="cursor-pointer rounded-lg px-3 py-2 text-[14px] font-medium text-muted hover:text-ink"
        >
          Agora não
        </button>
        <button
          type="button"
          onClick={onAvaliar}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-ink bg-btn-brown px-4 py-2 text-[15px] font-semibold text-ink shadow-btn hover:bg-btn-brown-hover"
        >
          Avaliar agora
        </button>
      </div>
    </section>
  )
}


import { useId } from 'react'
import { acertou } from '../data/aluno'
import type { Pergunta } from '../data/tipos'
import { Icon, cx } from './ui'

/** Pergunta de autoavaliação: o aluno responde (com `onChange`) ou lê o resultado (sem `onChange`). */
export function PerguntaCard({
  pergunta,
  indice,
  marcadas,
  onChange,
  mostrarGabarito,
}: {
  pergunta: Pergunta
  indice: number
  marcadas: number[]
  onChange?: (m: number[]) => void
  mostrarGabarito?: boolean
}) {
  const leitura = !onChange
  // `name` único por cartão: o mesmo formulário pode aparecer em dois lugares da tela (ex.: prévia sobre a página)
  const grupo = useId()
  const alternar = (j: number) => {
    if (!onChange) return
    if (pergunta.tipo === 'unica') return onChange([j])
    onChange(marcadas.includes(j) ? marcadas.filter((x) => x !== j) : [...marcadas, j])
  }
  return (
    <fieldset className="flex flex-col gap-3 rounded-xl border border-line bg-page p-4">
      <legend className="sr-only">{pergunta.enunciado}</legend>
      <div className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-[16px] font-bold text-white">{indice + 1}</span>
        <h2 className="text-[18px] font-semibold text-ink">{pergunta.enunciado}</h2>
        {mostrarGabarito && (
          <span className={cx('ml-auto flex items-center gap-1 text-[14px] font-semibold', acertou(pergunta, { [pergunta.id]: marcadas }) ? 'text-ok' : 'text-diff-c')}>
            <Icon name={acertou(pergunta, { [pergunta.id]: marcadas }) ? 'check_circle' : 'cancel'} className="text-[18px]" />
            {acertou(pergunta, { [pergunta.id]: marcadas }) ? 'Correta' : 'Incorreta'}
          </span>
        )}
      </div>
      <ul className="flex flex-col gap-2">
        {pergunta.opcoes.map((op, j) => {
          const marcada = marcadas.includes(j)
          const correta = mostrarGabarito && pergunta.gabarito?.includes(j)
          return (
            <li key={op}>
              <label
                className={cx(
                  'flex items-center gap-3 rounded-lg border bg-white px-3 py-3 text-[16px] text-ink',
                  correta ? 'border-ok' : mostrarGabarito && marcada ? 'border-diff-c' : 'border-line',
                  !leitura && 'cursor-pointer',
                )}
              >
                <input
                  type={pergunta.tipo === 'unica' ? 'radio' : 'checkbox'}
                  name={grupo}
                  checked={marcada}
                  onChange={() => alternar(j)}
                  disabled={leitura}
                  className="size-[18px] shrink-0 accent-ink"
                />
                <span className="min-w-0 flex-1">{op}</span>
                {correta && <span className="text-[13px] font-semibold text-ok">Resposta correta</span>}
              </label>
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}

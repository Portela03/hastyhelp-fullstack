import { useEffect, useId, useRef, useState } from 'react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'
import dotAgendado from '../assets/figma/dot-agendado.svg'
import dotAtivo from '../assets/figma/dot-ativo.svg'
import dotInativo from '../assets/figma/dot-inativo.svg'
import dotConcluido from '../assets/figma/dot-concluido.svg'
import dotRascunho from '../assets/figma/dot-rascunho.svg'
import { ROTULO_STATUS_ALUNO } from '../data/aluno'
import type { StatusAluno } from '../data/aluno'
import type { StatusFormulario } from '../data/tipos'
import { createPortal } from 'react-dom'
import { proximoIndice } from './navegacao-teclado'

export function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(' ')
}

export function SliderNotaGeral({
  value,
  onChange,
  leitura = false,
}: {
  value?: number
  onChange?: (value: number) => void
  leitura?: boolean
}) {
  const id = useId()
  const nota = value ?? 0
  const tamanhoIndicador = 44
  const posicaoReal = (percentual: number) =>
    `calc(${percentual * 100}% + ${(0.5 - percentual) * tamanhoIndicador}px)`
  return (
    <fieldset className="flex flex-col gap-3 rounded-xl border border-line bg-page p-4">
      <legend className="text-[18px] font-semibold text-ink">
        De 0 a 10 quanto você avalia seu conhecimento em relação ao conteúdo desta autoavaliação?
      </legend>
      <div className="relative flex flex-col gap-2">
        <div className="relative h-14">
          <div className="absolute left-0 right-0 top-[28px] h-2 rounded-full bg-line" aria-hidden />
          <div
            className="pointer-events-none absolute top-[10px] z-10 flex size-11 -translate-x-1/2 items-center justify-center rounded-full border-2 border-ink bg-ink text-[16px] font-bold text-white shadow-card"
            style={{ left: posicaoReal(nota / 10) }}
          >
            {nota.toLocaleString('pt-BR', { minimumFractionDigits: nota % 1 ? 1 : 0, maximumFractionDigits: 1 })}
          </div>
          <input
            id={id}
            aria-label="Nota geral do conteúdo"
            type="range"
            min={0}
            max={10}
            step={0.5}
            value={nota}
            disabled={leitura}
            onChange={(event) => onChange?.(Number(event.target.value))}
            className="absolute left-0 top-[10px] z-20 h-11 w-full cursor-pointer appearance-none bg-transparent disabled:cursor-default [&::-moz-range-thumb]:size-11 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-transparent [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:mt-[-18px] [&::-webkit-slider-thumb]:size-11 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-transparent"
          />
        </div>
        <div className="relative h-5 text-[12px] text-muted" aria-hidden>
          {Array.from({ length: 10 }, (_, i) => {
            const ponto = i + 1
            const meio = (ponto - 0.5) / 10
            return (
              <span
                key={`separador-${ponto}`}
                className="absolute -translate-x-1/2 text-[11px] font-normal text-placeholder"
                style={{ left: posicaoReal(meio) }}
              >
                |
              </span>
            )
          })}
          {Array.from({ length: 11 }, (_, i) => (
            <span
              key={i}
              className="absolute -translate-x-1/2 text-center text-[14px] font-semibold text-muted"
              style={{ left: posicaoReal(i / 10) }}
            >
              {i}
            </span>
          ))}
        </div>
      </div>
    </fieldset>
  )
}

export function Icon({ name, round = true, className }: { name: string; round?: boolean; className?: string }) {
  const tamanho = className?.match(/text-\[(\d+)px\]/)
  return (
    <span
      aria-hidden
      className={cx(round ? 'material-icons-round' : 'material-icons', 'shrink-0', className)}
      style={tamanho ? { fontSize: Number(tamanho[1]) } : undefined}
    >
      {name}
    </span>
  )
}

/* Menu 3 pontinhos */
type OptionMenuItem = {
  label: string
  icon: string
  onClick: () => void
  destructive?: boolean
}

type OptionsMenuProps = {
  label: string
  items: OptionMenuItem[]
  className?: string
}

export function OptionsMenu({ label, items, className }: OptionsMenuProps) {
  const [aberto, setAberto] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const botaoRef = useRef<HTMLButtonElement>(null)
  const [menuPosicao, setMenuPosicao] = useState({ top: 0, left: 0 })
  const menuPortalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return

    const fecharAoClicarFora = (event: MouseEvent) => {
      const clicouNoBotao = menuRef.current?.contains(event.target as Node)
      const clicouNoMenu = menuPortalRef.current?.contains(event.target as Node)

      if (!clicouNoBotao && !clicouNoMenu) {
        setAberto(false)
      }
    }

    const fecharComEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAberto(false)
      }
    }

    document.addEventListener('mousedown', fecharAoClicarFora)
    document.addEventListener('keydown', fecharComEscape)

    return () => {
      document.removeEventListener('mousedown', fecharAoClicarFora)
      document.removeEventListener('keydown', fecharComEscape)
    }
  }, [aberto])

  const selecionar = (item: OptionMenuItem) => {
    setAberto(false)
    item.onClick()
  }

  return (
    <div ref={menuRef} className={cx('relative shrink-0', className)}>
      <button
        ref={botaoRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={aberto}
        onClick={(event) => {
          event.stopPropagation()

          if (!aberto && botaoRef.current) {
            const rect = botaoRef.current.getBoundingClientRect()
            const menuHeight = items.length * 44 + 16
            const menuWidth = 200
            const abrirParaCima =
              window.innerHeight - rect.bottom < menuHeight

            setMenuPosicao({
              top: abrirParaCima
                ? rect.top - menuHeight - 8
                : rect.bottom + 8,
              left: Math.min(
                Math.max(rect.right - menuWidth, 8),
                window.innerWidth - menuWidth - 8,
              ),
            })
          }

          setAberto((valor) => !valor)
        }}
        className="flex cursor-pointer items-center justify-center rounded-full px-1 text-[20px] leading-none text-ink transition hover:bg-black/5"
      >
        <Icon name="more_horiz" />
      </button>

      {aberto && 
        createPortal(
        <div
          ref={menuPortalRef}
          role="menu"
          aria-label={label}
          className="fixed z-[9999] max-h-[calc(100vh-16px)] min-w-[200px] overflow-hidden rounded-xl border border-line-input bg-white py-1 shadow-[0_6px_18px_rgba(51,51,51,0.22)]"
          style={menuPosicao}          
          onClick={(event) => event.stopPropagation()}
        >
          {items.map((item, index) => (
            <div key={item.label}>
              {index > 0 && item.destructive && (
                <div className="mx-1 border-t border-line-input" />
              )}

              <button
                type="button"
                role="menuitem"
                onClick={() => selecionar(item)}
                className={cx(
                  'flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-left text-[16px] transition',
                  'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink',
                  item.destructive
                    ? 'text-red-500 hover:bg-red-50'
                    : 'text-ink hover:bg-btn',
                )}
              >
                <Icon name={item.icon} className="text-[18px]" />
                <span>{item.label}</span>
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </div>
  )
}

/* Botões */

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { icon?: string; iconRound?: boolean }

export function ButtonPrimary({ icon, iconRound = true, children, className, ...rest }: BtnProps) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        'flex cursor-pointer items-center justify-center gap0.5 whitespace-nowrap rounded-lg border border-ink bg-btn px-3 py-1 text-[20px] font-medium text-ink shadow-btn',
        'transition duration-100',
        'hover:bg-btn-hover hover:shadow-btn-hover',
        'active:shadow-none',
        className,
      )}
    >
      {icon && <Icon name={icon} round={iconRound} className="text-[22px]" />}
      {children}
    </button>
  )
}

export function ButtonBrown({ children, className, ...rest }: BtnProps) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        'flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg border border-ink bg-btn-brown px-3 py-1 text-[20px] font-medium text-ink shadow-btn',
        'transition duration-100',
        'hover:bg-btn-brown-hover hover:shadow-btn-hover',
        'active:shadow-none',
        'disabled:cursor-not-allowed disabled:border-transparent disabled:bg-[#eeeeee] disabled:text-[#888888] disabled:shadow-none disabled:hover:bg-[#eeeeee]',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function ButtonGhost({ children, className, ...rest }: BtnProps) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        'flex min-w-0 flex-1 cursor-pointer items-center justify-center rounded-lg bg-white px-1.5 py-1 text-[20px] font-medium text-[#505050]',
        'transition duration-100',
        'hover:opacity-80',
        'active:scale-95',
        className,
      )}
    >
      {children}
    </button>
  )
}

/* Abas segmentadas (ex.: Código | Email no modal Adicionar membros) */

export function SegmentedTabs<T extends string>({
  rotulo,
  abas,
  ativa,
  onChange,
  idPainel,
}: {
  rotulo: string
  abas: Array<{ id: T; label: string }>
  ativa: T
  onChange: (id: T) => void
  /** id do painel exibido, para ligar as abas a ele (acessibilidade). */
  idPainel?: string
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const indiceAtivo = Math.max(
    0,
    abas.findIndex((a) => a.id === ativa),
  )

  function aoTeclar(e: ReactKeyboardEvent<HTMLButtonElement>, indice: number) {
    const destino = proximoIndice(e.key, indice, abas.map(() => true), 'horizontal')
    if (destino === null) return
    e.preventDefault()
    onChange(abas[destino]!.id)
    refs.current[destino]?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label={rotulo}
      className="relative flex w-full items-center rounded-[9px] border border-placeholder bg-white"
    >
      <div
        aria-hidden="true"
        style={{
          width: `${100 / abas.length}%`,
          transform: `translateX(${indiceAtivo * 100}%)`,
        }}
        className="pointer-events-none absolute top-0 left-0 h-full rounded-lg bg-btn-brown outline transition-transform duration-250 ease-in-out"
      />

      {abas.map((a, i) => (
        <button
          key={a.id}
          ref={(el) => {
            refs.current[i] = el
          }}
          type="button"
          role="tab"
          id={`aba-${a.id}`}
          aria-selected={ativa === a.id}
          aria-controls={idPainel}
          tabIndex={ativa === a.id ? 0 : -1}
          onClick={() => onChange(a.id)}
          onKeyDown={(e) => aoTeclar(e, i)}
          className={cx(
            'relative z-10 min-h-11 flex-1 cursor-pointer rounded-lg px-3 py-2 text-[20px] font-medium transition-colors',
            ativa === a.id ? 'text-ink' : 'text-muted hover:text-ink',
          )}
        >
          {a.label}
        </button>
      ))}
    </div>
  )
}

/* Avatares e siglas */

export function Avatar({ letra, cor = '#15593c', size = 40, className }: { letra: string; cor?: string; size?: number; className?: string }) {
  return (
    <div
      className={cx('flex shrink-0 items-center justify-center rounded-full font-semibold text-[#ececec]', className)}
      style={{ backgroundColor: cor, width: size, height: size, fontSize: size >= 40 ? 16 : 11 }}
    >
      {letra}
    </div>
  )
}

export function TeamBadge({ sigla, cor, size = 60, fontSize }: { sigla: string; cor: string; size?: number; fontSize?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-[4px] font-semibold text-white"
      style={{ backgroundColor: cor, width: size, height: size, fontSize: fontSize ?? Math.round(size / 2) }}
    >
      {sigla}
    </div>
  )
}

/* Status */

const TONS = {
  verde: { dot: dotAtivo, bg: 'bg-[#eaf7ec]', text: 'text-[#2f7a3f]' },
  azul: { dot: dotAgendado, bg: 'bg-[#eaf2f7]', text: 'text-[#2f5b7a]' },
  cinza: { dot: dotInativo, bg: 'bg-black/8', text: 'text-black/46' },
  lilas: { dot: dotConcluido, bg: 'bg-[#f3eaf7]', text: 'text-[#5b2f7a]' },
  amarelo: { dot: dotRascunho, bg: 'bg-[#f7f5ea]', text: 'text-[#7a712f]' },
} as const

type Tom = keyof typeof TONS

export function Pill({ tom, children }: { tom: Tom; children: ReactNode }) {
  const t = TONS[tom]
  return (
    <span className={cx('inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-line-input px-2 py-1', t.bg)}>
      <img src={t.dot} alt="" className="size-2" />
      <span className={cx('text-[14px] font-semibold', t.text)}>{children}</span>
    </span>
  )
}

const STATUS: Record<StatusFormulario, { label: string; tom: Tom }> = {
  agendado: { label: 'Agendado', tom: 'azul' },
  rascunho: { label: 'Rascunho', tom: 'amarelo' },
  fechado: { label: 'Fechado', tom: 'cinza' },
  aberto: { label: 'Aberto', tom: 'verde' },
  concluido: { label: 'Concluído', tom: 'lilas' },
}

export function StatusPill({ status }: { status: StatusFormulario }) {
  return <Pill tom={STATUS[status].tom}>{STATUS[status].label}</Pill>
}

const STATUS_ALUNO: Record<StatusAluno, Tom> = {
  pendente: 'amarelo',
  andamento: 'azul',
  respondido: 'verde',
  encerrado: 'cinza',
}

export function StatusAlunoPill({ status }: { status: StatusAluno }) {
  return <Pill tom={STATUS_ALUNO[status]}>{ROTULO_STATUS_ALUNO[status]}</Pill>
}

/* Barras */

export function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-3 w-full overflow-hidden rounded-lg bg-white shadow-[inset_0_0_1px_rgba(0,0,0,0.45)]"
    >
      <div className="h-full rounded-lg bg-[#b8b8b8] shadow-[inset_0_0_1px_rgba(0,0,0,0.45)]" style={{ width: `${value}%` }} />
    </div>
  )
}

/* Campos */

export function Field({
  label,
  className,
  ...rest
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <div className="flex w-full flex-col">
      <label htmlFor={id} className="text-lg text-ink">
        {label}
      </label>
      <input
        id={id}
        {...rest}
        className={cx(
          'h-10 w-full rounded-lg border border-placeholder bg-white px-3 text-sm text-ink outline-none transition placeholder:text-placeholder focus:border-ink read-only:text-placeholder',
          className,
        )}
      />
    </div>
  )
}

export function PasswordField({ label, placeholder, value, onChange, name }: { label?: string; placeholder: string; value: string; onChange: (v: string) => void; name: string }) {
  const id = useId()
  const [show, setShow] = useToggle()
  return (
    <div className="flex w-full flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-[18px] text-ink">
          {label}
        </label>
      )}
      <div className="flex items-center rounded-lg border border-placeholder bg-white p-3">
        <input
          id={id}
          name={name}
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          aria-label={label ? undefined : placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-placeholder"
        />
        <button
          type="button"
          aria-label={show ? 'Ocultar senha' : 'Exibir senha'}
          onClick={setShow}
          className="flex cursor-pointer text-[20px] text-placeholder"
        >
          <Icon name={show ? 'visibility' : 'visibility_off'} />
        </button>
      </div>
    </div>
  )
}

function useToggle(): [boolean, () => void] {
  const [v, setV] = useState(false)
  return [v, () => setV((x) => !x)]
}

export function SelectField({
  label,
  value,
  onChange,
  placeholder,
  options,
  leading,
  leadingPad = 44,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  options: Array<{ value: string; label: string }>
  leading?: ReactNode
  leadingPad?: number
}) {
  const id = useId()
  return (
    <div className="flex w-full flex-col">
      <label htmlFor={id} className="text-lg text-ink gap-2">
        {label}
      </label>
      <div className="relative flex h-10 items-center rounded-lg border border-placeholder bg-white transition focus-within:border-ink">
        {leading && (
          <div className="pointer-events-none absolute left-3 flex items-center">
            {leading}
          </div>
        )}
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={leading ? { paddingLeft: leadingPad } : undefined}
          className={cx(
            'h-full w-full cursor-pointer appearance-none bg-transparent px-3 pr-9 text-sm outline-none',
            value ? 'text-ink' : 'text-placeholder',
          )}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Icon
          name="keyboard_arrow_down"
          round={false}
          className="pointer-events-none absolute right-2.5 text-[20px] text-placeholder"
        />
      </div>
    </div>
  )
}

/* Filtros da barra */

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="flex w-[200px] items-center gap-2 rounded-lg border border-line-input bg-white px-3 py-2 text-muted">
      <Icon name="search" className="text-[16px]" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
      />
    </label>
  )
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
  disabled,
  all = 'Todos',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  disabled?: boolean
  all?: string
}) {
  return (
    <label
      className={cx(
        'relative inline-flex items-center rounded-lg border text-[14px]',
        disabled ? 'border-[#ebebeb] bg-[#ebebeb] text-[#7f7f7f]' : 'border-line-input bg-white text-ink',
      )}
    >
      <select
        aria-label={label}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer appearance-none bg-transparent py-2 pl-3 pr-9 outline-none [field-sizing:content] disabled:cursor-not-allowed"
      >
        <option value="">{`${label}: ${all}`}</option>
        {options.map((o) => (
          <option key={o} value={o}>{`${label}: ${o}`}</option>
        ))}
      </select>
      <Icon name="expand_more" className="pointer-events-none absolute right-3" />
    </label>
  )
}

export function SortButton({ label, onClick, icon }: { label: string; onClick?: () => void; icon: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex cursor-pointer items-center gap-2 rounded-lg border border-line-input bg-white px-3 py-2 text-[14px] text-ink"
    >
      <img src={icon} alt="" className="toolbar-sort-icon size-[14px]" />
      {label}
    </button>
  )
}

/* Modal */

export function Modal({
  title,
  icon,
  onClose,
  children,
  width = 480,
  titleClassName
}: {
  title: string
  icon: string
  onClose: () => void
  children: ReactNode
  width?: number
  titleClassName?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  // onClose costuma ser uma função inline: guardá-la numa ref evita refocar o 1º controle a cada render do pai
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    const first = ref.current?.querySelector<HTMLElement>('input, select, button:not([tabindex="-1"])')
    first?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onCloseRef.current()
      if (e.key !== 'Tab' || !ref.current) return
      // prende o foco no diálogo (aria-modal)
      const focaveis = [...ref.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter((el) => el.tabIndex >= 0)
      if (focaveis.length === 0) return
      const primeiro = focaveis[0]!
      const ultimo = focaveis[focaveis.length - 1]!
      const dentro = ref.current.contains(document.activeElement)
      if (e.shiftKey && (document.activeElement === primeiro || !dentro)) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && (document.activeElement === ultimo || !dentro)) {
        e.preventDefault()
        primeiro.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      prev?.focus()
    }
  }, [])
    return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-black/45 p-4 backdrop-blur-[1px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ maxWidth: width }}
        className="my-auto flex w-full flex-col items-center gap-5 rounded-lg bg-white px-5 py-7 sm:px-"
      >
        <h2
          id={titleId}
          className={cx(
            'flex w-full items-center text-[22px] sm:!text-2xl font-semibold text-ink',
            titleClassName,
          )}
        >
          <Icon name={icon} round={false}/>
          {title}
        </h2>

        {children}
      </div>
    </div>,
    document.body,
  )
}

/* Cartões de indicador */

export function KpiCard({
  titulo,
  valor,
  detalhe,
  destaque,
  detalheTamanho = 14,
  className,
}: {
  titulo: string
  valor: ReactNode
  detalhe: ReactNode
  destaque?: boolean
  detalheTamanho?: number
  className?: string
}) {
  return (
    <div className={cx('flex min-w-0 flex-1 flex-col gap-2 rounded-xl border border-line bg-panel p-4', className)}>
      <p className="text-[14px] text-muted">{titulo}</p>
      <p className={cx('text-[28px] font-bold', destaque ? 'text-ok' : 'text-ink')}>{valor}</p>
      <p className="text-muted" style={{ fontSize: detalheTamanho }}>
        {detalhe}
      </p>
    </div>
  )
}

export function Panel({ titulo, subtitulo, children, className, tituloTamanho = 20 }: { titulo: string; subtitulo?: string; children: ReactNode; className?: string; tituloTamanho?: number }) {
  return (
    <section className={cx('flex flex-col gap-4 rounded-xl border border-line bg-panel p-5', className)}>
      <header className="flex flex-col gap-1">
        <h3 className="font-bold text-ink" style={{ fontSize: tituloTamanho }}>
          {titulo}
        </h3>
        {subtitulo && <p className="text-[14px] text-muted">{subtitulo}</p>}
      </header>
      {children}
    </section>
  )
}

export function DifficultyLetter({ letra, className }: { letra: string; className?: string }) {
  return <span className={cx('font-plex font-semibold', className)}>{letra}</span>
}


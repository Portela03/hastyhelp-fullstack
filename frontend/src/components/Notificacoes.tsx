import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, mensagemDeErro } from '../api/client'
import { useApi } from '../api/use-api'
import { Icon, cx } from './ui'

interface NotificacaoDTO {
  id: string
  tipo: 'publicacao' | 'lembrete' | 'conclusao' | 'resposta-observacao'
  titulo: string
  mensagem: string
  link: string | null
  criadaEm: string
  lida: boolean
}

interface ListaDTO {
  itens: NotificacaoDTO[]
  naoLidas: number
}

const ICONE: Record<NotificacaoDTO['tipo'], string> = {
  publicacao: 'assignment',
  lembrete: 'schedule',
  conclusao: 'task_alt',
  'resposta-observacao': 'chat',
}

const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

/** Sino da barra superior: notificações do próprio usuário (R-84). */
export function Notificacoes() {
  const navigate = useNavigate()
  const { dados, recarregar } = useApi<ListaDTO>('/notificacoes')
  const [aberto, setAberto] = useState(false)
  const [erro, setErro] = useState('')
  const naoLidas = dados?.naoLidas ?? 0

  useEffect(() => {
    const id = setInterval(() => void recarregar(), 30_000)
    return () => clearInterval(id)
  }, [recarregar])

  useEffect(() => {
    if (!aberto) return
    void recarregar()
    const fechar = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false)
    document.addEventListener('keydown', fechar)
    return () => document.removeEventListener('keydown', fechar)
  }, [aberto, recarregar])

  const abrirItem = useCallback(
    async (n: NotificacaoDTO) => {
      try {
        if (!n.lida) await api('POST', `/notificacoes/${n.id}/lida`)
        await recarregar()
        setAberto(false)
        if (n.link) navigate(n.link)
      } catch (e) {
        setErro(mensagemDeErro(e))
      }
    },
    [navigate, recarregar],
  )

  async function marcarTodas() {
    try {
      await api('POST', '/notificacoes/lidas')
      await recarregar()
    } catch (e) {
      setErro(mensagemDeErro(e))
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={naoLidas > 0 ? `Notificações (${naoLidas} não ${naoLidas === 1 ? 'lida' : 'lidas'})` : 'Notificações'}
        aria-haspopup="true"
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        className="relative flex size-9 cursor-pointer items-center justify-center text-[24px] text-ink"
      >
        <Icon name="notifications" />
        {naoLidas > 0 && (
          <span aria-hidden className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-diff-c px-1 text-[11px] font-bold leading-[18px] text-white">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>
      {aberto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
          <section
            aria-label="Lista de notificações"
            className="fixed right-2 top-[58px] z-50 flex max-h-[70vh] w-[min(380px,calc(100vw-16px))] flex-col gap-2 overflow-y-auto rounded-xl border border-line bg-white p-3 shadow-card-hover sm:absolute sm:right-0 sm:top-full sm:mt-2"
          >
            <header className="flex items-center justify-between gap-2">
              <h2 className="text-[18px] font-semibold text-ink">Notificações</h2>
              {naoLidas > 0 && (
                <button type="button" onClick={marcarTodas} className="cursor-pointer text-[14px] text-muted underline">
                  Marcar todas como lidas
                </button>
              )}
            </header>
            {erro && (
              <p role="alert" className="text-[14px] text-diff-c">
                {erro}
              </p>
            )}
            {(dados?.itens.length ?? 0) === 0 ? (
              <p className="py-4 text-center text-[16px] text-muted">Nenhuma notificação por aqui.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {dados?.itens.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => abrirItem(n)}
                      className={cx(
                        'flex w-full cursor-pointer items-start gap-3 rounded-lg border p-3 text-left',
                        n.lida ? 'border-line bg-white' : 'border-line-input bg-panel',
                      )}
                    >
                      <Icon name={ICONE[n.tipo]} className="mt-0.5 text-[20px] text-muted" />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className={cx('text-[15px] text-ink', !n.lida && 'font-semibold')}>{n.titulo}</span>
                        <span className="line-clamp-2 text-[13px] text-muted">{n.mensagem}</span>
                        <span className="text-[12px] text-muted">{quando(n.criadaEm)}</span>
                      </span>
                      {!n.lida && <span aria-label="Não lida" className="mt-1.5 size-2 shrink-0 rounded-full bg-diff-c" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}

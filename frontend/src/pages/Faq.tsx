import { useState } from 'react'
import { useStore } from '../store'
import { AppShell, Banner } from '../components/layout'
import { FilterSelect, Icon, SearchBox, cx } from '../components/ui'
import { FAQ_INICIAL, ROTULO_PUBLICO, filtrarFaqPorBusca, filtrarFaqPorPapel } from '../data/faq'
import type { PerguntaFaq, PublicoFaq } from '../data/faq'

function ItemFaq({ pergunta, aberta, aoAlternar }: { pergunta: PerguntaFaq; aberta: boolean; aoAlternar: () => void }) {
  return (
    <div className="rounded-xl border border-line bg-white">
      <button
        type="button"
        aria-expanded={aberta}
        onClick={aoAlternar}
        className="flex w-full cursor-pointer items-center gap-3 px-5 py-4 text-left transition hover:bg-topbar"
      >
        <span className="flex-1 text-[16px] font-semibold text-ink">{pergunta.pergunta}</span>
        <Icon
          name={aberta ? 'expand_less' : 'expand_more'}
          className={cx('text-[22px] text-muted shrink-0 transition-transform')}
        />
      </button>
      {aberta && (
        <div className="border-t border-line px-5 py-4">
          <p className="text-[15px] leading-relaxed text-ink">{pergunta.resposta}</p>
          <p className="mt-2 text-[12px] text-muted">
            Público: {ROTULO_PUBLICO[pergunta.publico]}
          </p>
        </div>
      )}
    </div>
  )
}

export function Faq() {
  const { sessao } = useStore()
  const papel = sessao?.papel ?? 'aluno'
  const [busca, setBusca] = useState('')
  const [filtroPublico, setFiltroPublico] = useState<PublicoFaq | ''>('')
  const [abertas, setAbertas] = useState<Set<string>>(new Set())

  const porPapel = filtrarFaqPorPapel(FAQ_INICIAL, papel)
  const porBusca = filtrarFaqPorBusca(porPapel, busca)
  const visiveis = filtroPublico
    ? porBusca.filter((p) => p.publico === filtroPublico || p.publico === 'todos')
    : porBusca

  const alternar = (id: string) => {
    setAbertas((atual) => {
      const nova = new Set(atual)
      if (nova.has(id)) nova.delete(id)
      else nova.add(id)
      return nova
    })
  }

  const expandirTodas = () => setAbertas(new Set(visiveis.map((p) => p.id)))
  const recolherTodas = () => setAbertas(new Set())
  const todasAbertas = visiveis.length > 0 && visiveis.every((p) => abertas.has(p.id))

  return (
    <AppShell>
      <Banner
        titulo="Perguntas Frequentes"
        subtitulo="Encontre respostas rápidas sobre como usar o HastyHelp"
        variante="lista"
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchBox value={busca} onChange={setBusca} placeholder="Buscar na FAQ…" />
          <FilterSelect
            label="Público"
            value={filtroPublico}
            onChange={(v) => setFiltroPublico(v as PublicoFaq | '')}
            options={papel === 'professor' ? ['professor'] : ['aluno']}
            all="Todos"
          />
        </div>

        <button
          type="button"
          onClick={todasAbertas ? recolherTodas : expandirTodas}
          className="flex cursor-pointer items-center gap-1 text-[14px] text-muted transition hover:text-ink"
        >
          <Icon name={todasAbertas ? 'unfold_less' : 'unfold_more'} className="text-[18px]" />
          {todasAbertas ? 'Recolher todas' : 'Expandir todas'}
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {visiveis.length === 0 ? (
          <p className="py-8 text-center text-[16px] text-muted">
            Nenhuma pergunta encontrada.
          </p>
        ) : (
          visiveis.map((p) => (
            <ItemFaq
              key={p.id}
              pergunta={p}
              aberta={abertas.has(p.id)}
              aoAlternar={() => alternar(p.id)}
            />
          ))
        )}
      </div>
    </AppShell>
  )
}


import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ErroApi, api, aoSessaoExpirar, aoTokensRenovados, definirTokens, mensagemDeErro, tokensAtuais } from './api/client'
import { paraAutoavaliacao, paraEquipe, paraFormulario, perguntaParaApi } from './api/mapeadores'
import type { AutoavaliacaoDTO, FormularioDTO, TurmaDTO } from './api/mapeadores'
import type { AutoavaliacaoAluno, Papel, Sessao } from './data/aluno'
import { editavel } from './data/aluno'
import type { Equipe, Formulario, Pergunta, StatusFormulario } from './data/tipos'
import type { NovaPesquisaInput, PesquisaSatisfacao } from './data/satisfacao'
import { restaurarPesquisas, validarPesquisa } from './data/satisfacao'

export interface PreferenciasPerfil {
  notificacoesEmail: boolean
  conclusaoFormularios: boolean
  publicacaoFormularios: boolean
  metricasTrimestrais: boolean
  metricasSemestrais: boolean
  acessibilidade: boolean
  tema: 'claro' | 'escuro' | 'alto-contraste'
}

const PREFERENCIAS_PADRAO: PreferenciasPerfil = {
  notificacoesEmail: true,
  conclusaoFormularios: true,
  publicacaoFormularios: true,
  metricasTrimestrais: true,
  metricasSemestrais: true,
  acessibilidade: true,
  tema: 'claro',
}

export interface DadosEquipe {
  nome: string
  periodo: string
  sigla?: string
  cor?: string
  oculta?: boolean
}

export interface DadosFormulario {
  titulo: string
  turmaId: string
  perguntas: Pergunta[]
  postar?: boolean
  /** ISO 8601. */
  publicarEm?: string
  /** AAAA-MM-DD. */
  prazo?: string
  mostrarGabarito?: boolean
}

export interface EdicaoFormulario {
  titulo?: string
  status?: StatusFormulario
  perguntas?: Pergunta[]
  mostrarGabarito?: boolean
  /** AAAA-MM-DD ou ISO; `null` remove o prazo. */
  prazo?: string | null
  publicarEm?: string
}

interface Store {
  sessao: Sessao | null
  /** `true` enquanto os dados iniciais da sessão ainda estão chegando. */
  carregando: boolean
  /** Mensagem transitória de erro de uma ação (ex.: falha ao fechar um formulário). */
  aviso: string | null
  limparAviso: () => void
  entrar: (email: string, senha: string, papel: Papel) => Promise<void>
  cadastrar: (dados: { nome: string; email: string; senha: string; confirmacaoSenha: string; papel: Papel; codigoConvite?: string }) => Promise<void>
  sair: () => void
  recarregar: () => Promise<void>
  /** Roda uma ação e, se falhar, mostra o erro como aviso global. */
  executar: (acao: () => Promise<void>) => Promise<void>
  equipes: Equipe[]
  formularios: Formulario[]
  autoavaliacoes: AutoavaliacaoAluno[]
  adicionarEquipe: (dados: DadosEquipe) => Promise<Equipe>
  atualizarEquipe: (id: string, dados: Partial<DadosEquipe>) => Promise<void>
  removerEquipe: (id: string) => Promise<void>
  sairDaEquipe: (id: string) => Promise<void>
  adicionarFormulario: (dados: DadosFormulario) => Promise<void>
  atualizarFormulario: (id: string, dados: EdicaoFormulario) => Promise<void>
  removerFormulario: (id: string) => Promise<void>
  salvarResposta: (id: string, perguntaId: string, marcadas: number[]) => void
  /** `true` se enviou; em erro mostra o aviso e devolve `false`. */
  enviarAutoavaliacao: (id: string, observacao?: string, notaGeral?: number) => Promise<boolean>
  preferencias: PreferenciasPerfil
  atualizarPreferencias: (dados: Partial<PreferenciasPerfil>) => Promise<void>
  pesquisas: PesquisaSatisfacao[]
  registrarPesquisa: (dados: NovaPesquisaInput) => { sucesso: boolean; erro?: string }
}

const StoreContext = createContext<Store | null>(null)
const CHAVE_SESSAO = 'hastyhelp:sessao'
const CHAVE_PESQUISAS = 'hastyhelp:pesquisas'

function lerPesquisas(): PesquisaSatisfacao[] {
  try {
    return restaurarPesquisas(localStorage.getItem(CHAVE_PESQUISAS))
  } catch {
    return []
  }
}

function gravarPesquisas(lista: PesquisaSatisfacao[]) {
  try {
    localStorage.setItem(CHAVE_PESQUISAS, JSON.stringify(lista))
  } catch {
    // localStorage indisponível
  }
}

function lerSessao(): Sessao | null {
  try {
    const bruto = sessionStorage.getItem(CHAVE_SESSAO)
    const sessao = bruto ? (JSON.parse(bruto) as Sessao) : null
    if (sessao?.token && sessao.refreshToken) definirTokens({ token: sessao.token, refreshToken: sessao.refreshToken })
    return sessao?.token && sessao.refreshToken ? sessao : null
  } catch {
    return null
  }
}

function gravarSessao(s: Sessao | null) {
  try {
    if (s) sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(s))
    else sessionStorage.removeItem(CHAVE_SESSAO)
  } catch {
    /* sessionStorage indisponível: a sessão vale só até recarregar */
  }
}

interface UsuarioDTO {
  id: string
  nome: string
  email: string
  papel: Papel
  preferencias: PreferenciasPerfil
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(lerSessao)
  const [carregando, setCarregando] = useState(() => lerSessao() !== null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [equipes, setEquipes] = useState<Equipe[]>([])
  const [formularios, setFormularios] = useState<Formulario[]>([])
  const [autoavaliacoes, setAutoavaliacoes] = useState<AutoavaliacaoAluno[]>([])
  const [preferencias, setPreferencias] = useState<PreferenciasPerfil>(PREFERENCIAS_PADRAO)
  const [pesquisas, setPesquisas] = useState<PesquisaSatisfacao[]>(lerPesquisas)
  const papelRef = useRef<Papel | null>(sessao?.papel ?? null)

  useEffect(() => {
    document.body.classList.toggle('ocultar-widget-acessibilidade', !preferencias.acessibilidade)
  }, [preferencias.acessibilidade])

  useEffect(() => {
    document.body.dataset.tema = preferencias.tema
  }, [preferencias.tema])

  const limparDados = useCallback(() => {
    setEquipes([])
    setFormularios([])
    setAutoavaliacoes([])
    setPreferencias(PREFERENCIAS_PADRAO)
  }, [])

  const sair = useCallback(() => {
    const atuais = tokensAtuais()
    // revoga a sessão no servidor (R-72); se falhar, o refresh expira sozinho
    if (atuais) void api('POST', '/auth/logout', { refreshToken: atuais.refreshToken }).catch(() => undefined)
    gravarSessao(null)
    definirTokens(null)
    papelRef.current = null
    setSessao(null)
    limparDados()
  }, [limparDados])

  useEffect(() => {
    aoSessaoExpirar(sair)
    // access token renovado: guarda o novo par sem refazer o carregamento dos dados
    aoTokensRenovados((novos) =>
      setSessao((atual) => {
        if (!atual) return atual
        const nova = { ...atual, ...novos }
        gravarSessao(nova)
        return nova
      }),
    )
    return () => {
      aoSessaoExpirar(null)
      aoTokensRenovados(null)
    }
  }, [sair])

  /** Busca tudo o que a sessão precisa; chamada após login e após cada mudança de dados. */
  const recarregar = useCallback(async () => {
    const papel = papelRef.current
    if (!papel) return
    if (papel === 'professor') {
      const [turmas, forms] = await Promise.all([api<TurmaDTO[]>('GET', '/turmas'), api<FormularioDTO[]>('GET', '/formularios')])
      const lista = turmas.map(paraEquipe)
      setEquipes(lista)
      setFormularios(forms.map((f) => paraFormulario(f, lista)))
    } else {
      const [turmas, itens] = await Promise.all([api<TurmaDTO[]>('GET', '/aluno/turmas'), api<AutoavaliacaoDTO[]>('GET', '/aluno/autoavaliacoes')])
      setEquipes(turmas.map(paraEquipe))
      setAutoavaliacoes(itens.map(paraAutoavaliacao))
    }
  }, [])

  // Login ou sessão restaurada (recarregar a página): busca perfil e dados.
  useEffect(() => {
    if (!sessao) return
    let ativo = true
    Promise.all([api<UsuarioDTO>('GET', '/perfil'), recarregar()])
      .then(([perfil]) => {
        if (ativo) setPreferencias({ ...PREFERENCIAS_PADRAO, ...perfil.preferencias })
      })
      .catch((e) => {
        if (ativo && !(e instanceof ErroApi && e.status === 401)) setAviso(mensagemDeErro(e))
      })
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
    // só reage a entrar/sair (a renovação do token troca `sessao`, mas não o usuário)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessao?.email, recarregar])

  const entrar = useCallback(async (email: string, senha: string, papel: Papel) => {
    const r = await api<{ token: string; refreshToken: string; usuario: UsuarioDTO }>('POST', '/auth/login', { email, senha, papel })
    const nova: Sessao = { papel: r.usuario.papel, nome: r.usuario.nome, email: r.usuario.email, token: r.token, refreshToken: r.refreshToken }
    definirTokens({ token: r.token, refreshToken: r.refreshToken })
    papelRef.current = nova.papel
    gravarSessao(nova)
    setCarregando(true)
    setPreferencias({ ...PREFERENCIAS_PADRAO, ...r.usuario.preferencias })
    setSessao(nova)
  }, [])

  const cadastrar = useCallback<Store['cadastrar']>(async (dados) => {
    await api('POST', '/auth/cadastro', dados)
  }, [])

  /** Executa uma ação de menu/botão que não tem onde mostrar o erro: vira um aviso global. */
  const comAviso = useCallback(async (acao: () => Promise<void>) => {
    try {
      await acao()
    } catch (e) {
      setAviso(mensagemDeErro(e))
    }
  }, [])

  const adicionarEquipe = useCallback(
    async (dados: DadosEquipe) => {
      const dto = await api<TurmaDTO>('POST', '/turmas', dados)
      await recarregar()
      return paraEquipe(dto)
    },
    [recarregar],
  )
  const atualizarEquipe = useCallback(
    async (id: string, dados: Partial<DadosEquipe>) => {
      await api('PATCH', `/turmas/${id}`, dados)
      await recarregar()
    },
    [recarregar],
  )
  const removerEquipe = useCallback(
    async (id: string) => {
      await api('DELETE', `/turmas/${id}`)
      await recarregar()
    },
    [recarregar],
  )

  const sairDaEquipe = useCallback(
    async (id: string) => {
      await api('DELETE', `/aluno/turmas/${id}`)
      await recarregar()
    },
    [recarregar],
  )

  const adicionarFormulario = useCallback(
    async (dados: DadosFormulario) => {
      await api('POST', '/formularios', { ...dados, perguntas: dados.perguntas.map(perguntaParaApi) })
      await recarregar()
    },
    [recarregar],
  )
  const atualizarFormulario = useCallback(
    async (id: string, dados: EdicaoFormulario) => {
      await api('PATCH', `/formularios/${id}`, { ...dados, ...(dados.perguntas ? { perguntas: dados.perguntas.map(perguntaParaApi) } : {}) })
      await recarregar()
    },
    [recarregar],
  )
  const removerFormulario = useCallback(
    async (id: string) => {
      await api('DELETE', `/formularios/${id}`)
      await recarregar()
    },
    [recarregar],
  )

  /** Salva na hora (rascunho): atualiza a tela já e confirma com o servidor; em erro, desfaz. */
  const salvarResposta = useCallback(
    (id: string, perguntaId: string, marcadas: number[]) => {
      const anterior = autoavaliacoes
      setAutoavaliacoes((lista) =>
        lista.map((a) => (a.id === id && editavel(a.status) ? { ...a, status: 'andamento', respostas: { ...a.respostas, [perguntaId]: marcadas } } : a)),
      )
      api<AutoavaliacaoDTO>('PUT', `/aluno/autoavaliacoes/${id}/respostas/${perguntaId}`, { marcadas }).catch((e) => {
        setAutoavaliacoes(anterior)
        setAviso(mensagemDeErro(e))
      })
    },
    [autoavaliacoes],
  )

  const enviarAutoavaliacao = useCallback(async (id: string, observacao?: string, notaGeral?: number) => {
    try {
      const corpo = {
        ...(observacao ? { observacao } : {}),
        ...(notaGeral !== undefined ? { notaGeral } : {}),
      }
      const dto = await api<AutoavaliacaoDTO>('POST', `/aluno/autoavaliacoes/${id}/enviar`, corpo)
      setAutoavaliacoes((lista) => lista.map((a) => (a.id === id ? paraAutoavaliacao(dto) : a)))
      return true
    } catch (e) {
      setAviso(mensagemDeErro(e))
      return false
    }
  }, [])

  const atualizarPreferencias = useCallback(async (dados: Partial<PreferenciasPerfil>) => {
    setPreferencias((atuais) => ({ ...atuais, ...dados }))
    await api('PATCH', '/perfil/preferencias', dados)
  }, [])

  const registrarPesquisa = useCallback((dados: NovaPesquisaInput) => {
    const validacao = validarPesquisa(dados)
    if (!validacao.valido) {
      return { sucesso: false, erro: validacao.erro }
    }
    const nova: PesquisaSatisfacao = {
      id: `pesquisa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      perfil: dados.perfil,
      data: new Date().toISOString(),
      csat: dados.csat,
      nps: dados.nps,
      comentario: dados.comentario?.trim() || undefined,
      gatilho: dados.gatilho,
    }
    setPesquisas((atuais) => {
      const atualizadas = [nova, ...atuais]
      gravarPesquisas(atualizadas)
      return atualizadas
    })
    return { sucesso: true }
  }, [])

  const value = useMemo<Store>(
    () => ({
      sessao,
      carregando,
      aviso,
      limparAviso: () => setAviso(null),
      entrar,
      cadastrar,
      sair,
      recarregar,
      executar: comAviso,
      equipes,
      formularios,
      autoavaliacoes,
      adicionarEquipe,
      atualizarEquipe: (id, dados) => comAviso(() => atualizarEquipe(id, dados)),
      removerEquipe: (id) => comAviso(() => removerEquipe(id)),
      sairDaEquipe: (id) => comAviso(() => sairDaEquipe(id)),
      adicionarFormulario,
      atualizarFormulario,
      removerFormulario: (id) => comAviso(() => removerFormulario(id)),
      salvarResposta,
      enviarAutoavaliacao,
      preferencias,
      atualizarPreferencias,
      pesquisas,
      registrarPesquisa,
    }),
    [sessao, carregando, aviso, entrar, cadastrar, sair, recarregar, equipes, formularios, autoavaliacoes, adicionarEquipe, atualizarEquipe, removerEquipe, sairDaEquipe, adicionarFormulario, atualizarFormulario, removerFormulario, comAviso, salvarResposta, enviarAutoavaliacao, preferencias, atualizarPreferencias, pesquisas, registrarPesquisa],
  )
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore deve ser usado dentro de StoreProvider')
  return ctx
}

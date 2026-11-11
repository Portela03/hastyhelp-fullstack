/** Cliente HTTP da API do HastyHelp (proxy `/api` no Vite; mesma origem em produção). */

export class ErroApi extends Error {
  readonly status: number
  readonly codigo: string
  constructor(status: number, codigo: string, mensagem: string) {
    super(mensagem)
    this.name = 'ErroApi'
    this.status = status
    this.codigo = codigo
  }
}

export interface Tokens {
  token: string
  refreshToken: string
}

let tokens: Tokens | null = null
let aoExpirar: (() => void) | null = null
let aoRenovar: ((novos: Tokens) => void) | null = null
let renovando: Promise<boolean> | null = null

export function definirTokens(novos: Tokens | null) {
  tokens = novos
}
export const tokensAtuais = () => tokens

/** Chamado quando a sessão não pode mais ser renovada (refresh inválido/expirado). */
export function aoSessaoExpirar(fn: (() => void) | null) {
  aoExpirar = fn
}
/** Chamado quando o par de tokens é renovado, para o store persistir. */
export function aoTokensRenovados(fn: ((novos: Tokens) => void) | null) {
  aoRenovar = fn
}

async function chamar(metodo: string, caminho: string, corpo: unknown, autenticar: boolean): Promise<Response> {
  try {
    return await fetch(`/api${caminho}`, {
      method: metodo,
      headers: {
        ...(corpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(autenticar && tokens ? { Authorization: `Bearer ${tokens.token}` } : {}),
      },
      ...(corpo !== undefined ? { body: JSON.stringify(corpo) } : {}),
    })
  } catch {
    throw new ErroApi(0, 'SEM_CONEXAO', 'Não foi possível conectar ao servidor. Tente novamente.')
  }
}

/** Troca o refresh token por um novo par (uma renovação por vez, mesmo com várias requisições 401). */
function renovarSessao(): Promise<boolean> {
  if (!tokens) return Promise.resolve(false)
  renovando ??= (async () => {
    try {
      const r = await chamar('POST', '/auth/refresh', { refreshToken: tokens?.refreshToken }, false)
      if (!r.ok) return false
      const novos = (await r.json()) as Tokens
      tokens = { token: novos.token, refreshToken: novos.refreshToken }
      aoRenovar?.(tokens)
      return true
    } catch {
      return false
    } finally {
      renovando = null
    }
  })()
  return renovando
}

export async function api<T = unknown>(metodo: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', caminho: string, corpo?: unknown): Promise<T> {
  let resposta = await chamar(metodo, caminho, corpo, true)
  let dados: unknown = resposta.status === 204 ? undefined : await resposta.json().catch(() => null)
  let erro = (dados as { erro?: { codigo?: string; mensagem?: string } } | null)?.erro

  // access token vencido (ou sessão revogada): tenta renovar uma vez e repete a chamada
  if (resposta.status === 401 && tokens && erro?.codigo === 'NAO_AUTENTICADO') {
    if (await renovarSessao()) {
      resposta = await chamar(metodo, caminho, corpo, true)
      dados = resposta.status === 204 ? undefined : await resposta.json().catch(() => null)
      erro = (dados as { erro?: { codigo?: string; mensagem?: string } } | null)?.erro
    } else {
      aoExpirar?.()
    }
  }
  if (!resposta.ok) throw new ErroApi(resposta.status, erro?.codigo ?? 'ERRO', erro?.mensagem ?? 'Algo deu errado. Tente novamente.')
  return dados as T
}

export const mensagemDeErro = (erro: unknown) => (erro instanceof Error ? erro.message : 'Algo deu errado. Tente novamente.')

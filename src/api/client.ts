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

let token: string | null = null
let aoExpirar: (() => void) | null = null

export function definirToken(novo: string | null) {
  token = novo
}

/** Chamado quando a API responde 401 com um token em uso (sessão expirada). */
export function aoSessaoExpirar(fn: (() => void) | null) {
  aoExpirar = fn
}

export async function api<T = unknown>(metodo: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', caminho: string, corpo?: unknown): Promise<T> {
  let resposta: Response
  try {
    resposta = await fetch(`/api${caminho}`, {
      method: metodo,
      headers: {
        ...(corpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(corpo !== undefined ? { body: JSON.stringify(corpo) } : {}),
    })
  } catch {
    throw new ErroApi(0, 'SEM_CONEXAO', 'Não foi possível conectar ao servidor. Tente novamente.')
  }
  if (resposta.status === 204) return undefined as T
  const dados: unknown = await resposta.json().catch(() => null)
  if (!resposta.ok) {
    const erro = (dados as { erro?: { codigo?: string; mensagem?: string } } | null)?.erro
    if (resposta.status === 401 && token && erro?.codigo === 'NAO_AUTENTICADO') aoExpirar?.()
    throw new ErroApi(resposta.status, erro?.codigo ?? 'ERRO', erro?.mensagem ?? 'Algo deu errado. Tente novamente.')
  }
  return dados as T
}

export const mensagemDeErro = (erro: unknown) => (erro instanceof Error ? erro.message : 'Algo deu errado. Tente novamente.')

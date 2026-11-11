/** Erro de regra de negócio. `status` é o código HTTP sugerido. */
export class ErroDeDominio extends Error {
  constructor(
    readonly codigo: string,
    mensagem: string,
    readonly status: number = 422,
  ) {
    super(mensagem)
    this.name = 'ErroDeDominio'
  }
}

export const naoEncontrado = (codigo: string, mensagem: string) => new ErroDeDominio(codigo, mensagem, 404)
export const acessoNegado = (mensagem = 'Você não tem permissão para esta operação.') => new ErroDeDominio('ACESSO_NEGADO', mensagem, 403)
export const conflito = (codigo: string, mensagem: string) => new ErroDeDominio(codigo, mensagem, 409)

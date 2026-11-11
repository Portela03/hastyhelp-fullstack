import { ErroDeDominio } from '../../../shared/erros.ts'

export const TAMANHO_MINIMO_SENHA = 8

export function validarSenha(senha: string): void {
  if (senha.length < TAMANHO_MINIMO_SENHA) {
    throw new ErroDeDominio('SENHA_FRACA', `A senha deve ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`, 400)
  }
}

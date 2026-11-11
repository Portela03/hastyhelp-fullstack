import { ErroDeDominio } from '../../../shared/erros.ts'

export type Email = string & { readonly __marca: 'Email' }

const PADRAO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function criarEmail(bruto: string): Email {
  const email = bruto.trim().toLowerCase()
  if (!PADRAO.test(email)) throw new ErroDeDominio('EMAIL_INVALIDO', 'Informe um e-mail válido.', 400)
  return email as Email
}

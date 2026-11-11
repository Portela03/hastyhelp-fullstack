import { describe, expect, it } from 'vitest'
import { criarEmail } from './email.ts'
import { validarSenha } from './senha.ts'

describe('Email', () => {
  it('R-01 normaliza para minúsculas e remove espaços', () => {
    expect(criarEmail('  Aluno@Escola.COM ')).toBe('aluno@escola.com')
  })
  it('R-01 rejeita e-mail inválido', () => {
    expect(() => criarEmail('sem-arroba')).toThrowError(/e-mail/i)
  })
})

describe('Senha', () => {
  it('R-02 exige no mínimo 8 caracteres', () => {
    expect(() => validarSenha('1234567')).toThrowError(/8 caracteres/)
    expect(() => validarSenha('12345678')).not.toThrow()
  })
})

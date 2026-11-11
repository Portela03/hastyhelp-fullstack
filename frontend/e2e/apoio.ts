import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const API = 'http://localhost:3334/api'

export async function chamar<T = unknown>(metodo: string, caminho: string, corpo?: unknown, token?: string): Promise<T> {
  const r = await fetch(`${API}${caminho}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(corpo !== undefined ? { body: JSON.stringify(corpo) } : {}),
  })
  const dados = r.status === 204 ? undefined : await r.json()
  if (!r.ok) throw new Error(`${metodo} ${caminho} → ${r.status}: ${JSON.stringify(dados)}`)
  return dados as T
}

export const unico = () => Math.random().toString(36).slice(2, 8)
export const SENHA = 'senha1234'

export interface Usuario {
  nome: string
  email: string
  senha: string
  papel: 'professor' | 'aluno'
  token: string
}

export async function criarUsuario(papel: 'professor' | 'aluno', nome: string, codigoConvite?: string): Promise<Usuario> {
  const email = `${papel}.${unico()}@teste.com`
  await chamar('POST', '/auth/cadastro', { nome, email, senha: SENHA, papel, ...(codigoConvite ? { codigoConvite } : {}) })
  const { token } = await chamar<{ token: string }>('POST', '/auth/login', { email, senha: SENHA, papel })
  return { nome, email, senha: SENHA, papel, token }
}

export interface Turma {
  id: string
  nome: string
  codigoConvite: string
}

export const criarTurma = (prof: Usuario, nome = `Estatística ${unico()}`, periodo = '2026/02') =>
  chamar<Turma>('POST', '/turmas', { nome, periodo }, prof.token)

export const PERGUNTAS = [
  { enunciado: 'Qual é a média de 2 e 4?', tipo: 'unica', opcoes: ['3', '4'], gabarito: [0] },
  { enunciado: 'Quais números são pares?', tipo: 'multipla', opcoes: ['2', '3', '4'], gabarito: [0, 2] },
]

export interface Formulario {
  id: string
  titulo: string
  perguntas: Array<{ id: string }>
}

export const publicarFormulario = (prof: Usuario, turmaId: string, titulo = `Quiz ${unico()}`, extra: object = {}) =>
  chamar<Formulario>('POST', '/formularios', { titulo, turmaId, postar: true, perguntas: PERGUNTAS, ...extra }, prof.token)

/** E-mails "enviados" ao endereço (caixa de saída de desenvolvimento da API). */
export const caixaDeSaida = (para: string) => chamar<Array<{ assunto: string; link?: string }>>('GET', `/dev/caixa-de-saida?para=${encodeURIComponent(para)}`)

/** Aluno responde tudo (certo = acerta tudo) e envia, direto pela API. */
export async function responderEEnviar(aluno: Usuario, form: Formulario, certo = true, observacao?: string) {
  const [p1, p2] = form.perguntas
  await chamar('PUT', `/aluno/autoavaliacoes/${form.id}/respostas/${p1!.id}`, { marcadas: certo ? [0] : [1] }, aluno.token)
  await chamar('PUT', `/aluno/autoavaliacoes/${form.id}/respostas/${p2!.id}`, { marcadas: [0, 2] }, aluno.token)
  await chamar('POST', `/aluno/autoavaliacoes/${form.id}/enviar`, observacao ? { observacao } : {}, aluno.token)
}

/** Login pela interface (valida a tela de login de ponta a ponta). */
export async function entrarPelaUI(page: Page, u: Pick<Usuario, 'email' | 'senha' | 'papel'>) {
  await page.goto('/login')
  await page.getByRole('radio', { name: u.papel === 'aluno' ? 'Sou aluno' : 'Sou professor' }).click()
  await page.getByLabel('Email').fill(u.email)
  await page.getByLabel('Senha', { exact: true }).fill(u.senha)
  await page.getByRole('button', { name: 'Concluir' }).click()
  await expect(page).toHaveURL(u.papel === 'aluno' ? /\/aluno\/turmas/ : /\/equipes/)
}

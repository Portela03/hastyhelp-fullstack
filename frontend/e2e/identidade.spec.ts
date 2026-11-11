import { expect, test } from '@playwright/test'
import { SENHA, chamar, criarTurma, criarUsuario, entrarPelaUI, unico } from './apoio'

test.describe('RF01 - cadastro e autenticação', () => {
  test('RF01 - professor se cadastra e faz login', async ({ page }) => {
    const email = `professor.${unico()}@teste.com`
    await page.goto('/cadastro')
    await page.getByRole('radio', { name: 'Sou professor' }).click()
    await page.getByLabel('Nome', { exact: true }).fill('Alberto Teste')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Senha', { exact: true }).fill(SENHA)
    await page.getByLabel('Confirme sua senha').fill(SENHA)
    await page.getByRole('button', { name: 'Cadastrar' }).click()
    await expect(page).toHaveURL(/\/login/)

    await entrarPelaUI(page, { email, senha: SENHA, papel: 'professor' })
    await expect(page.getByRole('heading', { name: 'Minhas Equipes' })).toBeVisible()
  })

  test('RF01 - cadastro rejeita senhas diferentes e e-mail já usado', async ({ page }) => {
    const existente = await criarUsuario('professor', 'Maria Silva')
    await page.goto('/cadastro')
    await page.getByLabel('Nome', { exact: true }).fill('Outra Pessoa')
    await page.getByLabel('Email').fill(`nova.${unico()}@teste.com`)
    await page.getByLabel('Senha', { exact: true }).fill(SENHA)
    await page.getByLabel('Confirme sua senha').fill('outra-senha-123')
    await page.getByRole('button', { name: 'Cadastrar' }).click()
    await expect(page.getByRole('alert')).toContainText('As senhas não conferem')

    await page.getByLabel('Email').fill(existente.email)
    await page.getByLabel('Confirme sua senha').fill(SENHA)
    await page.getByRole('button', { name: 'Cadastrar' }).click()
    await expect(page.getByRole('alert')).toContainText('já está cadastrado')
  })

  test('RF01 - login com senha errada mostra erro e não entra', async ({ page }) => {
    const prof = await criarUsuario('professor', 'Alberto')
    await page.goto('/login')
    await page.getByLabel('Email').fill(prof.email)
    await page.getByLabel('Senha', { exact: true }).fill('senha-errada-1')
    await page.getByRole('button', { name: 'Concluir' }).click()
    await expect(page.getByRole('alert')).toContainText('E-mail ou senha incorretos')
    await expect(page).toHaveURL(/\/login/)
  })

  test('RF01 - login com o papel trocado é recusado', async ({ page }) => {
    const aluno = await criarUsuario('aluno', 'Sarah Chen')
    await page.goto('/login')
    await page.getByRole('radio', { name: 'Sou professor' }).click()
    await page.getByLabel('Email').fill(aluno.email)
    await page.getByLabel('Senha', { exact: true }).fill(aluno.senha)
    await page.getByRole('button', { name: 'Concluir' }).click()
    await expect(page.getByRole('alert')).toContainText('E-mail ou senha incorretos')
  })

  test('RF01/N01 - aluno se cadastra pelo link de convite e vê a turma', async ({ page }) => {
    const prof = await criarUsuario('professor', 'Alberto')
    const turma = await criarTurma(prof, `Banco de Dados ${unico()}`)
    const email = `aluno.${unico()}@teste.com`

    await page.goto(`/convite/${turma.codigoConvite}`)
    await expect(page.getByRole('status')).toContainText(`Você foi convidado(a) para a turma ${turma.nome}`)
    await page.getByLabel('Nome', { exact: true }).fill('Sarah Convidada')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Senha', { exact: true }).fill(SENHA)
    await page.getByLabel('Confirme sua senha').fill(SENHA)
    await page.getByRole('button', { name: 'Cadastrar' }).click()
    await expect(page).toHaveURL(/\/login/)

    await entrarPelaUI(page, { email, senha: SENHA, papel: 'aluno' })
    await expect(page.getByRole('link', { name: new RegExp(turma.nome) })).toBeVisible()
  })

  test('RF01 - link de convite inválido avisa o aluno e impede o cadastro', async ({ page }) => {
    await page.goto('/convite/codigo-que-nao-existe')
    await expect(page.getByRole('status')).toContainText('inválido ou expirou')
    await page.getByLabel('Nome', { exact: true }).fill('Fulano')
    await page.getByLabel('Email').fill(`aluno.${unico()}@teste.com`)
    await page.getByLabel('Senha', { exact: true }).fill(SENHA)
    await page.getByLabel('Confirme sua senha').fill(SENHA)
    await page.getByRole('button', { name: 'Cadastrar' }).click()
    await expect(page.getByRole('alert')).toContainText('novo link de convite')
  })

  test('RNF03 - aluno não acessa a área do professor e visitante vai para o login', async ({ page }) => {
    const aluno = await criarUsuario('aluno', 'Sarah Chen')
    await page.goto('/equipes')
    await expect(page).toHaveURL(/\/login/)
    await entrarPelaUI(page, aluno)
    await page.goto('/equipes')
    await expect(page).toHaveURL(/\/aluno\/turmas/)
    await page.goto('/metricas')
    await expect(page).toHaveURL(/\/aluno\/turmas/)
  })

  test('RNF03 - a API recusa token de aluno em rota de professor e rota sem token', async () => {
    const aluno = await criarUsuario('aluno', 'Sarah Chen')
    await expect(chamar('GET', '/turmas', undefined, aluno.token)).rejects.toThrow(/403/)
    await expect(chamar('GET', '/turmas')).rejects.toThrow(/401/)
  })

  test('RF01 - sair da conta encerra a sessão', async ({ page }) => {
    const prof = await criarUsuario('professor', 'Alberto Sair')
    await entrarPelaUI(page, prof)
    await abrirPerfil(page, prof.nome)
    await page.getByRole('button', { name: 'Sair da conta' }).click()
    await expect(page).toHaveURL(/\/login/)
    await page.goto('/equipes')
    await expect(page).toHaveURL(/\/login/)
  })

  test('R-06 - preferências do perfil (tema) persistem entre sessões', async ({ page }) => {
    const prof = await criarUsuario('professor', 'Alberto Tema')
    await entrarPelaUI(page, prof)
    await abrirPerfil(page, prof.nome)
    await page.getByLabel('Temas').selectOption('escuro')
    await page.getByRole('button', { name: 'Concluir' }).click()
    await expect(page.locator('body')).toHaveAttribute('data-tema', 'escuro')

    // nova sessão: o tema volta do servidor
    await page.evaluate(() => sessionStorage.clear())
    await entrarPelaUI(page, prof)
    await expect(page.locator('body')).toHaveAttribute('data-tema', 'escuro')
  })
})

export async function abrirPerfil(page: import('@playwright/test').Page, nome: string) {
  await page.getByRole('main').waitFor()
  const menu = page.getByRole('button', { name: 'Abrir menu' })
  if (await menu.isVisible()) await menu.click()
  await page.getByRole('button', { name: `Abrir perfil de ${nome}` }).click()
}

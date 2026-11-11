import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { caixaDeSaida, chamar, criarTurma, criarUsuario, entrarPelaUI, publicarFormulario, responderEEnviar, unico } from './apoio'

const abrirMenuDoAluno = (page: Page, nome: string) => page.getByRole('button', { name: `Ações de ${nome}` }).click()

async function turmaComAluno(nomeAluno = 'Sarah Chen') {
  const prof = await criarUsuario('professor', 'Alberto')
  const turma = await criarTurma(prof, `Estatística ${unico()}`)
  const aluno = await criarUsuario('aluno', nomeAluno, turma.codigoConvite)
  return { prof, turma, aluno }
}

test.describe('RF01 - recuperação de senha', () => {
  test('RF01 - esqueci a senha: gera o link, redefine e entra com a nova senha', async ({ page }) => {
    const aluno = await criarUsuario('aluno', 'Sarah Chen')
    await page.goto('/login')
    await page.getByRole('button', { name: 'Esqueceu a senha?' }).click()
    await expect(page).toHaveURL(/\/esqueci-senha/)
    await page.getByLabel('Email').fill(aluno.email)
    await page.getByRole('button', { name: 'Gerar link' }).click()
    await expect(page.getByRole('status')).toContainText('Se existir uma conta com esse e-mail')

    const [mensagem] = await caixaDeSaida(aluno.email)
    await page.goto(new URL(mensagem!.link!).pathname)
    await page.getByLabel('Nova senha', { exact: true }).fill('nova-senha-99')
    await page.getByLabel('Confirme sua nova senha').fill('nova-senha-99')
    await page.getByRole('button', { name: 'Salvar senha' }).click()
    await expect(page.getByRole('status')).toContainText('Senha alterada com sucesso')

    await entrarPelaUI(page, { email: aluno.email, senha: 'nova-senha-99', papel: 'aluno' })
  })

  test('RF01 - e-mail desconhecido recebe a mesma resposta (sem revelar quem tem conta)', async ({ page }) => {
    await page.goto('/esqueci-senha')
    await page.getByLabel('Email').fill(`ninguem.${unico()}@teste.com`)
    await page.getByRole('button', { name: 'Gerar link' }).click()
    await expect(page.getByRole('status')).toContainText('Se existir uma conta com esse e-mail')
  })

  test('RF01 - link inválido ou já usado é recusado e senha fraca é barrada', async ({ page }) => {
    const aluno = await criarUsuario('aluno', 'Sarah Chen')
    await chamar('POST', '/auth/esqueci-senha', { email: aluno.email })
    const [mensagem] = await caixaDeSaida(aluno.email)
    const caminho = new URL(mensagem!.link!).pathname

    await page.goto(caminho)
    await page.getByLabel('Nova senha', { exact: true }).fill('123')
    await page.getByLabel('Confirme sua nova senha').fill('123')
    await page.getByRole('button', { name: 'Salvar senha' }).click()
    await expect(page.getByRole('alert')).toContainText('pelo menos 8 caracteres')

    await page.getByLabel('Nova senha', { exact: true }).fill('nova-senha-99')
    await page.getByLabel('Confirme sua nova senha').fill('nova-senha-99')
    await page.getByRole('button', { name: 'Salvar senha' }).click()
    await expect(page.getByRole('status')).toContainText('Senha alterada com sucesso')

    await page.goto(caminho) // usar de novo
    await page.getByLabel('Nova senha', { exact: true }).fill('outra-senha-99')
    await page.getByLabel('Confirme sua nova senha').fill('outra-senha-99')
    await page.getByRole('button', { name: 'Salvar senha' }).click()
    await expect(page.getByRole('alert')).toContainText('inválido ou expirou')
  })

  test('RF01 - professor gera o link de redefinição para um aluno da equipe', async ({ page }) => {
    const { prof, turma, aluno } = await turmaComAluno()
    await entrarPelaUI(page, prof)
    await page.goto(`/equipes/${turma.id}/alunos`)
    await abrirMenuDoAluno(page, 'Sarah Chen')
    await page.getByRole('menuitem', { name: 'Gerar link de redefinição de senha' }).click()
    const link = await page.getByLabel('Link de redefinição', { exact: true }).textContent()
    expect(link).toMatch(/\/redefinir-senha\/[0-9a-f]{64}$/)

    await page.getByRole('button', { name: 'Fechar' }).click()
    await chamar('POST', '/auth/redefinir-senha', { token: link!.split('/redefinir-senha/')[1], senha: 'nova-senha-99' })
    await entrarPelaUI(page, { email: aluno.email, senha: 'nova-senha-99', papel: 'aluno' })
  })
})

test.describe('RNF03 - sessão com renovação e logout real', () => {
  const lerSessao = (page: Page) => page.evaluate(() => JSON.parse(sessionStorage.getItem('hastyhelp:sessao') ?? 'null') as { token: string; refreshToken: string } | null)

  test('RNF03 - access token vencido é renovado sozinho e a tela continua', async ({ page }) => {
    const prof = await criarUsuario('professor', 'Alberto')
    await entrarPelaUI(page, prof)
    const antes = await lerSessao(page)
    await page.evaluate(() => {
      const s = JSON.parse(sessionStorage.getItem('hastyhelp:sessao')!)
      s.token = 'token-vencido'
      sessionStorage.setItem('hastyhelp:sessao', JSON.stringify(s))
    })
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Minhas Equipes' })).toBeVisible()
    const depois = await lerSessao(page)
    expect(depois?.token).not.toBe('token-vencido')
    expect(depois?.refreshToken).not.toBe(antes?.refreshToken) // rotação
  })

  test('RNF03 - sessão revogada no servidor leva ao login', async ({ page }) => {
    const prof = await criarUsuario('professor', 'Alberto')
    await entrarPelaUI(page, prof)
    const sessao = await lerSessao(page)
    await chamar('POST', '/auth/logout', { refreshToken: sessao!.refreshToken })
    await page.reload()
    await expect(page).toHaveURL(/\/login/)
  })

  test('RNF03 - sair da conta revoga o token no servidor', async ({ page }) => {
    const prof = await criarUsuario('professor', 'Alberto Sair')
    await entrarPelaUI(page, prof)
    const sessao = await lerSessao(page)
    const menu = page.getByRole('button', { name: 'Abrir menu' })
    if (await menu.isVisible()) await menu.click()
    await page.getByRole('button', { name: `Abrir perfil de ${prof.nome}` }).click()
    await page.getByRole('button', { name: 'Sair da conta' }).click()
    await expect(page).toHaveURL(/\/login/)
    // o logout é disparado em segundo plano: espera o servidor revogar a sessão
    await expect
      .poll(() => chamar('GET', '/perfil', undefined, sessao!.token).then(() => 'ativo', () => 'revogado'))
      .toBe('revogado')
    await expect(chamar('POST', '/auth/refresh', { refreshToken: sessao!.refreshToken })).rejects.toThrow(/401/)
  })
})

test.describe('RF05 - notificações (sino)', () => {
  test('RF05 - aluno recebe a publicação no sino, abre e marca como lida', async ({ page }) => {
    const { prof, turma, aluno } = await turmaComAluno()
    await entrarPelaUI(page, aluno)
    await expect(page.getByRole('button', { name: 'Notificações', exact: true })).toBeVisible()
    const form = await publicarFormulario(prof, turma.id, `Nova ${unico()}`)

    await page.reload()
    const sino = page.getByRole('button', { name: 'Notificações (1 não lida)' })
    await expect(sino).toBeVisible()
    await sino.click()
    await page.getByRole('button', { name: new RegExp(`Nova autoavaliação: ${form.titulo}`) }).click()
    await expect(page).toHaveURL(new RegExp(`/aluno/autoavaliacoes/${form.id}`))
    await expect(page.getByRole('button', { name: 'Notificações', exact: true })).toBeVisible() // 0 não lidas
  })

  test('RF05 - "Notificar pendentes" chega ao aluno; "marcar todas como lidas" zera o contador', async ({ page }) => {
    const { prof, turma, aluno } = await turmaComAluno()
    const form = await publicarFormulario(prof, turma.id)
    await chamar('POST', `/formularios/${form.id}/notificar-pendentes`, undefined, prof.token)
    await entrarPelaUI(page, aluno)
    const sino = page.getByRole('button', { name: 'Notificações (2 não lidas)' })
    await sino.click()
    await expect(page.getByText(/Autoavaliação pendente:/)).toBeVisible()
    await page.getByRole('button', { name: 'Marcar todas como lidas' }).click()
    await expect(page.getByRole('button', { name: 'Notificações', exact: true })).toBeVisible()
  })

  test('RF05 - professor é avisado quando todos os alunos respondem', async ({ page }) => {
    const { prof, turma, aluno } = await turmaComAluno()
    const form = await publicarFormulario(prof, turma.id)
    await responderEEnviar(aluno, form)
    await entrarPelaUI(page, prof)
    await page.getByRole('button', { name: 'Notificações (1 não lida)' }).click()
    await page.getByRole('button', { name: /Todos os alunos responderam/ }).click()
    await expect(page).toHaveURL(new RegExp(`/avaliacoes/${form.id}/resumo`))
  })

  test('R-81 - quem desligou as notificações no perfil não recebe nada', async ({ page }) => {
    const { prof, turma, aluno } = await turmaComAluno()
    await chamar('PATCH', '/perfil/preferencias', { notificacoesEmail: false }, aluno.token)
    await publicarFormulario(prof, turma.id)
    await entrarPelaUI(page, aluno)
    await expect(page.getByRole('button', { name: 'Notificações', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Notificações', exact: true }).click()
    await expect(page.getByText('Nenhuma notificação por aqui.')).toBeVisible()
  })
})

test.describe('N09 - ações por aluno', () => {
  test('N09 - professor vê as respostas individuais pelo menu do aluno (equipe e formulário)', async ({ page }) => {
    const { prof, turma, aluno } = await turmaComAluno()
    const form = await publicarFormulario(prof, turma.id, `Média ${unico()}`)
    await responderEEnviar(aluno, form, false)
    await entrarPelaUI(page, prof)

    await page.goto(`/equipes/${turma.id}/alunos`)
    await abrirMenuDoAluno(page, 'Sarah Chen')
    await page.getByRole('menuitem', { name: 'Ver respostas' }).click()
    const dialogo = page.getByRole('dialog')
    await expect(dialogo).toContainText('Respostas de Sarah Chen')
    const bloco = dialogo.getByRole('region', { name: `Respostas em ${form.titulo}` })
    await expect(bloco).toContainText('Nota: 5,0/10')
    await expect(bloco.getByRole('heading', { name: 'Qual é a média de 2 e 4?' })).toBeVisible()
    await page.keyboard.press('Escape')

    await page.goto(`/avaliacoes/${form.id}/alunos`)
    await abrirMenuDoAluno(page, 'Sarah Chen')
    await page.getByRole('menuitem', { name: 'Ver respostas' }).click()
    await expect(page.getByRole('dialog').getByRole('region', { name: `Respostas em ${form.titulo}` })).toContainText('Nota: 5,0/10')
  })

  test('N09 - aluno que não respondeu aparece como pendente', async ({ page }) => {
    const { prof, turma } = await turmaComAluno()
    await publicarFormulario(prof, turma.id)
    await entrarPelaUI(page, prof)
    await page.goto(`/equipes/${turma.id}/alunos`)
    await abrirMenuDoAluno(page, 'Sarah Chen')
    await page.getByRole('menuitem', { name: 'Ver respostas' }).click()
    await expect(page.getByRole('dialog')).toContainText('ainda não começou a responder')
  })

  test('R-18 - professor remove o aluno da equipe e ele perde o acesso', async ({ page }) => {
    const { prof, turma, aluno } = await turmaComAluno()
    const form = await publicarFormulario(prof, turma.id)
    await responderEEnviar(aluno, form)
    await entrarPelaUI(page, prof)
    await page.goto(`/equipes/${turma.id}/alunos`)

    page.once('dialog', (d) => d.accept())
    await abrirMenuDoAluno(page, 'Sarah Chen')
    await page.getByRole('menuitem', { name: 'Remover da equipe' }).click()
    await expect(page.getByRole('heading', { name: 'Alunos (0)' }).or(page.getByRole('button', { name: 'Alunos (0)' }))).toBeVisible()
    await expect(page.getByText('Sarah Chen')).toHaveCount(0)
    expect(await chamar<unknown[]>('GET', '/aluno/turmas', undefined, aluno.token)).toEqual([])
    expect(await chamar<unknown[]>('GET', '/aluno/autoavaliacoes', undefined, aluno.token)).toEqual([])
  })

  test('R-18 - cancelar a confirmação não remove ninguém', async ({ page }) => {
    const { prof, turma } = await turmaComAluno()
    await entrarPelaUI(page, prof)
    await page.goto(`/equipes/${turma.id}/alunos`)
    page.once('dialog', (d) => d.dismiss())
    await abrirMenuDoAluno(page, 'Sarah Chen')
    await page.getByRole('menuitem', { name: 'Remover da equipe' }).click()
    await expect(page.getByText('Sarah Chen')).toBeVisible()
  })
})

test.describe('RF02 - ver como aluno', () => {
  test('RF02 - a prévia mostra as perguntas como o aluno vê e não salva nada', async ({ page }) => {
    const { prof, turma, aluno } = await turmaComAluno()
    const form = await publicarFormulario(prof, turma.id, `Prévia ${unico()}`)
    await entrarPelaUI(page, prof)
    await page.goto(`/avaliacoes/${form.id}`)
    await page.getByRole('button', { name: `Opções do formulário ${form.titulo}` }).click()
    await page.getByRole('menuitem', { name: 'Ver como aluno' }).click()

    const dialogo = page.getByRole('dialog')
    await expect(dialogo).toContainText('não é salvo')
    const pergunta = dialogo.getByRole('group', { name: 'Qual é a média de 2 e 4?' })
    await pergunta.getByLabel('3', { exact: true }).check()
    await expect(pergunta.getByLabel('3', { exact: true })).toBeChecked()
    await expect(dialogo.getByText('Correta')).toHaveCount(0) // sem gabarito na prévia
    await page.getByRole('button', { name: 'Fechar prévia' }).click()

    const [minha] = await chamar<Array<{ status: string }>>('GET', '/aluno/autoavaliacoes', undefined, aluno.token)
    expect(minha?.status).toBe('pendente')
  })
})

test.describe('RF05 - observações dos alunos', () => {
  test('RF05 - professor responde e oculta; o aluno vê a resposta no resultado', async ({ page, browser }) => {
    const { prof, turma, aluno } = await turmaComAluno()
    const form = await publicarFormulario(prof, turma.id, `Obs ${unico()}`)
    await chamar('PUT', `/aluno/autoavaliacoes/${form.id}/respostas/${form.perguntas[0]!.id}`, { marcadas: [0] }, aluno.token)
    await chamar('PUT', `/aluno/autoavaliacoes/${form.id}/respostas/${form.perguntas[1]!.id}`, { marcadas: [0, 2] }, aluno.token)
    await chamar('POST', `/aluno/autoavaliacoes/${form.id}/enviar`, { observacao: 'Mais exemplos reais, por favor' }, aluno.token)

    await entrarPelaUI(page, prof)
    await page.goto(`/avaliacoes/${form.id}/resumo`)
    const item = page.getByRole('listitem').filter({ hasText: 'Mais exemplos reais, por favor' })
    await expect(item).toContainText('Sarah Chen')
    await item.getByRole('button', { name: 'Responder' }).click()
    await page.getByLabel('Resposta para Sarah Chen').fill('Vou trazer na próxima aula.')
    await page.getByRole('button', { name: 'Enviar resposta' }).click()
    await expect(item).toContainText('Sua resposta: Vou trazer na próxima aula.')

    // o aluno vê a resposta (outra sessão) e foi notificado
    const contexto = await browser.newContext()
    const paginaAluno = await contexto.newPage()
    await entrarPelaUI(paginaAluno, aluno)
    await paginaAluno.goto(`/aluno/autoavaliacoes/${form.id}/resultado`)
    const secao = paginaAluno.getByRole('region', { name: 'Minha observação' })
    await expect(secao).toContainText('Mais exemplos reais, por favor')
    await expect(secao).toContainText('Vou trazer na próxima aula.')
    await contexto.close()

    // ocultar tira do resumo (e da contagem); dá para reexibir
    await item.getByRole('button', { name: 'Ocultar' }).click()
    await expect(page.getByText('Todas as observações estão ocultas.')).toBeVisible()
    await page.getByRole('button', { name: 'Mostrar ocultas (1)' }).click()
    await expect(page.getByRole('listitem').filter({ hasText: 'Mais exemplos reais, por favor' }).getByRole('button', { name: 'Mostrar', exact: true })).toBeVisible()
  })
})

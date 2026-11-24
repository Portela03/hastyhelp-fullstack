import { expect, test } from '@playwright/test'
import { chamar, criarTurma, criarUsuario, entrarPelaUI, unico } from './apoio'
import type { Turma, Usuario } from './apoio'
import { TEMAS, abrirAdicionarMembrosModal, alvosPequenos, contrastesReprovados, definirTema } from './acessibilidade-membros'

/** Abre o modal "Adicionar membros" pelo menu ⋮ do cartão da equipe (professor). */
async function abrirAdicionarMembros(page: import('@playwright/test').Page, turma: Turma) {
  await page.getByRole('button', { name: /Opções da equipe/ }).first().click()
  await page.getByRole('menuitem', { name: 'Adicionar membros' }).click()
  await expect(page.getByRole('dialog', { name: 'Adicionar membros' })).toBeVisible()
  return turma
}

test.describe('RF01/RF02 - entrada em turmas por código e e-mail', () => {
  test('R-101 - aluno que já tem conta entra em mais de uma equipe pelo código', async ({ page }) => {
    const prof = await criarUsuario('professor', 'Alberto')
    const t1 = await criarTurma(prof, `Estatística ${unico()}`)
    const t2 = await criarTurma(prof, `Cálculo ${unico()}`)
    const aluno = await criarUsuario('aluno', 'Sarah Chen', t1.codigoConvite)

    await entrarPelaUI(page, aluno)
    await expect(page.getByRole('link', { name: `Abrir equipe ${t1.nome}` })).toBeVisible()

    await page.getByRole('button', { name: 'Entrar em equipe' }).click()
    const modal = page.getByRole('dialog', { name: 'Entrar em equipe' })
    await modal.getByLabel('Código da equipe').fill('zzzzzz')
    await modal.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(modal.getByRole('alert')).toContainText('Código inválido')

    await modal.getByLabel('Código da equipe').fill(` ${t2.codigoConvite.toUpperCase()} `)
    await modal.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(modal.getByRole('status')).toContainText(t2.nome)
    await modal.getByRole('button', { name: 'Fechar' }).click()
    await expect(page.getByRole('link', { name: `Abrir equipe ${t1.nome}` })).toBeVisible()
    await expect(page.getByRole('link', { name: `Abrir equipe ${t2.nome}` })).toBeVisible()

    // o mesmo código de novo é recusado com mensagem clara
    await page.getByRole('button', { name: 'Entrar em equipe' }).click()
    await page.getByLabel('Código da equipe').fill(t2.codigoConvite)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('já faz parte')
  })

  test('R-114 - link de convite com aluno já logado leva direto à entrada, sem cadastro', async ({ page }) => {
    const prof = await criarUsuario('professor', 'Alberto')
    const t1 = await criarTurma(prof, `Estatística ${unico()}`)
    const t2 = await criarTurma(prof, `Física ${unico()}`)
    const aluno = await criarUsuario('aluno', 'Sarah Chen', t1.codigoConvite)

    // sem sessão: o link mostra o cadastro e um caminho para quem já tem conta
    await page.goto(`/convite/${t2.codigoConvite}`)
    await expect(page.getByRole('heading', { name: 'Cadastrar' })).toBeVisible()
    await page.getByRole('button', { name: 'Já tenho conta' }).click()
    await expect(page).toHaveURL(/\/login\?convite=/)
    await page.getByLabel('Email').fill(aluno.email)
    await page.getByLabel('Senha', { exact: true }).fill(aluno.senha)
    await page.getByRole('button', { name: 'Concluir' }).click()

    await expect(page).toHaveURL(new RegExp(`/convite/${t2.codigoConvite}`))
    await expect(page.getByText(t2.nome)).toBeVisible()
    await page.getByRole('button', { name: 'Entrar na equipe' }).click()
    await expect(page.getByRole('status')).toContainText('Você entrou na equipe')
    await page.getByRole('button', { name: 'Abrir equipe' }).click()
    await expect(page).toHaveURL(new RegExp(`/aluno/turmas/${t2.id}`))
  })

  test('R-103/R-105 - aprovação manual: aluno fica em espera até o professor aceitar', async ({ browser }) => {
    const prof = await criarUsuario('professor', 'Alberto')
    const turma = await criarTurma(prof, `Banco de Dados ${unico()}`)
    const aluno = await criarUsuario('aluno', 'Sarah Chen')

    const pagProf = await (await browser.newContext()).newPage()
    await entrarPelaUI(pagProf, prof)
    await abrirAdicionarMembros(pagProf, turma)
    const modalProf = pagProf.getByRole('dialog', { name: 'Adicionar membros' })
    await expect(modalProf.getByLabel('Código da equipe')).toHaveText(turma.codigoConvite.toUpperCase())
    await modalProf.getByRole('switch', { name: /Aprovar entradas manualmente/ }).check()
    await expect(modalProf.getByText('fica em espera')).toBeVisible()

    const pagAluno = await (await browser.newContext()).newPage()
    await entrarPelaUI(pagAluno, aluno)
    await pagAluno.getByRole('button', { name: 'Entrar em equipe' }).click()
    await pagAluno.getByLabel('Código da equipe').fill(turma.codigoConvite)
    await pagAluno.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(pagAluno.getByRole('status')).toContainText('Pedido enviado')
    await pagAluno.getByRole('button', { name: 'Fechar' }).click()
    await expect(pagAluno.getByRole('link', { name: `Abrir equipe ${turma.nome}` })).toHaveCount(0)

    // o professor vê o pedido (recarregando o modal) e aceita
    await pagProf.reload()
    await abrirAdicionarMembros(pagProf, turma)
    const pedidos = pagProf.getByRole('region', { name: 'Pedidos de entrada' })
    await expect(pedidos).toContainText('Sarah Chen')
    await pedidos.getByRole('button', { name: 'Aceitar' }).click()
    await expect(pedidos).toContainText('Nenhum pedido aguardando')

    await pagAluno.reload()
    await expect(pagAluno.getByRole('link', { name: `Abrir equipe ${turma.nome}` })).toBeVisible()
    await pagAluno.getByRole('button', { name: /Notificações/ }).click()
    await expect(pagAluno.getByRole('region', { name: 'Lista de notificações' })).toContainText('Pedido aceito')
  })

  test('R-107/R-108/R-110 - professor convida por e-mail/nome; aluno aceita e entra', async ({ browser }) => {
    const prof = await criarUsuario('professor', 'Alberto')
    const turma = await criarTurma(prof, `Probabilidade ${unico()}`)
    const nomeUnico = `Zélia${unico()}`
    const aluno = await criarUsuario('aluno', `${nomeUnico} Souza`)

    const pagProf = await (await browser.newContext()).newPage()
    await entrarPelaUI(pagProf, prof)
    await abrirAdicionarMembros(pagProf, turma)
    const modal = pagProf.getByRole('dialog', { name: 'Adicionar membros' })
    await modal.getByRole('tab', { name: 'Email' }).click()
    await expect(modal.getByRole('button', { name: 'Convidar' })).toBeDisabled()

    await modal.getByPlaceholder('Digite o email ou nome').fill('ze')
    await modal.getByRole('button', { name: 'Pesquisar' }).click()
    await expect(modal.getByRole('alert')).toContainText('ao menos 3 letras')

    await modal.getByPlaceholder('Digite o email ou nome').fill(nomeUnico.toLowerCase().replace('é', 'e'))
    await modal.getByRole('button', { name: 'Pesquisar' }).click()
    await modal.getByRole('radio', { name: new RegExp(aluno.email) }).click()
    await modal.getByRole('button', { name: 'Convidar' }).click()
    await expect(modal.getByRole('status')).toContainText('Convite enviado')
    await expect(modal.getByRole('region', { name: 'Convites enviados' })).toContainText(aluno.nome)
    await expect(modal.getByRole('button', { name: 'Convidar' })).toBeDisabled()

    const pagAluno = await (await browser.newContext()).newPage()
    await entrarPelaUI(pagAluno, aluno)
    const convites = pagAluno.getByRole('region', { name: 'Convites para equipes' })
    await expect(convites).toContainText(turma.nome)
    await pagAluno.getByRole('button', { name: /Notificações/ }).click()
    await expect(pagAluno.getByRole('region', { name: 'Lista de notificações' })).toContainText('Convite para uma equipe')
    await pagAluno.keyboard.press('Escape')
    await convites.getByRole('button', { name: 'Aceitar' }).click()
    await expect(pagAluno.getByRole('link', { name: `Abrir equipe ${turma.nome}` })).toBeVisible()
    await expect(convites).toHaveCount(0)
  })

  test('R-111/R-110 - aluno recusa convite e professor cancela outro', async ({ page }) => {
    const prof = await criarUsuario('professor', 'Alberto')
    const turma = await criarTurma(prof, `Álgebra ${unico()}`)
    const a1 = await criarUsuario('aluno', 'Aluno Um')
    const a2 = await criarUsuario('aluno', 'Aluno Dois')
    await chamar('POST', `/turmas/${turma.id}/convites`, { alunoId: await idDe(a1) }, prof.token)
    await chamar('POST', `/turmas/${turma.id}/convites`, { alunoId: await idDe(a2) }, prof.token)

    await entrarPelaUI(page, a1)
    const convites = page.getByRole('region', { name: 'Convites para equipes' })
    await convites.getByRole('button', { name: 'Recusar' }).click()
    await expect(convites).toHaveCount(0)
    await expect(page.getByRole('link', { name: `Abrir equipe ${turma.nome}` })).toHaveCount(0)

    const entradas = await chamar<{ convites: Array<{ id: string; aluno: { nome: string } }> }>('GET', `/turmas/${turma.id}/entradas`, undefined, prof.token)
    expect(entradas.convites.map((c) => c.aluno.nome)).toEqual(['Aluno Dois'])
    await chamar('DELETE', `/turmas/${turma.id}/entradas/${entradas.convites[0]!.id}`, undefined, prof.token)
    expect(await chamar<unknown[]>('GET', '/aluno/convites', undefined, a2.token)).toEqual([])
  })

  test('R-04/R-103 - cadastro pelo link com aprovação manual deixa o pedido pendente', async ({ page }) => {
    const prof = await criarUsuario('professor', 'Alberto')
    const turma = await criarTurma(prof, `Redes ${unico()}`)
    await chamar('PATCH', `/turmas/${turma.id}`, { aprovacaoManual: true }, prof.token)

    await page.goto(`/convite/${turma.codigoConvite}`)
    await expect(page.getByRole('status')).toContainText('precisará aceitar')
    const email = `aluno.${unico()}@teste.com`
    await page.getByLabel('Nome', { exact: true }).fill('Novo Aluno')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Senha', { exact: true }).fill('senha1234')
    await page.getByLabel('Confirme sua senha').fill('senha1234')
    await page.getByRole('button', { name: 'Cadastrar' }).click()
    await expect(page).toHaveURL(/\/login/)

    const entradas = await chamar<{ solicitacoes: Array<{ aluno: { nome: string } }> }>('GET', `/turmas/${turma.id}/entradas`, undefined, prof.token)
    expect(entradas.solicitacoes.map((s) => s.aluno.nome)).toEqual(['Novo Aluno'])
  })
})

test.describe('RF01/N01 - link de convite inválido e acessibilidade dos modais de membros', () => {
  test('R-17 - link de convite inválido esconde o cadastro e oferece "Voltar ao login"', async ({ page }) => {
    await page.goto('/convite/zzzzzz')
    await expect(page.getByRole('alert')).toContainText('inválido ou expirou')
    await expect(page.getByLabel('Nome', { exact: true })).toHaveCount(0)
    await expect(page.getByLabel('Email')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Cadastrar' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Voltar ao login' }).click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('N-A11Y - abas e resultados da busca navegam por teclado (roving tabindex)', async ({ page }) => {
    const prof = await criarUsuario('professor', 'Alberto')
    const turma = await criarTurma(prof, `Teclado ${unico()}`)
    const prefixo = `Zelia${unico()}`
    const alunos = await Promise.all(['A', 'B', 'C'].map((l) => criarUsuario('aluno', `${prefixo} ${l}`)))
    await chamar('POST', `/turmas/${turma.id}/convites`, { alunoId: await idDe(alunos[1]!) }, prof.token)

    await entrarPelaUI(page, prof)
    const modal = await abrirAdicionarMembrosModal(page)

    // foco inicial na aba ativa; só ela está na ordem de Tab
    const abaCodigo = modal.getByRole('tab', { name: 'Código' })
    const abaEmail = modal.getByRole('tab', { name: 'Email' })
    await expect(abaCodigo).toBeFocused()
    await expect(abaEmail).toHaveAttribute('tabindex', '-1')
    await page.keyboard.press('ArrowRight')
    await expect(abaEmail).toBeFocused()
    await expect(abaEmail).toHaveAttribute('aria-selected', 'true')
    await expect(abaCodigo).toHaveAttribute('tabindex', '-1')
    await page.keyboard.press('ArrowRight')
    await expect(abaCodigo).toBeFocused()
    await page.keyboard.press('End')
    await expect(abaEmail).toBeFocused()

    await modal.getByPlaceholder('Digite o email ou nome').fill(prefixo.toLowerCase())
    await modal.getByRole('button', { name: 'Pesquisar' }).click()
    await expect(modal.getByRole('status')).toContainText('3 alunos encontrados')
    const radios = modal.getByRole('radio')
    await expect(radios).toHaveCount(3)
    await expect(radios.nth(0)).toHaveAttribute('tabindex', '0')
    await expect(radios.nth(2)).toHaveAttribute('tabindex', '-1')

    await radios.nth(0).focus()
    await page.keyboard.press('ArrowDown') // pula o B (já convidado)
    await expect(radios.nth(2)).toBeFocused()
    await expect(radios.nth(2)).toHaveAttribute('aria-checked', 'true')
    await page.keyboard.press('ArrowRight')
    await expect(radios.nth(0)).toBeFocused()
    await expect(radios.nth(0)).toHaveAttribute('aria-checked', 'true')
    await expect(radios.nth(2)).toHaveAttribute('aria-checked', 'false')
    await page.keyboard.press('ArrowUp')
    await expect(radios.nth(2)).toBeFocused()
  })

  test('N-A11Y - foco fica preso no modal e Esc fecha', async ({ page }) => {
    const prof = await criarUsuario('professor', 'Alberto')
    await criarTurma(prof, `Foco ${unico()}`)
    await entrarPelaUI(page, prof)
    const modal = await abrirAdicionarMembrosModal(page)
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab')
      expect(await modal.evaluate((el) => el.contains(document.activeElement))).toBe(true)
    }
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Shift+Tab')
      expect(await modal.evaluate((el) => el.contains(document.activeElement))).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(modal).toHaveCount(0)
  })

  test('N-A11Y - modal Entrar em equipe: foco no campo e erro ligado ao campo', async ({ page }) => {
    const prof = await criarUsuario('professor', 'Alberto')
    const turma = await criarTurma(prof, `Entrada ${unico()}`)
    const aluno = await criarUsuario('aluno', 'Sarah Chen', turma.codigoConvite)
    await entrarPelaUI(page, aluno)
    await page.getByRole('button', { name: 'Entrar em equipe' }).click()
    const modal = page.getByRole('dialog', { name: 'Entrar em equipe' })
    const campo = modal.getByLabel('Código da equipe')
    await expect(campo).toBeFocused()
    await campo.fill('zzzzzz')
    await page.keyboard.press('Enter')
    await expect(modal.getByRole('alert')).toContainText('Código inválido')
    await expect(campo).toHaveAttribute('aria-invalid', 'true')
    const idErro = await modal.getByRole('alert').getAttribute('id')
    await expect(campo).toHaveAttribute('aria-describedby', idErro ?? 'x')
  })

  for (const tema of TEMAS) {
    test(`N-A11Y - contraste e alvos de toque nos modais de membros (tema ${tema})`, async ({ browser }) => {
      const prof = await criarUsuario('professor', 'Alberto')
      // cor escura: o contraste da sigla depende da cor da turma (paleta do Figma, fora do escopo deste teste)
      const turma = await chamar<Turma>('POST', '/turmas', { nome: `Contraste ${unico()}`, periodo: '2026/02', cor: '#15593c' }, prof.token)
      const prefixo = `Zelia${unico()}`
      await criarUsuario('aluno', `${prefixo} A`)
      const convidado = await criarUsuario('aluno', `${prefixo} B`)
      await chamar('POST', `/turmas/${turma.id}/convites`, { alunoId: await idDe(convidado) }, prof.token)
      await definirTema(prof, tema)
      await definirTema(convidado, tema)

      // viewport de celular pedida pela especificação (RNF02)
      const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true })
      const page = await ctx.newPage()
      await entrarPelaUI(page, prof)
      await expect(page.locator('body')).toHaveAttribute('data-tema', tema)
      const modal = await abrirAdicionarMembrosModal(page)
      await modal.getByRole('switch', { name: /Aprovar entradas manualmente/ }).check()
      await expect.poll(() => contrastesReprovados(modal), { message: 'aba Código' }).toEqual([])
      expect(await alvosPequenos(modal), 'aba Código').toEqual([])

      await modal.getByRole('tab', { name: 'Email' }).click()
      await modal.getByPlaceholder('Digite o email ou nome').fill(prefixo.toLowerCase())
      await modal.getByRole('button', { name: 'Pesquisar' }).click()
      await expect(modal.getByRole('radio')).toHaveCount(2)
      await modal.getByRole('radio').first().click()
      await expect.poll(() => contrastesReprovados(modal), { message: 'aba Email' }).toEqual([])
      expect(await alvosPequenos(modal), 'aba Email').toEqual([])
      await modal.getByPlaceholder('Digite o email ou nome').fill('ze')
      await modal.getByRole('button', { name: 'Pesquisar' }).click()
      await expect(modal.getByRole('alert')).toBeVisible()
      await expect.poll(() => contrastesReprovados(modal), { message: 'erro de busca' }).toEqual([])
      await ctx.close()

      const ctxAluno = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true })
      const pagAluno = await ctxAluno.newPage()
      await entrarPelaUI(pagAluno, convidado)
      const convites = pagAluno.getByRole('region', { name: 'Convites para equipes' })
      await expect(convites).toBeVisible()
      await expect.poll(() => contrastesReprovados(convites), { message: 'convites recebidos' }).toEqual([])
      expect(await alvosPequenos(convites), 'convites recebidos').toEqual([])
      await pagAluno.getByRole('button', { name: 'Entrar em equipe' }).click()
      const entrar = pagAluno.getByRole('dialog', { name: 'Entrar em equipe' })
      await entrar.getByLabel('Código da equipe').fill('zzzzzz')
      await entrar.getByRole('button', { name: 'Entrar', exact: true }).click()
      await expect(entrar.getByRole('alert')).toBeVisible()
      await expect.poll(() => contrastesReprovados(entrar), { message: 'entrar em equipe' }).toEqual([])
      expect(await alvosPequenos(entrar), 'entrar em equipe').toEqual([])
      await ctxAluno.close()
    })
  }
})

async function idDe(u: Usuario): Promise<string> {
  const perfil = await chamar<{ id: string }>('GET', '/perfil', undefined, u.token)
  return perfil.id
}

import { expect, test } from '@playwright/test'
import { chamar, criarTurma, criarUsuario, entrarPelaUI, unico } from './apoio'
import { TEMAS, abrirAdicionarMembrosModal, definirTema } from './acessibilidade-membros'

/**
 * Validação visual dos modais de membros: capturas em 1440×810 e 375×812 nos três temas.
 * Saída em `capturas-visual/membros/` (ignorada pelo git). Roda só no projeto desktop;
 * o viewport é definido aqui, por captura.
 */
const TAMANHOS = [
  { nome: 'desktop', width: 1440, height: 810 },
  { nome: 'mobile', width: 375, height: 812 },
] as const

test.describe('RNF02 - validação visual dos modais de membros', () => {
  test.beforeEach(({ browserName: _ }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'capturas geradas uma vez, no projeto desktop')
  })

  for (const tema of TEMAS) {
    test(`capturas dos modais de membros (tema ${tema})`, async ({ browser }) => {
      test.setTimeout(120_000)
      const prof = await criarUsuario('professor', 'Alberto')
      const turma = await criarTurma(prof, `Estatística ${unico()}`)
      const prefixo = `Zelia${unico()}`
      await criarUsuario('aluno', `${prefixo} Almeida`)
      const convidado = await criarUsuario('aluno', `${prefixo} Barbosa`)
      const convidado2 = await criarUsuario('aluno', `${prefixo} Cardoso`)
      const pedinte = await criarUsuario('aluno', 'Sarah Chen')
      await chamar('PATCH', `/turmas/${turma.id}`, { aprovacaoManual: true }, prof.token)
      await chamar('POST', '/aluno/turmas/entrar', { codigo: turma.codigoConvite }, pedinte.token)
      const idConvidado = (await chamar<{ id: string }>('GET', '/perfil', undefined, convidado.token)).id
      await chamar('POST', `/turmas/${turma.id}/convites`, { alunoId: idConvidado }, prof.token)
      await chamar('POST', `/turmas/${turma.id}/convites`, { alunoId: (await chamar<{ id: string }>('GET', '/perfil', undefined, convidado2.token)).id }, prof.token)
      await definirTema(prof, tema)
      await definirTema(convidado2, tema)

      for (const t of TAMANHOS) {
        const ctx = await browser.newContext({ viewport: { width: t.width, height: t.height }, hasTouch: t.nome === 'mobile' })
        const page = await ctx.newPage()
        const arquivo = (nome: string) => `capturas-visual/membros/${t.nome}-${tema}-${nome}.png`

        await entrarPelaUI(page, prof)
        const modal = await abrirAdicionarMembrosModal(page)
        await expect(modal.getByRole('region', { name: 'Pedidos de entrada' })).toContainText('Sarah Chen')
        await page.screenshot({ path: arquivo('modal-aba-codigo') })

        await modal.getByRole('tab', { name: 'Email' }).click()
        await modal.getByPlaceholder('Digite o email ou nome').fill(prefixo.toLowerCase())
        await modal.getByRole('button', { name: 'Pesquisar' }).click()
        await expect(modal.getByRole('radio')).toHaveCount(3)
        await modal.getByRole('radio').first().click()
        await expect(modal.getByRole('region', { name: 'Convites enviados' })).toBeVisible()
        await page.screenshot({ path: arquivo('modal-aba-email') })

        // aluno: convite recebido + modal "Entrar em equipe" com erro
        const ctxAluno = await browser.newContext({ viewport: { width: t.width, height: t.height }, hasTouch: t.nome === 'mobile' })
        const pagAluno = await ctxAluno.newPage()
        await entrarPelaUI(pagAluno, convidado2)
        await expect(pagAluno.getByRole('region', { name: 'Convites para equipes' })).toBeVisible()
        await pagAluno.screenshot({ path: arquivo('aluno-convites') })
        await pagAluno.getByRole('button', { name: 'Entrar em equipe' }).click()
        const entrar = pagAluno.getByRole('dialog', { name: 'Entrar em equipe' })
        await entrar.getByLabel('Código da equipe').fill('zzzzzz')
        await entrar.getByRole('button', { name: 'Entrar', exact: true }).click()
        await expect(entrar.getByRole('alert')).toBeVisible()
        await pagAluno.screenshot({ path: arquivo('modal-entrar-equipe') })
        await ctxAluno.close()

        if (tema === 'claro') {
          const ctxAnonimo = await browser.newContext({ viewport: { width: t.width, height: t.height } })
          const anonimo = await ctxAnonimo.newPage()
          await anonimo.goto('/convite/zzzzzz')
          await expect(anonimo.getByRole('alert')).toBeVisible()
          await anonimo.screenshot({ path: arquivo('convite-invalido') })
          await ctxAnonimo.close()
        }
        await ctx.close()
      }
    })
  }
})

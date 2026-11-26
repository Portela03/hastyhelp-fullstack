import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { criarTurma, criarUsuario, entrarPelaUI, publicarFormulario } from './apoio'

/** RNF02: nenhuma tela principal pode ganhar rolagem horizontal (a barra superior já estourou em 375 px). */
async function semRolagemHorizontal(page: Page, rota: string) {
  await page.waitForLoadState('networkidle')
  const { scroll, largura } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, largura: document.documentElement.clientWidth }))
  expect(scroll, `${rota}: a página tem ${scroll}px de largura numa tela de ${largura}px`).toBeLessThanOrEqual(largura)
}

test.describe('RNF02 - barra superior cabe na tela', () => {
  test('RNF02 - telas do professor não têm rolagem horizontal e avaliação fica na FAQ', async ({ page }) => {
    const prof = await criarUsuario('professor', 'Alberto')
    const turma = await criarTurma(prof)
    const form = await publicarFormulario(prof, turma.id)
    await entrarPelaUI(page, prof)
    await page.setViewportSize({ width: 375, height: 812 }) // o menor celular comum (iPhone SE)

    for (const rota of ['/equipes', '/avaliacoes', '/metricas', '/faq', `/equipes/${turma.id}`, `/avaliacoes/${form.id}`]) {
      await page.goto(rota)
      const avaliar = page.locator('header').getByRole('button', { name: 'Avaliar o HastyHelp' })
      if (rota === '/faq') await expect(avaliar).toBeVisible()
      else await expect(page.getByRole('button', { name: 'Avaliar o HastyHelp' })).toHaveCount(0)
      await semRolagemHorizontal(page, rota)
    }

    await page.goto('/faq')
    await page.locator('header').getByRole('button', { name: 'Avaliar o HastyHelp' }).click()
    await expect(page.getByRole('dialog', { name: 'Avaliar o HastyHelp' })).toBeVisible()
  })

  test('RNF02 - telas do aluno não têm rolagem horizontal e avaliação fica na FAQ', async ({ page }) => {
    const prof = await criarUsuario('professor', 'Alberto')
    const turma = await criarTurma(prof)
    const aluno = await criarUsuario('aluno', 'Sarah Chen', turma.codigoConvite)
    await publicarFormulario(prof, turma.id)
    await entrarPelaUI(page, aluno)
    await page.setViewportSize({ width: 375, height: 812 })

    for (const rota of ['/aluno/turmas', '/aluno/autoavaliacoes', '/aluno/desempenho', '/aluno/faq']) {
      await page.goto(rota)
      const avaliar = page.locator('header').getByRole('button', { name: 'Avaliar o HastyHelp' })
      if (rota === '/aluno/faq') await expect(avaliar).toBeVisible()
      else await expect(page.getByRole('button', { name: 'Avaliar o HastyHelp' })).toHaveCount(0)
      await semRolagemHorizontal(page, rota)
    }
  })
})

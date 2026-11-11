import { expect, test } from '@playwright/test'
import { chamar, criarTurma, criarUsuario, entrarPelaUI, publicarFormulario, responderEEnviar, unico } from './apoio'

/** Sarah acerta tudo (10), James erra uma (5), Lisa só começa, Michael fica pendente. */
async function turmaComRespostas() {
  const prof = await criarUsuario('professor', 'Alberto')
  const turma = await criarTurma(prof, `Estatística ${unico()}`)
  const sarah = await criarUsuario('aluno', 'Sarah Chen', turma.codigoConvite)
  const james = await criarUsuario('aluno', 'James Park', turma.codigoConvite)
  const lisa = await criarUsuario('aluno', 'Lisa Anderson', turma.codigoConvite)
  await criarUsuario('aluno', 'Michael Torres', turma.codigoConvite)
  const form = await publicarFormulario(prof, turma.id, `Média ${unico()}`)
  await responderEEnviar(sarah, form, true)
  await responderEEnviar(james, form, false)
  await chamar('PUT', `/aluno/autoavaliacoes/${form.id}/respostas/${form.perguntas[0]!.id}`, { marcadas: [0] }, lisa.token)
  return { prof, turma, form }
}

test.describe('RF05/RF06/RF07/RF08 - professor acompanha resultados', () => {
  test('RF05/N09/N10 - resumo do formulário: taxa, nota média e dificuldades', async ({ page }) => {
    const { prof, form } = await turmaComRespostas()
    await entrarPelaUI(page, prof)
    await page.goto(`/avaliacoes/${form.id}/resumo`)
    await expect(page.getByText('50%').first()).toBeVisible()
    await expect(page.getByText('2/4 alunos responderam')).toBeVisible()
    await expect(page.getByText('7,5/10')).toBeVisible()
    // RF06/N11: a pergunta mais errada aparece nas dificuldades gerais
    await expect(page.getByRole('heading', { name: 'Dificuldades gerais' })).toBeVisible()
    await expect(page.getByText('Qual é a média de 2 e 4?').first()).toBeVisible()
  })

  test('RF05/N09 - alunos do formulário: responderam, visualizaram e pendentes', async ({ page }) => {
    const { prof, form } = await turmaComRespostas()
    await entrarPelaUI(page, prof)
    await page.goto(`/avaliacoes/${form.id}/alunos`)
    await expect(page.getByRole('button', { name: 'Responderam (2/4)' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Visualizaram (1/4)' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Pendente (1/4)' })).toBeVisible()
    await expect(page.getByText('Sarah Chen')).toBeVisible()
    await expect(page.getByText('Lisa Anderson')).toBeVisible()
    await expect(page.getByText('Michael Torres')).toBeVisible()
  })

  test('RF05 - notificar pendentes informa quantos alunos foram avisados', async ({ page }) => {
    const { prof, form } = await turmaComRespostas()
    await entrarPelaUI(page, prof)
    await page.goto(`/avaliacoes/${form.id}`)
    await page.getByRole('button', { name: 'Notificar pendentes' }).click()
    await expect(page.getByRole('status')).toContainText('2 alunos notificados')
  })

  test('RF05/N10 - equipe: estatísticas no cartão, alunos e resumo coletivo', async ({ page }) => {
    const { prof, turma } = await turmaComRespostas()
    await entrarPelaUI(page, prof)
    const cartao = page.getByRole('link', { name: `Abrir equipe ${turma.nome}` })
    await expect(cartao).toContainText('4 Alunos')
    await expect(cartao).toContainText('50%')

    await page.goto(`/equipes/${turma.id}/alunos`)
    await expect(page.getByRole('button', { name: 'Alunos (4)' })).toBeVisible()
    const linhaSarah = page.getByRole('row', { name: /Sarah Chen/ })
    await expect(linhaSarah).toContainText('100%')
    await expect(linhaSarah).toContainText('1 / 1')

    await page.goto(`/equipes/${turma.id}/resumo`)
    await expect(page.getByText('2 alunos responderam tudo')).toBeVisible()
    await expect(page.getByText('7,5/10')).toBeVisible()
    await expect(page.getByText('I (50%)')).toBeVisible()
  })

  test('RF08/N13 - métricas consolidadas e filtros por turma e aluno', async ({ page }) => {
    const { prof, turma } = await turmaComRespostas()
    await entrarPelaUI(page, prof)
    await page.goto('/metricas')
    await expect(page.getByText('Desempenho médio')).toBeVisible()
    await expect(page.getByText('75%').first()).toBeVisible()
    await expect(page.getByText('2 de 4 respostas')).toBeVisible()
    await expect(page.getByRole('progressbar', { name: turma.nome })).toHaveAttribute('aria-valuenow', '75')

    await page.getByLabel('Turma').selectOption(turma.nome)
    await page.getByLabel('Aluno').selectOption('Sarah Chen')
    await expect(page.getByText('100%').first()).toBeVisible()
    await expect(page.getByText('1 de 1 respostas')).toBeVisible()
  })

  test('RNF04 - professor de outra turma não acessa o resumo (API)', async () => {
    const { form } = await turmaComRespostas()
    const intruso = await criarUsuario('professor', 'Intruso')
    await expect(chamar('GET', `/formularios/${form.id}/resumo`, undefined, intruso.token)).rejects.toThrow(/403/)
    await expect(chamar('GET', `/formularios/${form.id}/alunos`, undefined, intruso.token)).rejects.toThrow(/403/)
  })
})

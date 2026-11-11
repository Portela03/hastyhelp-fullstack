import { expect, test } from '@playwright/test'
import { chamar, criarTurma, criarUsuario, entrarPelaUI, publicarFormulario, responderEEnviar, unico } from './apoio'
import type { Usuario } from './apoio'

async function cenario(extra: object = {}) {
  const prof = await criarUsuario('professor', 'Alberto')
  const turma = await criarTurma(prof)
  const aluno = await criarUsuario('aluno', 'Sarah Chen', turma.codigoConvite)
  const form = await publicarFormulario(prof, turma.id, `Média ${unico()}`, extra)
  return { prof, turma, aluno, form }
}

const pergunta = (page: import('@playwright/test').Page, enunciado: string) => page.getByRole('group', { name: enunciado })

async function responderPelaUI(page: import('@playwright/test').Page) {
  await pergunta(page, 'Qual é a média de 2 e 4?').getByLabel('3', { exact: true }).check()
  await pergunta(page, 'Quais números são pares?').getByLabel('2', { exact: true }).check()
  await pergunta(page, 'Quais números são pares?').getByLabel('4', { exact: true }).check()
}

test.describe('RF03 - aluno responde as autoavaliações', () => {
  test('RF03/N02/N03 - aluno vê as autoavaliações disponibilizadas da sua turma', async ({ page }) => {
    const { aluno, form, turma } = await cenario()
    await entrarPelaUI(page, aluno)
    await page.goto('/aluno/autoavaliacoes')
    const linha = page.getByRole('link', { name: `Abrir autoavaliação ${form.titulo}` })
    await expect(linha).toContainText('Pendente')
    await expect(linha).toContainText(turma.nome)
    await expect(linha).toContainText('0/2 perguntas respondidas')
  })

  test('RF03/N04/N05 - aluno responde, revisa e envia; vê nota e resultado', async ({ page }) => {
    const { aluno, form } = await cenario({ mostrarGabarito: true })
    await entrarPelaUI(page, aluno)
    await page.goto(`/aluno/autoavaliacoes/${form.id}`)

    await responderPelaUI(page)
    await page.getByRole('button', { name: 'Revisar respostas' }).click()
    await expect(page.getByRole('heading', { name: 'Revise suas respostas' })).toBeVisible()
    await page.getByLabel('Observações (opcional)').fill('Gostei dos exemplos')
    await page.getByRole('button', { name: 'Enviar', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Enviar' }).click()

    await expect(page).toHaveURL(new RegExp(`/aluno/autoavaliacoes/${form.id}/resultado`))
    await expect(page.getByText('10,0/10').first()).toBeVisible()
    // aluno não pode mais alterar (RNF05): API recusa
    await expect(chamar('PUT', `/aluno/autoavaliacoes/${form.id}/respostas/${form.perguntas[0]!.id}`, { marcadas: [1] }, aluno.token)).rejects.toThrow(/409/)
  })

  test('N05 - não deixa enviar com perguntas sem resposta', async ({ page }) => {
    const { aluno, form } = await cenario()
    await entrarPelaUI(page, aluno)
    await page.goto(`/aluno/autoavaliacoes/${form.id}`)
    await pergunta(page, 'Qual é a média de 2 e 4?').getByLabel('4', { exact: true }).check()
    await page.getByRole('button', { name: 'Revisar respostas' }).click()
    await expect(page.getByText('Sem resposta')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Enviar', exact: true })).toBeDisabled()
  })

  test('RF04 - as respostas são salvas na hora e voltam ao recarregar (em andamento)', async ({ page }) => {
    const { aluno, form } = await cenario()
    await entrarPelaUI(page, aluno)
    await page.goto(`/aluno/autoavaliacoes/${form.id}`)
    await pergunta(page, 'Qual é a média de 2 e 4?').getByLabel('3', { exact: true }).check()
    await expect(page.getByText(/1\/2/).first()).toBeVisible()
    await page.reload()
    await expect(pergunta(page, 'Qual é a média de 2 e 4?').getByLabel('3', { exact: true })).toBeChecked()
    await page.goto('/aluno/autoavaliacoes')
    await expect(page.getByRole('link', { name: `Abrir autoavaliação ${form.titulo}` })).toContainText('Em andamento')
  })

  test('RF09/N06 - histórico: autoavaliação enviada aparece como Respondida com a nota', async ({ page }) => {
    const { aluno, form } = await cenario()
    await responderEEnviar(aluno, form, false)
    await entrarPelaUI(page, aluno)
    await page.goto('/aluno/autoavaliacoes')
    const linha = page.getByRole('link', { name: `Abrir autoavaliação ${form.titulo}` })
    await expect(linha).toContainText('Respondido')
    await expect(linha).toContainText('Nota: 5,0/10')
    await page.goto('/aluno/desempenho')
    await expect(page.getByText('5,0/10').first()).toBeVisible()
  })

  test('RF03 - formulário fechado vira Encerrado e bloqueia respostas', async ({ page }) => {
    const { prof, aluno, form } = await cenario()
    await chamar('PATCH', `/formularios/${form.id}`, { status: 'fechado' }, prof.token)
    await entrarPelaUI(page, aluno)
    await page.goto('/aluno/autoavaliacoes')
    await expect(page.getByRole('link', { name: `Abrir autoavaliação ${form.titulo}` })).toContainText('Encerrado')
    await expect(chamar('PUT', `/aluno/autoavaliacoes/${form.id}/respostas/${form.perguntas[0]!.id}`, { marcadas: [0] }, aluno.token)).rejects.toThrow(/422/)
  })

  test('RF03 - rascunho e agendado não aparecem para o aluno', async ({ page }) => {
    const { prof, turma, aluno } = await cenario()
    const oculto = await chamar<{ titulo: string }>('POST', '/formularios', { titulo: `Oculto ${unico()}`, turmaId: turma.id, perguntas: [] }, prof.token)
    await entrarPelaUI(page, aluno)
    await page.goto('/aluno/autoavaliacoes')
    await expect(page.getByRole('link', { name: new RegExp(oculto.titulo) })).toHaveCount(0)
  })

  test('RNF04 - aluno de outra turma não vê nem responde a autoavaliação', async ({ page }) => {
    const { form } = await cenario()
    const forasteiro: Usuario = await criarUsuario('aluno', 'Michael Torres')
    await entrarPelaUI(page, forasteiro)
    await page.goto('/aluno/autoavaliacoes')
    await expect(page.getByRole('link', { name: new RegExp(form.titulo) })).toHaveCount(0)
    await expect(chamar('PUT', `/aluno/autoavaliacoes/${form.id}/respostas/${form.perguntas[0]!.id}`, { marcadas: [0] }, forasteiro.token)).rejects.toThrow(/403/)
  })

  test('R-47 - gabarito só aparece quando o professor libera', async ({ page }) => {
    const { aluno, form } = await cenario({ mostrarGabarito: false })
    await responderEEnviar(aluno, form, false)
    await entrarPelaUI(page, aluno)
    await page.goto(`/aluno/autoavaliacoes/${form.id}/resultado`)
    await expect(page.getByText('Incorreta')).toHaveCount(0)
    await expect(page.getByText('Correta', { exact: true })).toHaveCount(0)
  })
})

import { expect, test } from '@playwright/test'
import { PERGUNTAS, chamar, confirmarExclusao, criarTurma, criarUsuario, entrarPelaUI, publicarFormulario, unico } from './apoio'

test.describe('RF02 - professor gerencia equipes e formulários', () => {
  test('RF02/N07 - professor cria uma equipe', async ({ page }) => {
    const prof = await criarUsuario('professor', 'Alberto')
    await entrarPelaUI(page, prof)
    const nome = `Engenharia de Software ${unico()}`
    await page.getByRole('button', { name: 'Criar equipe' }).first().click()
    await page.getByLabel('Nome da equipe').fill(nome)
    await page.getByLabel('Período letivo').selectOption('2026/02')
    await page.getByRole('button', { name: 'Concluir' }).click()
    await expect(page.getByRole('link', { name: `Abrir equipe ${nome}` })).toBeVisible()
  })

  test('RF02 - criar equipe sem nome mostra erro', async ({ page }) => {
    const prof = await criarUsuario('professor', 'Alberto')
    await entrarPelaUI(page, prof)
    await page.getByRole('button', { name: 'Criar equipe' }).first().click()
    await page.getByRole('button', { name: 'Concluir' }).click()
    await expect(page.getByRole('alert')).toContainText('Informe o nome e o período')
  })

  test('RF02 - editar equipe e ocultar/desocultar', async ({ page }) => {
    const prof = await criarUsuario('professor', 'Alberto')
    const turma = await criarTurma(prof, `Turma ${unico()}`)
    await entrarPelaUI(page, prof)

    await page.getByRole('button', { name: `Opções da equipe ${turma.nome}` }).click()
    await page.getByRole('menuitem', { name: 'Editar' }).click()
    await page.getByLabel('Nome da equipe').fill(`${turma.nome} (editada)`)
    await page.getByRole('button', { name: 'Concluir' }).click()
    await expect(page.getByRole('link', { name: `Abrir equipe ${turma.nome} (editada)` })).toBeVisible()

    await page.getByRole('button', { name: `Opções da equipe ${turma.nome} (editada)` }).first().click()
    await page.getByRole('menuitem', { name: 'Ocultar' }).click()
    await expect(page.getByRole('button', { name: 'Equipes ocultas' })).toBeVisible()
    const dto = await chamar<{ oculta: boolean }>('GET', `/turmas/${turma.id}`, undefined, prof.token)
    expect(dto.oculta).toBe(true)
  })

  test('RF02 - excluir equipe remove a equipe', async ({ page }) => {
    const prof = await criarUsuario('professor', 'Alberto')
    const turma = await criarTurma(prof, `Apagar ${unico()}`)
    await entrarPelaUI(page, prof)
    await page.getByRole('button', { name: `Opções da equipe ${turma.nome}` }).click()
    await page.getByRole('menuitem', { name: 'Excluir' }).click()
    await confirmarExclusao(page)
    await expect(page.getByRole('link', { name: `Abrir equipe ${turma.nome}` })).toHaveCount(0)
    await expect(chamar('GET', `/turmas/${turma.id}`, undefined, prof.token)).rejects.toThrow(/404/)
  })

  test('RF02/N08 - professor cria e publica uma autoavaliação com perguntas e alternativas', async ({ page }) => {
    const prof = await criarUsuario('professor', 'Alberto')
    const turma = await criarTurma(prof, `Estatística ${unico()}`)
    await entrarPelaUI(page, prof)
    await page.goto('/avaliacoes')

    const titulo = `Média, mediana e moda ${unico()}`
    await page.getByRole('button', { name: 'Criar formulário' }).first().click()
    await page.getByLabel('Nome do Formulário').fill(titulo)
    await page.getByLabel('Postar ao criar formulário').check()
    await page.getByLabel('Prazo para responder (opcional)').fill('31/12/30')
    await page.getByLabel('Liberar o gabarito para os alunos').check()

    // as alternativas são fixas (escala I/P/C); o professor só escreve o enunciado
    await page.getByRole('button', { name: '+ Adicionar' }).click()
    await page.getByRole('button', { name: 'Editar pergunta 1' }).click()
    await page.getByLabel('Enunciado da pergunta 1').fill('Qual é a média de 2 e 4?')
    await page.getByRole('button', { name: 'Salvar pergunta 1' }).click()
    await page.getByRole('button', { name: 'Criar', exact: true }).click()

    await expect(page.getByRole('link', { name: `Abrir formulário ${titulo}` })).toBeVisible()
    const [criado] = await chamar<Array<{ titulo: string; status: string; mostrarGabarito: boolean; prazo: string; perguntas: Array<{ enunciado: string; opcoes: string[] }> }>>('GET', `/formularios?turmaId=${turma.id}`, undefined, prof.token)
    expect(criado).toMatchObject({ titulo, status: 'aberto', mostrarGabarito: true })
    expect(criado?.perguntas).toHaveLength(1)
    expect(criado?.perguntas[0]).toMatchObject({ enunciado: 'Qual é a média de 2 e 4?' })
    expect(criado?.perguntas[0]?.opcoes).toHaveLength(4)
    expect(criado?.prazo).toMatch(/^2030-12-31|^2031-01-01/)
  })

  test('RF02 - não publica sem perguntas (mostra a regra do domínio)', async ({ page }) => {
    const prof = await criarUsuario('professor', 'Alberto')
    await criarTurma(prof)
    await entrarPelaUI(page, prof)
    await page.goto('/avaliacoes')
    await page.getByRole('button', { name: 'Criar formulário' }).first().click()
    await page.getByLabel('Nome do Formulário').fill('Sem perguntas')
    await page.getByLabel('Postar ao criar formulário').check()
    await page.getByRole('button', { name: 'Criar', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('ao menos uma pergunta')
  })

  test('RF02 - agenda um formulário para uma data futura', async ({ page }) => {
    const prof = await criarUsuario('professor', 'Alberto')
    const turma = await criarTurma(prof)
    await entrarPelaUI(page, prof)
    await page.goto('/avaliacoes')
    const titulo = `Agendado ${unico()}`
    await page.getByRole('button', { name: 'Criar formulário' }).first().click()
    await page.getByLabel('Nome do Formulário').fill(titulo)
    await page.getByLabel('Data de publicação').fill('01/01/30')
    await page.getByLabel('Horário').fill('08:30')
    await page.getByRole('button', { name: '+ Adicionar' }).click()
    await page.getByRole('button', { name: 'Editar pergunta 1' }).click()
    await page.getByLabel('Enunciado da pergunta 1').fill('Pergunta?')
    await page.getByRole('button', { name: 'Salvar pergunta 1' }).click()
    await page.getByRole('button', { name: 'Criar', exact: true }).click()
    await expect(page.getByRole('link', { name: `Abrir formulário ${titulo}` })).toBeVisible()
    const [f] = await chamar<Array<{ status: string }>>('GET', `/formularios?turmaId=${turma.id}`, undefined, prof.token)
    expect(f?.status).toBe('agendado')
  })

  test('RF02 - fecha, reabre, conclui e exclui um formulário pelo menu', async ({ page }) => {
    const prof = await criarUsuario('professor', 'Alberto')
    const turma = await criarTurma(prof)
    const form = await publicarFormulario(prof, turma.id, `Ciclo ${unico()}`)
    await entrarPelaUI(page, prof)
    await page.goto(`/equipes/${turma.id}`)
    const linha = page.getByRole('link', { name: `Abrir formulário ${form.titulo}` })
    const abrirMenu = () => page.getByRole('button', { name: `Opções do formulário ${form.titulo}` }).click()

    await expect(linha).toContainText('Aberto')
    await abrirMenu()
    await page.getByRole('menuitem', { name: 'Fechar formulário' }).click()
    await expect(linha).toContainText('Fechado')
    await abrirMenu()
    await page.getByRole('menuitem', { name: 'Reabrir formulário' }).click()
    await expect(linha).toContainText('Aberto')
    await abrirMenu()
    await page.getByRole('menuitem', { name: 'Marcar como concluído' }).click()
    await expect(linha).toContainText('Concluído')

    await abrirMenu()
    await page.getByRole('menuitem', { name: 'Excluir' }).click()
    await confirmarExclusao(page)
    await expect(linha).toHaveCount(0)
  })

  test('RF02 - editar formulário: perguntas de formulário publicado ficam travadas; título muda', async ({ page }) => {
    const prof = await criarUsuario('professor', 'Alberto')
    const turma = await criarTurma(prof)
    const form = await publicarFormulario(prof, turma.id, `Travado ${unico()}`)
    await entrarPelaUI(page, prof)
    await page.goto(`/avaliacoes/${form.id}`)
    await page.getByRole('button', { name: `Opções do formulário ${form.titulo}` }).click()
    await page.getByRole('menuitem', { name: 'Editar formulário' }).click()
    await expect(page.getByText('já publicados não podem ter as perguntas alteradas')).toBeVisible()
    await expect(page.getByRole('button', { name: '+ Adicionar' })).toHaveCount(0)
    await page.getByLabel('Nome do Formulário').fill(`${form.titulo} v2`)
    await page.getByRole('button', { name: 'Concluir' }).click()
    await expect(page.getByRole('heading', { name: `${form.titulo} v2` })).toBeVisible()
  })

  test('RF02 - rascunho pode ser editado e publicado', async ({ page }) => {
    const prof = await criarUsuario('professor', 'Alberto')
    const turma = await criarTurma(prof)
    const titulo = `Rascunho ${unico()}`
    const form = await chamar<{ id: string }>('POST', '/formularios', { titulo, turmaId: turma.id, perguntas: PERGUNTAS }, prof.token)
    await entrarPelaUI(page, prof)
    await page.goto(`/avaliacoes/${form.id}`)
    await page.getByRole('button', { name: `Opções do formulário ${titulo}` }).click()
    await page.getByRole('menuitem', { name: 'Publicar agora' }).click()
    await expect(page.getByText('Publicado em')).toBeVisible()
    await expect(page.getByText('Aberto', { exact: true }).first()).toBeVisible()
  })

  test('RF02 - professor vê o link de convite da equipe na aba Alunos', async ({ page }) => {
    const prof = await criarUsuario('professor', 'Alberto')
    const turma = await criarTurma(prof)
    await entrarPelaUI(page, prof)
    await page.goto(`/equipes/${turma.id}/alunos`)
    await expect(page.getByLabel('Link de convite')).toContainText(`/convite/${turma.codigoConvite}`)
  })

  test('RNF04 - professor não vê equipe de outro professor', async ({ page }) => {
    const dono = await criarUsuario('professor', 'Dono')
    const turma = await criarTurma(dono)
    const outro = await criarUsuario('professor', 'Outro')
    await entrarPelaUI(page, outro)
    await expect(page.getByRole('link', { name: `Abrir equipe ${turma.nome}` })).toHaveCount(0)
    await page.goto(`/equipes/${turma.id}`)
    await expect(page).toHaveURL(/\/equipes$/)
  })
})

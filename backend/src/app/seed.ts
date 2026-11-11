import type { Container } from './container.ts'

export const SENHA_DEMO = 'senha1234'

const PERGUNTAS = [
  { enunciado: 'Qual é a fórmula da média aritmética simples?', tipo: 'unica' as const, opcoes: ['Soma dos valores dividida pelo número de valores (Σx / n)', 'Soma dos valores multiplicada pelo número de valores (Σx * n)', 'Raiz quadrada da soma dos valores (√Σx)'], gabarito: [0] },
  { enunciado: 'O que caracteriza a moda de um conjunto de dados?', tipo: 'multipla' as const, opcoes: ['É o valor que aparece com mais frequência', 'É o valor médio dos dados', 'É o valor central quando os dados estão ordenados'], gabarito: [0] },
  { enunciado: 'Dados os valores 90, 70, 65. Qual a média?', tipo: 'unica' as const, opcoes: ['75', '70', '80'], gabarito: [0] },
]

/** Dados de demonstração alinhados ao front (convites `pdm-2026` e `ea-2026`). Só roda em banco vazio. */
export async function semear({ uc, infra }: Container): Promise<boolean> {
  if (await infra.usuarios.porEmail('alberto@hastyhelp.dev')) return false

  const cadastrar = async (nome: string, papel: 'professor' | 'aluno', email: string) => {
    const { usuario } = await uc.identidade.cadastrar.executar({ nome, email, senha: SENHA_DEMO, papel })
    return { id: usuario.id, papel }
  }
  const prof = await cadastrar('Alberto', 'professor', 'alberto@hastyhelp.dev')
  const alunos = [
    await cadastrar('Sarah Chen', 'aluno', 'sarah.chen@hastyhelp.dev'),
    await cadastrar('James Park', 'aluno', 'james.park@hastyhelp.dev'),
    await cadastrar('Michael Torres', 'aluno', 'michael.torres@hastyhelp.dev'),
    await cadastrar('Lisa Anderson', 'aluno', 'lisa.anderson@hastyhelp.dev'),
  ]

  const criarTurma = async (nome: string, periodo: string, cor: string, codigo?: string) => {
    const t = await uc.turmas.criar.executar(prof, { nome, periodo, cor })
    if (codigo) {
      const salva = await infra.turmas.porId(t.id)
      if (salva) await infra.turmas.salvar({ ...salva, codigoConvite: codigo })
    }
    return t
  }
  await criarTurma('Desenvolvimento Web Moderno', '2026/02', '#6AD890')
  await criarTurma('Banco de Dados Relacional', '2026/01', '#f27c7e')
  await criarTurma('Engenharia de Software', '2026/02', '#b98fcb')
  const pdm = await criarTurma('Programação para Dispositivos Móveis', '2026/02', '#8fcbc5', 'pdm-2026')
  const ea = await criarTurma('Estatística Aplicada', '2026/02', '#b98fcb', 'ea-2026')
  for (const a of alunos) {
    await infra.turmas.matricular(pdm.id, a.id)
    await infra.turmas.matricular(ea.id, a.id)
  }

  const [sarah, james, , lisa] = alunos as [typeof alunos[number], typeof alunos[number], typeof alunos[number], typeof alunos[number]]
  const publicar = (titulo: string, turmaId: string, extra: object = {}) =>
    uc.formularios.criar.executar(prof, { titulo, turmaId, postar: true, perguntas: PERGUNTAS, ...extra })

  const diag = await publicar('Diagnóstico', pdm.id, { mostrarGabarito: false })
  const ativ = await publicar('Atividade 1', pdm.id, { mostrarGabarito: true })
  const media = await publicar('Média, mediana e moda', pdm.id, { prazo: '2026-12-20', mostrarGabarito: true })
  await uc.formularios.criar.executar(prof, { titulo: 'Rascunho: Distribuições', turmaId: ea.id, perguntas: PERGUNTAS })
  await publicar('Estatística descritiva', ea.id)

  const responder = async (ator: typeof sarah, form: typeof diag, escolhas: number[][], observacao?: string) => {
    for (const [i, p] of form.perguntas.entries()) await uc.respostas.salvar.executar(ator, form.id, p.id, escolhas[i] ?? [0])
    await uc.respostas.enviar.executar(ator, form.id, observacao)
  }
  await responder(sarah, diag, [[1], [0], [1]], 'Acharia útil mais exemplos com conjuntos de dados reais.')
  await responder(sarah, ativ, [[0], [0], [1]])
  await responder(james, diag, [[0], [0], [0]], 'Acharia útil mais exemplos com conjuntos de dados reais.')
  await responder(james, ativ, [[1], [0], [1]])
  await uc.respostas.salvar.executar(lisa, media.id, media.perguntas[0]!.id, [0])
  return true
}

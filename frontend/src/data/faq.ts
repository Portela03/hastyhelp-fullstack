import type { Papel } from './aluno'

/** Público-alvo de uma pergunta da FAQ. */
export type PublicoFaq = 'aluno' | 'professor' | 'todos'

export interface PerguntaFaq {
  id: string
  pergunta: string
  resposta: string
  publico: PublicoFaq
}

/** Filtra as perguntas da FAQ pelo papel do usuário. */
export function filtrarFaqPorPapel(perguntas: PerguntaFaq[], papel: Papel): PerguntaFaq[] {
  return perguntas.filter((p) => p.publico === 'todos' || p.publico === papel)
}

/** Filtra as perguntas da FAQ por termo de busca (case-insensitive, sem acentos). */
export function filtrarFaqPorBusca(perguntas: PerguntaFaq[], termo: string): PerguntaFaq[] {
  const normalizado = normalizar(termo)
  if (!normalizado) return perguntas
  return perguntas.filter(
    (p) => normalizar(p.pergunta).includes(normalizado) || normalizar(p.resposta).includes(normalizado),
  )
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/** Rótulos dos filtros de público. */
export const ROTULO_PUBLICO: Record<PublicoFaq, string> = {
  aluno: 'Aluno',
  professor: 'Professor',
  todos: 'Todos',
}

/** Perguntas iniciais da FAQ (Anexo A do Plano de Suporte). */
export const FAQ_INICIAL: PerguntaFaq[] = [
  {
    id: 'faq-01',
    pergunta: 'Como entro na minha turma?',
    resposta:
      'O professor envia um link de convite. Abra o link e faça o cadastro com nome, e-mail e senha. Se o link aparecer como inválido ou expirado, peça um novo ao professor.',
    publico: 'aluno',
  },
  {
    id: 'faq-02',
    pergunta: 'Onde vejo as autoavaliações liberadas?',
    resposta: 'No menu Autoavaliações (todas as turmas) ou dentro da turma, em Turmas.',
    publico: 'aluno',
  },
  {
    id: 'faq-03',
    pergunta: 'Preciso responder tudo de uma vez?',
    resposta:
      'Não. Enquanto a autoavaliação estiver aberta, suas respostas são salvas automaticamente como rascunho e o status passa a Em andamento.',
    publico: 'aluno',
  },
  {
    id: 'faq-04',
    pergunta: 'Posso alterar uma autoavaliação depois de enviar?',
    resposta:
      'Não. Por isso há uma etapa de revisão antes do envio. O envio só é liberado quando todas as perguntas estão respondidas.',
    publico: 'aluno',
  },
  {
    id: 'faq-05',
    pergunta: 'Por que não vejo o gabarito?',
    resposta:
      'O professor decide quando liberar o gabarito. Sua nota, compreensão e evolução aparecem sempre.',
    publico: 'aluno',
  },
  {
    id: 'faq-06',
    pergunta: 'O que significam Pendente, Em andamento, Respondido e Encerrado?',
    resposta:
      'Pendente: ainda não começou. Em andamento: há respostas salvas. Respondido: já foi enviada. Encerrado: o prazo passou sem resposta.',
    publico: 'aluno',
  },
  {
    id: 'faq-07',
    pergunta: 'O que significam I, P e C?',
    resposta:
      'São os níveis de dificuldade mostrados no resultado. O significado oficial está sendo definido pelo docente da disciplina e será publicado no glossário.',
    publico: 'aluno',
  },
  {
    id: 'faq-08',
    pergunta: 'Como crio uma equipe e convido os alunos?',
    resposta:
      'Em Equipes, use Criar equipe e informe nome e período letivo. Os alunos entram pelo link de convite ou pela aba Alunos da equipe.',
    publico: 'professor',
  },
  {
    id: 'faq-09',
    pergunta: 'Como crio e publico uma autoavaliação?',
    resposta:
      'Em Avaliações, use Criar formulário: informe nome, período letivo, data e horário de publicação (ou marque "Postar ao criar formulário") e adicione as perguntas. O status pode ser Ativo, Agendado, Inativo ou Rascunho.',
    publico: 'professor',
  },
  {
    id: 'faq-10',
    pergunta: 'Como vejo quem respondeu e onde a turma tem dificuldade?',
    resposta:
      'Abra o formulário e use as abas Alunos e Resumo. Para a visão de todas as turmas, use Métricas.',
    publico: 'professor',
  },
  {
    id: 'faq-11',
    pergunta: 'Como lembro quem ainda não respondeu?',
    resposta: 'Na tela do formulário, use o botão Notificar pendentes na barra superior.',
    publico: 'professor',
  },
  {
    id: 'faq-12',
    pergunta: 'Como mudo o tema ou as notificações por e-mail?',
    resposta:
      'Clique no cartão com seu nome na parte inferior do menu lateral para abrir o perfil. Ali você ajusta notificações por e-mail, tema (claro, escuro ou alto contraste) e o widget de acessibilidade.',
    publico: 'todos',
  },
  {
    id: 'faq-13',
    pergunta: 'A pesquisa de satisfação é anônima?',
    resposta:
      'Sim. O sistema guarda apenas se você é aluno ou professor, as notas e o comentário. Nome e e-mail não são gravados.',
    publico: 'todos',
  },
  {
    id: 'faq-14',
    pergunta: 'Esqueci minha senha. O que faço?',
    resposta:
      'Use o link "Esqueceu a senha?" na tela de login para solicitar a redefinição por e-mail.',
    publico: 'todos',
  },
]


# HastyHelp — Spec do Backend (SDD)

Fonte de verdade do backend. **Spec primeiro**: cada regra (`R-xx`) e cada rota abaixo vira um teste com o mesmo ID no nome (`it('R-12 …')`). Mudou comportamento → muda esta spec antes do código.

- **Stack:** Node 24 · TypeScript strict · Express 5 · PostgreSQL 16 · Docker Compose · Vitest + Supertest.
- **Pasta:** `backend/` (pacote próprio). API em `/api`, porta `3333`.
- **Origem das funcionalidades:** telas do front (`docs/SPEC-TELAS.md`, `frontend/src/pages/*`) e requisitos RF/RNF de `CLAUDE.md`.
- **Idioma:** domínio em pt-BR sem acento nos identificadores; mensagens de erro em pt-BR com acento.

## 1. Arquitetura (DDD)

```
backend/src/
  shared/        Result/erros de domínio, Id, relógio, tipos comuns
  contexts/
    identidade/    Usuario, Email, Senha, Preferencias · cadastro, login, perfil
    turmas/        Turma, Matricula, PeriodoLetivo, convite · CRUD, ocultar, entrar por convite
    autoavaliacoes/ Formulario (agregado), Pergunta, StatusFormulario · CRUD, ciclo de vida
    respostas/     Envio (rascunho → enviado) · salvar resposta, enviar, nota, compreensão
    analise/       Resumos e métricas (somente leitura) · turma, formulário, alunos, métricas
      domain/ application/ infra/ http/
  app/           composição (container), servidor Express, migrações, seed
```

Regras de dependência: `http → application → domain`; `infra` implementa interfaces do domínio. `domain/` é TypeScript puro. Contextos conversam por Id e por interfaces públicas (`index.ts`). Persistência: repositórios com implementação **em memória** (testes unitários e de API) e **PostgreSQL** (produção; testado contra um Postgres real no Docker).

## 2. Modelo de dados (PostgreSQL)

| Tabela | Colunas principais |
|---|---|
| `usuarios` | id, nome, email (único), senha_hash, papel (`professor`/`aluno`), preferencias (jsonb), criado_em |
| `turmas` | id, nome, sigla, cor, periodo, docente_id → usuarios, oculta, codigo_convite (único), criada_em |
| `matriculas` | turma_id, aluno_id (PK composta) |
| `formularios` | id, titulo, turma_id, status, publicar_em, publicado_em, prazo, mostrar_gabarito, criado_em |
| `perguntas` | id, formulario_id, ordem, enunciado, tipo (`unica`/`multipla`), opcoes (jsonb), gabarito (jsonb) |
| `envios` | id, formulario_id, aluno_id, turma_id, status (`rascunho`/`enviado`), respostas (jsonb), nota, compreensao, observacao, enviado_em, atualizado_em · único (formulario_id, aluno_id) |

Exclusões em cascata: turma → matrículas, formulários → perguntas, envios.

## 3. Autenticação e autorização (RF01, RNF03, RNF04)

- Login por e-mail + senha; senha com hash (bcrypt). Sessão por **JWT** (`Authorization: Bearer`), validade 8 h.
- Papéis `professor` e `aluno`. Rotas do professor exigem papel professor; `/aluno/*` exige papel aluno (403 caso contrário).
- Autorização é regra de **aplicação**, não só de rota: o professor só acessa turmas/formulários que leciona; o aluno só acessa turmas em que está matriculado e as próprias respostas.

## 4. Regras de negócio

### Identidade
- **R-01** E-mail válido, normalizado em minúsculas; único (409 `EMAIL_EM_USO`).
- **R-02** Senha com no mínimo 8 caracteres.
- **R-03** Cadastro exige nome, e-mail, senha e papel. Senha e confirmação devem coincidir quando a confirmação é enviada.
- **R-04** Aluno que se cadastra com `codigoConvite` válido é matriculado na turma; código inexistente → 422 `CONVITE_INVALIDO` e o cadastro **não** é feito.
- **R-05** Login com credenciais erradas ou `papel` diferente do cadastrado → 401 `CREDENCIAIS_INVALIDAS` (mesma mensagem para e-mail inexistente e senha errada).
- **R-06** Preferências do perfil (`notificacoesEmail`, `conclusaoFormularios`, `publicacaoFormularios`, `metricasTrimestrais`, `metricasSemestrais`, `acessibilidade`, `tema: claro|escuro|alto-contraste`) são persistidas por usuário; atualização parcial.

### Turmas
- **R-10** Turma exige nome e período letivo no formato `AAAA/NN` (ex.: `2026/02`).
- **R-11** Sigla: até 3 letras maiúsculas; se não informada, é gerada das iniciais do nome. Cor: hex `#RRGGBB` (padrão da paleta).
- **R-12** Cada turma tem `codigoConvite` único gerado na criação; o aluno entra por ele.
- **R-13** Só o docente dono edita, oculta/desoculta ou exclui a turma (403 `ACESSO_NEGADO`).
- **R-14** Ocultar não apaga nada: a turma some da lista principal e aparece em "ocultas" (`oculta: true`).
- **R-15** Excluir turma remove matrículas, formulários e envios.
- **R-16** Matricular o mesmo aluno duas vezes é idempotente.
- **R-17** `GET /auth/convites/:codigo` devolve nome/período da turma sem exigir login; código inválido → 404.

### Formulários (autoavaliações)
- **R-20** Título obrigatório; turma deve ser do professor.
- **R-21** Status: `rascunho`, `agendado`, `aberto`, `fechado`, `concluido`.
- **R-22** Criação: `postar=true` → `aberto`; senão `publicarEm` informado → `agendado`; senão `rascunho`.
- **R-23** Só publica (`aberto`) com ≥ 1 pergunta (422 `SEM_PERGUNTAS`).
- **R-24** `publicarEm` precisa estar no futuro ao agendar (422 `DATA_NO_PASSADO`).
- **R-25** Transições permitidas: `rascunho→aberto|agendado` · `agendado→aberto|rascunho` · `aberto→fechado|concluido` · `fechado→aberto|concluido` · `concluido` é final. Outras → 422 `TRANSICAO_INVALIDA`.
- **R-26** Agendado cujo `publicarEm` já passou é tratado como `aberto` ao ser lido (materializado no primeiro acesso).
- **R-27** Pergunta: enunciado obrigatório; ≥ 2 opções; `tipo` `unica`|`multipla`; gabarito (opcional) com índices válidos; `unica` aceita no máximo 1 índice.
- **R-28** Perguntas só podem ser alteradas em `rascunho`/`agendado` (RNF05: formulário publicado é imutável). Título, prazo e `mostrarGabarito` podem mudar sempre.
- **R-29** Excluir formulário remove perguntas e envios; só o docente dono.
- **R-30** Listagem aceita filtros `turmaId`, `status`, `busca` e devolve por formulário: `respostas` (envios enviados), `total` (alunos da turma), `dominioMedio`, `maiorDificuldade`.

### Respostas (RF03, RF04, N04, N05)
- **R-40** Aluno vê só formulários das turmas matriculadas com status `aberto`, `fechado` ou `concluido` (nunca rascunho/agendado).
- **R-41** Status do ponto de vista do aluno: sem envio → `pendente`; envio rascunho → `andamento`; envio enviado → `respondido`; formulário não aberto (ou prazo vencido) e sem envio enviado → `encerrado`.
- **R-42** Salvar resposta só se o formulário aceita respostas (`aberto` e prazo não vencido), aluno matriculado e envio ainda não enviado (422 `FORA_DO_PRAZO` / 409 `ENVIO_JA_ENVIADO`).
- **R-43** `marcadas` com índices válidos; `unica` aceita no máximo 1.
- **R-44** Enviar exige **todas** as perguntas respondidas (422 `RESPOSTAS_INCOMPLETAS`). Resposta enviada é **imutável**.
- **R-45** Nota = acertos ÷ perguntas com gabarito × 10, uma casa decimal; sem gabarito → sem nota ("em análise").
- **R-46** Nível de compreensão (`I`/`P`/`C`) derivado da nota: ≥ 8 → `I`; ≥ 6 → `P`; senão `C` *(assumido; confirmar significado com a equipe)*.
- **R-47** Gabarito só é enviado ao aluno quando `mostrarGabarito` e o envio está enviado ou o formulário encerrou.
- **R-48** Envio guarda aluno, turma e formulário (RF04) e aceita `observacao` opcional.

### Análise (RF05–RF08)
- **R-50** *Maior dificuldade* de um conjunto de envios = nível mais frequente entre `I/P/C`; empate resolve para o pior (`C` > `P` > `I`); sem envios → `null`.
- **R-51** *Domínio médio* = média de `nota × 10` dos envios enviados com nota (inteiro arredondado); sem dados → `null`.
- **R-52** *Taxa de resposta* = envios enviados ÷ (alunos × formulários publicados); 0 se denominador 0.
- **R-53** Resumo do formulário: respondidos/total, taxa, nota média, observações, distribuição I/P/C (%), maior dificuldade e *dificuldades gerais* (por pergunta, nº de alunos que erraram, ordenado desc.).
- **R-54** Alunos do formulário: `responderam` (nome, nota, nível), `visualizaram` (em andamento), `pendentes`.
- **R-55** Alunos da turma: domínio médio por aluno e `enviados / publicados`.
- **R-56** Resumo da turma: engajamento (alunos que enviaram tudo), nota média, distribuição I/P/C, evolução (domínio médio dos 5 últimos formulários) e maior dificuldade por formulário.
- **R-57** Métricas do professor aceitam filtros `periodo`, `turmaId`, `alunoId`, `formularioId`, `status`, `desde`; devolvem desempenho médio, taxa de respostas (`x de y`), formulários concluídos, maior dificuldade, desempenho por turma e evolução mensal.
- **R-58** *Notificar pendentes*: registra notificação para cada aluno pendente do formulário (porta `Notificador`) e devolve a quantidade.

## 5. API

Erros: `{ "erro": { "codigo": "…", "mensagem": "…" } }` · 400 validação · 401 sem sessão · 403 acesso negado · 404 inexistente · 409 conflito · 422 regra de negócio.

| Método | Rota | Papel | Regras |
|---|---|---|---|
| GET | `/api/health` | — | — |
| POST | `/api/auth/cadastro` | — | R-01…R-04 |
| POST | `/api/auth/login` | — | R-05 |
| GET | `/api/auth/convites/:codigo` | — | R-17 |
| GET | `/api/perfil` | ambos | — |
| PATCH | `/api/perfil/preferencias` | ambos | R-06 |
| GET/POST | `/api/turmas` | prof | R-10…R-12 |
| GET/PATCH/DELETE | `/api/turmas/:id` | prof | R-13, R-14, R-15 |
| GET | `/api/turmas/:id/alunos` | prof | R-55 |
| GET | `/api/turmas/:id/resumo` | prof | R-56 |
| GET/POST | `/api/formularios` | prof | R-20…R-23, R-30 |
| GET/PATCH/DELETE | `/api/formularios/:id` | prof | R-25…R-29 |
| GET | `/api/formularios/:id/alunos` | prof | R-54 |
| GET | `/api/formularios/:id/resumo` | prof | R-53 |
| POST | `/api/formularios/:id/notificar-pendentes` | prof | R-58 |
| GET | `/api/metricas` | prof | R-57 |
| GET | `/api/aluno/turmas` | aluno | R-40 |
| GET | `/api/aluno/autoavaliacoes` | aluno | R-40, R-41, R-47 |
| PUT | `/api/aluno/autoavaliacoes/:id/respostas/:perguntaId` | aluno | R-42, R-43 |
| POST | `/api/aluno/autoavaliacoes/:id/enviar` | aluno | R-44…R-48 |

## 6. Fora de escopo (o front ainda não tem fluxo)
Recuperação de senha ("Esqueceu a senha?"), "Ver como aluno", ações por aluno (`...`), remoção de aluno da turma, envio real de e-mail (usa a porta `Notificador`, implementação de log).

## 7. Estratégia de testes
1. **Domínio/aplicação** (Vitest, repositórios em memória, relógio fixo): um `*.test.ts` ao lado de cada caso de uso, nomeado com o `R-xx`.
2. **API** (Supertest sobre o app com repositórios em memória): contrato HTTP, status e autorização.
3. **Repositórios Postgres**: testes de contrato contra o Postgres do Docker (`npm run test:db`).
4. **E2E (Playwright)** no front real + API real + Postgres: `RF01`, `RF02`, `RF03/N05`, `RF05`.

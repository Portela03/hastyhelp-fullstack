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
    notificacoes/  Notificacao · emissão respeitando preferências, sino do usuário
    analise/       Resumos e métricas (somente leitura) · turma, formulário, alunos, métricas
      domain/ application/ infra/ http/
  app/           composição (container), servidor Express, migrações, seed
```

Regras de dependência: `http → application → domain`; `infra` implementa interfaces do domínio. `domain/` é TypeScript puro. Contextos conversam por Id e por interfaces públicas (`index.ts`). Persistência: repositórios com implementação **em memória** (testes unitários e de API) e **PostgreSQL** (produção; testado contra um Postgres real no Docker).

## 2. Modelo de dados (PostgreSQL)

| Tabela | Colunas principais |
|---|---|
| `usuarios` | id, nome, email (único), senha_hash, papel (`professor`/`aluno`), preferencias (jsonb), criado_em |
| `turmas` | id, nome, sigla, cor, periodo, docente_id → usuarios, oculta, aprovacao_manual, codigo_convite (único), criada_em |
| `matriculas` | turma_id, aluno_id (PK composta) |
| `entradas_turma` | id, turma_id, aluno_id, origem (`codigo`/`convite`), status (`pendente`/`aceita`/`recusada`/`cancelada`), criada_em, resolvida_em · único pendente por (turma_id, aluno_id) |
| `formularios` | id, titulo, turma_id, status, publicar_em, publicado_em, prazo, mostrar_gabarito, criado_em |
| `perguntas` | id, formulario_id, ordem, enunciado, tipo (`unica`/`multipla`), opcoes (jsonb), gabarito (jsonb) |
| `envios` | id, formulario_id, aluno_id, turma_id, status (`rascunho`/`enviado`), respostas (jsonb), nota, compreensao, observacao, observacao_oculta, resposta_professor, respondida_em, enviado_em, atualizado_em · único (formulario_id, aluno_id) |
| `sessoes` | id, usuario_id, refresh_hash, expira_em, revogada_em, criada_em |
| `redefinicoes_senha` | id, usuario_id, token_hash, expira_em, usada_em, criada_em |
| `notificacoes` | id, usuario_id, tipo, titulo, mensagem, link, criada_em, lida_em |
| `caixa_de_saida` | id, para, assunto, corpo, link, criada_em (e-mails que seriam enviados; ver R-75) |

Exclusões em cascata: turma → matrículas, formulários → perguntas, envios.

## 3. Autenticação e autorização (RF01, RNF03, RNF04)

- Login por e-mail + senha; senha com hash (bcrypt). Sessão = **access token JWT** curto (15 min, `Authorization: Bearer`, carrega o `sid` da sessão) + **refresh token** opaco (30 dias, guardado só como hash). Toda requisição autenticada confere se a sessão ainda está ativa, então revogar a sessão invalida o access token na hora (R-70…R-73).
- Papéis `professor` e `aluno`. Rotas do professor exigem papel professor; `/aluno/*` exige papel aluno (403 caso contrário).
- Autorização é regra de **aplicação**, não só de rota: o professor só acessa turmas/formulários que leciona; o aluno só acessa turmas em que está matriculado e as próprias respostas.

## 4. Regras de negócio

### Identidade
- **R-01** E-mail válido, normalizado em minúsculas; único (409 `EMAIL_EM_USO`).
- **R-02** Senha com no mínimo 8 caracteres.
- **R-03** Cadastro exige nome, e-mail, senha e papel. Senha e confirmação devem coincidir quando a confirmação é enviada.
- **R-04** Aluno que se cadastra com `codigoConvite` válido é matriculado na turma (ou fica com solicitação pendente se a turma tem `aprovacaoManual`, R-103); código inexistente → 422 `CONVITE_INVALIDO` e o cadastro **não** é feito.
- **R-05** Login com credenciais erradas ou `papel` diferente do cadastrado → 401 `CREDENCIAIS_INVALIDAS` (mesma mensagem para e-mail inexistente e senha errada).
- **R-06** Preferências do perfil (`notificacoesEmail`, `conclusaoFormularios`, `publicacaoFormularios`, `metricasTrimestrais`, `metricasSemestrais`, `acessibilidade`, `tema: claro|escuro|alto-contraste`) são persistidas por usuário; atualização parcial.

### Sessão e senha (RF01, RNF03)
- **R-70** Login cria uma sessão e devolve `token` (access, 15 min), `refreshToken` (opaco, 30 dias) e o usuário. Só o hash do refresh é guardado.
- **R-71** `POST /auth/refresh` troca um refresh válido por um novo par (rotação: o refresh anterior deixa de valer). Refresh desconhecido, expirado ou de sessão revogada → 401 `SESSAO_INVALIDA`.
- **R-72** `POST /auth/logout` (com o refresh) revoga a sessão; o access token dessa sessão passa a ser recusado (401) imediatamente.
- **R-73** Redefinir a senha revoga todas as sessões do usuário.
- **R-75** `POST /auth/esqueci-senha` responde sempre igual (202), exista ou não a conta (sem enumeração de e-mails). Se existe, gera token de redefinição (30 min, uso único, só o hash é guardado) e registra a mensagem com o link na **caixa de saída** (não há envio de e-mail; em desenvolvimento ela é lida em `GET /dev/caixa-de-saida?para=`, habilitado só com `EXPOR_CAIXA_DE_SAIDA=true`). O token nunca volta na resposta ao solicitante.
- **R-76** `POST /auth/redefinir-senha` com token válido e senha ≥ 8 (R-02, confirmação opcional como R-03) troca a senha e consome o token. Token inexistente, expirado ou já usado → 422 `TOKEN_INVALIDO`.
- **R-77** O professor gera um link de redefinição para um aluno matriculado em turma sua (`POST /turmas/:id/alunos/:alunoId/redefinir-senha`); turma de outro → 403; aluno que não está na turma → 404. Devolve o link ao professor, que o repassa ao aluno.

### Turmas
- **R-10** Turma exige nome e período letivo no formato `AAAA/NN` (ex.: `2026/02`).
- **R-11** Sigla: até 3 letras maiúsculas; se não informada, é gerada das iniciais do nome. Cor: hex `#RRGGBB` (padrão da paleta).
- **R-12** Cada turma tem `codigoConvite` único gerado na criação; o aluno entra por ele.
- **R-13** Só o docente dono edita, oculta/desoculta ou exclui a turma (403 `ACESSO_NEGADO`).
- **R-14** Ocultar não apaga nada: a turma some da lista principal e aparece em "ocultas" (`oculta: true`).
- **R-15** Excluir turma remove matrículas, formulários e envios.
- **R-16** Matricular o mesmo aluno duas vezes é idempotente.
- **R-17** `GET /auth/convites/:codigo` devolve nome, período e `aprovacaoManual` da turma sem exigir login; código inválido → 404.
- **R-18** O docente dono remove um aluno da turma (`DELETE /turmas/:id/alunos/:alunoId`): somem a matrícula e os envios dele **nessa turma**; o aluno deixa de ver a turma e seus formulários. Aluno que não está na turma → 404; outro professor → 403.

### Entrada em turmas (RF01, RF02) — membros por código e por e-mail
Motivação: o link de convite só servia para quem ainda não tinha conta; quem já estava logado ficava preso a uma única turma. Agora um aluno com conta entra em quantas turmas quiser, por **código**, por **convite do professor** ou pelo **link** (já logado).

- **R-100** O código da turma tem **6 caracteres** (letras minúsculas e dígitos sem ambiguidade). A busca ignora maiúsculas/minúsculas e espaços nas pontas; turmas antigas continuam valendo com o código que já têm. Código inexistente → 404 `CONVITE_INVALIDO`.
- **R-101** `POST /aluno/turmas/entrar { codigo }`: aluno logado entra numa turma pelo código. Modo automático (padrão) → matrícula imediata (`{ status: 'matriculado', turma }`, 201). Já matriculado → 409 `JA_NA_TURMA`. Professor → 403.
- **R-102** A turma tem `aprovacaoManual` (padrão `false`). Só o docente dono altera (R-13), via `PATCH /turmas/:id`. O DTO do aluno não expõe o código nem essa flag.
- **R-103** Com `aprovacaoManual`, entrar pelo código (ou cadastrar-se por link, R-04) cria uma **solicitação pendente** (`{ status: 'pendente', turma }`, 202) em vez de matricular, e notifica o docente (`solicitacao-entrada`). Pedir de novo enquanto pendente → 409 `SOLICITACAO_PENDENTE`. Depois de recusada, o aluno pode pedir de novo.
- **R-104** `GET /turmas/:id/entradas` (docente dono): `{ solicitacoes, convites }` pendentes, cada item com `id`, `aluno { id, nome, email }` e `criadaEm`.
- **R-105** `POST /turmas/:id/entradas/:entradaId/aceitar|recusar` (docente dono) só para **solicitações** pendentes. Entrada de outra turma ou inexistente → 404 `ENTRADA_NAO_ENCONTRADA`; já resolvida → 409 `ENTRADA_JA_RESOLVIDA`; é um convite → 422 `ORIGEM_INVALIDA`.
- **R-106** Aceitar matricula o aluno (R-16 idempotente) e notifica o aluno (`entrada-resolvida`); recusar apenas notifica.
- **R-107** `GET /turmas/:id/alunos-para-convite?busca=` (docente dono): procura **alunos** cadastrados por nome ou e-mail (sem diferenciar maiúsculas/acentos), mínimo 3 caracteres (senão 422 `BUSCA_CURTA`), no máximo 10 resultados, excluindo quem já está na turma. Cada resultado traz `id`, `nome`, `email` e `convidado` (há convite pendente). Professores nunca aparecem.
- **R-108** `POST /turmas/:id/convites { alunoId }` (docente dono): cria convite pendente (201 `{ id }`) e notifica o aluno (`convite-turma`). Aluno inexistente (ou que não é aluno) → 404 `ALUNO_NAO_ENCONTRADO`; já na turma → 409 `JA_NA_TURMA`; convite pendente → 409 `CONVITE_JA_ENVIADO`; o aluno já pediu para entrar → 409 `SOLICITACAO_PENDENTE`.
- **R-109** `GET /aluno/convites`: convites pendentes **do próprio aluno** (turma, docente, data). Nunca os de outros alunos.
- **R-110** `POST /aluno/convites/:id/aceitar|recusar`: aceitar matricula e notifica o docente (`entrada-resolvida`); recusar notifica o docente. Convite de outro aluno ou inexistente → 404 `ENTRADA_NAO_ENCONTRADA`; já resolvido → 409 `ENTRADA_JA_RESOLVIDA`.
- **R-111** `DELETE /turmas/:id/entradas/:entradaId` (docente dono) cancela um **convite** pendente (o aluno deixa de vê-lo). Solicitação → 422 `ORIGEM_INVALIDA`.
- **R-112** Excluir a turma apaga suas entradas (cascata). Remover o aluno (R-18) ou ele sair da equipe não bloqueia novo convite/entrada depois.
- **R-113** Notificações novas: `convite-turma` (aluno), `solicitacao-entrada` (docente), `entrada-resolvida` (quem aguardava). Respeitam `notificacoesEmail` como as demais (R-81…R-84); convites e pedidos pendentes também aparecem nas telas, então não dependem do sino.
- **R-114** Front: `/convite/:codigo` mostra a turma; sem conta → cadastro (ou login que volta ao convite); já logado como aluno → botão "Entrar na equipe" (R-101).

### Formulários (autoavaliações)
- **R-20** Título obrigatório; turma deve ser do professor.
- **R-21** Status: `rascunho`, `agendado`, `aberto`, `fechado`, `concluido`.
- **R-22** Criação: `postar=true` → `aberto`; senão `publicarEm` informado → `agendado`; senão `rascunho`.
- **R-23** Só publica (`aberto`) com ≥ 1 pergunta (422 `SEM_PERGUNTAS`).
- **R-24** `publicarEm` precisa estar no futuro ao agendar (422 `DATA_NO_PASSADO`).
- **R-25** Transições permitidas: `rascunho→aberto|agendado` · `agendado→aberto|rascunho` · `aberto→fechado|concluido` · `fechado→aberto|concluido` · `concluido` é final. Outras → 422 `TRANSICAO_INVALIDA`.
- **R-26** Agendado cujo `publicarEm` já passou é tratado como `aberto` ao ser lido (materializado no primeiro acesso).
- **R-27** Pergunta: enunciado obrigatório; ≥ 2 opções; `tipo` `unica`|`multipla`; gabarito (opcional) com índices válidos; `unica` aceita no máximo 1 índice. A opção fixa de autoavaliação tem 4 alternativas: interpretação (`I`), procedimento (`P`), cálculo (`C`) e ausência de resposta, sem categoria IPC. Todas as opções podem ser marcadas na resposta.
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
- **R-46** Nível de compreensão (`I`/`P`/`C`) derivado das opções IPC marcadas pelo aluno na autoavaliação; quando houver mais de uma categoria, prevalece a pior (`C` > `P` > `I`). Sem categoria marcada (inclusive quando só marcou "Não tive tempo / Deixei em branco"), não há nível. Fora da opção fixa, o nível continua derivado da nota: ≥ 8 → `I`; ≥ 6 → `P`; senão `C` *(assumido; confirmar significado com a equipe)*.
- **R-47** Gabarito só é enviado ao aluno quando `mostrarGabarito` e o envio está enviado ou o formulário encerrou.
- **R-48** Envio guarda aluno, turma e formulário (RF04), aceita `observacao` opcional e uma `notaGeral` em escala de 0 a 10, em intervalos de 0,5. Esse valor é a nota final da autoavaliação e alimenta “Minha nota”, médias e evolução. A interface exige o valor antes do envio; a API aceita ausência para compatibilidade com envios existentes e rejeita valores fora da escala ou com intervalo inferior a 0,5 (`NOTA_GERAL_INVALIDA`).

### Análise (RF05–RF08)
- **R-50** *Maior dificuldade* de um conjunto de envios = nível mais frequente entre `I/P/C`; empate resolve para o pior (`C` > `P` > `I`); sem envios → `null`.
- **R-51** *Domínio médio* = média de `nota × 10` dos envios enviados com nota (inteiro arredondado); sem dados → `null`.
- **R-52** *Taxa de resposta* = envios enviados ÷ (alunos × formulários publicados); 0 se denominador 0.
- **R-53** Resumo do formulário: respondidos/total, taxa, nota média, observações (uma por envio: aluno, texto, resposta, oculta; as ocultas não entram na contagem), distribuição I/P/C (%), maior dificuldade e *dificuldades gerais* (por pergunta, nº de alunos que erraram, ordenado desc.).
- **R-54** Alunos do formulário: `responderam` (nome, nota, nível), `visualizaram` (em andamento), `pendentes`.
- **R-55** Alunos da turma: domínio médio por aluno e `enviados / publicados`.
- **R-56** Resumo da turma: engajamento (alunos que enviaram tudo), nota média, distribuição I/P/C, evolução (domínio médio dos 5 últimos formulários) e maior dificuldade por formulário.
- **R-57** Métricas do professor aceitam filtros `periodo`, `turmaId`, `alunoId`, `formularioId`, `status`, `desde`; devolvem desempenho médio, taxa de respostas (`x de y`), formulários concluídos, maior dificuldade, desempenho por turma e evolução mensal.
- **R-58** *Notificar pendentes*: cria um lembrete (R-82) para cada aluno que ainda não enviou e devolve quantos foram notificados.
- **R-90** Respostas individuais (N09): o docente dono vê, de um aluno matriculado, cada formulário com enunciado, opções, marcadas, gabarito, nota, nível e observação (`GET /turmas/:id/alunos/:alunoId/respostas`; um formulário: `GET /formularios/:id/alunos/:alunoId`). Aluno fora da turma → 404; outro professor → 403.

### Observações dos alunos (RF05)
- **R-95** O docente dono responde a observação de um envio (texto 1–500 caracteres, `PATCH /formularios/:id/observacoes/:envioId`). O aluno vê `respostaProfessor` na própria autoavaliação e recebe uma notificação (R-80).
- **R-96** O docente oculta/reexibe uma observação (`oculta`): ocultas saem da lista e da contagem do resumo (R-53), mas o aluno continua vendo a própria.
- **R-97** Só o docente dono; envio sem observação → 422 `SEM_OBSERVACAO`; envio inexistente → 404.

### Notificações (sino)
- **R-80** Notificação = usuário, tipo (`publicacao`, `lembrete`, `conclusao`, `resposta-observacao`, `convite-turma`, `solicitacao-entrada`, `entrada-resolvida`), título, mensagem, link e `lidaEm`.
- **R-81** Quando um formulário passa a `aberto` (criar com `postar`, publicar, "postar agora", agendamento que venceu) cada aluno da turma recebe `publicacao`, se tiver `notificacoesEmail` e `publicacaoFormularios` ligados.
- **R-82** *Notificar pendentes* gera `lembrete` para quem ainda não enviou, se o aluno tiver `notificacoesEmail` ligado.
- **R-83** Quando todos os alunos da turma enviaram um formulário, o docente dono recebe `conclusao`, se tiver `notificacoesEmail` e `conclusaoFormularios` ligados.
- **R-84** `GET /notificacoes` lista as do próprio usuário (mais recentes primeiro, máx. 50) com o total de não lidas; `POST /notificacoes/:id/lida` e `POST /notificacoes/lidas` marcam como lidas. Notificação de outro usuário → 404.

## 5. API

Erros: `{ "erro": { "codigo": "…", "mensagem": "…" } }` · 400 validação · 401 sem sessão · 403 acesso negado · 404 inexistente · 409 conflito · 422 regra de negócio.

| Método | Rota | Papel | Regras |
|---|---|---|---|
| GET | `/api/health` | — | — |
| POST | `/api/auth/cadastro` | — | R-01…R-04 |
| POST | `/api/auth/login` | — | R-05, R-70 |
| POST | `/api/auth/refresh` | — | R-71 |
| POST | `/api/auth/logout` | — | R-72 |
| POST | `/api/auth/esqueci-senha` | — | R-75 |
| POST | `/api/auth/redefinir-senha` | — | R-76, R-73 |
| GET | `/api/dev/caixa-de-saida` | — (só com `EXPOR_CAIXA_DE_SAIDA=true`) | R-75 |
| GET | `/api/notificacoes` | ambos | R-84 |
| POST | `/api/notificacoes/:id/lida` · `/api/notificacoes/lidas` | ambos | R-84 |
| GET | `/api/auth/convites/:codigo` | — | R-17 |
| GET | `/api/perfil` | ambos | — |
| PATCH | `/api/perfil/preferencias` | ambos | R-06 |
| GET/POST | `/api/turmas` | prof | R-10…R-12 |
| GET/PATCH/DELETE | `/api/turmas/:id` | prof | R-13, R-14, R-15 |
| GET | `/api/turmas/:id/alunos` | prof | R-55 |
| GET | `/api/turmas/:id/resumo` | prof | R-56 |
| GET | `/api/turmas/:id/alunos/:alunoId/respostas` | prof | R-90 |
| DELETE | `/api/turmas/:id/alunos/:alunoId` | prof | R-18 |
| POST | `/api/turmas/:id/alunos/:alunoId/redefinir-senha` | prof | R-77 |
| GET/POST | `/api/formularios` | prof | R-20…R-23, R-30 |
| GET/PATCH/DELETE | `/api/formularios/:id` | prof | R-25…R-29 |
| GET | `/api/formularios/:id/alunos` | prof | R-54 |
| GET | `/api/formularios/:id/resumo` | prof | R-53 |
| GET | `/api/formularios/:id/alunos/:alunoId` | prof | R-90 |
| PATCH | `/api/formularios/:id/observacoes/:envioId` | prof | R-95…R-97 |
| POST | `/api/formularios/:id/notificar-pendentes` | prof | R-58 |
| GET | `/api/metricas` | prof | R-57 |
| GET | `/api/aluno/turmas` | aluno | R-40 |
| POST | `/api/aluno/turmas/entrar` | aluno | R-101, R-103 |
| GET | `/api/aluno/convites` | aluno | R-109 |
| POST | `/api/aluno/convites/:id/aceitar` · `/recusar` | aluno | R-110 |
| GET | `/api/turmas/:id/entradas` | prof | R-104 |
| POST | `/api/turmas/:id/entradas/:entradaId/aceitar` · `/recusar` | prof | R-105, R-106 |
| DELETE | `/api/turmas/:id/entradas/:entradaId` | prof | R-111 |
| GET | `/api/turmas/:id/alunos-para-convite` | prof | R-107 |
| POST | `/api/turmas/:id/convites` | prof | R-108 |
| GET | `/api/aluno/autoavaliacoes` | aluno | R-40, R-41, R-47 |
| PUT | `/api/aluno/autoavaliacoes/:id/respostas/:perguntaId` | aluno | R-42, R-43 |
| POST | `/api/aluno/autoavaliacoes/:id/enviar` | aluno | R-44…R-48 |

## 6. Fora de escopo
Envio real de e-mail (R-75: a mensagem fica na caixa de saída; trocar a implementação da porta `CaixaDeSaida` por SMTP não muda o domínio), notificações periódicas de métricas (`metricasTrimestrais`/`metricasSemestrais` seguem só salvas), moderação de observações por outros papéis, agrupamento de alunos com dificuldades semelhantes (RF07) e evolução individual do aluno para o professor.

## 7. Estratégia de testes
1. **Domínio/aplicação** (Vitest, repositórios em memória, relógio fixo): um `*.test.ts` ao lado de cada caso de uso, nomeado com o `R-xx`.
2. **API** (Supertest sobre o app com repositórios em memória): contrato HTTP, status e autorização.
3. **Repositórios Postgres**: testes de contrato contra o Postgres do Docker (`npm run test:db`).
4. **E2E (Playwright)** no front real + API real + Postgres: `RF01`, `RF02`, `RF03/N05`, `RF05`.

# HastyHelp — Spec de Casos de Uso

Catálogo dos casos de uso do sistema por ator, levantado **lendo o código real** (`backend/src`, `frontend/src`, `frontend/e2e`) e cruzado com [`SPEC-BACKEND.md`](SPEC-BACKEND.md) (regras `R-xx`) e [`SPEC-TELAS.md`](SPEC-TELAS.md). Onde o código diverge da spec, o item está descrito como o código se comporta e a divergência aparece em **Lacunas e melhorias mapeadas** (seção 6, `MEL-xx`).

- **Atores:** Visitante (sem sessão), Aluno, Professor. Alguns casos são comuns a aluno e professor autenticados.
- **Escopo:** somente documentação. Nenhum comportamento foi alterado.
- **Cobertura de testes** (campo "Testes"): usa as siglas da seção 1.3. "sem teste" significa que não há teste automatizado que exercite o caminho.

---

## 1. Convenções

### 1.1 Formato de erro da API

Toda falha da API responde `{ "erro": { "codigo": "…", "mensagem": "…" } }`. Nos casos abaixo, "Exceção" é escrita como `HTTP · CODIGO · "mensagem"`. A mensagem é a que o **backend devolve**; o front mostra exatamente essa mensagem (`mensagemDeErro`) no `role="alert"` do formulário ou, quando a ação não tem formulário próprio, no aviso global (`AvisoGlobal`, toast no rodapé), salvo quando indicado.

### 1.2 Exceções transversais (valem para todo caso de uso que chama a API)

| HTTP | `codigo` | Mensagem | Quando |
|---|---|---|---|
| 400 | `DADOS_INVALIDOS` | "Dados inválidos na requisição." (+ `detalhes[]` com `campo` e `mensagem` do Zod, em inglês, que o front não exibe) | corpo/query fora do esquema (campo ausente ou de tipo errado) |
| 400 | `JSON_INVALIDO` | "Corpo da requisição não é um JSON válido." | JSON malformado |
| 401 | `NAO_AUTENTICADO` | "Faça login para continuar." | sem `Authorization: Bearer`, token adulterado/vencido, sessão revogada ou expirada |
| 403 | `ACESSO_NEGADO` | "Esta área é exclusiva de professores." / "…de alunos." (papel errado na rota) | papel diferente do exigido |
| 403 | `ACESSO_NEGADO` | "Você não tem permissão para esta operação." | recurso de outro professor (turma/formulário) |
| 404 | `ROTA_NAO_ENCONTRADA` | "Rota não encontrada." | rota inexistente sob `/api` |
| 500 | `ERRO_INTERNO` | "Erro interno do servidor." | exceção não tratada (ver MEL-03, MEL-05) |
| — | `SEM_CONEXAO` (só front) | "Não foi possível conectar ao servidor. Tente novamente." | `fetch` falhou (status 0) |
| — | `ERRO` (só front) | "Algo deu errado. Tente novamente." | resposta de erro sem corpo JSON |

**Sessão no front (`frontend/src/api/client.ts`):** ao receber 401 com `NAO_AUTENTICADO` e havendo tokens, o cliente chama `POST /auth/refresh` (uma renovação por vez), repete a requisição e, se a renovação falhar, executa `sair` (limpa a sessão local) e a rota protegida redireciona para `/login` **sem mensagem** (ver MEL-26).

**Rotas protegidas no front (`App.tsx`, `Protegida`):** sem sessão → `/login`; papel errado → página inicial do papel (`/equipes` ou `/aluno/turmas`); enquanto carrega → "Carregando…" (`role="status"`). Testes: E-ID "RNF03 - aluno não acessa a área do professor…" e "RNF03 - a API recusa token de aluno em rota de professor…"; API-A "aluno não acessa rotas do professor e vice-versa (403)".

### 1.3 Siglas de testes

Backend (`backend/src/…`), Vitest (+ Supertest nos de API):

| Sigla | Arquivo |
|---|---|
| API-A | `app/http/api.test.ts` |
| API-N | `app/http/api-novas-rotas.test.ts` |
| API-E | `app/http/api-entrada-turmas.test.ts` |
| ID | `contexts/identidade/application/identidade.test.ts` |
| SS | `contexts/identidade/application/sessao-e-senha.test.ts` |
| VAL | `contexts/identidade/domain/valores.test.ts` |
| TU | `contexts/turmas/application/turmas.test.ts` |
| EN | `contexts/turmas/application/entrada.test.ts` |
| AL | `contexts/turmas/application/alunos.test.ts` |
| TD | `contexts/turmas/domain/turma.test.ts` |
| FO | `contexts/autoavaliacoes/application/formularios.test.ts` |
| FD | `contexts/autoavaliacoes/domain/formulario.test.ts` |
| RE | `contexts/respostas/application/respostas.test.ts` |
| OB | `contexts/respostas/application/observacoes.test.ts` |
| ED | `contexts/respostas/domain/envio.test.ts` |
| AN | `contexts/analise/application/analise.test.ts` |
| RI | `contexts/analise/application/respostas-individuais.test.ts` |
| MT | `contexts/analise/domain/metricas.test.ts` |
| NO | `contexts/notificacoes/application/notificacoes.test.ts` |

E2E Playwright (`frontend/e2e/…`): **E-ID** `identidade.spec.ts` · **E-NF** `novas-funcionalidades.spec.ts` · **E-EN** `entrada-turmas.spec.ts` · **E-PR** `professor.spec.ts` · **E-AL** `aluno.spec.ts` · **E-AN** `analise.spec.ts` · **E-RS** `responsivo.spec.ts`. Unitários do front: **FU-SAT** `src/data/satisfacao.test.ts`, **FU-ALU** `src/data/aluno.test.ts`, **FU-MAP** `src/api/mapeadores.test.ts`. Repositórios Postgres: `app/testes/contrato-postgres.db.test.ts` (`npm run test:db`) e `contrato-memoria.test.ts`.

### 1.4 Índice

| Ator | Casos de uso |
|---|---|
| Visitante | UC-01 Cadastrar-se · UC-02 Consultar convite · UC-03 Cadastrar-se por convite · UC-04 Entrar · UC-05 Solicitar link de redefinição · UC-06 Redefinir senha |
| Comum (autenticado) | UC-07 Renovar sessão · UC-08 Sair · UC-09 Consultar e atualizar perfil/preferências · UC-10 Consultar notificações · UC-11 Marcar notificações como lidas · UC-12 Responder pesquisa de satisfação · UC-13 Consultar FAQ |
| Aluno | UC-20 Listar minhas equipes · UC-21 Entrar em equipe por código · UC-22 Entrar pelo link de convite (já logado) · UC-23 Responder convites recebidos · UC-24 Sair da equipe · UC-25 Listar autoavaliações · UC-26 Responder pergunta (salvamento automático) · UC-27 Revisar e enviar · UC-28 Ver resultado · UC-29 Acompanhar desempenho e histórico |
| Professor | UC-40 Criar equipe · UC-41 Listar e buscar equipes · UC-42 Editar equipe · UC-43 Ocultar/reexibir equipe · UC-44 Excluir equipe · UC-45 Ver alunos da equipe · UC-46 Ver resumo da equipe · UC-47 Gerenciar pedidos de entrada · UC-48 Convidar aluno por nome/e-mail · UC-49 Remover aluno da equipe · UC-50 Gerar link de redefinição para aluno · UC-51 Ver respostas individuais de um aluno · UC-52 Criar formulário · UC-53 Listar formulários · UC-54 Ver formulário · UC-55 Editar formulário e mudar status · UC-56 Excluir formulário · UC-57 Ver resumo do formulário · UC-58 Ver alunos do formulário · UC-59 Notificar pendentes · UC-60 Responder/ocultar observação · UC-61 Consultar métricas · UC-62 Ver como aluno (prévia) |

---

## 2. Visitante

### UC-01 — Cadastrar-se
- **Objetivo:** criar conta de professor ou de aluno (RF01).
- **Pré-condições:** nenhuma.
- **Fluxo principal:** (1) visitante abre `/cadastro`; (2) escolhe "Sou professor"/"Sou aluno" (padrão: professor); (3) informa nome, e-mail, senha e confirmação; (4) o front valida senha ≥ 8 e confirmação igual; (5) `POST /api/auth/cadastro`; (6) 201 `{ usuario }`; (7) o front vai para `/login` **sem aviso de sucesso** (MEL-23).
- **Alternativos:** (A1) com `codigoConvite` → UC-03. (A2) `codigoConvite` enviado por professor é ignorado em silêncio (só vale para `papel: aluno`).
- **Exceções:**
  - front · "A senha deve ter pelo menos 8 caracteres." / "As senhas não conferem." (antes de chamar a API).
  - 400 · `NOME_OBRIGATORIO` · "Informe seu nome."
  - 400 · `PAPEL_INVALIDO` · "Papel inválido." (só via API; o Zod já barra outros valores com `DADOS_INVALIDOS`)
  - 400 · `EMAIL_INVALIDO` · "Informe um e-mail válido."
  - 400 · `SENHA_FRACA` · "A senha deve ter pelo menos 8 caracteres."
  - 400 · `SENHAS_DIFERENTES` · "As senhas não conferem."
  - 409 · `EMAIL_EM_USO` · "Este e-mail já está cadastrado."
  - 500 · `ERRO_INTERNO` se dois cadastros simultâneos com o mesmo e-mail passarem pela checagem antes do `INSERT` (violação de `UNIQUE` não tratada; MEL-05).
- **Regras:** R-01, R-02, R-03.
- **API:** `POST /api/auth/cadastro`. **Front:** `/cadastro` (`pages/Auth.tsx`, `Cadastro`).
- **Testes:** ID (R-01 duplicado, R-02, R-03 ×2), VAL (R-01 ×2, R-02), API-A (R-03/R-05, "R-05 login errado é 401; e-mail repetido é 409", "dados inválidos viram 400"), E-ID "RF01 - professor se cadastra e faz login", "RF01 - cadastro rejeita senhas diferentes e e-mail já usado". **Sem teste:** `NOME_OBRIGATORIO`, `PAPEL_INVALIDO`, `EMAIL_INVALIDO` por código; corrida de e-mail.

### UC-02 — Consultar convite (público)
- **Objetivo:** mostrar ao visitante (ou ao aluno logado) a turma de um código/link antes de entrar (R-17, R-114).
- **Pré-condições:** nenhuma (rota pública).
- **Fluxo principal:** (1) abrir `/convite/:codigo`; (2) `GET /api/auth/convites/:codigo`; (3) o front exibe "Você foi convidado(a) para a turma {nome} ({período})." e, se `aprovacaoManual`, "O professor precisará aceitar sua entrada.".
- **Alternativos:** busca ignora maiúsculas/minúsculas e espaços nas pontas (R-100).
- **Exceções:** 404 · `CONVITE_INVALIDO` · "Este link de convite é inválido ou expirou." O front mostra "Este link de convite é inválido ou expirou." (visitante, em `role="status"`) ou "Este link de convite é inválido ou expirou. Peça um novo ao professor." (logado, `role="alert"`) e impede o cadastro. Qualquer falha da chamada (inclusive rede) é tratada como convite inválido (MEL-28).
- **Regras:** R-17, R-100, R-114. **API:** `GET /api/auth/convites/:codigo`. **Front:** `/convite/:codigo` (`Convite`).
- **Testes:** TU (R-17 pública; inválido 404), EN (R-17 informa nome, período e aprovação; R-100 ×2), E-ID "RF01 - link de convite inválido avisa o aluno e impede o cadastro". **Sem teste:** limitação de tentativas (MEL-04).

### UC-03 — Cadastrar-se por link de convite (aluno)
- **Objetivo:** criar conta de aluno já entrando na turma do link (R-04, R-103).
- **Pré-condições:** link `/convite/:codigo` válido; visitante sem sessão.
- **Fluxo principal:** (1) UC-02 mostra a turma; (2) o papel fica fixo em aluno; (3) visitante preenche o formulário de UC-01; (4) `POST /auth/cadastro` com `codigoConvite`; (5) turma sem aprovação manual → matrícula imediata (`entrada: 'matriculado'`); (6) vai para `/login?…`/`/login`; ao entrar vê a turma.
- **Alternativos:** (A1) turma com `aprovacaoManual` → resposta traz `entrada: 'pendente'`, cria solicitação e notifica o docente (`solicitacao-entrada`); o aluno só vê o aviso prévio "O professor precisará aceitar sua entrada.", o front **não** informa o resultado depois do cadastro (MEL-23). (A2) "Já tenho conta" leva a `/login?convite=…`; após login volta a `/convite/:codigo` (UC-22).
- **Exceções:** além das de UC-01: 422 · `CONVITE_INVALIDO` · "Peça um novo link de convite ao professor." (o cadastro **não** é feito). No front, se o convite não carregou: "Peça um novo link de convite ao professor." sem chamar a API.
- **Regras:** R-04, R-103, R-100, R-114. **API:** `POST /api/auth/cadastro`. **Front:** `/convite/:codigo` (`Cadastro convite`).
- **Testes:** ID (R-04 ×2), EN (R-103 cadastro por link; R-04 sem aprovação), API-E (R-04/R-103), E-ID "RF01/N01 - aluno se cadastra pelo link de convite e vê a turma", E-EN "R-04/R-103 - cadastro pelo link com aprovação manual deixa o pedido pendente".

### UC-04 — Entrar (login)
- **Objetivo:** autenticar e abrir sessão (RF01, N01).
- **Pré-condições:** conta existente.
- **Fluxo principal:** (1) `/login`; (2) escolhe o papel; (3) informa e-mail e senha; (4) `POST /api/auth/login`; (5) 200 `{ token (15 min), refreshToken (30 dias), usuario }`; (6) o front guarda a sessão em `sessionStorage`, carrega `/perfil` e os dados e vai para `/equipes` (professor) ou `/aluno/turmas` (aluno).
- **Alternativos:** (A1) vindo de `?convite=` → aluno volta a `/convite/:codigo` (R-114). (A2) "Esqueceu a senha?" → UC-05.
- **Exceções:**
  - 401 · `CREDENCIAIS_INVALIDAS` · "E-mail ou senha incorretos." (e-mail inexistente, senha errada **ou papel diferente do cadastrado** dão a mesma resposta; R-05).
  - 400 · `DADOS_INVALIDOS` · "Dados inválidos na requisição." quando e-mail ou senha estão vazios: os campos de login não têm `required`, então o envio vazio chega à API (MEL-23).
  - `SEM_CONEXAO` (front).
- **Regras:** R-05, R-70. **API:** `POST /api/auth/login`. **Front:** `/login` (`Login`).
- **Testes:** ID (R-05 ×2), SS (R-70 ×3), API-A (R-03/R-05; R-05 401), API-N (login devolve refresh), E-ID "RF01 - login com senha errada…", "RF01 - login com o papel trocado é recusado", `entrarPelaUI` em quase todos os E2E.

### UC-05 — Solicitar link de redefinição de senha
- **Objetivo:** recuperar acesso quando a senha foi esquecida (R-75).
- **Pré-condições:** nenhuma.
- **Fluxo principal:** (1) `/esqueci-senha`; (2) informa o e-mail; (3) `POST /api/auth/esqueci-senha`; (4) 202 `{ mensagem }` sempre igual; (5) o front mostra "Se existir uma conta com esse e-mail, geramos um link para você escolher uma nova senha. Como o envio de e-mail ainda não está configurado, peça o link ao seu professor (alunos) ou ao administrador do sistema (professores)."
- **Alternativos:** conta existente → gera token (30 min, uso único, só o hash é guardado) e grava a mensagem na caixa de saída (`caixa_de_saida`), com o link; **não há envio de e-mail**. Com `EXPOR_CAIXA_DE_SAIDA=true`, `GET /api/dev/caixa-de-saida?para=` lista as mensagens.
- **Exceções:** 400 · `DADOS_INVALIDOS` se o e-mail estiver vazio; e-mail com formato inválido responde 202 normalmente (sem erro, evita enumeração). Em produção professores **não têm caminho de recuperação** (MEL-01).
- **Regras:** R-75. **API:** `POST /api/auth/esqueci-senha`, `GET /api/dev/caixa-de-saida` (dev). **Front:** `/esqueci-senha`.
- **Testes:** SS (R-75 ×2), API-N ("esqueci-senha responde igual…", "caixa de saída… desligada por padrão"), E-NF "RF01 - esqueci a senha…", "RF01 - e-mail desconhecido recebe a mesma resposta".

### UC-06 — Redefinir senha com o link
- **Objetivo:** escolher nova senha a partir do link (R-76, R-73).
- **Pré-condições:** link `/redefinir-senha/:token` válido.
- **Fluxo principal:** (1) informa nova senha e confirmação; (2) o front valida ≥ 8 e igualdade; (3) `POST /api/auth/redefinir-senha`; (4) 204; troca a senha, consome o token e **revoga todas as sessões** do usuário; (5) "Senha alterada com sucesso. Entre com a nova senha." → `/login`.
- **Exceções:**
  - 422 · `TOKEN_INVALIDO` · "Este link de redefinição é inválido ou expirou. Peça um novo." (inexistente, expirado, já usado, ou usuário removido).
  - 400 · `SENHA_FRACA` · "A senha deve ter pelo menos 8 caracteres."; 400 · `SENHAS_DIFERENTES` · "As senhas não conferem." (não consomem o token).
  - front · "A senha deve ter pelo menos 8 caracteres." / "As senhas não conferem."
- **Regras:** R-76, R-73, R-02, R-03. **API:** `POST /api/auth/redefinir-senha`. **Front:** `/redefinir-senha/:token`.
- **Testes:** SS (R-76 ×3), API-N ("redefinir troca a senha, derruba as sessões e consome o link"), E-NF "RF01 - link inválido ou já usado é recusado e senha fraca é barrada".

---

## 3. Comum a aluno e professor (autenticado)

### UC-07 — Renovar sessão
- **Objetivo:** manter o usuário logado após o access token (15 min) vencer (R-71).
- **Pré-condições:** refresh token válido.
- **Fluxo principal:** o cliente HTTP recebe 401 `NAO_AUTENTICADO`, chama `POST /api/auth/refresh { refreshToken }`, recebe novo par (rotação: o refresh anterior deixa de valer), atualiza `sessionStorage` e repete a requisição original.
- **Exceções:** 401 · `SESSAO_INVALIDA` · "Sua sessão expirou. Entre novamente." (refresh desconhecido, expirado, sessão revogada ou usuário inexistente); o front faz logout local e redireciona a `/login` sem mensagem.
- **Regras:** R-70, R-71. **API:** `POST /api/auth/refresh`. **Front:** transparente (`api/client.ts`).
- **Testes:** SS (R-71 ×2, R-70), API-N (refresh gira o par), E-NF "RNF03 - access token vencido é renovado sozinho…", "RNF03 - sessão revogada no servidor leva ao login". **Sem teste:** reutilização de refresh antigo (MEL-12).

### UC-08 — Sair
- **Objetivo:** encerrar a sessão (R-72).
- **Fluxo principal:** "Sair da conta" no modal de perfil → `POST /api/auth/logout { refreshToken }` → 204; o front limpa a sessão local e vai a `/login`. O access token da sessão passa a ser recusado imediatamente.
- **Alternativos:** refresh desconhecido não é erro (idempotente). Falha de rede no logout é ignorada (sessão local já limpa; a do servidor expira em até 30 dias, MEL-12).
- **Exceções:** 400 · `DADOS_INVALIDOS` se `refreshToken` vier vazio.
- **Regras:** R-72. **API:** `POST /api/auth/logout`. **Front:** `PerfilModal` → "Sair da conta".
- **Testes:** SS (R-72 ×2), API-N ("logout revoga na hora"), E-ID "RF01 - sair da conta encerra a sessão", E-NF "RNF03 - sair da conta revoga o token no servidor".

### UC-09 — Consultar e atualizar perfil e preferências
- **Objetivo:** ver o perfil e ajustar notificações, ícone de acessibilidade e tema (R-06).
- **Fluxo principal:** (1) avatar da barra lateral "Abrir perfil de {nome}"; (2) `GET /api/perfil` (já carregado no login); (3) usuário altera opções (`notificacoesEmail`, `conclusaoFormularios`, `publicacaoFormularios`, `metricasTrimestrais`, `metricasSemestrais`, `acessibilidade`, `tema: claro|escuro|alto-contraste`); (4) "Concluir" → `PATCH /api/perfil/preferencias` (parcial) → o tema/ícone passam a valer.
- **Alternativos:** o switch "Ícone de acessibilidade" grava imediatamente; os demais só em "Concluir".
- **Exceções:** 400 · `PREFERENCIA_INVALIDA` · "Valor inválido para "{campo}"." (valor não booleano) ou "Tema inválido."; 404 · `USUARIO_NAO_ENCONTRADO` · "Usuário não encontrado.". Em falha, o modal mostra a mensagem, mas o estado local já foi alterado (otimista, sem reversão; MEL-22).
- **Limite:** não há edição de nome, e-mail nem troca de senha logado (MEL-14).
- **Regras:** R-06. **API:** `GET /api/perfil`, `PATCH /api/perfil/preferencias`. **Front:** `PerfilModal` (`components/modals.tsx`).
- **Testes:** ID (R-06 ×2), API-A (R-06 preferências persistem), E-ID "R-06 - preferências do perfil (tema) persistem entre sessões", E-NF "R-81 - quem desligou as notificações…". **Sem teste:** `GET /perfil` isolado, erros 404/`PREFERENCIA_INVALIDA` via HTTP, preferências `metricas*` (apenas salvas; sem efeito, ver seção 6 da SPEC-BACKEND).

### UC-10 — Consultar notificações (sino)
- **Objetivo:** ver avisos do sistema (R-80, R-84, RF05).
- **Fluxo principal:** o sino consulta `GET /api/notificacoes` ao montar, a cada 30 s e ao abrir; mostra até 50, mais recentes primeiro, com contador de não lidas; tipos: `publicacao`, `lembrete`, `conclusao`, `resposta-observacao`, `convite-turma`, `solicitacao-entrada`, `entrada-resolvida`.
- **Alternativos:** lista vazia → "Nenhuma notificação por aqui.". Notificações só são criadas se `notificacoesEmail` estiver ligado e, para publicação/conclusão, a preferência específica (R-81…R-83, R-113).
- **Exceções:** erro de rede/API ao listar: o `useApi` guarda o erro, mas o sino não o exibe (MEL-24). Erros de marcar como lida aparecem no `role="alert"` do painel.
- **Regras:** R-80…R-84, R-113. **API:** `GET /api/notificacoes`. **Front:** `components/Notificacoes.tsx`.
- **Testes:** NO (R-81 ×3, R-82 ×2, R-83 ×2, R-84), API-N (R-81/R-84), E-NF "RF05 - aluno recebe a publicação no sino…", "RF05 - "Notificar pendentes" chega ao aluno…", "RF05 - professor é avisado quando todos os alunos respondem".

### UC-11 — Marcar notificações como lidas
- **Fluxo principal:** abrir um item → `POST /api/notificacoes/:id/lida` (204) e navega ao `link`; "Marcar todas como lidas" → `POST /api/notificacoes/lidas` (204).
- **Exceções:** 404 · `NOTIFICACAO_NAO_ENCONTRADA` · "Notificação não encontrada." (inexistente **ou de outro usuário**).
- **Regras:** R-84. **Testes:** NO (R-84), API-N ("R-84 notificação de outra pessoa é 404"), E-NF (sino, marcar todas).

### UC-12 — Responder pesquisa de satisfação (NPS/CSAT)
- **Objetivo:** coletar satisfação com o HastyHelp (gatilhos `pos-envio`, `trimestral`, `continua`). **Não consta na SPEC-BACKEND nem em SPEC-TELAS.**
- **Fluxo principal:** aluno (cartão após enviar autoavaliação) ou qualquer usuário (botão na barra; aviso "Pesquisa trimestral pendente" após 90 dias) abre o modal, escolhe CSAT 1–5, NPS 0–10 e comentário opcional (≤ 500) → `registrarPesquisa` grava em **`localStorage`** (`hastyhelp:pesquisas`).
- **Exceções (somente front):** "Avaliação de satisfação (CSAT) inválida. Escolha uma nota de 1 a 5." · "Nota de recomendação (NPS) inválida. Escolha uma nota de 0 a 10." · "O comentário deve conter no máximo 500 caracteres.".
- **Regras:** nenhuma `R-xx`. **API:** nenhuma. **Front:** `components/PesquisaSatisfacao.tsx`, painel "Satisfação com o HastyHelp" em `/metricas`.
- **Testes:** FU-SAT (cálculo/validação). **Sem teste:** modal, gatilhos, painel. Ver **MEL-02** (dados só no navegador; o painel do professor não vê as respostas dos alunos).

### UC-13 — Consultar FAQ
- **Objetivo:** ajuda estática por papel. **Rotas:** `/faq` (professor) e `/aluno/faq` (aluno); busca sem acento; conteúdo em `data/faq.ts`. Sem API, sem exceções. **Testes:** E-RS (sem rolagem horizontal) e filtros em `data/faq.ts` sem teste unitário.

---

## 4. Aluno

> Todas as rotas `/api/aluno/*` exigem papel aluno (403 `ACESSO_NEGADO` · "Esta área é exclusiva de alunos."). As telas ficam sob `Protegida papel="aluno"`.

### UC-20 — Listar minhas equipes
- **Objetivo:** ver as turmas em que estou matriculado e a participação em cada uma (RNF03, N02).
- **Fluxo principal:** `/aluno/turmas` → `GET /api/aluno/turmas` (turmas do aluno, sem `codigoConvite` nem `aprovacaoManual`, R-102) e `GET /api/aluno/autoavaliacoes`; filtros por busca/período/ordem; turmas ocultas pelo professor ficam em "Equipes ocultas" recolhida; convites pendentes aparecem no topo (UC-23).
- **Alternativos:** sem equipes → "Você ainda não está em nenhuma equipe. Use "Entrar em equipe" com o código do professor."; filtro sem resultado → "Nenhuma equipe encontrada.".
- **Exceções:** transversais (1.2). Falha ao carregar os dados iniciais aparece como aviso global.
- **Regras:** R-40, R-102, RNF03. **API:** `GET /api/aluno/turmas`. **Front:** `/aluno/turmas` (`AlunoTurmas`), `/aluno/turmas/:id` (+ `/resumo`).
- **Testes:** RE (R-40), EN (R-102), E-AL "RF03/N02/N03…", E-RS (aluno). **Sem teste:** ordenação/busca/ocultas na tela do aluno.

### UC-21 — Entrar em equipe por código
- **Objetivo:** entrar em quantas turmas quiser com o código de 6 caracteres (R-100, R-101, R-103).
- **Pré-condições:** aluno logado.
- **Fluxo principal:** "Entrar em equipe" → informa o código → `POST /api/aluno/turmas/entrar { codigo }` → 201 `{ status: 'matriculado', turma }` → lista recarregada.
- **Alternativos:** (A1) turma com `aprovacaoManual` → 202 `{ status: 'pendente', turma }`, notifica o docente. (A2) havia convite pendente do professor → entrar pelo código equivale a aceitar (matrícula direta, 201).
- **Exceções:**
  - front · "Digite o código da equipe." (vazio).
  - 404 · `CONVITE_INVALIDO` · "Código inválido. Confira com o professor e tente de novo."
  - 409 · `JA_NA_TURMA` · "Você já faz parte desta equipe."
  - 409 · `SOLICITACAO_PENDENTE` · "Você já pediu para entrar nesta equipe. Aguarde o professor." (depois de recusado, pode pedir de novo).
  - 403 · `ACESSO_NEGADO` · "Esta área é exclusiva de alunos." (professor).
  - 404 · `USUARIO_NAO_ENCONTRADO` · "Usuário não encontrado." (token de usuário removido).
- **Regras:** R-100, R-101, R-102, R-103, R-106, R-113. **API:** `POST /api/aluno/turmas/entrar`. **Front:** `EntrarEquipeModal`.
- **Testes:** EN (R-100 ×2, R-101 ×2, R-103 ×2), API-E (R-101, R-102/R-103/R-105), E-EN "R-101 - aluno que já tem conta entra em mais de uma equipe pelo código", "R-103/R-105 - aprovação manual…". **Sem teste:** (A2) convite → código via HTTP/E2E (há apenas teste de domínio parcial); limitação de tentativas (MEL-04).

### UC-22 — Entrar pelo link de convite (já logado)
- **Objetivo:** aluno com conta usa `/convite/:codigo` sem recadastro (R-114).
- **Fluxo principal:** abre o link logado como aluno → UC-02 → botão "Entrar na equipe" → `POST /aluno/turmas/entrar` → "Pronto! Você entrou na equipe {nome}." + "Abrir equipe" (ou, pendente, "Pedido enviado para {nome}. Você será avisado quando o professor aceitar." + "Ver minhas equipes").
- **Alternativos:** logado como professor → aviso "Você está logado como professor. Para entrar numa equipe como aluno, saia e entre com uma conta de aluno." e botão "Ir para minhas equipes".
- **Exceções:** as de UC-02 e UC-21 (mensagens no `role="alert"` da tela).
- **Regras:** R-114, R-101, R-103. **Front:** `ConviteLogado`. **Testes:** E-EN "R-114 - link de convite com aluno já logado leva direto à entrada…".

### UC-23 — Responder convites recebidos
- **Objetivo:** aceitar ou recusar convite feito pelo professor (R-109, R-110).
- **Fluxo principal:** convites pendentes em `/aluno/turmas` (`ConvitesRecebidos`) via `GET /api/aluno/convites` (somente os próprios; turma, docente, data) → "Aceitar"/"Recusar" → `POST /api/aluno/convites/:id/aceitar|recusar` → 204; aceitar matricula; ambos notificam o docente (`entrada-resolvida`).
- **Exceções:** 404 · `ENTRADA_NAO_ENCONTRADA` · "Convite não encontrado." (convite de outro aluno, inexistente ou turma excluída); 409 · `ENTRADA_JA_RESOLVIDA` · "Este convite já foi respondido ou cancelado."; 403 · `ACESSO_NEGADO` (professor).
- **Regras:** R-109, R-110, R-113. **Testes:** EN (R-110 ×2, R-108, R-113), API-E (R-107…R-111), E-EN "R-107/R-108/R-110…", "R-111/R-110 - aluno recusa convite e professor cancela outro".

### UC-24 — Sair da equipe
- **Objetivo:** aluno se desmatricula. **Não consta na tabela de API da SPEC-BACKEND** (só mencionado em R-112; MEL-09).
- **Fluxo principal:** menu da equipe → modal "Sair da equipe" ("Suas respostas e sua participação nesta equipe serão apagadas.") exige marcar "Sim, entendo que esta ação é irreversível." → `DELETE /api/aluno/turmas/:id` → 204; **apaga matrícula e todos os envios do aluno nessa turma** (inclusive os já enviados).
- **Exceções:** 404 · `TURMA_NAO_ENCONTRADA` · "Turma não encontrada." (turma inexistente, aluno não matriculado, ou ator professor); falha exibida no aviso global.
- **Regras:** R-18 (por analogia), R-112. **Front:** `AlunoTurmas` + `ExcluirModal tipo="sairEquipe"`.
- **Testes:** API-N "aluno sai da própria equipe e perde a matrícula e os envios", EN (R-112 sair/remover não bloqueia novo convite). **Sem teste:** E2E do fluxo; ver MEL-10 (destruição de histórico).

### UC-25 — Listar e abrir autoavaliações
- **Objetivo:** ver autoavaliações disponibilizadas e o conteúdo avaliado (N02, N03, RF03, RF09).
- **Fluxo principal:** `/aluno/autoavaliacoes` → `GET /api/aluno/autoavaliacoes` (formulários `aberto`/`fechado`/`concluido` das turmas do aluno, nunca `rascunho`/`agendado`; agendamento vencido é materializado na leitura, R-26); status do ponto de vista do aluno: `pendente`, `andamento`, `respondido`, `encerrado` (R-41); abrir `/aluno/autoavaliacoes/:id`.
- **Alternativos:** sem itens → "Nenhuma autoavaliação encontrada."; prazo exibido como "Prazo: …" ou "Sem prazo".
- **Exceções:** formulário de turma onde não está matriculado → 403 `ACESSO_NEGADO` "Você não está matriculado nesta turma."; rascunho/agendado → 404 `FORMULARIO_NAO_ENCONTRADO` "Autoavaliação não encontrada." (essas duas só via ação direta na API; o front navega pela lista).
- **Regras:** R-26, R-40, R-41, R-47. **API:** `GET /api/aluno/autoavaliacoes`. **Front:** `AlunoAutoavaliacoes`, `AlunoAutoavaliacaoDetalhe`.
- **Testes:** RE (R-40 ×2, R-41 ×2), FD (R-26), FO (R-26), E-AL (RF03/N02/N03; "RF03 - rascunho e agendado não aparecem"; "RNF04 - aluno de outra turma não vê nem responde"; "RF03 - formulário fechado vira Encerrado").

### UC-26 — Responder pergunta (salvamento automático)
- **Objetivo:** marcar opções e guardar rascunho na hora (RF03, RF04, N04).
- **Pré-condições:** formulário `aberto` e prazo não vencido; aluno matriculado; envio ainda não enviado.
- **Fluxo principal:** cada marcação → atualização otimista na tela + `PUT /api/aluno/autoavaliacoes/:id/respostas/:perguntaId { marcadas }` → 200 (DTO atualizado); status vira `andamento`. Respostas voltam ao recarregar.
- **Exceções:**
  - 404 · `PERGUNTA_NAO_ENCONTRADA` · "Pergunta não encontrada."
  - 400 · `OPCAO_INVALIDA` · "Opção inválida para esta pergunta." / "Esta pergunta aceita apenas uma opção."
  - 409 · `ENVIO_JA_ENVIADO` · "Esta autoavaliação já foi enviada e não pode ser alterada."
  - 422 · `FORA_DO_PRAZO` · "Esta autoavaliação não aceita mais respostas."
  - 403 · `ACESSO_NEGADO` · "Você não está matriculado nesta turma."
  - No front, qualquer falha **desfaz toda a tela para o estado anterior** e mostra a mensagem no aviso global (MEL-17).
- **Regras:** R-42, R-43, R-40. **API:** `PUT /api/aluno/autoavaliacoes/:id/respostas/:perguntaId`. **Front:** `AlunoRespostas` (`Responder`, `PerguntaCard`).
- **Testes:** RE (R-42, R-43), ED (R-42, R-43 ×2), E-AL "RF04 - as respostas são salvas na hora e voltam ao recarregar", "RF03 - formulário fechado vira Encerrado e bloqueia respostas". **Sem teste:** `PERGUNTA_NAO_ENCONTRADA`; escritas concorrentes (MEL-07).

### UC-27 — Revisar e enviar
- **Objetivo:** conferir e enviar definitivamente com nota geral e observação (N05, R-44, R-48).
- **Pré-condições:** todas as perguntas respondidas; nota geral escolhida (0–10, passos de 0,5; o botão "Revisar respostas" só habilita com as duas coisas).
- **Fluxo principal:** "Revisar respostas" → tela "Revise suas respostas" (mostra "Sem resposta" onde faltar), campo opcional "Observações (opcional)" (`maxLength` 500) → "Enviar" → modal "Depois de enviadas, as respostas não poderão ser alteradas. Deseja enviar agora?" → `POST /api/aluno/autoavaliacoes/:id/enviar { observacao?, notaGeral? }` → 200; calcula nota, nível I/P/C, grava aluno/turma/formulário (RF04); navega a `/resultado`. Se for o último aluno da turma a enviar, o docente recebe `conclusao` (R-83).
- **Exceções:**
  - 422 · `RESPOSTAS_INCOMPLETAS` · "Responda todas as perguntas antes de enviar."
  - 400 · `NOTA_GERAL_INVALIDA` · "A nota geral deve estar entre 0 e 10, em intervalos de 0,5." (a API aceita a ausência da nota; só a UI a exige: MEL-18)
  - 400 · `DADOS_INVALIDOS` · se `notaGeral` fora de 0–10 for barrada antes pelo Zod.
  - 409 · `ENVIO_JA_ENVIADO` · "Esta autoavaliação já foi enviada e não pode ser alterada." (reenvio)
  - 422 · `FORA_DO_PRAZO` · "Esta autoavaliação não aceita mais respostas."
  - 403/404 como em UC-25.
  - No front a falha vira aviso global e o usuário permanece na tela de revisão.
- **Regras:** R-44, R-45, R-46, R-47, R-48, R-83. **API:** `POST /api/aluno/autoavaliacoes/:id/enviar`. **Front:** `Responder` (etapa "revisar").
- **Testes:** RE (R-44, R-45/R-46/R-48), ED (R-44 ×3, R-45 ×2, R-46 ×4, R-48), NO (R-83), E-AL "RF03/N04/N05 - aluno responde, revisa e envia", "N05 - não deixa enviar com perguntas sem resposta". **Sem teste:** `NOTA_GERAL_INVALIDA` por HTTP; envio duplo simultâneo (MEL-07); limite de tamanho da observação na API (MEL-19).

### UC-28 — Ver resultado
- **Objetivo:** ver nota, compreensão, acertos, resposta do professor e gabarito (R-47, R-95).
- **Fluxo principal:** `/aluno/autoavaliacoes/:id/resultado` (só se `respondido`; senão redireciona às respostas): KPIs "Minha nota", "Compreensão", "Acertos", "Média geral"; gabarito somente se `mostrarGabarito` **e** o envio já foi enviado ou o prazo encerrou; a resposta do professor aparece em "…" ou "O professor ainda não respondeu.". A observação oculta pelo professor continua visível ao autor (R-96).
- **Exceções:** transversais; "Em análise" quando não há nota.
- **Regras:** R-45, R-46, R-47, R-48, R-95, R-96. **Front:** `AlunoResultado`.
- **Testes:** RE (R-47, "RNF04 um aluno nunca vê as respostas do outro"), OB (R-95, R-96), E-AL ("R-47 - gabarito só aparece quando o professor libera"; "RF03/N04/N05"), E-NF "RF05 - professor responde e oculta; o aluno vê a resposta no resultado". Ver MEL-13 (nota vs gabarito).

### UC-29 — Acompanhar desempenho e histórico
- **Objetivo:** histórico e evolução (N06, RF09).
- **Fluxo principal:** `/aluno/desempenho` e `/aluno/turmas/:id/resumo`: participação (respondidas ÷ total), última nota, média das avaliações, compreensão por autoavaliação, colunas de evolução; calculado **no front** a partir de `GET /api/aluno/autoavaliacoes`. Autoavaliação enviada aparece como "Respondida" com a nota.
- **Exceções:** "Sem dados"/"—" quando não há notas.
- **Regras:** R-41, R-48, RF08/RF09 (sem `R-xx` próprio no backend). **Front:** `AlunoDesempenho`, `AlunoTurmaResumo`.
- **Testes:** E-AL "RF09/N06 - histórico…", FU-ALU (média), FU-MAP (nota). **Sem teste:** KPIs de participação/evolução (lógica de negócio no componente, MEL-20).

---

## 5. Professor

> Rotas `/api/turmas`, `/api/formularios`, `/api/metricas` exigem papel professor (403 `ACESSO_NEGADO` · "Esta área é exclusiva de professores."). Recurso de **outro professor** → 403 `ACESSO_NEGADO` · "Você não tem permissão para esta operação."; recurso inexistente → 404 (`TURMA_NAO_ENCONTRADA` "Turma não encontrada.", `FORMULARIO_NAO_ENCONTRADO` "Formulário não encontrado."). Essas exceções valem para todos os UC-40…UC-62 e não são repetidas.

### UC-40 — Criar equipe (turma)
- **Objetivo:** cadastrar turma e disponibilizar o código de entrada (RF02, N07).
- **Fluxo principal:** `/equipes` → "Criar equipe" → nome e período letivo (`AAAA/NN`); sigla e cor opcionais → `POST /api/turmas` → 201 com `codigoConvite` (6 caracteres, único); sigla gerada das iniciais (≤ 3 letras) e cor padrão se omitidas.
- **Exceções:** front · "Informe o nome e o período letivo."; 400 · `NOME_OBRIGATORIO` · "Informe o nome da turma."; 400 · `PERIODO_INVALIDO` · "Informe o período letivo no formato AAAA/NN (ex.: 2026/02)."; 400 · `COR_INVALIDA` · "A cor deve estar no formato #RRGGBB."; 403 · `ACESSO_NEGADO` (aluno); 500 se a geração do código colidir (sem repetição; MEL-05).
- **Regras:** R-10, R-11, R-12, R-100. **API:** `POST /api/turmas`. **Front:** `CriarEquipeModal`.
- **Testes:** TU (R-10/R-11/R-12; "R-10 só professor cria turma"), TD (R-10 ×3, R-11 ×4), EN (R-100 6 caracteres), E-PR "RF02/N07 - professor cria uma equipe", "RF02 - criar equipe sem nome mostra erro". **Sem teste:** `COR_INVALIDA` por código; colisão de código.

### UC-41 — Listar e buscar equipes
- **Fluxo principal:** `GET /api/turmas` (turmas do professor com `totalAlunos`, `taxaResposta`, `dominioMedio`, `engajamento`, `ultimoFormularioEm`); filtros no front: busca, período, ordem; "Equipes ocultas" recolhida. `GET /api/turmas/:id` devolve a turma (404 `TURMA_NAO_ENCONTRADA` se não for do professor: **não** distingue "de outro" de "inexistente" nesta rota).
- **Alternativos:** sem equipes → "Você ainda não possui equipes"; sem resultado → "Nenhuma equipe encontrada." / "Nenhuma equipe ocultada.".
- **Regras:** R-13, R-52, R-56, RNF04. **Testes:** AN (R-52/R-56 listagem), API-A ("professor não vê turma nem formulário de outro professor"), E-PR "RNF04 - professor não vê equipe de outro professor", E-AN "RF05/N10 - equipe: estatísticas no cartão…".

### UC-42 — Editar equipe
- **Fluxo principal:** "Editar equipe" → nome, período, sigla, cor, **aprovação manual** (R-102) → `PATCH /api/turmas/:id` (parcial) → 200.
- **Exceções:** 400 · `NOME_OBRIGATORIO` / `PERIODO_INVALIDO` / `COR_INVALIDA` (mensagens do UC-40); 403 · `ACESSO_NEGADO` (outro professor, R-13).
- **Regras:** R-10, R-11, R-13, R-102. **Testes:** TU (R-13, R-10 edição), TD (R-11 sigla editada), EN (R-102), E-PR "RF02 - editar equipe e ocultar/desocultar".

### UC-43 — Ocultar/reexibir equipe
- **Fluxo principal:** menu da equipe → "Ocultar"/"Exibir" → `PATCH /api/turmas/:id { oculta }`; nada é apagado (R-14); aparece em "Equipes ocultas". O aluno também vê a turma na seção "Equipes ocultas".
- **Regras:** R-13, R-14. **Testes:** TU (R-14), TD (R-14), E-PR "RF02 - editar equipe e ocultar/desocultar".

### UC-44 — Excluir equipe
- **Fluxo principal:** menu → modal "Excluir permanentemente" ("Todos os formulários, respostas de alunos e métricas associadas serão apagados.") com confirmação "Sim, entendo que esta ação é irreversível." → `DELETE /api/turmas/:id` → 204; apaga envios, formulários, entradas e a turma (R-15, R-112).
- **Exceções:** 403/404 padrão; falha em qualquer etapa deixa a exclusão **parcial** (passos sequenciais sem transação; MEL-08).
- **Regras:** R-13, R-15, R-112. **Testes:** TU (R-15), EN (R-112), API-A ("RF02 editar, fechar e excluir…"), E-PR "RF02 - excluir equipe remove a equipe".

### UC-45 — Ver alunos da equipe
- **Fluxo principal:** `/equipes/:id/alunos` → `GET /api/turmas/:id/alunos` (docente e alunos com domínio médio e `enviados / publicados`, R-55); cada aluno tem menu (respostas individuais, gerar link de redefinição, remover); o link/código de convite é mostrado com botões "Copiar código"/"Copiar link de convite" ("Não foi possível copiar automaticamente. Selecione o texto e copie à mão." se a área de transferência falhar).
- **Alternativos:** sem alunos → "Nenhum aluno na equipe ainda. Use "Adicionar membros" acima (código ou e-mail)."
- **Regras:** R-55. **Testes:** AN (R-55), E-AN "RF05/N10 - equipe: estatísticas…", E-PR "RF02 - professor vê o link de convite da equipe na aba Alunos".

### UC-46 — Ver resumo da equipe
- **Fluxo principal:** `/equipes/:id/resumo` → `GET /api/turmas/:id/resumo`: engajamento, nota média, desempenho geral (diferença entre o último e o primeiro formulário com dados, só com ≥ 2), distribuição I/P/C, evolução (5 últimos), maior dificuldade por formulário (R-56, RF05, RF06, RF08).
- **Alternativos:** turma sem dados devolve zeros/nulos ("—").
- **Regras:** R-50, R-51, R-56. **Testes:** AN (R-56 ×2), MT (R-50, R-51, R-53), E-AN "RF05/N10…".

### UC-47 — Gerenciar pedidos de entrada
- **Objetivo:** aceitar/recusar pedidos de alunos que usaram o código em turma com aprovação manual (R-104…R-106).
- **Fluxo principal:** "Adicionar membros" → aba "Código" → `GET /api/turmas/:id/entradas` (`solicitacoes` e `convites` pendentes) → "Aceitar"/"Recusar" → `POST /api/turmas/:id/entradas/:entradaId/aceitar|recusar` → 204; aceitar matricula (idempotente) e ambos notificam o aluno (`entrada-resolvida`).
- **Alternativos:** "Nenhum pedido aguardando.".
- **Exceções:** 404 · `ENTRADA_NAO_ENCONTRADA` · "Pedido ou convite não encontrado." (outra turma/inexistente); 409 · `ENTRADA_JA_RESOLVIDA` · "Este pedido ou convite já foi respondido."; 422 · `ORIGEM_INVALIDA` · "Convites são respondidos pelo aluno convidado." (tentar aceitar/recusar um convite).
- **Regras:** R-103, R-104, R-105, R-106, R-113. **Testes:** EN (R-104, R-105 ×2, R-106), API-E (R-102/R-103/R-105), E-EN "R-103/R-105 - aprovação manual…".

### UC-48 — Convidar aluno por nome/e-mail
- **Objetivo:** convidar aluno já cadastrado (R-107, R-108, R-111).
- **Fluxo principal:** aba "E-mail" → pesquisar (≥ 3 caracteres, sem diferenciar acento/maiúscula; no máx. 10; exclui quem já está na turma; marca `convidado`) → `GET /api/turmas/:id/alunos-para-convite?busca=` → selecionar → `POST /api/turmas/:id/convites { alunoId }` → 201 `{ id }` → "Convite enviado para {nome}. Ele aparece para o aluno em Equipes e no sino de notificações."; convite pendente pode ser cancelado: `DELETE /api/turmas/:id/entradas/:entradaId` → 204 (R-111).
- **Alternativos:** "Nenhum aluno encontrado com "{busca}"…".
- **Exceções:**
  - 422 · `BUSCA_CURTA` · "Digite ao menos 3 letras do nome ou do e-mail."
  - 404 · `ALUNO_NAO_ENCONTRADO` · "Aluno não encontrado." (id inexistente ou de professor)
  - 409 · `JA_NA_TURMA` · "Este aluno já faz parte da equipe."
  - 409 · `CONVITE_JA_ENVIADO` · "Este aluno já foi convidado e ainda não respondeu."
  - 409 · `SOLICITACAO_PENDENTE` · "Este aluno já pediu para entrar. Aceite o pedido na aba Código."
  - cancelar: 422 · `ORIGEM_INVALIDA` · "Pedidos de entrada são aceitos ou recusados, não cancelados."; 409 · `ENTRADA_JA_RESOLVIDA`; 404 · `ENTRADA_NAO_ENCONTRADA`.
- **Regras:** R-107, R-108, R-111, R-113. **Testes:** EN (R-107 ×2, R-108 ×2, R-111), API-E (R-107…R-111), E-EN "R-107/R-108/R-110…", "R-111/R-110…". Ver MEL-11 (busca expõe todos os alunos do sistema).

### UC-49 — Remover aluno da equipe
- **Fluxo principal:** menu do aluno → modal "Remover da equipe" ("As respostas dele(a) nesta equipe serão apagadas.") + confirmação → `DELETE /api/turmas/:id/alunos/:alunoId` → 204; apaga matrícula e envios dele **nessa turma**; o aluno perde acesso; pode ser convidado de novo (R-112). Não avisa o aluno (MEL-16).
- **Exceções:** 404 · `ALUNO_NAO_ENCONTRADO` · "Este aluno não está na turma."; 403 padrão.
- **Regras:** R-18, R-112. **Testes:** AL (R-18 ×3), API-N ("R-90/R-18…"), E-NF "R-18 - professor remove o aluno da equipe e ele perde o acesso", "R-18 - cancelar a confirmação não remove ninguém".

### UC-50 — Gerar link de redefinição de senha de um aluno
- **Fluxo principal:** menu do aluno → "Gerar link de redefinição de senha" → `POST /api/turmas/:id/alunos/:alunoId/redefinir-senha` → 200 `{ link }` exibido em modal; o professor repassa o link ao aluno (R-77). Vale 30 min, uso único.
- **Exceções:** 404 · `ALUNO_NAO_ENCONTRADO` · "Este aluno não está na turma."; 403 padrão.
- **Regras:** R-77, R-76. **Testes:** SS (R-77 ×2), API-N ("R-77 professor gera o link do aluno da turma; outro professor não"), E-NF "RF01 - professor gera o link de redefinição para um aluno da equipe". Ver MEL-11 sobre risco de tomada de conta.

### UC-51 — Ver respostas individuais de um aluno
- **Fluxo principal:** menu do aluno (equipe ou formulário) → modal com cada formulário publicado: enunciado, opções, marcadas, gabarito, nota, nível, observação (N09, R-90): `GET /api/turmas/:id/alunos/:alunoId/respostas` ou `GET /api/formularios/:id/alunos/:alunoId`. Status: `respondido`/`andamento`/`pendente`.
- **Exceções:** 404 · `ALUNO_NAO_ENCONTRADO` · "Este aluno não está na turma."; 403 padrão.
- **Regras:** R-90, RNF04. **Testes:** RI (R-90 ×4), API-N ("R-90/R-18…"), E-NF "N09 - professor vê as respostas individuais…", "N09 - aluno que não respondeu aparece como pendente".

### UC-52 — Criar formulário (autoavaliação)
- **Objetivo:** criar a autoavaliação e disponibilizá-la à turma (RF02, N07, N08).
- **Fluxo principal:** "Criar formulário" → título, equipe, perguntas (a opção fixa de autoavaliação: 4 alternativas I/P/C/ausência, múltipla escolha), prazo opcional, "Liberar o gabarito…" → escolhe **uma** forma: "Postar ao criar" (`aberto`), data+hora futura (`agendado`) ou nada (`rascunho`) → `POST /api/formularios` → 201. Postar notifica os alunos (R-81).
- **Exceções:**
  - front · "Informe o nome do formulário e a equipe."
  - 400 · `TITULO_OBRIGATORIO` · "Informe o título do formulário."
  - 422 · `SEM_PERGUNTAS` · "Adicione ao menos uma pergunta antes de publicar." (postar ou agendar sem perguntas)
  - 422 · `DATA_NO_PASSADO` · "A data de publicação não pode estar no passado."
  - 400 · `DATA_INVALIDA` · "Data inválida em "{campo}"." (`publicarEm`/`prazo` ilegíveis)
  - 422 · `PERGUNTA_INVALIDA` · "Toda pergunta precisa de enunciado." / "Cada pergunta precisa de pelo menos 2 opções preenchidas." / "Gabarito inválido para a pergunta." / "Categorias IPC inválidas para as opções."
  - 403 · `ACESSO_NEGADO` (turma de outro professor, R-20)
- **Regras:** R-20…R-24, R-27, R-81. **API:** `POST /api/formularios`. **Front:** `CriarFormularioModal`.
- **Testes:** FO (R-22, R-23, R-24, R-20), FD (R-20, R-22 ×3, R-23, R-24, R-27 ×4), NO (R-81), E-PR "RF02/N08 - professor cria e publica…", "RF02 - não publica sem perguntas…", "RF02 - agenda um formulário para uma data futura". **Sem teste:** `DATA_INVALIDA`, `TITULO_OBRIGATORIO` por código; prazo anterior à publicação não é validado (MEL-15).

### UC-53 — Listar formulários
- **Fluxo principal:** `/avaliacoes` → `GET /api/formularios?turmaId=&status=&busca=` com `respostas`, `total`, `dominioMedio`, `maiorDificuldade` (R-30); agendados vencidos são materializados na leitura (R-26).
- **Alternativos:** "Nenhum formulário encontrado." / "Você ainda não possui formulários".
- **Exceções:** 400 · `DADOS_INVALIDOS` (status inválido na query).
- **Regras:** R-26, R-30, R-51. **Testes:** FO (R-30), AN (R-30/R-51/R-52), E-PR (vários), E-RS.

### UC-54 — Ver formulário
- **Fluxo principal:** `/avaliacoes/:id` → `GET /api/formularios/:id` (perguntas, status, datas, `mostrarGabarito`); abas Formulário · Alunos · Resumo; menu com Editar, Ver como aluno, mudar status e Excluir.
- **Regras:** R-26. **Testes:** E-PR "RF02 - editar formulário…", FO.

### UC-55 — Editar formulário e mudar status
- **Objetivo:** alterar título/prazo/gabarito sempre; perguntas só em `rascunho`/`agendado`; publicar, agendar, fechar, reabrir, concluir (R-25, R-28).
- **Fluxo principal:** "Editar formulário" (modal) ou itens do menu ("Publicar agora"/"Postar agora" · "Fechar formulário" · "Reabrir formulário" · "Marcar como concluído") → `PATCH /api/formularios/:id` → 200. Passar a `aberto` notifica os alunos (R-81).
- **Transições (R-25):** `rascunho→aberto|agendado` · `agendado→aberto|rascunho` · `aberto→fechado|concluido` · `fechado→aberto|concluido` · `concluido` final.
- **Exceções:**
  - 422 · `TRANSICAO_INVALIDA` · "Transição de status inválida: {de} → {para}."
  - 422 · `FORMULARIO_PUBLICADO` · "O formulário já foi publicado: as perguntas não podem ser alteradas."
  - 400 · `DATA_OBRIGATORIA` · "Informe a data de publicação para agendar."
  - 422 · `DATA_NO_PASSADO`, `SEM_PERGUNTAS`, `PERGUNTA_INVALIDA`, 400 `TITULO_OBRIGATORIO`, `DATA_INVALIDA` (como UC-52).
  - Ações de menu sem formulário próprio mostram o erro no aviso global.
- **Regras:** R-23, R-24, R-25, R-26, R-27, R-28, R-81. **Testes:** FO (R-25, R-26, R-28 ×2), FD (R-25 ×3, R-28 ×3, R-23), API-A ("RF02 editar, fechar e excluir…"), E-PR "RF02 - fecha, reabre, conclui e exclui um formulário pelo menu", "RF02 - editar formulário: perguntas de formulário publicado ficam travadas…", "RF02 - rascunho pode ser editado e publicado". **Sem teste:** `DATA_OBRIGATORIA`; edição concorrente (MEL-07).

### UC-56 — Excluir formulário
- **Fluxo principal:** menu → modal "Excluir permanentemente" ("Todas as respostas e métricas associadas serão apagadas.") → `DELETE /api/formularios/:id` → 204; apaga envios e formulário (R-29) e volta a `/avaliacoes`. Se a API falhar, o front **navega assim mesmo** e só mostra o aviso global (MEL-21).
- **Regras:** R-29. **Testes:** FO (R-29), E-PR (fecha, reabre, conclui e exclui).

### UC-57 — Ver resumo do formulário
- **Fluxo principal:** `/avaliacoes/:id/resumo` → `GET /api/formularios/:id/resumo`: respondidos/total, taxa, nota média, observações (uma por envio, com oculta), distribuição I/P/C, maior dificuldade, dificuldades gerais por pergunta (R-53).
- **Alternativos:** "Sem respostas ainda", "Nenhuma dificuldade registrada ainda.", "Nenhuma observação enviada.".
- **Regras:** R-50…R-53, RF05, RF06. **Testes:** AN (R-53 ×2, RNF04), MT (R-50…R-53), OB (R-53), E-AN "RF05/N09/N10 - resumo do formulário…".

### UC-58 — Ver alunos do formulário
- **Fluxo principal:** `/avaliacoes/:id/alunos` → `GET /api/formularios/:id/alunos`: "Responderam (x/total)", "Visualizaram" (rascunho), "Pendente" (R-54).
- **Alternativos:** "Esta turma ainda não possui alunos", "Nenhuma resposta enviada ainda.", "Nenhum aluno visualizou o formulário no momento.", "Nenhum aluno pendente.".
- **Regras:** R-54. **Testes:** AN (R-54), E-AN "RF05/N09 - alunos do formulário…".

### UC-59 — Notificar pendentes
- **Fluxo principal:** "Notificar pendentes" → `POST /api/formularios/:id/notificar-pendentes` → 200 `{ notificados }`; cria `lembrete` para quem ainda não enviou e tem `notificacoesEmail` ligado (R-58, R-82); mensagem: "{n} aluno(s) notificado(s)." ou "Nenhum aluno pendente para notificar.".
- **Exceções:** 422 · `FORMULARIO_NAO_ABERTO` · "Só é possível notificar alunos de um formulário aberto." (aparece no aviso global; o botão não é desabilitado para formulário não aberto, MEL-25). Sem limite de repetição (MEL-16).
- **Regras:** R-58, R-82. **Testes:** AN (R-58), NO (R-82 ×2), E-AN "RF05 - notificar pendentes informa quantos alunos foram avisados", E-NF "RF05 - "Notificar pendentes" chega ao aluno…". **Sem teste:** `FORMULARIO_NAO_ABERTO`.

### UC-60 — Responder e ocultar observação do aluno
- **Fluxo principal:** em `/avaliacoes/:id/resumo`, por observação: responder (≤ 500 caracteres) e/ou "Ocultar"/"Mostrar ocultas (n)" → `PATCH /api/formularios/:id/observacoes/:envioId { resposta?, oculta? }` → 204; o aluno é notificado (`resposta-observacao`) e vê a resposta no resultado; ocultas saem da contagem do resumo.
- **Exceções:** 400 · `DADOS_INVALIDOS` · "Dados inválidos na requisição." (detalhe: "Informe "resposta" e/ou "oculta".") quando o corpo não traz `resposta` nem `oculta`, ou os tipos estão errados; 422 · `SEM_OBSERVACAO` · "Este envio não tem observação."; 404 · `ENVIO_NAO_ENCONTRADO` · "Envio não encontrado."; 400 · `RESPOSTA_INVALIDA` · "A resposta pode ter no máximo 500 caracteres.". Resposta vazia **limpa** a resposta (a spec diz 1–500; MEL-09).
- **Regras:** R-95, R-96, R-97. **Testes:** OB (R-95 ×2, R-96, R-97, R-53), API-N ("R-95/R-96…"), E-NF "RF05 - professor responde e oculta; o aluno vê a resposta no resultado". **Sem teste:** `ENVIO_NAO_ENCONTRADO` por código; `DADOS_INVALIDOS` do refine.

### UC-61 — Consultar métricas
- **Fluxo principal:** `/metricas` → `GET /api/metricas?periodo=&turmaId=&alunoId=&formularioId=&status=&desde=`: desempenho médio, taxa de respostas ("x de y"), formulários concluídos/publicados, maior dificuldade (% de respostas incorretas), desempenho por turma, turmas sem dados e evolução mensal (5 últimos meses) (R-57, N10, N11, N13, RF08).
- **Alternativos:** "Nenhuma turma encontrada para estes filtros."; seletor de aluno desabilitado até escolher a turma; filtros do front resolvem turma/formulário **pelo nome** (MEL-29).
- **Exceções:** 400 · `DATA_INVALIDA` · "Data inválida em "desde"."; 400 · `DADOS_INVALIDOS` (status inválido); erro de carga mostrado em `role="alert"`.
- **Regras:** R-50, R-51, R-52, R-57. **Testes:** AN (R-57 ×4, RNF04), E-AN "RF08/N13 - métricas consolidadas e filtros por turma e aluno". **Sem teste:** `DATA_INVALIDA` em `desde`; fuso/ano na evolução mensal (MEL-30).

### UC-62 — Ver como aluno (prévia)
- **Fluxo principal:** menu do formulário → "Ver como aluno" abre `PreviaAlunoModal` com as perguntas como o aluno vê; **somente front, não grava nada.**
- **Testes:** E-NF "RF02 - a prévia mostra as perguntas como o aluno vê e não salva nada".

---

## 6. Lacunas e melhorias mapeadas

Gravidade: **Alta** (risco de segurança/privacidade, perda de dado ou fluxo essencial quebrado) · **Média** (inconsistência ou falha funcional com contorno) · **Baixa** (polimento, dívida técnica). Todos os itens abaixo foram confirmados no código; nenhum foi corrigido neste documento.

| ID | Gravidade | Tipo | Lacuna | Evidência | Sugestão |
|---|---|---|---|---|---|
| MEL-01 | Alta | Fluxo / spec | **Professor não tem como recuperar a senha em produção.** Não há envio de e-mail; a UI manda professores "ao administrador do sistema", que não existe como papel nem rota. Só o aluno tem contorno (UC-50). | `redefinicao-de-senha.ts`, `Auth.tsx` (EsqueciSenha), SPEC-BACKEND §6 | Implementar SMTP/serviço transacional atrás da porta `CaixaDeSaida` ou um procedimento de reset administrativo documentado; até lá, deixar a mensagem honesta sobre o limite. |
| MEL-02 | Alta | Inconsistência | **Pesquisa de satisfação só existe no `localStorage`**: é compartilhada entre usuários do mesmo navegador, perde-se ao limpar dados e o painel "Satisfação com o HastyHelp" do professor **só vê o que foi respondido no navegador dele**, embora se diga "respondida por alunos e professores". Fora das specs e sem API. | `store.tsx` (`registrarPesquisa`), `Metricas.tsx` | Criar contexto/rota no backend (spec + testes `R-xx`) com resposta anônima por sessão, ou remover o painel/rotular como protótipo local. |
| MEL-03 | Média | Tratamento de erro | **Erros do `body-parser` viram 500**: corpo > 1 MB deveria ser 413 (`PayloadTooLarge`), mas o handler só trata `ErroDeDominio`, `ZodError` e `SyntaxError`; o resto cai em `ERRO_INTERNO` e polui o log. | `servidor.ts` (handler final) | Respeitar `erro.status`/`erro.type` do Express (413, 400) no handler e testar. |
| MEL-04 | Média | Segurança | **Sem limitação de taxa** em login, cadastro, esqueci-senha, `GET /auth/convites/:codigo`, `POST /aluno/turmas/entrar` e busca de alunos; sem `helmet`. Possibilita força bruta de senha e enumeração do espaço de códigos (31⁶ ≈ 887 milhões, com leve viés de `% 31`). | `servidor.ts`, `package.json` | `express-rate-limit` por IP/conta nas rotas públicas, cabeçalhos de segurança, e `crypto.randomInt` na geração do código. |
| MEL-05 | Média | Concorrência | **Corridas de unicidade viram 500**: `EMAIL_EM_USO` é checado antes do `INSERT` (violação de `UNIQUE` não tratada), colisão do `codigo_convite` não tem nova tentativa, e o índice parcial `entradas_turma_pendente_idx` (006) também lança erro cru. | `cadastrar-usuario.ts`, `usuario-repositorio-pg.ts`, `criar-turma.ts`, sem tratamento de SQLSTATE `23505` em `backend/src` | Traduzir `23505` em `conflito(...)` nos repositórios Postgres; repetir geração de código; teste de contrato com concorrência. |
| MEL-06 | Média | Segurança | **Token de redefinição em texto claro em dois lugares**: a spec diz "só o hash é guardado", mas o link com o token vai para `caixa_de_saida.link` (banco) e para o log do servidor (`logCaixaDeSaida` é `true` por padrão no Postgres). | `sessao-repositorios-pg.ts` (`CaixaDeSaidaPg`), `infra-postgres.ts` | Não persistir o link nem logar em produção (flag desligada por padrão); expurgar `caixa_de_saida` antiga. Atualizar R-75 na spec. |
| MEL-07 | Média | Concorrência | **Atualização perdida e duplicidade**: (a) `PUT .../respostas/:perguntaId` lê o envio inteiro e regrava `respostas` (jsonb) — dois salvamentos quase simultâneos de perguntas diferentes (o front dispara um por clique) podem sobrescrever um ao outro; (b) o `UPSERT` de `envios` não é condicional ao status, então envio duplo concorrente passa de `rascunho` duas vezes e duplica `conclusao`; (c) a materialização de `agendado→aberto` ocorre em qualquer leitura e dois leitores simultâneos notificam duas vezes (e a notificação só sai quando alguém abre a tela, não no horário agendado). | `salvar-resposta.ts`, `enviar-autoavaliacao.ts`, `envio-repositorio-pg.ts`, `autoavaliacoes/application/acesso.ts` | Atualizar a chave do jsonb (`jsonb_set`) ou versão otimista (`atualizado_em`); `UPDATE … WHERE status='rascunho'`; job agendado/`UPDATE … WHERE status='agendado' RETURNING` para materializar uma única vez. |
| MEL-08 | Média | Integridade | **Exclusão de turma sem transação** (envios → formulários → entradas → turma em chamadas separadas): falha no meio deixa estado parcial. Mesmo padrão em remover aluno/sair da equipe. | `excluir-turma.ts`, `alunos-da-turma.ts` | Transação no repositório (unidade de trabalho) ou `ON DELETE CASCADE` (já previsto na spec §2) e um único `DELETE`. |
| MEL-09 | Média | Spec × código | **Divergências spec/código:** (1) `DELETE /api/aluno/turmas/:id` (sair da equipe) não está na tabela de API; (2) R-95 diz texto "1–500" e o código aceita vazio (limpa a resposta); (3) códigos de erro `DADOS_INVALIDOS`, `JSON_INVALIDO`, `NAO_AUTENTICADO`, `ROTA_NAO_ENCONTRADA`, `ERRO_INTERNO`, `DATA_OBRIGATORIA`, `DATA_INVALIDA`, `FORMULARIO_NAO_ABERTO`, `PERGUNTA_NAO_ENCONTRADA`, `ENVIO_NAO_ENCONTRADO`, `NOTIFICACAO_NAO_ENCONTRADA`, `ALUNO_NAO_ENCONTRADO` não aparecem na spec; (4) R-04 manda 422 `CONVITE_INVALIDO` no cadastro e a consulta pública usa 404 com outra mensagem; (5) erros de validação de pergunta são 422 (`PERGUNTA_INVALIDA`) enquanto os demais campos usam 400; (6) a seed cria códigos de 8 caracteres (`pdm-2026`, `ea-2026`) contra R-100 (6); (7) `SPEC-TELAS.md` ainda diz "Sem backend… dados mockados" e omite rotas do aluno, `/convite`, `/redefinir-senha`, `/esqueci-senha`, `/faq`, `/aluno/*`. | `servidor.ts`, `moderar-observacao`/`envio.ts`, `seed.ts`, SPEC-TELAS §2 e §4 | Atualizar as specs (e criar R-xx para "sair da equipe" e para a pesquisa), padronizar 400 × 422 e adicionar um catálogo de `codigo`s. |
| MEL-10 | Alta | UX / dado | **Sair da equipe e remover aluno apagam envios já enviados**, inclusive o histórico do aluno (RF09) e as métricas do professor; só há confirmação por checkbox, sem exportar/arquivar. Nenhum aviso ao aluno removido (R-18 não prevê notificação). | `alunos-da-turma.ts` (`excluirDoAlunoNaTurma`) | Preferir arquivar (soft delete) mantendo anonimizado nas métricas; notificar o aluno removido. |
| MEL-11 | Alta | Privacidade (RNF04) | **Professor enumera todos os alunos do sistema**: `GET /turmas/:id/alunos-para-convite` busca por nome/e-mail (3+ letras) em **todos** os usuários `aluno`, sem relação com a turma, e devolve e-mail. Além disso, o link de redefinição (R-77) é devolvido ao professor, que pode usá-lo ele mesmo e assumir a conta do aluno. | `usuario-repositorio-pg.ts` (`buscarAlunos`), `convidar-aluno.ts`, `gerar-link` (R-77) | Exigir e-mail completo exato (ou busca restrita à instituição), mascarar e-mail em resultados parciais; no R-77 enviar o link por e-mail ao aluno em vez de entregá-lo ao professor, ou auditar o uso. |
| MEL-12 | Média | Segurança | **Reuso de refresh token não é detectado** (refresh antigo só falha; a sessão nova continua viva), logout por falha de rede deixa a sessão do servidor válida por 30 dias, e `ValidarSessao` não confere se o usuário ainda existe. | `sessao.ts` | Revogar a sessão ao detectar reuso, repetir o logout/`sendBeacon`, checar existência do usuário. |
| MEL-13 | Média | Spec × código | **Nota e níveis inconsistentes:** (a) R-45 define nota por gabarito, mas com `notaGeral` (R-48) a `nota` passa a ser **a nota autodeclarada**, e a tela mostra "Acertos" calculado no front pelo gabarito — dois números diferentes na mesma tela; (b) R-27 define I/P/C como interpretação/procedimento/cálculo, enquanto o fallback R-46 (sem opções IPC) classifica por nota (≥ 8 → I…), significado marcado "a confirmar com a equipe"; (c) `desempenhoGeral` e `percentualIncorretas` (R-56/R-57) usam gabarito inexistente nas autoavaliações IPC e retornam `0`. | `envio.ts`, `dto.ts`, `metricas-do-professor.ts`, CLAUDE.md | Fechar com a equipe o significado de I/P/C e de "nota"; remover o fallback por nota ou documentá-lo; esconder "Acertos" quando não há gabarito. |
| MEL-14 | Média | Funcional | **Perfil sem edição de dados nem troca de senha logado**; não há exclusão de conta/exportação (LGPD). | `PerfilModal`, rotas `/perfil` | Casos de uso para alterar nome/e-mail/senha (revogando outras sessões) e solicitação de exclusão. |
| MEL-15 | Baixa | Validação | **Datas sem consistência:** `prazo` pode ser anterior a `publicarEm`/ao agora (formulário já nasce "encerrado"); sem limite de perguntas, tamanho de enunciado/opções/título. | `formulario.ts` | Validar `prazo > publicarEm` e limites de tamanho; testes de domínio. |
| MEL-16 | Baixa | Abuso / UX | `POST /formularios/:id/notificar-pendentes` pode ser repetido sem limite (spam de lembretes) e não há aviso ao aluno removido; `lembrete` não registra última data. | `consultas-formulario.ts` | Intervalo mínimo (ex.: 24 h) ou deduplicação por formulário/aluno. |
| MEL-17 | Média | Concorrência (front) | **Salvamento automático frágil**: cada clique dispara um `PUT` sem fila/debounce; a reversão em caso de erro restaura a lista inteira capturada no clique (`anterior`), desfazendo respostas de outras perguntas, e respostas fora de ordem podem gravar um valor antigo. | `store.tsx` (`salvarResposta`) | Fila serial por pergunta (ou `PUT` com versão), reverter só a pergunta que falhou e indicar "Salvando…/Salvo/Erro". |
| MEL-18 | Baixa | Spec × UI | `notaGeral` é obrigatória na UI mas opcional na API (R-48 "compatibilidade"); a API aceita envio sem nota e sem validar `observacao`. | `servidor.ts` (`envio`), `Aluno.tsx` | Decidir se continua opcional e, se não, exigir na API com teste. |
| MEL-19 | Baixa | Validação | `observacao` do aluno tem `maxLength=500` só no front; a API aceita até 1 MB. Idem `comentario` de pesquisa e nomes de usuário/turma (sem limite). | `Aluno.tsx`, `envio.ts` | Limites no Zod/domínio e testes (`R-xx`). |
| MEL-20 | Baixa | Arquitetura | **Regra de negócio no front**: `acertou`, `calcularNota`, participação, evolução e média do aluno são recalculados em `data/aluno.ts` e `Aluno.tsx`, duplicando o backend (e divergindo, ver MEL-13). | `frontend/src/data/aluno.ts` | Expor esses números numa rota do aluno (ex.: `GET /aluno/desempenho`) com teste `R-xx`. |
| MEL-21 | Baixa | Tratamento de erro (front) | Excluir formulário navega para `/avaliacoes` **mesmo se a API falhar** (o erro é engolido por `executar`); `atualizarPreferencias` é otimista sem reversão. | `Formularios.tsx` (`removerFormulario`), `store.tsx` | Propagar a falha ao modal antes de navegar; reverter preferência no `catch`. |
| MEL-22 | Baixa | UX | Em `PerfilModal`, só "Ícone de acessibilidade" grava na hora; as outras opções só em "Concluir", sem indicar isso; falha deixa o estado global alterado. | `modals.tsx` | Padronizar (salvar ao mudar ou só no Concluir) e reverter em erro. |
| MEL-23 | Baixa | Acessibilidade / UX | Campos do **login** não têm `required` nem validação inline: envio vazio chega à API e mostra "Dados inválidos na requisição.". Após o **cadastro** o usuário vai ao login sem mensagem de sucesso; o resultado `pendente` (aprovação manual) não é comunicado. | `Auth.tsx` | `required`, mensagem "Conta criada" (e "aguarde aprovação") e foco no erro. |
| MEL-24 | Baixa | Tratamento de erro (front) | O sino ignora o erro de carregamento (`useApi.erro` não é exibido) e `useApi` não tem *retry*; falha silenciosa. | `Notificacoes.tsx`, `use-api.ts` | Mostrar estado de erro/"tentar de novo". |
| MEL-25 | Baixa | UX | "Notificar pendentes" fica habilitado para formulário que não está `aberto` e só falha depois (`FORMULARIO_NAO_ABERTO`). | `Formularios.tsx` | Desabilitar com tooltip conforme o status. |
| MEL-26 | Baixa | UX | Quando a sessão não pode ser renovada, o usuário é levado ao login **sem nenhuma explicação**; e o aluno cujo pedido de entrada foi aceito só fica sabendo pelo sino (depende de `notificacoesEmail`, R-113), pois não há lista de "pedidos enviados". | `client.ts`, `App.tsx`, R-113 | Mensagem "Sua sessão expirou" no login e seção "Pedidos enviados" para o aluno. |
| MEL-27 | Média | Segurança (front) | Tokens (access + refresh) guardados em `sessionStorage`: legíveis por qualquer XSS; sem `Content-Security-Policy`. | `store.tsx` (`gravarSessao`) | Cookie `HttpOnly` + `SameSite` para o refresh e CSP restritiva. |
| MEL-28 | Baixa | Tratamento de erro | `Cadastro` e `ConviteLogado` tratam **qualquer** falha de `GET /auth/convites/:codigo` (inclusive rede/500) como "convite inválido ou expirou", e a mensagem fala em expiração embora o código nunca expire nem possa ser regenerado/revogado. | `Auth.tsx`, `consultar-convite.ts` | Distinguir 404 de erro de rede; permitir regenerar/revogar o código e, se houver expiração, documentar. |
| MEL-29 | Baixa | Robustez (front) | Em `/metricas` turma e formulário são resolvidos **pelo nome** (`equipes.find(e => e.nome === turma)`): turmas/formulários homônimos colidem. | `Metricas.tsx` | Usar id nos `FilterSelect`. |
| MEL-30 | Baixa | Correção | A evolução mensal agrupa por `AAAA-MM` em UTC e rotula só com o mês (`MESES[...]`): envios de meses iguais em anos diferentes se confundem na legenda e a virada de mês em Brasília (UTC−3) cai no mês errado. | `metricas-do-professor.ts` | Usar fuso de Brasília e incluir o ano no rótulo; teste em R-57. |
| MEL-31 | Média | Cobertura de testes | **Sem teste**: `NOTA_GERAL_INVALIDA`, `DATA_INVALIDA`, `DATA_OBRIGATORIA`, `FORMULARIO_NAO_ABERTO`, `PERGUNTA_NAO_ENCONTRADA`, `ENVIO_NAO_ENCONTRADO`, `JSON_INVALIDO`, `COR_INVALIDA`, `PREFERENCIA_INVALIDA` (via HTTP), `EMAIL_INVALIDO`/`PAPEL_INVALIDO` por código, `ERRO_INTERNO`; E2E de "sair da equipe" (aluno), de ocultar/exibir equipe do lado do aluno, de FAQ, de pesquisa de satisfação e de métricas por mês; testes de concorrência; testes de componente (Testing Library) das telas (só há 3 testes unitários no front). Os testes de erro existentes frequentemente asseveram só o `status`. | seção 1.3 | Para cada código acima, `it('R-xx …')` com `codigo` e `mensagem`; E2E por RF faltante. |
| MEL-32 | Baixa | Operação / segurança | `docker-compose.yml` sobe `SEED=true`, `EXPOR_CAIXA_DE_SAIDA=true` e `JWT_SECRET: troque-em-producao`; `config.ts` cai em `'segredo-de-desenvolvimento'` se `JWT_SECRET` faltar, sem recusar a inicialização em produção; a seed cria contas conhecidas (`alberto@hastyhelp.dev`, senha `senha1234`). | `docker-compose.yml`, `config.ts`, `seed.ts` | Falhar no boot se `NODE_ENV=production` sem `JWT_SECRET` forte; separar compose de dev e prod; nunca semear/expor caixa de saída em produção. |
| MEL-33 | Baixa | Performance | `GET /turmas/:id` calcula as estatísticas de **todas** as turmas e filtra depois; `materializar` roda `salvar` em leitura (GET com efeito colateral). | `servidor.ts`, `acesso.ts` | Consulta direta por id e materialização por job. |

### Resumo por gravidade
- **Alta:** MEL-01, MEL-02, MEL-10, MEL-11.
- **Média:** MEL-03, MEL-04, MEL-05, MEL-06, MEL-07, MEL-08, MEL-09, MEL-12, MEL-13, MEL-14, MEL-17, MEL-27, MEL-31.
- **Baixa:** MEL-15, MEL-16, MEL-18…MEL-26, MEL-28…MEL-30, MEL-32, MEL-33.

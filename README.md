# HastyHelp

Sistema de autoavaliação para alunos e professores. O aluno indica seu nível de compreensão sobre conteúdos e habilidades; o professor cria as autoavaliações, acompanha resultados individuais e coletivos e identifica dificuldades.

- **Front:** Vite + React 19 + TypeScript + Tailwind v4 (`frontend/`)
- **Back:** Node 24 + TypeScript + Express 5 + PostgreSQL (`backend/`), organizado em DDD
- **Spec do backend (SDD):** [`docs/SPEC-BACKEND.md`](docs/SPEC-BACKEND.md) — cada regra `R-xx` vira teste com o mesmo ID
- **Design system:** [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md) · telas: [`docs/SPEC-TELAS.md`](docs/SPEC-TELAS.md)

## Rodando

```bash
docker compose up -d db          # PostgreSQL em localhost:5433
npm run install:all
SEED=true npm run api            # API em :3333 (migra o banco e cria dados de demonstração)
npm run dev                      # front em :5173 (proxy /api → :3333)
```

Tudo em Docker (banco + API): `docker compose up --build` (API em `http://localhost:3333/api`).

Logins de demonstração (senha `senha1234`): professor `alberto@hastyhelp.dev`; alunos `sarah.chen@`, `james.park@`, `michael.torres@`, `lisa.anderson@hastyhelp.dev`. Links de convite: `/convite/pdm-2026` e `/convite/ea-2026`.

Recuperação de senha: não há envio de e-mail. O link de redefinição vai para a **caixa de saída** (log do servidor e, com `EXPOR_CAIXA_DE_SAIDA=true`, `GET /api/dev/caixa-de-saida?para=<e-mail>`); o professor também pode gerar o link de um aluno da equipe pelo menu `...` da aba Alunos.

## Testes

```bash
npm run api:test                 # backend: domínio, casos de uso e API (Vitest + Supertest, em memória)
npm --prefix backend run test:db # repositórios PostgreSQL (precisa do banco; cria/usa hastyhelp_teste)
npm run test:e2e                 # Playwright (frontend/e2e): front + API + PostgreSQL reais (usa o banco hastyhelp_e2e)
npm run lint && npm run build
```

Bancos auxiliares (uma vez): `docker compose exec db psql -U hastyhelp -d postgres -c "create database hastyhelp_teste"` e o mesmo para `hastyhelp_e2e`.

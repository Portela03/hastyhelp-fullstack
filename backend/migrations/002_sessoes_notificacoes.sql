-- Sessões (access + refresh), redefinição de senha, notificações, caixa de saída e moderação de observações

CREATE TABLE sessoes (
  id            TEXT PRIMARY KEY,
  usuario_id    TEXT NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  refresh_hash  TEXT NOT NULL UNIQUE,
  expira_em     TIMESTAMPTZ NOT NULL,
  revogada_em   TIMESTAMPTZ,
  criada_em     TIMESTAMPTZ NOT NULL
);
CREATE INDEX sessoes_usuario_idx ON sessoes (usuario_id);

CREATE TABLE redefinicoes_senha (
  id          TEXT PRIMARY KEY,
  usuario_id  TEXT NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expira_em   TIMESTAMPTZ NOT NULL,
  usada_em    TIMESTAMPTZ,
  criada_em   TIMESTAMPTZ NOT NULL
);

CREATE TABLE notificacoes (
  id          TEXT PRIMARY KEY,
  usuario_id  TEXT NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL CHECK (tipo IN ('publicacao', 'lembrete', 'conclusao', 'resposta-observacao')),
  titulo      TEXT NOT NULL,
  mensagem    TEXT NOT NULL,
  link        TEXT,
  criada_em   TIMESTAMPTZ NOT NULL,
  lida_em     TIMESTAMPTZ
);
CREATE INDEX notificacoes_usuario_idx ON notificacoes (usuario_id, criada_em DESC);

CREATE TABLE caixa_de_saida (
  id         TEXT PRIMARY KEY,
  para       TEXT NOT NULL,
  assunto    TEXT NOT NULL,
  corpo      TEXT NOT NULL,
  link       TEXT,
  criada_em  TIMESTAMPTZ NOT NULL
);
CREATE INDEX caixa_de_saida_para_idx ON caixa_de_saida (para, criada_em DESC);

ALTER TABLE envios
  ADD COLUMN observacao_oculta   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN resposta_professor  TEXT,
  ADD COLUMN respondida_em       TIMESTAMPTZ;

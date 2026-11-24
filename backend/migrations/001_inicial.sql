-- HastyHelp: esquema inicial (ver docs/SPEC-BACKEND.md, seção 2)

CREATE TABLE usuarios (
  id            TEXT PRIMARY KEY,
  nome          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  senha_hash    TEXT NOT NULL,
  papel         TEXT NOT NULL CHECK (papel IN ('professor', 'aluno')),
  preferencias  JSONB NOT NULL,
  criado_em     TIMESTAMPTZ NOT NULL
);

CREATE TABLE turmas (
  id             TEXT PRIMARY KEY,
  nome           TEXT NOT NULL,
  sigla          TEXT NOT NULL,
  cor            TEXT NOT NULL,
  periodo        TEXT NOT NULL,
  docente_id     TEXT NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  oculta         BOOLEAN NOT NULL DEFAULT FALSE,
  codigo_convite TEXT NOT NULL UNIQUE,
  criada_em      TIMESTAMPTZ NOT NULL
);
CREATE INDEX turmas_docente_idx ON turmas (docente_id);

CREATE TABLE matriculas (
  turma_id TEXT NOT NULL REFERENCES turmas (id) ON DELETE CASCADE,
  aluno_id TEXT NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  PRIMARY KEY (turma_id, aluno_id)
);
CREATE INDEX matriculas_aluno_idx ON matriculas (aluno_id);

CREATE TABLE formularios (
  id               TEXT PRIMARY KEY,
  titulo           TEXT NOT NULL,
  turma_id         TEXT NOT NULL REFERENCES turmas (id) ON DELETE CASCADE,
  status           TEXT NOT NULL CHECK (status IN ('agendado', 'rascunho', 'fechado', 'aberto', 'concluido')),
  publicar_em      TIMESTAMPTZ,
  publicado_em     TIMESTAMPTZ,
  prazo            TIMESTAMPTZ,
  mostrar_gabarito BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em        TIMESTAMPTZ NOT NULL
);
CREATE INDEX formularios_turma_idx ON formularios (turma_id);

CREATE TABLE perguntas (
  id            TEXT PRIMARY KEY,
  formulario_id TEXT NOT NULL REFERENCES formularios (id) ON DELETE CASCADE,
  ordem         INTEGER NOT NULL,
  enunciado     TEXT NOT NULL,
  tipo          TEXT NOT NULL CHECK (tipo IN ('unica', 'multipla')),
  opcoes        JSONB NOT NULL,
  gabarito      JSONB
);
CREATE INDEX perguntas_formulario_idx ON perguntas (formulario_id, ordem);

CREATE TABLE envios (
  id             TEXT PRIMARY KEY,
  formulario_id  TEXT NOT NULL REFERENCES formularios (id) ON DELETE CASCADE,
  aluno_id       TEXT NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  turma_id       TEXT NOT NULL REFERENCES turmas (id) ON DELETE CASCADE,
  status         TEXT NOT NULL CHECK (status IN ('rascunho', 'enviado')),
  respostas      JSONB NOT NULL,
  nota           NUMERIC(4, 1),
  nota_geral     NUMERIC(3, 1),
  compreensao    CHAR(1) CHECK (compreensao IN ('I', 'P', 'C')),
  observacao     TEXT,
  enviado_em     TIMESTAMPTZ,
  atualizado_em  TIMESTAMPTZ NOT NULL,
  UNIQUE (formulario_id, aluno_id)
);
CREATE INDEX envios_aluno_idx ON envios (aluno_id);
CREATE INDEX envios_turma_idx ON envios (turma_id);

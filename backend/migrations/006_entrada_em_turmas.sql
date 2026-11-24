-- Entrada em turmas: aprovação manual, solicitações por código e convites por e-mail (R-100…R-114)

ALTER TABLE turmas ADD COLUMN aprovacao_manual BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE entradas_turma (
  id           TEXT PRIMARY KEY,
  turma_id     TEXT NOT NULL REFERENCES turmas (id) ON DELETE CASCADE,
  aluno_id     TEXT NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  origem       TEXT NOT NULL CHECK (origem IN ('codigo', 'convite')),
  status       TEXT NOT NULL CHECK (status IN ('pendente', 'aceita', 'recusada', 'cancelada')),
  criada_em    TIMESTAMPTZ NOT NULL,
  resolvida_em TIMESTAMPTZ
);
-- no máximo uma entrada pendente por aluno em cada turma
CREATE UNIQUE INDEX entradas_turma_pendente_idx ON entradas_turma (turma_id, aluno_id) WHERE status = 'pendente';
CREATE INDEX entradas_turma_aluno_idx ON entradas_turma (aluno_id) WHERE status = 'pendente';

ALTER TABLE notificacoes DROP CONSTRAINT notificacoes_tipo_check;
ALTER TABLE notificacoes ADD CONSTRAINT notificacoes_tipo_check
  CHECK (tipo IN ('publicacao', 'lembrete', 'conclusao', 'resposta-observacao', 'convite-turma', 'solicitacao-entrada', 'entrada-resolvida'));

-- romprofcont — schema inicial (Neon Postgres)
-- Espelha o app Skip: contabilidades, profissionais, obrigações, documentos

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Usuários (login interno)
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Contabilidades (escritórios parceiros)
-- ---------------------------------------------------------------------------
CREATE TABLE contabilidades (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  cnpj       TEXT,
  email      TEXT,
  phone      TEXT,
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contabilidades_cnpj ON contabilidades (cnpj);

-- ---------------------------------------------------------------------------
-- Profissionais (Base Mestre — cadastro de parceiros/PJ)
-- ---------------------------------------------------------------------------
CREATE TABLE profissionais (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contabilidade_id UUID NOT NULL REFERENCES contabilidades (id) ON DELETE RESTRICT,
  name             TEXT NOT NULL,
  cnpj             TEXT,
  cpf              TEXT,
  email            TEXT,
  regime           TEXT,
  active           BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profissionais_contabilidade ON profissionais (contabilidade_id);
CREATE INDEX idx_profissionais_cnpj ON profissionais (cnpj);

-- ---------------------------------------------------------------------------
-- Obrigações esperadas por profissional (Base Mestre)
-- ---------------------------------------------------------------------------
CREATE TYPE periodicidade AS ENUM ('Mensal', 'Trimestral', 'Semestral', 'Anual');

CREATE TABLE obrigacoes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profissional_id UUID NOT NULL REFERENCES profissionais (id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  tipo            TEXT,
  periodicidade   periodicidade NOT NULL DEFAULT 'Mensal',
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_obrigacoes_profissional ON obrigacoes (profissional_id);

-- ---------------------------------------------------------------------------
-- Documentos / notas recebidas
-- ---------------------------------------------------------------------------
CREATE TYPE documento_status AS ENUM (
  'aprovado',
  'pendente_validacao',
  'reprovado',
  'nao_identificado',
  'arquivado'
);

CREATE TABLE documentos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profissional_id  UUID REFERENCES profissionais (id) ON DELETE SET NULL,
  contabilidade_id UUID REFERENCES contabilidades (id) ON DELETE SET NULL,
  obrigacao_id     UUID REFERENCES obrigacoes (id) ON DELETE SET NULL,
  competencia      TEXT NOT NULL, -- ex: 2026-01
  status           documento_status NOT NULL DEFAULT 'pendente_validacao',
  tipo_arquivo     TEXT,          -- xml | pdf
  file_name        TEXT,
  file_path        TEXT,          -- storage key (S3/Vercel Blob)
  file_size        INTEGER,
  -- metadados extraídos da NF
  emitente_cnpj    TEXT,
  destinatario_cnpj TEXT,
  valor            NUMERIC(14, 2),
  chave_nfe        TEXT,
  metadata         JSONB NOT NULL DEFAULT '{}',
  origem           TEXT NOT NULL DEFAULT 'manual', -- manual | email | upload
  email_log_id     UUID,
  observacoes      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documentos_competencia ON documentos (competencia);
CREATE INDEX idx_documentos_status ON documentos (status);
CREATE INDEX idx_documentos_profissional ON documentos (profissional_id);
CREATE INDEX idx_documentos_contabilidade ON documentos (contabilidade_id);

-- ---------------------------------------------------------------------------
-- Log de e-mails recebidos (integração impostoparceiro@)
-- ---------------------------------------------------------------------------
CREATE TYPE email_log_status AS ENUM ('pending', 'processed', 'error');

CREATE TABLE email_logs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id         TEXT,
  remetente          TEXT NOT NULL,
  assunto            TEXT,
  corpo              TEXT,
  status             email_log_status NOT NULL DEFAULT 'pending',
  documentos_criados INTEGER NOT NULL DEFAULT 0,
  erro               TEXT,
  raw_payload        JSONB,
  received_at        TIMESTAMPTZ,
  processed_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_logs_status ON email_logs (status);
CREATE INDEX idx_email_logs_message_id ON email_logs (message_id);

ALTER TABLE documentos
  ADD CONSTRAINT fk_documentos_email_log
  FOREIGN KEY (email_log_id) REFERENCES email_logs (id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Trigger updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_contabilidades_updated_at
  BEFORE UPDATE ON contabilidades FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_profissionais_updated_at
  BEFORE UPDATE ON profissionais FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_obrigacoes_updated_at
  BEFORE UPDATE ON obrigacoes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_documentos_updated_at
  BEFORE UPDATE ON documentos FOR EACH ROW EXECUTE FUNCTION set_updated_at();

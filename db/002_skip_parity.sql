-- Skip parity migration: align schema with original PocketBase collections

ALTER TABLE profissionais
  ADD COLUMN IF NOT EXISTS unidade TEXT DEFAULT 'ROM Brasil',
  ADD COLUMN IF NOT EXISTS regime_tributario TEXT DEFAULT 'Simples Nacional',
  ADD COLUMN IF NOT EXISTS email_contabilidade TEXT,
  ADD COLUMN IF NOT EXISTS skip_id TEXT;

ALTER TABLE contabilidades
  ADD COLUMN IF NOT EXISTS skip_id TEXT;

ALTER TABLE obrigacoes
  ADD COLUMN IF NOT EXISTS valor_esperado NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS vencimento TEXT DEFAULT 'Dia 20 de cada mês',
  ADD COLUMN IF NOT EXISTS regras TEXT DEFAULT 'Padrão (tolerância 5%)',
  ADD COLUMN IF NOT EXISTS skip_id TEXT;

ALTER TABLE obrigacoes ALTER COLUMN name DROP NOT NULL;

ALTER TABLE documentos
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS tipo TEXT,
  ADD COLUMN IF NOT EXISTS motivo TEXT,
  ADD COLUMN IF NOT EXISTS acao_necessaria TEXT,
  ADD COLUMN IF NOT EXISTS data_vencimento TEXT,
  ADD COLUMN IF NOT EXISTS unidade TEXT,
  ADD COLUMN IF NOT EXISTS validacoes JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS skip_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_contabilidades_skip_id ON contabilidades (skip_id) WHERE skip_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profissionais_skip_id ON profissionais (skip_id) WHERE skip_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_obrigacoes_skip_id ON obrigacoes (skip_id) WHERE skip_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_documentos_skip_id ON documentos (skip_id) WHERE skip_id IS NOT NULL;

import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const periodicidadeEnum = pgEnum("periodicidade", [
  "Mensal",
  "Trimestral",
  "Semestral",
  "Anual",
]);

export const documentoStatusEnum = pgEnum("documento_status", [
  "aprovado",
  "pendente_validacao",
  "reprovado",
  "nao_identificado",
  "arquivado",
]);

export const emailLogStatusEnum = pgEnum("email_log_status", [
  "pending",
  "processed",
  "error",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const contabilidades = pgTable("contabilidades", {
  id: uuid("id").primaryKey().defaultRandom(),
  skipId: text("skip_id"),
  name: text("name").notNull(),
  cnpj: text("cnpj"),
  email: text("email"),
  phone: text("phone"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const profissionais = pgTable("profissionais", {
  id: uuid("id").primaryKey().defaultRandom(),
  skipId: text("skip_id"),
  contabilidadeId: uuid("contabilidade_id")
    .notNull()
    .references(() => contabilidades.id),
  name: text("name").notNull(),
  cnpj: text("cnpj"),
  cpf: text("cpf"),
  email: text("email"),
  regime: text("regime"),
  unidade: text("unidade").default("ROM Brasil"),
  regimeTributario: text("regime_tributario").default("Simples Nacional"),
  emailContabilidade: text("email_contabilidade"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const obrigacoes = pgTable("obrigacoes", {
  id: uuid("id").primaryKey().defaultRandom(),
  skipId: text("skip_id"),
  profissionalId: uuid("profissional_id")
    .notNull()
    .references(() => profissionais.id, { onDelete: "cascade" }),
  name: text("name"),
  tipo: text("tipo"),
  valorEsperado: numeric("valor_esperado", { precision: 14, scale: 2 }),
  vencimento: text("vencimento").default("Dia 20 de cada mês"),
  regras: text("regras").default("Padrão (tolerância 5%)"),
  periodicidade: periodicidadeEnum("periodicidade").notNull().default("Mensal"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const emailLogs = pgTable("email_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: text("message_id"),
  remetente: text("remetente").notNull(),
  assunto: text("assunto"),
  corpo: text("corpo"),
  status: emailLogStatusEnum("status").notNull().default("pending"),
  documentosCriados: integer("documentos_criados").notNull().default(0),
  erro: text("erro"),
  rawPayload: jsonb("raw_payload"),
  receivedAt: timestamp("received_at", { withTimezone: true }),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const documentos = pgTable("documentos", {
  id: uuid("id").primaryKey().defaultRandom(),
  skipId: text("skip_id"),
  profissionalId: uuid("profissional_id").references(() => profissionais.id),
  contabilidadeId: uuid("contabilidade_id").references(() => contabilidades.id),
  obrigacaoId: uuid("obrigacao_id").references(() => obrigacoes.id),
  competencia: text("competencia").notNull(),
  status: documentoStatusEnum("status").notNull().default("pendente_validacao"),
  cnpj: text("cnpj"),
  tipo: text("tipo"),
  tipoArquivo: text("tipo_arquivo"),
  fileName: text("file_name"),
  filePath: text("file_path"),
  fileSize: integer("file_size"),
  emitenteCnpj: text("emitente_cnpj"),
  destinatarioCnpj: text("destinatario_cnpj"),
  valor: numeric("valor", { precision: 14, scale: 2 }),
  chaveNfe: text("chave_nfe"),
  motivo: text("motivo"),
  acaoNecessaria: text("acao_necessaria"),
  dataVencimento: text("data_vencimento"),
  unidade: text("unidade"),
  validacoes: jsonb("validacoes").notNull().default([]),
  metadata: jsonb("metadata").notNull().default({}),
  origem: text("origem").notNull().default("manual"),
  emailLogId: uuid("email_log_id").references(() => emailLogs.id),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

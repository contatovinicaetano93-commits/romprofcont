import { documentos, obrigacoes, profissionais } from "@/db/schema";
import { getDb } from "@/lib/db";
import {
  extractCnpjFromText,
  extractFromXml,
  extractValorFromText,
  guessTipoFromText,
  validateDocument,
} from "@/lib/validate-document";

type ProcessOptions = {
  text: string;
  fileName?: string;
  hint?: string;
  emailLogId?: string;
};

async function loadValidationContext() {
  const db = getDb();
  const [profs, obrs] = await Promise.all([
    db.select().from(profissionais),
    db.select().from(obrigacoes),
  ]);
  return { profs, obrs };
}

function extractFromContent(text: string, fileName?: string, hint = "") {
  const combined = `${text}\n${hint}`;
  const isXml =
    (fileName?.toLowerCase().endsWith(".xml") ?? false) ||
    text.includes("<nfeProc") ||
    text.includes("<NFe") ||
    text.includes("<?xml");

  if (isXml) {
    return extractFromXml(text);
  }

  return {
    cnpj: extractCnpjFromText(combined),
    tipo: guessTipoFromText(combined),
    valor: extractValorFromText(combined),
    competencia: undefined as string | undefined,
  };
}

export async function processInboundDocument(options: ProcessOptions) {
  const { text, fileName, hint = "", emailLogId } = options;
  if (!text.trim()) return null;

  const extracted = extractFromContent(text, fileName, hint);
  const { profs, obrs } = await loadValidationContext();

  const result = validateDocument(
    extracted,
    profs.map((p) => ({
      id: p.id,
      name: p.name,
      cnpj: p.cnpj,
      contabilidadeId: p.contabilidadeId,
      unidade: p.unidade,
    })),
    obrs.map((o) => ({
      id: o.id,
      profissionalId: o.profissionalId,
      tipo: o.tipo,
      valorEsperado: o.valorEsperado,
      regras: o.regras,
    })),
  );

  const competencia =
    result.competencia ||
    `${String(new Date().getMonth() + 1).padStart(2, "0")}/${new Date().getFullYear()}`;

  const [row] = await getDb()
    .insert(documentos)
    .values({
      profissionalId: result.profissionalId,
      contabilidadeId: result.contabilidadeId,
      obrigacaoId: result.obrigacaoId,
      competencia,
      status: result.status,
      cnpj: result.cnpj || null,
      tipo: result.tipo,
      tipoArquivo: fileName?.split(".").pop()?.toLowerCase() ?? null,
      fileName: fileName ?? null,
      valor: result.valor ? String(result.valor) : null,
      motivo: result.motivo,
      acaoNecessaria: result.acaoNecessaria,
      unidade: result.unidade,
      validacoes: result.validacoes,
      origem: "email",
      emailLogId: emailLogId ?? null,
      metadata: { source: "imap", fileName: fileName ?? null },
    })
    .returning({ id: documentos.id });

  return row?.id ?? null;
}

export async function processInboundParts(
  parts: Array<{ text: string; fileName?: string }>,
  hint: string,
  emailLogId?: string,
) {
  let count = 0;
  for (const part of parts) {
    const id = await processInboundDocument({
      text: part.text,
      fileName: part.fileName,
      hint,
      emailLogId,
    });
    if (id) count += 1;
  }
  return count;
}

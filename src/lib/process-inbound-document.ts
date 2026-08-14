import { documentos, obrigacoes, profissionais } from "@/db/schema";
import { getDb } from "@/lib/db";
import { extractFromContent } from "@/lib/extract-document-fields";
import { validateDocument } from "@/lib/validate-document";

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

function hasMinimalData(extracted: ReturnType<typeof extractFromContent>, fileName?: string) {
  if (extracted.cnpj || extracted.valor || extracted.competencia) return true;
  if (fileName && fileName !== "corpo-email.txt" && guessAttachmentName(fileName)) {
    return true;
  }
  return false;
}

function guessAttachmentName(fileName: string) {
  return /\.(pdf|xml)$/i.test(fileName);
}

function guessTipoFromText(text: string): string {
  const upper = text.toUpperCase();
  if (upper.includes("DAS")) return "DAS";
  if (upper.includes("DARF")) return "DARF";
  return "Outros";
}

export async function processInboundDocument(options: ProcessOptions) {
  const { text, fileName, hint = "", emailLogId } = options;
  const isBodyOnly = fileName === "corpo-email.txt";

  if (!text.trim() && !fileName) return null;

  const extracted = extractFromContent(text, fileName, hint);
  if (!hasMinimalData(extracted, fileName)) return null;

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
    extracted.competencia ||
    `${String(new Date().getMonth() + 1).padStart(2, "0")}/${new Date().getFullYear()}`;

  const tipo =
    result.tipo !== "Outros"
      ? result.tipo
      : isBodyOnly
        ? guessTipoFromText(`${hint}\n${text}`)
        : guessTipoFromText(fileName ?? text);

  const [row] = await getDb()
    .insert(documentos)
    .values({
      profissionalId: result.profissionalId,
      contabilidadeId: result.contabilidadeId,
      obrigacaoId: result.obrigacaoId,
      competencia,
      status: result.status,
      cnpj: result.cnpj || extracted.cnpj || null,
      tipo,
      tipoArquivo: fileName?.split(".").pop()?.toLowerCase() ?? null,
      fileName: fileName ?? null,
      valor: (result.valor || extracted.valor) ? String(result.valor || extracted.valor) : null,
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
  const attachmentParts = parts.filter((p) => p.fileName !== "corpo-email.txt");
  const bodyPart = parts.find((p) => p.fileName === "corpo-email.txt");
  const bodyHint = bodyPart ? `${hint}\n${bodyPart.text}` : hint;

  const toProcess =
    attachmentParts.length > 0
      ? attachmentParts
      : bodyPart
        ? [bodyPart]
        : [];

  let count = 0;
  for (const part of toProcess) {
    const id = await processInboundDocument({
      text: part.text,
      fileName: part.fileName,
      hint: bodyHint,
      emailLogId,
    });
    if (id) count += 1;
  }
  return count;
}

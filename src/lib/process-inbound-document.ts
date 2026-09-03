import { documentos, obrigacoes, profissionais } from "@/db/schema";
import { getDb } from "@/lib/db";
import {
  classifyInboundDocument,
  isGuiaImposto,
  tipoFromKind,
} from "@/lib/classify-inbound-document";
import { extractFromContent, pickMatchingCnpj } from "@/lib/extract-document-fields";
import { validateDocument } from "@/lib/validate-document";

type ProcessOptions = {
  text: string;
  fileName?: string;
  hint?: string;
  emailLogId?: string;
  folder?: string;
  contabilidadeId?: string | null;
  origem?: "email" | "upload";
};

export type InboundContext = {
  folder?: string;
  contabilidadeId?: string | null;
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
  if (fileName && guessAttachmentName(fileName)) {
    return true;
  }
  return false;
}

function guessAttachmentName(fileName: string) {
  return /\.(pdf|xml)$/i.test(fileName);
}

export async function processInboundDocument(options: ProcessOptions) {
  const { text, fileName, hint = "", emailLogId, folder, origem = "email" } = options;
  const kind = classifyInboundDocument(fileName, text);
  if (!isGuiaImposto(kind)) return null;

  if (!text.trim() && !fileName) return null;

  const extracted = extractFromContent(text, fileName, hint);
  const { profs, obrs } = await loadValidationContext();
  const cnpj =
    pickMatchingCnpj(
      [fileName ?? "", text],
      profs.map((profissional) => profissional.cnpj),
    ) ?? extracted.cnpj;
  const typed = {
    ...extracted,
    cnpj,
    tipo: tipoFromKind(kind),
  };
  if (!hasMinimalData(typed, fileName)) return null;

  const result = validateDocument(
    typed,
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
    typed.competencia ||
    `${String(new Date().getMonth() + 1).padStart(2, "0")}/${new Date().getFullYear()}`;

  const tipo = tipoFromKind(kind);

  const contabilidadeId = result.profissionalId
    ? result.contabilidadeId
    : (result.contabilidadeId ?? options.contabilidadeId ?? null);

  const [row] = await getDb()
    .insert(documentos)
    .values({
      profissionalId: result.profissionalId,
      contabilidadeId,
      obrigacaoId: result.obrigacaoId,
      competencia,
      status: result.status,
      cnpj: result.cnpj || typed.cnpj || null,
      tipo,
      tipoArquivo: fileName?.split(".").pop()?.toLowerCase() ?? null,
      fileName: fileName ?? null,
      valor: (result.valor || typed.valor) ? String(result.valor || typed.valor) : null,
      motivo: result.motivo,
      acaoNecessaria: result.acaoNecessaria,
      unidade: result.unidade,
      validacoes: result.validacoes,
      origem,
      emailLogId: emailLogId ?? null,
      metadata: {
        source: origem === "upload" ? "upload" : "imap",
        fileName: fileName ?? null,
        folder: folder ?? null,
        kind,
      },
    })
    .returning({ id: documentos.id });

  return row?.id ?? null;
}

export async function processInboundParts(
  parts: Array<{ text: string; fileName?: string }>,
  hint: string,
  emailLogId?: string,
  context?: InboundContext,
) {
  const attachmentParts = parts.filter((p) => p.fileName !== "corpo-email.txt");
  const bodyPart = parts.find((p) => p.fileName === "corpo-email.txt");
  const bodyHint = bodyPart ? `${hint}\n${bodyPart.text}` : hint;
  const toProcess = attachmentParts;

  let count = 0;
  for (const part of toProcess) {
    const id = await processInboundDocument({
      text: part.text,
      fileName: part.fileName,
      hint: bodyHint,
      emailLogId,
      folder: context?.folder,
      contabilidadeId: context?.contabilidadeId,
    });
    if (id) count += 1;
  }
  return count;
}

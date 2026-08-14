import { contabilidades, documentos, obrigacoes, profissionais } from "@/db/schema";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { extractFromContent } from "@/lib/extract-document-fields";
import { validateDocument } from "@/lib/validate-document";

async function loadValidationContext() {
  const db = getDb();
  const [profs, obrs] = await Promise.all([
    db.select().from(profissionais),
    db.select().from(obrigacoes),
  ]);
  return { profs, obrs };
}

export async function POST(request: Request) {
  await requireSession();
  const form = await request.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  const hint = String(form.get("text") ?? "");

  if (files.length === 0) {
    return Response.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  }

  const { profs, obrs } = await loadValidationContext();
  let count = 0;

  for (const file of files) {
    const buffer = await file.arrayBuffer();
    const text = new TextDecoder().decode(buffer);
    const extracted = extractFromContent(text, file.name, hint);

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

    await getDb().insert(documentos).values({
      profissionalId: result.profissionalId,
      contabilidadeId: result.contabilidadeId,
      obrigacaoId: result.obrigacaoId,
      competencia,
      status: result.status,
      cnpj: result.cnpj || null,
      tipo: result.tipo,
      tipoArquivo: file.name.split(".").pop()?.toLowerCase() ?? null,
      fileName: file.name,
      valor: result.valor ? String(result.valor) : null,
      motivo: result.motivo,
      acaoNecessaria: result.acaoNecessaria,
      unidade: result.unidade,
      validacoes: result.validacoes,
      origem: "upload",
    });
    count += 1;
  }

  return Response.json({ count });
}

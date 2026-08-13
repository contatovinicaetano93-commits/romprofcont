import { documentos, obrigacoes, profissionais } from "@/db/schema";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import {
  extractCnpjFromText,
  extractValorFromText,
  guessTipoFromText,
  validateDocument,
} from "@/lib/validate-document";

export async function POST(request: Request) {
  await requireSession();
  const { content } = await request.json();

  if (!content || String(content).trim().length < 10) {
    return Response.json({ error: "Conteúdo muito curto." }, { status: 400 });
  }

  const text = String(content);
  const db = getDb();
  const [profs, obrs] = await Promise.all([
    db.select().from(profissionais),
    db.select().from(obrigacoes),
  ]);

  const extracted = {
    cnpj: extractCnpjFromText(text),
    tipo: guessTipoFromText(text),
    valor: extractValorFromText(text),
    competencia: undefined as string | undefined,
  };

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

  await db.insert(documentos).values({
    profissionalId: result.profissionalId,
    contabilidadeId: result.contabilidadeId,
    obrigacaoId: result.obrigacaoId,
    competencia,
    status: result.status,
    cnpj: result.cnpj || null,
    tipo: result.tipo,
    valor: result.valor ? String(result.valor) : null,
    motivo: result.motivo,
    acaoNecessaria: result.acaoNecessaria,
    unidade: result.unidade,
    validacoes: result.validacoes,
    origem: "email",
    metadata: { source: "paste" },
  });

  return Response.json({ count: 1 });
}

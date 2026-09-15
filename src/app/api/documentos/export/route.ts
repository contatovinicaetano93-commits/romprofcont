import { desc, eq } from "drizzle-orm";
import {
  contabilidades,
  documentos,
  profissionais,
} from "@/db/schema";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { buildConferenciaRows } from "@/lib/conferencia-export";
import { writeConferenciaXlsx } from "@/lib/conferencia-xlsx";
import { currentCompetencia } from "@/lib/competencia";

export const runtime = "nodejs";

export async function GET(request: Request) {
  await requireSession();
  const competencia =
    new URL(request.url).searchParams.get("competencia")?.trim() ||
    currentCompetencia();

  const db = getDb();
  const [profs, docs] = await Promise.all([
    db
      .select({
        profissional: profissionais,
        contabilidadeName: contabilidades.name,
      })
      .from(profissionais)
      .leftJoin(contabilidades, eq(profissionais.contabilidadeId, contabilidades.id)),
    db.select().from(documentos).orderBy(desc(documentos.createdAt)),
  ]);

  const rows = buildConferenciaRows(
    profs.map((row) => ({
      id: row.profissional.id,
      name: row.profissional.name,
      cnpj: row.profissional.cnpj,
      unidade: row.profissional.unidade,
      regimeTributario: row.profissional.regimeTributario,
      contabilidadeName: row.contabilidadeName,
    })),
    docs.map((doc) => ({
      profissionalId: doc.profissionalId,
      competencia: doc.competencia,
      status: doc.status,
      tipo: doc.tipo,
      valor: doc.valor,
      fileName: doc.fileName,
      metadata: doc.metadata,
    })),
    competencia,
  );

  const file = await writeConferenciaXlsx(rows, competencia);
  return new Response(new Uint8Array(file.buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${file.fileName}"`,
    },
  });
}

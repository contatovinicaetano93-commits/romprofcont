import { desc, eq } from "drizzle-orm";
import {
  contabilidades,
  documentos,
  emailLogs,
  profissionais,
} from "@/db/schema";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { buildConferenciaRows } from "@/lib/conferencia-export";
import { writeConferenciaXlsx } from "@/lib/conferencia-xlsx";
import { competenciaForDocumento, currentCompetencia } from "@/lib/competencia";

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
    db
      .select({
        documento: documentos,
        emailSentAt: emailLogs.receivedAt,
      })
      .from(documentos)
      .leftJoin(emailLogs, eq(documentos.emailLogId, emailLogs.id))
      .orderBy(desc(documentos.createdAt)),
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
    docs.map((row) => ({
      profissionalId: row.documento.profissionalId,
      competencia: competenciaForDocumento({
        competencia: row.documento.competencia,
        emailSentAt: row.emailSentAt,
      }),
      status: row.documento.status,
      tipo: row.documento.tipo,
      valor: row.documento.valor,
      fileName: row.documento.fileName,
      metadata: row.documento.metadata,
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

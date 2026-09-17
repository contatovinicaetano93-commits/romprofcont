import { desc, eq } from "drizzle-orm";
import {
  contabilidades,
  documentos,
  emailLogs,
  profissionais,
} from "@/db/schema";
import { getDb } from "@/lib/db";
import { competenciaForDocumento } from "@/lib/competencia";
import { requireSession } from "@/lib/require-session";

export async function GET() {
  await requireSession();
  const rows = await getDb()
    .select({
      documento: documentos,
      profissionalName: profissionais.name,
      contabilidadeName: contabilidades.name,
      emailSentAt: emailLogs.receivedAt,
    })
    .from(documentos)
    .leftJoin(profissionais, eq(documentos.profissionalId, profissionais.id))
    .leftJoin(contabilidades, eq(documentos.contabilidadeId, contabilidades.id))
    .leftJoin(emailLogs, eq(documentos.emailLogId, emailLogs.id))
    .orderBy(desc(documentos.createdAt));

  return Response.json(
    rows.map((r) => ({
      ...r.documento,
      competencia: competenciaForDocumento({
        competencia: r.documento.competencia,
        emailSentAt: r.emailSentAt,
      }),
      profissionalName: r.profissionalName,
      contabilidadeName: r.contabilidadeName,
    })),
  );
}

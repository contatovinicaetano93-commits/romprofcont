import { desc, eq } from "drizzle-orm";
import {
  contabilidades,
  documentos,
  profissionais,
} from "@/db/schema";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/require-session";

export async function GET() {
  await requireSession();
  const rows = await getDb()
    .select({
      documento: documentos,
      profissionalName: profissionais.name,
      contabilidadeName: contabilidades.name,
    })
    .from(documentos)
    .leftJoin(profissionais, eq(documentos.profissionalId, profissionais.id))
    .leftJoin(contabilidades, eq(documentos.contabilidadeId, contabilidades.id))
    .orderBy(desc(documentos.createdAt));

  return Response.json(
    rows.map((r) => ({
      ...r.documento,
      profissionalName: r.profissionalName,
      contabilidadeName: r.contabilidadeName,
    })),
  );
}

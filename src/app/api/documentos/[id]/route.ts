import { eq } from "drizzle-orm";
import { z } from "zod";
import { documentos } from "@/db/schema";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/require-session";

const updateSchema = z.object({
  status: z.enum([
    "aprovado",
    "pendente_validacao",
    "reprovado",
    "nao_identificado",
    "arquivado",
  ]),
  motivo: z.string().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  await requireSession();
  const { id } = await params;
  const body = updateSchema.parse(await request.json());
  const [row] = await getDb()
    .update(documentos)
    .set({
      status: body.status,
      motivo: body.motivo ?? null,
    })
    .where(eq(documentos.id, id))
    .returning();
  return Response.json(row);
}

export async function DELETE(_request: Request, { params }: Params) {
  await requireSession();
  const { id } = await params;
  await getDb().delete(documentos).where(eq(documentos.id, id));
  return Response.json({ ok: true });
}

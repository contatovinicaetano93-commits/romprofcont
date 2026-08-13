import { eq } from "drizzle-orm";
import { z } from "zod";
import { obrigacoes } from "@/db/schema";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { OBRIGACAO_TIPOS } from "@/lib/types";

const schema = z.object({
  profissionalId: z.string().uuid(),
  tipo: z.enum(OBRIGACAO_TIPOS as unknown as [string, ...string[]]),
  valorEsperado: z.string().min(1),
  periodicidade: z.enum(["Mensal", "Trimestral", "Anual"]),
  vencimento: z.string().optional(),
  regras: z.string().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  await requireSession();
  const { id } = await params;
  const body = schema.parse(await request.json());
  const [row] = await getDb()
    .update(obrigacoes)
    .set({
      profissionalId: body.profissionalId,
      tipo: body.tipo,
      name: body.tipo,
      valorEsperado: body.valorEsperado,
      periodicidade: body.periodicidade,
      vencimento: body.vencimento,
      regras: body.regras,
    })
    .where(eq(obrigacoes.id, id))
    .returning();
  return Response.json(row);
}

export async function DELETE(_request: Request, { params }: Params) {
  await requireSession();
  const { id } = await params;
  await getDb().delete(obrigacoes).where(eq(obrigacoes.id, id));
  return Response.json({ ok: true });
}

import { eq } from "drizzle-orm";
import { z } from "zod";
import { profissionais } from "@/db/schema";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { REGIMES, UNIDADES } from "@/lib/types";

const schema = z.object({
  name: z.string().min(1),
  cnpj: z.string().min(1),
  cpf: z.string().optional(),
  contabilidadeId: z.string().uuid(),
  unidade: z.enum(UNIDADES),
  regimeTributario: z.enum(REGIMES),
  emailContabilidade: z.string().email().optional().or(z.literal("")),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  await requireSession();
  const { id } = await params;
  const body = schema.parse(await request.json());
  const [row] = await getDb()
    .update(profissionais)
    .set({
      name: body.name.trim(),
      cnpj: body.cnpj.trim(),
      cpf: body.cpf?.trim() || null,
      contabilidadeId: body.contabilidadeId,
      unidade: body.unidade,
      regimeTributario: body.regimeTributario,
      emailContabilidade: body.emailContabilidade?.trim() || null,
    })
    .where(eq(profissionais.id, id))
    .returning();
  return Response.json(row);
}

export async function DELETE(_request: Request, { params }: Params) {
  await requireSession();
  const { id } = await params;
  await getDb().delete(profissionais).where(eq(profissionais.id, id));
  return Response.json({ ok: true });
}

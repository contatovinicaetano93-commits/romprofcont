import { eq } from "drizzle-orm";
import { z } from "zod";
import { contabilidades } from "@/db/schema";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/require-session";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  cnpj: z.string().optional(),
  phone: z.string().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  await requireSession();
  const { id } = await params;
  const body = schema.parse(await request.json());
  const [row] = await getDb()
    .update(contabilidades)
    .set({
      name: body.name.trim(),
      email: body.email?.trim() || null,
      cnpj: body.cnpj?.trim() || null,
      phone: body.phone?.trim() || null,
    })
    .where(eq(contabilidades.id, id))
    .returning();
  return Response.json(row);
}

export async function DELETE(_request: Request, { params }: Params) {
  await requireSession();
  const { id } = await params;
  await getDb().delete(contabilidades).where(eq(contabilidades.id, id));
  return Response.json({ ok: true });
}

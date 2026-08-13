import { asc, eq } from "drizzle-orm";
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

export async function GET() {
  await requireSession();
  const rows = await getDb()
    .select()
    .from(contabilidades)
    .orderBy(asc(contabilidades.name));
  return Response.json(rows);
}

export async function POST(request: Request) {
  await requireSession();
  const body = schema.parse(await request.json());
  const [row] = await getDb()
    .insert(contabilidades)
    .values({
      name: body.name.trim(),
      email: body.email?.trim() || null,
      cnpj: body.cnpj?.trim() || null,
      phone: body.phone?.trim() || null,
    })
    .returning();
  return Response.json(row, { status: 201 });
}

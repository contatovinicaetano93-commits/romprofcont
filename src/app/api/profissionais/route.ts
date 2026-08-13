import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { contabilidades, profissionais } from "@/db/schema";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { REGIMES, UNIDADES } from "@/lib/types";

const schema = z.object({
  name: z.string().min(1),
  cnpj: z.string().min(1),
  cpf: z.string().optional(),
  contabilidadeId: z.string().uuid(),
  unidade: z.enum(UNIDADES).default("ROM Brasil"),
  regimeTributario: z.enum(REGIMES).default("Simples Nacional"),
  emailContabilidade: z.string().email().optional().or(z.literal("")),
});

export async function GET() {
  await requireSession();
  const rows = await getDb()
    .select({
      profissional: profissionais,
      contabilidadeName: contabilidades.name,
    })
    .from(profissionais)
    .leftJoin(contabilidades, eq(profissionais.contabilidadeId, contabilidades.id))
    .orderBy(asc(profissionais.name));

  return Response.json(
    rows.map((r) => ({
      ...r.profissional,
      contabilidadeName: r.contabilidadeName,
    })),
  );
}

export async function POST(request: Request) {
  await requireSession();
  const body = schema.parse(await request.json());
  const [row] = await getDb()
    .insert(profissionais)
    .values({
      name: body.name.trim(),
      cnpj: body.cnpj.trim(),
      cpf: body.cpf?.trim() || null,
      contabilidadeId: body.contabilidadeId,
      unidade: body.unidade,
      regimeTributario: body.regimeTributario,
      emailContabilidade: body.emailContabilidade?.trim() || null,
    })
    .returning();
  return Response.json(row, { status: 201 });
}

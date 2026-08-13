import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { obrigacoes, profissionais } from "@/db/schema";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { OBRIGACAO_TIPOS } from "@/lib/types";

const schema = z.object({
  profissionalId: z.string().uuid(),
  tipo: z.enum(OBRIGACAO_TIPOS as unknown as [string, ...string[]]),
  valorEsperado: z.string().min(1),
  periodicidade: z.enum(["Mensal", "Trimestral", "Anual"]).default("Mensal"),
  vencimento: z.string().optional(),
  regras: z.string().optional(),
});

export async function GET() {
  await requireSession();
  const rows = await getDb()
    .select({
      obrigacao: obrigacoes,
      profissionalName: profissionais.name,
    })
    .from(obrigacoes)
    .leftJoin(profissionais, eq(obrigacoes.profissionalId, profissionais.id))
    .orderBy(desc(obrigacoes.createdAt));

  return Response.json(
    rows.map((r) => ({
      ...r.obrigacao,
      profissionalName: r.profissionalName,
    })),
  );
}

export async function POST(request: Request) {
  await requireSession();
  const body = schema.parse(await request.json());
  const [row] = await getDb()
    .insert(obrigacoes)
    .values({
      profissionalId: body.profissionalId,
      tipo: body.tipo,
      name: body.tipo,
      valorEsperado: body.valorEsperado,
      periodicidade: body.periodicidade,
      vencimento: body.vencimento ?? "Dia 20 de cada mês",
      regras: body.regras ?? "Padrão (tolerância 5%)",
    })
    .returning();
  return Response.json(row, { status: 201 });
}

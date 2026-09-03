import { requireSession } from "@/lib/require-session";

export async function POST(_request: Request) {
  await requireSession();
  return Response.json(
    {
      error:
        "A guia precisa ser um PDF DAS/DARF. Use a aba Upload em Lote — colar o e-mail não identifica a guia.",
    },
    { status: 400 },
  );
}

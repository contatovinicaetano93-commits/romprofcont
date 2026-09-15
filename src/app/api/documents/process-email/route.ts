import { requireSession } from "@/lib/require-session";

export async function POST(_request: Request) {
  await requireSession();
  return Response.json(
    {
      error:
        "O PDF precisa ser DAS, INSS, parcelamento ou mensalidade. Use a aba Upload em lote — colar o e-mail não identifica o documento.",
    },
    { status: 400 },
  );
}

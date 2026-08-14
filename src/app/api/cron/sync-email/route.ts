import { syncEmailInbox } from "@/lib/sync-email-imap";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorize(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const result = await syncEmailInbox();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    console.error("[sync-email]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}

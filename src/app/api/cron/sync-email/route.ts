export const runtime = "nodejs";
export const maxDuration = 300;

function authorize(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

const PAUSED_RESPONSE = {
  ok: true,
  paused: true,
  reason: "Leitura automática do e-mail fiscal está pausada.",
};

export async function GET(request: Request) {
  if (!authorize(request)) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  return Response.json(PAUSED_RESPONSE);
}

export async function POST(request: Request) {
  return GET(request);
}

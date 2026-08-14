import {
  convertToModelMessages,
  streamText,
  type UIMessage,
} from "ai";
import {
  ASSISTENTE_SYSTEM_PROMPT,
  buildAssistenteContext,
  formatAssistenteContext,
} from "@/lib/assistente-context";
import { requireSession } from "@/lib/require-session";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.AI_MODEL ?? "openai/gpt-4o-mini";

export async function POST(request: Request) {
  await requireSession();

  let body: { messages?: UIMessage[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const messages = body.messages ?? [];
  if (messages.length === 0) {
    return Response.json({ error: "Envie ao menos uma mensagem." }, { status: 400 });
  }

  const context = await buildAssistenteContext();
  const contextBlock = formatAssistenteContext(context);

  try {
    const result = streamText({
      model: MODEL,
      system: `${ASSISTENTE_SYSTEM_PROMPT}\n\n## Contexto atual do sistema (JSON)\n\`\`\`json\n${contextBlock}\n\`\`\``,
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao consultar assistente";
    console.error("[assistente/chat]", message);
    return Response.json(
      {
        error:
          "Assistente indisponível. Configure AI Gateway ou AI_MODEL no Vercel.",
        detail: message,
      },
      { status: 503 },
    );
  }
}

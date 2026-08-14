import { simpleParser, type Attachment } from "mailparser";
import { ImapFlow } from "imapflow";
import { eq } from "drizzle-orm";
import { emailLogs } from "@/db/schema";
import { getDb } from "@/lib/db";
import { processInboundParts } from "@/lib/process-inbound-document";

export type SyncEmailResult = {
  processed: number;
  skipped: number;
  errors: number;
  documentsCreated: number;
};

function getImapConfig() {
  const user = process.env.IMAP_USER;
  const password = process.env.IMAP_PASSWORD;
  if (!user || !password) {
    throw new Error("IMAP_USER e IMAP_PASSWORD não configurados");
  }
  return {
    host: process.env.IMAP_HOST ?? "email-ssl.com.br",
    port: Number(process.env.IMAP_PORT ?? "993"),
    secure: true,
    auth: { user, pass: password },
  };
}

async function attachmentToText(attachment: Attachment) {
  const content = attachment.content;
  if (!content || content.length === 0) return null;

  const fileName = attachment.filename ?? "anexo";
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".pdf")) {
    try {
      const pdf = (await import("pdf-parse")).default;
      const parsed = await pdf(content);
      return { text: parsed.text ?? "", fileName };
    } catch {
      return { text: "", fileName };
    }
  }

  const isTextLike =
    lower.endsWith(".xml") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".html") ||
    attachment.contentType?.includes("xml") ||
    attachment.contentType?.includes("text");

  if (!isTextLike) {
    return null;
  }

  const text = new TextDecoder().decode(content);
  return { text, fileName };
}

export async function syncEmailInbox(): Promise<SyncEmailResult> {
  const client = new ImapFlow(getImapConfig());
  const result: SyncEmailResult = {
    processed: 0,
    skipped: 0,
    errors: 0,
    documentsCreated: 0,
  };

  await client.connect();

  const lock = await client.getMailboxLock("INBOX");
  try {
    const uids = await client.search({ seen: false });
    if (!Array.isArray(uids) || uids.length === 0) return result;

    const maxPerRun = Number(process.env.IMAP_MAX_PER_RUN ?? "25");
    const batch = uids.slice(0, maxPerRun);

    for (const uid of batch) {
      const message = await client.fetchOne(
        uid,
        { source: true, envelope: true },
        { uid: true },
      );
      if (!message || !message.source) {
        continue;
      }

      const parsed = await simpleParser(message.source);
      const messageId = parsed.messageId ?? `uid-${uid}`;
      const remetente =
        parsed.from?.text ?? message.envelope?.from?.[0]?.address ?? "desconhecido";
      const assunto = parsed.subject ?? "";
      const corpo =
        (typeof parsed.text === "string" ? parsed.text : "") ||
        (typeof parsed.html === "string" ? parsed.html : "") ||
        "";

      const db = getDb();
      const [existing] = await db
        .select({ id: emailLogs.id })
        .from(emailLogs)
        .where(eq(emailLogs.messageId, messageId))
        .limit(1);

      if (existing) {
        result.skipped += 1;
        await client.messageFlagsAdd(uid, ["\\Seen"], { uid: true });
        continue;
      }

      const [log] = await db
        .insert(emailLogs)
        .values({
          messageId,
          remetente,
          assunto,
          corpo: corpo.slice(0, 8000),
          status: "pending",
          receivedAt: parsed.date ?? new Date(),
        })
        .returning({ id: emailLogs.id });

      try {
        const parts: Array<{ text: string; fileName?: string }> = [];

        if (corpo.trim()) {
          parts.push({ text: corpo, fileName: "corpo-email.txt" });
        }

        for (const attachment of parsed.attachments) {
          const part = await attachmentToText(attachment);
          if (part) parts.push(part);
        }

        const hint = `${assunto}\n${remetente}`;
        const created = await processInboundParts(parts, hint, log.id);

        await db
          .update(emailLogs)
          .set({
            status: "processed",
            documentosCriados: created,
            processedAt: new Date(),
          })
          .where(eq(emailLogs.id, log.id));

        result.processed += 1;
        result.documentsCreated += created;
        await client.messageFlagsAdd(uid, ["\\Seen"], { uid: true });
      } catch (error) {
        const erro = error instanceof Error ? error.message : "Erro desconhecido";
        await db
          .update(emailLogs)
          .set({
            status: "error",
            erro,
            processedAt: new Date(),
          })
          .where(eq(emailLogs.id, log.id));
        result.errors += 1;
      }
    }
  } finally {
    lock.release();
  }

  await client.logout();
  return result;
}

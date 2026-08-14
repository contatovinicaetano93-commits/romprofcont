/**
 * Reprocessa e-mails recentes do IMAP com a lógica nova (inclui PDF).
 * Uso: npm run email:reprocess
 */

import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import pdf from "pdf-parse";
import { eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/db/schema";
import { documentos, emailLogs } from "../src/db/schema";
import { processInboundParts } from "../src/lib/process-inbound-document";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function attachmentToText(attachment: {
  content: Buffer;
  filename?: string;
  contentType?: string;
}) {
  const fileName = attachment.filename ?? "anexo";
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) {
    try {
      const parsed = await pdf(attachment.content);
      return { text: parsed.text ?? "", fileName };
    } catch {
      return { text: "", fileName };
    }
  }
  if (
    lower.endsWith(".xml") ||
    lower.endsWith(".txt") ||
    attachment.contentType?.includes("xml") ||
    attachment.contentType?.includes("text")
  ) {
    return { text: new TextDecoder().decode(attachment.content), fileName };
  }
  return null;
}

async function main() {
  const client = new ImapFlow({
    host: process.env.IMAP_HOST ?? "email-ssl.com.br",
    port: Number(process.env.IMAP_PORT ?? "993"),
    secure: true,
    auth: {
      user: process.env.IMAP_USER!,
      pass: process.env.IMAP_PASSWORD!,
    },
  });

  await client.connect();
  const lock = await client.getMailboxLock("INBOX");

  try {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const uids = await client.search({ since });
    if (!Array.isArray(uids)) return;

    const batch = uids.slice(-40);
    let reprocessed = 0;

    for (const uid of batch) {
      const message = await client.fetchOne(uid, { source: true, envelope: true }, { uid: true });
      if (!message || !message.source) continue;

      const parsed = await simpleParser(message.source);
      const messageId = parsed.messageId ?? `uid-${uid}`;

      const [log] = await db
        .select()
        .from(emailLogs)
        .where(eq(emailLogs.messageId, messageId))
        .limit(1);

      if (!log) continue;

      await db.delete(documentos).where(eq(documentos.emailLogId, log.id));

      const corpo =
        (typeof parsed.text === "string" ? parsed.text : "") ||
        (typeof parsed.html === "string" ? parsed.html : "") ||
        "";
      const assunto = parsed.subject ?? log.assunto ?? "";
      const remetente = parsed.from?.text ?? log.remetente;

      const parts: Array<{ text: string; fileName?: string }> = [];
      for (const attachment of parsed.attachments) {
        const content = attachment.content;
        if (!content || !Buffer.isBuffer(content)) continue;
        const part = await attachmentToText({
          content,
          filename: attachment.filename,
          contentType: attachment.contentType,
        });
        if (part) parts.push(part);
      }

      const hint = `${assunto}\n${remetente}\n${corpo.slice(0, 2000)}`;
      const created = await processInboundParts(parts, hint, log.id);
      if (created > 0) reprocessed += 1;
    }

    console.log({ reprocessed, scanned: batch.length });
  } finally {
    lock.release();
    await client.logout();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

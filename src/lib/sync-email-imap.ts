import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { simpleParser, type Attachment } from "mailparser";
import { ImapFlow, type ListResponse, type MailboxLockObject } from "imapflow";
import { eq } from "drizzle-orm";
import { contabilidades, emailLogs } from "@/db/schema";
import { getDb } from "@/lib/db";
import { processInboundParts } from "@/lib/process-inbound-document";
import {
  displayNameFromFolder,
  fallbackMessageId,
  isInboxMailbox,
  mailboxLeafName,
  matchFolderToContabilidade,
  shouldSyncMailbox,
  type FirmRef,
} from "@/lib/imap-mailbox";

export type SyncEmailResult = {
  processed: number;
  skipped: number;
  errors: number;
  documentsCreated: number;
  moved: number;
  foldersScanned: string[];
  firmsCreated: string[];
};

const DEFAULT_MAX_PER_RUN = 20;
const RETRY_ATTEMPTS = 3;

function resolvedMailboxPath() {
  return process.env.IMAP_RESOLVED_MAILBOX ?? "INBOX.Resolvido";
}

function maxMessagesPerRun() {
  const raw = Number(process.env.IMAP_MAX_PER_RUN ?? DEFAULT_MAX_PER_RUN);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MAX_PER_RUN;
}

function getImapConfig() {
  const user = process.env.IMAP_USER;
  const password = process.env.IMAP_PASSWORD;
  if (!user || !password) {
    throw new Error("IMAP_USER e IMAP_PASSWORD não configurados");
  }
  return {
    host: process.env.IMAP_HOST ?? "email-ssl.com.br",
    port: Number(process.env.IMAP_PORT ?? "993"),
    secure: true as const,
    auth: { user, pass: password },
    logger: false as const,
    disableAutoIdle: true,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Erro desconhecido";
}

function errorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code.toUpperCase() : "";
  }
  return "";
}

function isRetryableImapError(error: unknown) {
  const code = errorCode(error);
  if (
    [
      "ECONNRESET",
      "ETIMEDOUT",
      "EPIPE",
      "ENOTFOUND",
      "EAI_AGAIN",
      "CONNECT_TIMEOUT",
      "ETIME",
    ].includes(code)
  ) {
    return true;
  }
  const message = errorMessage(error).toLowerCase();
  return /timeout|timed out|econnreset|socket hang up|connection closed|not connected|closed unexpectedly|connection ended/.test(
    message,
  );
}

async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryableImapError(error) || attempt === RETRY_ATTEMPTS - 1) {
        throw error;
      }
      const wait = 1000 * 2 ** attempt;
      console.warn(
        `[sync-email] ${label} falhou (${errorMessage(error)}), nova tentativa em ${wait}ms`,
      );
      await sleep(wait);
    }
  }
  throw lastError;
}

async function connectClient() {
  const client = new ImapFlow(getImapConfig());
  await withRetry("connect", () => client.connect());
  return client;
}

async function safeLogout(client: ImapFlow | null) {
  if (!client) return;
  try {
    await client.logout();
  } catch {
    try {
      client.close();
    } catch {
      // sessão já encerrada
    }
  }
}

class ImapSession {
  client: ImapFlow | null = null;
  lock: MailboxLockObject | null = null;
  lockedPath: string | null = null;

  async ensure() {
    if (this.client?.usable) return this.client;
    const pathToRestore = this.lockedPath;
    this.dropLock();
    await safeLogout(this.client);
    this.client = await connectClient();
    if (pathToRestore) {
      this.lock = await this.client.getMailboxLock(pathToRestore);
      this.lockedPath = pathToRestore;
    }
    return this.client;
  }

  dropLock() {
    try {
      this.lock?.release();
    } catch {
      // lock já inválido após queda da sessão
    }
    this.lock = null;
    this.lockedPath = null;
  }

  async lockMailbox(path: string) {
    const client = await this.ensure();
    if (this.lock && this.lockedPath === path && client.mailbox) {
      return;
    }
    this.dropLock();
    this.lock = await client.getMailboxLock(path);
    this.lockedPath = path;
  }

  async run<T>(label: string, fn: (client: ImapFlow) => Promise<T>): Promise<T> {
    return withRetry(label, async () => {
      const client = await this.ensure();
      if (this.lockedPath && (!this.lock || !client.mailbox)) {
        this.lock = await client.getMailboxLock(this.lockedPath);
      }
      return fn(client);
    });
  }

  async close() {
    this.dropLock();
    await safeLogout(this.client);
    this.client = null;
  }
}

async function attachmentToText(attachment: Attachment) {
  const content = attachment.content;
  if (!content || content.length === 0) return null;

  const fileName = attachment.filename ?? "anexo";
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".pdf")) {
    try {
      const parsed = await pdfParse(content);
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

async function loadFirms(): Promise<FirmRef[]> {
  const rows = await getDb()
    .select({ id: contabilidades.id, name: contabilidades.name })
    .from(contabilidades);
  return rows.map((row) => ({ id: row.id, name: row.name }));
}

async function findEmailLog(messageId: string) {
  const [existing] = await getDb()
    .select({ id: emailLogs.id, status: emailLogs.status })
    .from(emailLogs)
    .where(eq(emailLogs.messageId, messageId))
    .limit(1);
  return existing ?? null;
}

async function resolveContabilidade(
  folderPath: string,
  folderName: string,
  firms: FirmRef[],
): Promise<{ id: string | null; createdName?: string }> {
  if (isInboxMailbox(folderPath, folderName)) {
    return { id: null };
  }

  const matched = matchFolderToContabilidade(folderName, firms);
  if (matched) return { id: matched.id };

  const name = displayNameFromFolder(folderName);
  const [row] = await getDb()
    .insert(contabilidades)
    .values({ name, active: true })
    .returning({ id: contabilidades.id, name: contabilidades.name });

  if (!row) return { id: null };
  firms.push({ id: row.id, name: row.name });
  return { id: row.id, createdName: row.name };
}

function workMailboxes(listed: ListResponse[]) {
  return listed
    .filter((mailbox) => shouldSyncMailbox(mailbox))
    .sort((a, b) => {
      const aInbox = isInboxMailbox(a.path, a.name) ? 1 : 0;
      const bInbox = isInboxMailbox(b.path, b.name) ? 1 : 0;
      if (aInbox !== bInbox) return aInbox - bInbox;
      return a.path.localeCompare(b.path);
    });
}

function emptyResult(): SyncEmailResult {
  return {
    processed: 0,
    skipped: 0,
    errors: 0,
    documentsCreated: 0,
    moved: 0,
    foldersScanned: [],
    firmsCreated: [],
  };
}

function slotsUsed(result: SyncEmailResult) {
  return result.processed + result.skipped + result.errors;
}

async function moveToResolved(session: ImapSession, uid: number, destination: string) {
  if (!session.lockedPath || session.lockedPath === destination) return false;
  const moved = await session.run("move", (client) =>
    client.messageMove(uid, destination, { uid: true }),
  );
  return Boolean(moved);
}

export async function syncEmailInbox(): Promise<SyncEmailResult> {
  const result = emptyResult();
  const maxPerRun = maxMessagesPerRun();
  const resolvedPath = resolvedMailboxPath();
  const session = new ImapSession();
  const firms = await loadFirms();

  try {
    await session.ensure();

    const listed = await session.run("list", (client) => client.list());
    if (!listed.some((mailbox) => mailbox.path === resolvedPath)) {
      await session.run("create-resolvido", (client) =>
        client.mailboxCreate(resolvedPath),
      );
    }

    const folders = workMailboxes(listed);

    for (const folder of folders) {
      if (slotsUsed(result) >= maxPerRun) break;

      const folderName = folder.name || mailboxLeafName(folder.path, folder.delimiter);
      const firm = await resolveContabilidade(folder.path, folderName, firms);
      if (firm.createdName) {
        result.firmsCreated.push(firm.createdName);
      }

      result.foldersScanned.push(folder.path);
      await session.lockMailbox(folder.path);

      const uids = await session.run("search", (client) =>
        client.search({ all: true }, { uid: true }),
      );
      if (!Array.isArray(uids) || uids.length === 0) {
        session.dropLock();
        continue;
      }

      const newestFirst = [...uids].sort((a, b) => Number(b) - Number(a));

      for (const uid of newestFirst) {
        if (slotsUsed(result) >= maxPerRun) break;

        try {
          const preview = await session.run("fetch-envelope", (client) =>
            client.fetchOne(uid, { envelope: true, uid: true }, { uid: true }),
          );
          if (!preview) continue;

          let messageId =
            preview.envelope?.messageId?.trim() ||
            fallbackMessageId(folder.path, uid);

          let existing = await findEmailLog(messageId);
          if (existing) {
            result.skipped += 1;
            if (await moveToResolved(session, uid, resolvedPath)) {
              result.moved += 1;
            }
            continue;
          }

          const message = await session.run("fetch-source", (client) =>
            client.fetchOne(
              uid,
              { source: true, envelope: true, uid: true },
              { uid: true },
            ),
          );
          if (!message || !message.source) {
            result.errors += 1;
            continue;
          }

          const parsed = await simpleParser(message.source);
          messageId = parsed.messageId?.trim() || messageId;
          existing = await findEmailLog(messageId);
          if (existing) {
            result.skipped += 1;
            if (await moveToResolved(session, uid, resolvedPath)) {
              result.moved += 1;
            }
            continue;
          }

          const remetente =
            parsed.from?.text ??
            message.envelope?.from?.[0]?.address ??
            "desconhecido";
          const assunto = parsed.subject ?? "";
          const corpo =
            (typeof parsed.text === "string" ? parsed.text : "") ||
            (typeof parsed.html === "string" ? parsed.html : "") ||
            "";

          const [log] = await getDb()
            .insert(emailLogs)
            .values({
              messageId,
              remetente,
              assunto,
              corpo: corpo.slice(0, 8000),
              status: "pending",
              receivedAt: parsed.date ?? new Date(),
              rawPayload: { folder: folder.path, uid },
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

            const hint = `${assunto}\n${remetente}\n${folderName}`;
            const created = await processInboundParts(parts, hint, log.id, {
              folder: folder.path,
              contabilidadeId: firm.id,
            });

            await getDb()
              .update(emailLogs)
              .set({
                status: "processed",
                documentosCriados: created,
                processedAt: new Date(),
              })
              .where(eq(emailLogs.id, log.id));

            result.processed += 1;
            result.documentsCreated += created;
            if (await moveToResolved(session, uid, resolvedPath)) {
              result.moved += 1;
            }
          } catch (error) {
            await getDb()
              .update(emailLogs)
              .set({
                status: "error",
                erro: errorMessage(error),
                processedAt: new Date(),
              })
              .where(eq(emailLogs.id, log.id));
            result.errors += 1;
          }
        } catch (error) {
          console.error(
            `[sync-email] falha em ${folder.path} uid=${uid}: ${errorMessage(error)}`,
          );
          result.errors += 1;
        }
      }

      session.dropLock();
    }
  } finally {
    await session.close();
  }

  return result;
}

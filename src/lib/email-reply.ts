export type InboundMailMeta = {
  subject?: string | null;
  inReplyTo?: string | null;
  from?: string | null;
  mailboxUser?: string | null;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase().replace(/^<|>$/g, "");
}

export function extractEmailAddresses(value: string) {
  const matches = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  return matches.map(normalizeEmail);
}

export function isOwnMailboxSender(from: string | null | undefined, mailboxUser: string | null | undefined) {
  const mailbox = mailboxUser ? normalizeEmail(mailboxUser) : "";
  if (!mailbox || !from?.trim()) return false;
  return extractEmailAddresses(from).includes(mailbox);
}

export function isReplySubject(subject: string | null | undefined) {
  let value = (subject ?? "").trim();
  if (!value) return false;
  value = value.replace(/^(\[[^\]]+\]\s*)+/g, "").trim();
  return /^(re|res)\s*:/i.test(value);
}

export function skipInboundReason(meta: InboundMailMeta): string | null {
  if (isOwnMailboxSender(meta.from, meta.mailboxUser)) {
    return "own-mailbox";
  }
  if (isReplySubject(meta.subject)) {
    return "reply-subject";
  }
  if ((meta.inReplyTo ?? "").trim()) {
    return "in-reply-to";
  }
  return null;
}

export type FirmRef = {
  id: string;
  name: string;
};

export type MailboxLike = {
  path: string;
  name?: string;
  specialUse?: string;
  flags?: Set<string> | string[];
  delimiter?: string;
};

const SKIP_SPECIAL_USE = new Set([
  "\\Sent",
  "\\Trash",
  "\\Junk",
  "\\Drafts",
  "\\All",
  "\\Archive",
  "\\Flagged",
]);

const SKIP_LEAF_NAMES = new Set([
  "enviadas",
  "lixo",
  "rascunho",
  "mala direta",
  "maladireta",
  "resolvido",
  "sent",
  "trash",
  "junk",
  "drafts",
  "spam",
  "deleted",
]);

/** Nomes de pasta Locaweb → nome cadastrado na Base Mestre. */
export const FOLDER_ALIASES: Record<string, string> = {
  yamada: "YAMADA",
  contbell: "CONTBELL",
  "primeiro assessoria": "Primeiro Acessoria",
  "primeiro acessoria": "Primeiro Acessoria",
};

export function normalizeMailboxName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function mailboxLeafName(path: string, delimiter = "."): string {
  const parts = path.split(delimiter || ".");
  return parts.at(-1) || path;
}

export function shouldSyncMailbox(mailbox: MailboxLike): boolean {
  const flags =
    mailbox.flags instanceof Set
      ? mailbox.flags
      : new Set(mailbox.flags ?? []);
  if (flags.has("\\Noselect") || flags.has("\\NonExistent")) {
    return false;
  }
  if (mailbox.specialUse && SKIP_SPECIAL_USE.has(mailbox.specialUse)) {
    return false;
  }
  const leaf = normalizeMailboxName(
    mailbox.name ?? mailboxLeafName(mailbox.path, mailbox.delimiter ?? "."),
  );
  if (SKIP_LEAF_NAMES.has(leaf)) {
    return false;
  }
  return true;
}

export function isInboxMailbox(path: string, name?: string): boolean {
  const leaf = normalizeMailboxName(name ?? mailboxLeafName(path));
  return leaf === "inbox" || normalizeMailboxName(path) === "inbox";
}

export function matchFolderToContabilidade(
  folderName: string,
  firms: FirmRef[],
): FirmRef | null {
  const folderNorm = normalizeMailboxName(folderName);
  if (!folderNorm || folderNorm === "inbox") return null;

  const aliasTarget = FOLDER_ALIASES[folderNorm];
  const candidates = aliasTarget
    ? [normalizeMailboxName(aliasTarget), folderNorm]
    : [folderNorm];

  for (const candidate of candidates) {
    const exact = firms.find(
      (firm) => normalizeMailboxName(firm.name) === candidate,
    );
    if (exact) return exact;
  }

  for (const firm of firms) {
    const firmNorm = normalizeMailboxName(firm.name);
    if (!firmNorm) continue;
    if (firmNorm.includes(folderNorm) || folderNorm.includes(firmNorm)) {
      return firm;
    }
  }

  return null;
}

export function displayNameFromFolder(folderName: string): string {
  const alias = FOLDER_ALIASES[normalizeMailboxName(folderName)];
  if (alias) return alias;
  return folderName.trim();
}

export function fallbackMessageId(folderPath: string, uid: number): string {
  if (normalizeMailboxName(folderPath) === "inbox") {
    return `uid-${uid}`;
  }
  return `uid-${folderPath}-${uid}`;
}

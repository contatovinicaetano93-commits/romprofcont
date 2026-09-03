import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  displayNameFromFolder,
  fallbackMessageId,
  isInboxMailbox,
  matchFolderToContabilidade,
  shouldSyncMailbox,
} from "./imap-mailbox";

const firms = [
  { id: "1", name: "YAMADA" },
  { id: "2", name: "CONTBELL" },
  { id: "3", name: "Primeiro Acessoria" },
  { id: "4", name: "Styllus" },
  { id: "5", name: "SEM CONT" },
];

describe("shouldSyncMailbox", () => {
  it("keeps accounting folders and INBOX", () => {
    assert.equal(shouldSyncMailbox({ path: "INBOX", name: "INBOX" }), true);
    assert.equal(
      shouldSyncMailbox({ path: "INBOX.Yamada", name: "Yamada" }),
      true,
    );
  });

  it("skips sent, trash, junk, drafts and Resolvido", () => {
    assert.equal(
      shouldSyncMailbox({
        path: "INBOX.enviadas",
        name: "enviadas",
        specialUse: "\\Sent",
      }),
      false,
    );
    assert.equal(
      shouldSyncMailbox({ path: "INBOX.lixo", name: "lixo", specialUse: "\\Trash" }),
      false,
    );
    assert.equal(
      shouldSyncMailbox({
        path: "INBOX.Mala_Direta",
        name: "Mala_Direta",
        specialUse: "\\Junk",
      }),
      false,
    );
    assert.equal(
      shouldSyncMailbox({
        path: "INBOX.rascunho",
        name: "rascunho",
        specialUse: "\\Drafts",
      }),
      false,
    );
    assert.equal(
      shouldSyncMailbox({ path: "INBOX.Resolvido", name: "Resolvido" }),
      false,
    );
  });
});

describe("matchFolderToContabilidade", () => {
  it("matches exact and aliased folder names", () => {
    assert.equal(matchFolderToContabilidade("Yamada", firms)?.id, "1");
    assert.equal(matchFolderToContabilidade("Contbell", firms)?.id, "2");
    assert.equal(
      matchFolderToContabilidade("Primeiro Assessoria", firms)?.id,
      "3",
    );
    assert.equal(matchFolderToContabilidade("Styllus", firms)?.id, "4");
  });

  it("does not map INBOX to a firm", () => {
    assert.equal(matchFolderToContabilidade("INBOX", firms), null);
  });

  it("returns null for unknown folders so they can be created", () => {
    assert.equal(matchFolderToContabilidade("Onvio", firms), null);
    assert.equal(matchFolderToContabilidade("Appcont", firms), null);
  });
});

describe("displayNameFromFolder", () => {
  it("uses aliases when creating missing firms", () => {
    assert.equal(displayNameFromFolder("Primeiro Assessoria"), "Primeiro Acessoria");
    assert.equal(displayNameFromFolder("Onvio"), "Onvio");
  });
});

describe("inbox helpers", () => {
  it("detects INBOX and keeps legacy uid fallback", () => {
    assert.equal(isInboxMailbox("INBOX"), true);
    assert.equal(isInboxMailbox("INBOX.Yamada", "Yamada"), false);
    assert.equal(fallbackMessageId("INBOX", 12), "uid-12");
    assert.equal(fallbackMessageId("INBOX.Yamada", 12), "uid-INBOX.Yamada-12");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isOwnMailboxSender,
  isReplySubject,
  skipInboundReason,
} from "./email-reply";

describe("skipInboundReason", () => {
  it("skips replies from the shared mailbox itself", () => {
    assert.equal(
      isOwnMailboxSender(
        "Ricardo <impostoparceiro@romconcept.com.br>",
        "impostoparceiro@romconcept.com.br",
      ),
      true,
    );
    assert.equal(
      skipInboundReason({
        subject: "DAS agosto",
        from: "impostoparceiro@romconcept.com.br",
        mailboxUser: "impostoparceiro@romconcept.com.br",
      }),
      "own-mailbox",
    );
  });

  it("skips Re/RES subjects and In-Reply-To threads", () => {
    assert.equal(isReplySubject("RES: DAS LUCIMARY"), true);
    assert.equal(isReplySubject("Re: [Yamada] guia"), true);
    assert.equal(isReplySubject("[externo] RES: parcela"), true);
    assert.equal(isReplySubject("DAS agosto"), false);
    assert.equal(
      skipInboundReason({
        subject: "RES: confirmação da guia",
        from: "yamada@contabil.com",
        mailboxUser: "impostoparceiro@romconcept.com.br",
      }),
      "reply-subject",
    );
    assert.equal(
      skipInboundReason({
        subject: "DAS",
        inReplyTo: "<abc@mail.locaweb.com.br>",
        from: "yamada@contabil.com",
        mailboxUser: "impostoparceiro@romconcept.com.br",
      }),
      "in-reply-to",
    );
  });

  it("keeps a new inbound guide email", () => {
    assert.equal(
      skipInboundReason({
        subject: "Guias DAS competência 09/2026",
        from: "contato@yamada.com.br",
        mailboxUser: "impostoparceiro@romconcept.com.br",
      }),
      null,
    );
  });
});

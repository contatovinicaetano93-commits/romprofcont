import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  documentDedupeKey,
  extraDuplicateIds,
  findMatchingLiveDuplicate,
  pickKeptDocument,
} from "./document-dedupe";

describe("documentDedupeKey", () => {
  it("treats the same file, amount and professional as one document", () => {
    const a = documentDedupeKey({
      fileName: "ENC: GuiaPagamento.pdf",
      valor: "37.10",
      profissionalId: "prof-1",
      tipo: "INSS",
    });
    const b = documentDedupeKey({
      fileName: "enc:  guiapagamento.pdf",
      valor: 37.1,
      profissionalId: "prof-1",
      tipo: "INSS",
    });
    assert.equal(a, b);
    assert.ok(a);
  });

  it("keeps monthly DAS that reuse a filename when the amount changes", () => {
    const march = documentDedupeKey({
      fileName: "DAS MARIA ROSEANE.pdf",
      valor: "210.00",
      profissionalId: "prof-maria",
      tipo: "DAS",
    });
    const april = documentDedupeKey({
      fileName: "DAS MARIA ROSEANE.pdf",
      valor: "215.50",
      profissionalId: "prof-maria",
      tipo: "DAS",
    });
    assert.notEqual(march, april);
  });

  it("does not key a document without filename or amount", () => {
    assert.equal(
      documentDedupeKey({
        fileName: "",
        valor: "60.00",
        profissionalId: "prof-1",
        tipo: "DAS",
      }),
      null,
    );
    assert.equal(
      documentDedupeKey({
        fileName: "DAS LUCIMARY.pdf",
        valor: null,
        profissionalId: "prof-1",
        tipo: "DAS",
      }),
      null,
    );
  });
});

describe("extraDuplicateIds", () => {
  it("keeps an approved row over older pending copies", () => {
    const extras = extraDuplicateIds([
      {
        id: "old",
        status: "pendente_validacao",
        createdAt: "2026-08-01T10:00:00.000Z",
        fileName: "DAS LUCIMARY.pdf",
        valor: "60.00",
        profissionalId: "luci",
        tipo: "DAS",
      },
      {
        id: "approved",
        status: "aprovado",
        createdAt: "2026-08-02T10:00:00.000Z",
        fileName: "DAS LUCIMARY.pdf",
        valor: "60.00",
        profissionalId: "luci",
        tipo: "DAS",
      },
    ]);
    assert.deepEqual(extras, ["old"]);
  });

  it("keeps the oldest pending row and archives the rest", () => {
    const extras = extraDuplicateIds([
      {
        id: "fourth",
        status: "pendente_validacao",
        createdAt: "2026-09-10T12:00:04.000Z",
        fileName: "Andressa.pdf",
        valor: "86.05",
        profissionalId: "andressa",
        tipo: "DAS",
      },
      {
        id: "first",
        status: "pendente_validacao",
        createdAt: "2026-09-10T12:00:01.000Z",
        fileName: "Andressa.pdf",
        valor: "86.05",
        profissionalId: "andressa",
        tipo: "DAS",
      },
      {
        id: "third",
        status: "pendente_validacao",
        createdAt: "2026-09-10T12:00:03.000Z",
        fileName: "Andressa.pdf",
        valor: "86.05",
        profissionalId: "andressa",
        tipo: "DAS",
      },
      {
        id: "second",
        status: "pendente_validacao",
        createdAt: "2026-09-10T12:00:02.000Z",
        fileName: "Andressa.pdf",
        valor: "86.05",
        profissionalId: "andressa",
        tipo: "DAS",
      },
    ]);
    assert.equal(extras.length, 3);
    assert.ok(!extras.includes("first"));
    assert.deepEqual(new Set(extras), new Set(["second", "third", "fourth"]));
  });

  it("ignores archived or rejected copies and reused filenames with other amounts", () => {
    const extras = extraDuplicateIds([
      {
        id: "live",
        status: "pendente_validacao",
        createdAt: "2026-03-01T10:00:00.000Z",
        fileName: "DAS MARIA ROSEANE.pdf",
        valor: "100.00",
        profissionalId: "maria",
        tipo: "DAS",
      },
      {
        id: "other-month",
        status: "pendente_validacao",
        createdAt: "2026-04-01T10:00:00.000Z",
        fileName: "DAS MARIA ROSEANE.pdf",
        valor: "110.00",
        profissionalId: "maria",
        tipo: "DAS",
      },
      {
        id: "already-archived",
        status: "arquivado",
        createdAt: "2026-03-01T11:00:00.000Z",
        fileName: "DAS MARIA ROSEANE.pdf",
        valor: "100.00",
        profissionalId: "maria",
        tipo: "DAS",
      },
    ]);
    assert.deepEqual(extras, []);
  });
});

describe("findMatchingLiveDuplicate", () => {
  it("matches an inbound ENC resend against the live queue", () => {
    const match = findMatchingLiveDuplicate(
      {
        fileName: "GuiaPagamento.pdf",
        valor: "412.33",
        profissionalId: "prof-inss",
        tipo: "INSS",
      },
      [
        {
          id: "kept",
          status: "pendente_validacao",
          createdAt: "2026-09-16T14:00:00.000Z",
          fileName: "GuiaPagamento.pdf",
          valor: "412.33",
          profissionalId: "prof-inss",
          tipo: "INSS",
        },
      ],
    );
    assert.equal(match?.id, "kept");
  });

  it("does not match a rejected document so a resend can re-enter the queue", () => {
    const match = findMatchingLiveDuplicate(
      {
        fileName: "DAS.pdf",
        valor: "80.00",
        profissionalId: "prof-1",
        tipo: "DAS",
      },
      [
        {
          id: "rejected",
          status: "reprovado",
          createdAt: "2026-09-01T10:00:00.000Z",
          fileName: "DAS.pdf",
          valor: "80.00",
          profissionalId: "prof-1",
          tipo: "DAS",
        },
      ],
    );
    assert.equal(match, undefined);
  });
});

describe("pickKeptDocument", () => {
  it("prefers the oldest approved document", () => {
    const kept = pickKeptDocument([
      {
        id: "later-approved",
        status: "aprovado",
        createdAt: "2026-09-02T00:00:00.000Z",
      },
      {
        id: "first-approved",
        status: "aprovado",
        createdAt: "2026-09-01T00:00:00.000Z",
      },
    ]);
    assert.equal(kept.id, "first-approved");
  });
});

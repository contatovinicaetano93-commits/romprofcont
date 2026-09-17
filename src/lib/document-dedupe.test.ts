import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  documentDedupeKey,
  extraDuplicateIds,
  findMatchingLiveDuplicate,
  pickKeptDocument,
} from "./document-dedupe";

describe("documentDedupeKey", () => {
  it("treats the same file, amount, professional and month as one document", () => {
    const a = documentDedupeKey({
      fileName: "ENC: GuiaPagamento.pdf",
      valor: "37.10",
      profissionalId: "prof-1",
      tipo: "INSS",
      competencia: "15/09/2026",
    });
    const b = documentDedupeKey({
      fileName: "enc:  guiapagamento.pdf",
      valor: 37.1,
      profissionalId: "prof-1",
      tipo: "INSS",
      competencia: "09/2026",
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
      competencia: "03/2026",
    });
    const april = documentDedupeKey({
      fileName: "DAS MARIA ROSEANE.pdf",
      valor: "215.50",
      profissionalId: "prof-maria",
      tipo: "DAS",
      competencia: "03/2026",
    });
    assert.notEqual(march, april);
  });

  it("keeps a later month that reuses the filename and amount", () => {
    const march = documentDedupeKey({
      fileName: "GuiaPagamento.pdf",
      valor: "412.33",
      profissionalId: "prof-inss",
      tipo: "INSS",
      competencia: "15/03/2026",
    });
    const april = documentDedupeKey({
      fileName: "GuiaPagamento.pdf",
      valor: "412.33",
      profissionalId: "prof-inss",
      tipo: "INSS",
      competencia: "04/2026",
    });
    assert.ok(march);
    assert.ok(april);
    assert.notEqual(march, april);
  });

  it("does not key a document without filename, amount, month or identity", () => {
    assert.equal(
      documentDedupeKey({
        fileName: "",
        valor: "60.00",
        profissionalId: "prof-1",
        tipo: "DAS",
        competencia: "09/2026",
      }),
      null,
    );
    assert.equal(
      documentDedupeKey({
        fileName: "DAS LUCIMARY.pdf",
        valor: null,
        profissionalId: "prof-1",
        tipo: "DAS",
        competencia: "09/2026",
      }),
      null,
    );
    assert.equal(
      documentDedupeKey({
        fileName: "GuiaPagamento.pdf",
        valor: "37.10",
        profissionalId: "prof-1",
        tipo: "INSS",
      }),
      null,
    );
    assert.equal(
      documentDedupeKey({
        fileName: "GuiaPagamento.pdf",
        valor: "37.10",
        tipo: "INSS",
        competencia: "09/2026",
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
        competencia: "08/2026",
      },
      {
        id: "approved",
        status: "aprovado",
        createdAt: "2026-08-02T10:00:00.000Z",
        fileName: "DAS LUCIMARY.pdf",
        valor: "60.00",
        profissionalId: "luci",
        tipo: "DAS",
        competencia: "08/2026",
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
        competencia: "09/2026",
      },
      {
        id: "first",
        status: "pendente_validacao",
        createdAt: "2026-09-10T12:00:01.000Z",
        fileName: "Andressa.pdf",
        valor: "86.05",
        profissionalId: "andressa",
        tipo: "DAS",
        competencia: "09/2026",
      },
      {
        id: "third",
        status: "pendente_validacao",
        createdAt: "2026-09-10T12:00:03.000Z",
        fileName: "Andressa.pdf",
        valor: "86.05",
        profissionalId: "andressa",
        tipo: "DAS",
        competencia: "09/2026",
      },
      {
        id: "second",
        status: "pendente_validacao",
        createdAt: "2026-09-10T12:00:02.000Z",
        fileName: "Andressa.pdf",
        valor: "86.05",
        profissionalId: "andressa",
        tipo: "DAS",
        competencia: "09/2026",
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
        competencia: "03/2026",
      },
      {
        id: "other-month",
        status: "pendente_validacao",
        createdAt: "2026-04-01T10:00:00.000Z",
        fileName: "DAS MARIA ROSEANE.pdf",
        valor: "110.00",
        profissionalId: "maria",
        tipo: "DAS",
        competencia: "04/2026",
      },
      {
        id: "already-archived",
        status: "arquivado",
        createdAt: "2026-03-01T11:00:00.000Z",
        fileName: "DAS MARIA ROSEANE.pdf",
        valor: "100.00",
        profissionalId: "maria",
        tipo: "DAS",
        competencia: "03/2026",
      },
    ]);
    assert.deepEqual(extras, []);
  });

  it("keeps approved months that reuse a filename and amount", () => {
    const extras = extraDuplicateIds([
      {
        id: "march-approved",
        status: "aprovado",
        createdAt: "2026-03-10T10:00:00.000Z",
        fileName: "GuiaPagamento.pdf",
        valor: "37.10",
        profissionalId: "prof-inss",
        tipo: "INSS",
        competencia: "03/2026",
      },
      {
        id: "april-pending",
        status: "pendente_validacao",
        createdAt: "2026-04-10T10:00:00.000Z",
        fileName: "GuiaPagamento.pdf",
        valor: "37.10",
        profissionalId: "prof-inss",
        tipo: "INSS",
        competencia: "04/2026",
      },
    ]);
    assert.deepEqual(extras, []);
  });

  it("does not archive unidentified docs that share a generic name without identity", () => {
    const extras = extraDuplicateIds([
      {
        id: "one",
        status: "nao_identificado",
        createdAt: "2026-09-01T10:00:00.000Z",
        fileName: "GuiaPagamento.pdf",
        valor: "37.10",
        tipo: "INSS",
        competencia: "09/2026",
      },
      {
        id: "two",
        status: "nao_identificado",
        createdAt: "2026-09-02T10:00:00.000Z",
        fileName: "GuiaPagamento.pdf",
        valor: "37.10",
        tipo: "INSS",
        competencia: "09/2026",
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
        competencia: "09/2026",
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
          competencia: "15/09/2026",
        },
      ],
    );
    assert.equal(match?.id, "kept");
  });

  it("does not match a later month that reuses the filename and amount", () => {
    const match = findMatchingLiveDuplicate(
      {
        fileName: "GuiaPagamento.pdf",
        valor: "412.33",
        profissionalId: "prof-inss",
        tipo: "INSS",
        competencia: "04/2026",
      },
      [
        {
          id: "march",
          status: "aprovado",
          createdAt: "2026-03-16T14:00:00.000Z",
          fileName: "GuiaPagamento.pdf",
          valor: "412.33",
          profissionalId: "prof-inss",
          tipo: "INSS",
          competencia: "03/2026",
        },
      ],
    );
    assert.equal(match, undefined);
  });

  it("does not match a rejected document so a resend can re-enter the queue", () => {
    const match = findMatchingLiveDuplicate(
      {
        fileName: "DAS.pdf",
        valor: "80.00",
        profissionalId: "prof-1",
        tipo: "DAS",
        competencia: "09/2026",
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
          competencia: "09/2026",
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

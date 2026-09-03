import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateDocument } from "./validate-document";

const profissional = {
  id: "p1",
  name: "Andressa Erica",
  cnpj: "12345678000195",
  contabilidadeId: "c1",
  unidade: "ROM Brasil",
};

const obrigacao = {
  id: "o1",
  profissionalId: "p1",
  tipo: "DAS",
  valorEsperado: "100.00",
  regras: "Padrão (tolerância 5%)",
};

describe("validateDocument", () => {
  it("organizes a matched CNPJ as pending human approval, never auto-approves", () => {
    const result = validateDocument(
      { cnpj: "12.345.678/0001-95", tipo: "DAS", valor: 100, competencia: "05/2026" },
      [profissional],
      [obrigacao],
    );
    assert.equal(result.status, "pendente_validacao");
    assert.equal(result.profissionalId, "p1");
    assert.equal(result.contabilidadeId, "c1");
    assert.equal(result.motivo.includes("aguardando aprovação"), true);
  });

  it("keeps unidentified CNPJ out of the approval queue as nao_identificado", () => {
    const result = validateDocument(
      { cnpj: "00000000000000", tipo: "DAS" },
      [profissional],
      [],
    );
    assert.equal(result.status, "nao_identificado");
    assert.equal(result.profissionalId, null);
  });

  it("does not treat missing obrigação as a reason to skip organization", () => {
    const result = validateDocument(
      { cnpj: "12345678000195", tipo: "DAS", valor: 80 },
      [profissional],
      [],
    );
    assert.equal(result.status, "pendente_validacao");
    assert.equal(result.profissionalId, "p1");
    assert.equal(
      result.validacoes.some((item) => item.check === "Obrigação" && item.result === "DIVERGÊNCIA"),
      false,
    );
  });
});

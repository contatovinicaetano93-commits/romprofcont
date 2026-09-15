import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildConferenciaRows,
  extractParcelaLabel,
  mapRegimeExcel,
  mapUnidadeExcel,
  sheetNameForCompetencia,
} from "./conferencia-export";

describe("conferencia export mapping", () => {
  it("maps unit and regime to the spreadsheet labels", () => {
    assert.equal(mapUnidadeExcel("ROM Iguatemi"), "IGUATEMI");
    assert.equal(mapUnidadeExcel("ROM Brasil"), "AV. BRASIL");
    assert.equal(mapRegimeExcel("Simples Nacional"), "SIMPLES");
    assert.equal(mapRegimeExcel("MEI"), "MEI");
    assert.equal(sheetNameForCompetencia("09/2026"), "GERAL - Setembro");
    assert.equal(extractParcelaLabel("guia parcela 21/23.pdf"), "Parcela: 21/23");
  });

  it("builds one row per Base Mestre professional with approved amounts", () => {
    const rows = buildConferenciaRows(
      [
        {
          id: "p2",
          name: "BRUNNA FABRICIO DA SILVA",
          cnpj: "26843842000107",
          unidade: "ROM Iguatemi",
          regimeTributario: "Simples Nacional",
          contabilidadeName: "ASSISTEC",
        },
        {
          id: "p1",
          name: "ALBUQUERQUE CABELEIREIROS LTDA - ME",
          cnpj: "11.106.752/0001-58",
          unidade: "ROM Brasil",
          regimeTributario: "Simples Nacional",
          contabilidadeName: "CONTBELL",
        },
      ],
      [
        {
          profissionalId: "p1",
          competencia: "09/2026",
          status: "aprovado",
          tipo: "Mensalidade",
          valor: "120",
        },
        {
          profissionalId: "p1",
          competencia: "09/2026",
          status: "aprovado",
          tipo: "DAS",
          valor: "6631.67",
        },
        {
          profissionalId: "p1",
          competencia: "09/2026",
          status: "aprovado",
          tipo: "Parcelamento",
          valor: "368.81",
          fileName: "parcela_21_23.pdf",
          metadata: { parcela: "Parcela: 21/23" },
        },
        {
          profissionalId: "p2",
          competencia: "08/2026",
          status: "aprovado",
          tipo: "DAS",
          valor: "99",
        },
        {
          profissionalId: "p1",
          competencia: "09/2026",
          status: "pendente_validacao",
          tipo: "INSS",
          valor: "178.31",
        },
      ],
      "09/2026",
    );

    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.profissional, "ALBUQUERQUE CABELEIREIROS LTDA - ME");
    assert.equal(rows[0]?.unidade, "AV. BRASIL");
    assert.equal(rows[0]?.valorMensalidade, 120);
    assert.equal(rows[0]?.valorDas, 6631.67);
    assert.equal(rows[0]?.parcelamento, "Parcela: 21/23");
    assert.equal(rows[0]?.valorParcelamento, 368.81);
    assert.equal(rows[0]?.situacao, "Envio Financeiro");
    assert.equal(rows[0]?.financeiro, "");
    assert.equal(rows[1]?.valorDas, "");
    assert.equal(rows[1]?.situacao, "");
  });
});

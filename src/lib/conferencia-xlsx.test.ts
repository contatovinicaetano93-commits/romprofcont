import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { writeConferenciaXlsx } from "./conferencia-xlsx";

describe("writeConferenciaXlsx", () => {
  it("writes a real xlsx workbook", async () => {
    const file = await writeConferenciaXlsx(
      [
        {
          profissional: "ALBUQUERQUE",
          cnpj: "11.106.752/0001-58",
          unidade: "AV. BRASIL",
          contabilidade: "CONTBELL",
          valorMensalidade: 120,
          dasMeiSimples: "SIMPLES",
          valorDas: 6631.67,
          darfInss: "",
          parcelamento: "Parcela: 21/23",
          valorParcelamento: 368.81,
          situacao: "Envio Financeiro",
          financeiro: "",
        },
      ],
      "09/2026",
    );
    assert.match(file.fileName, /IMPOSTOS - CONFERENCIA 09-2026\.xlsx/);
    assert.equal(file.buffer.subarray(0, 2).toString(), "PK");
  });
});

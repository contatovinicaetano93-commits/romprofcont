import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyInboundDocument,
  isGuiaImposto,
  tipoFromKind,
} from "./classify-inbound-document";

describe("classifyInboundDocument", () => {
  it("keeps official DAS and DARF guides", () => {
    assert.equal(classifyInboundDocument("PGDASD-DAS- 06_2026.pdf"), "guia_das");
    assert.equal(classifyInboundDocument("ExibirDAS-15072026_173918_06_2026.pdf"), "guia_das");
    assert.equal(classifyInboundDocument("DAS LUCIMARY.pdf"), "guia_das");
    assert.equal(classifyInboundDocument("guia-darf-agosto.pdf"), "guia_darf");
    assert.equal(
      classifyInboundDocument("imposto.pdf", "Documento de Arrecadação do Simples Nacional"),
      "guia_das",
    );
    assert.equal(isGuiaImposto("guia_das"), true);
    assert.equal(tipoFromKind("guia_das"), "DAS");
  });

  it("drops NFS-e, honorarios, service slips, extracts and email bodies", () => {
    assert.equal(classifyInboundDocument("NFSe19361_01530207000130.pdf"), "nfse");
    assert.equal(classifyInboundDocument("19361_20260727.xml"), "nfse");
    assert.equal(
      classifyInboundDocument("recibo_de_honorarios_contabeis_0000003851.pdf"),
      "honorarios",
    );
    assert.equal(
      classifyInboundDocument(
        "servicos_vencto_10_08_2026_doc_19361_bol__cli_47365477000134_001.pdf",
      ),
      "boleto_servico",
    );
    assert.equal(classifyInboundDocument("PGDASD-EXTRATO- 06_2026.pdf"), "extrato");
    assert.equal(
      classifyInboundDocument(
        "Relatorios_Impostos_SIMPLES_Nacional_Demonstrativo_das_Receitas_e_Imposto_a_Pagar - 06_2026.pdf",
      ),
      "relatorio",
    );
    assert.equal(classifyInboundDocument("corpo-email.txt", "assunto DAS"), "corpo_email");
    assert.equal(isGuiaImposto("nfse"), false);
    assert.equal(isGuiaImposto("boleto_servico"), false);
    assert.equal(isGuiaImposto("extrato"), false);
  });
});

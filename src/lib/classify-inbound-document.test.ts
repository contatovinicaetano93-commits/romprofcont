import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyInboundDocument,
  isDocumentoOperacional,
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
    assert.equal(
      classifyInboundDocument(
        "PGDASD-DAS- 06_2026.pdf",
        "Simples Nacional com menção a parcelamento e Dívida Ativa PGFN",
      ),
      "guia_das",
    );
    assert.equal(isDocumentoOperacional("guia_das"), true);
    assert.equal(tipoFromKind("guia_das"), "DAS");
  });

  it("keeps INSS, parcelamento (including dívida ativa) and accounting fees", () => {
    assert.equal(classifyInboundDocument("guia-inss-agosto.pdf"), "guia_inss");
    assert.equal(
      classifyInboundDocument("gps.pdf", "Guia da Previdência Social INSS"),
      "guia_inss",
    );
    assert.equal(tipoFromKind("guia_inss"), "INSS");

    assert.equal(
      classifyInboundDocument("parcelamento-julho.pdf"),
      "guia_parcelamento",
    );
    assert.equal(
      classifyInboundDocument("guia.pdf", "Parcelamento de Dívida Ativa PGFN"),
      "guia_parcelamento",
    );
    assert.equal(tipoFromKind("guia_parcelamento"), "Parcelamento");

    assert.equal(
      classifyInboundDocument("recibo_de_honorarios_contabeis_0000003851.pdf"),
      "mensalidade",
    );
    assert.equal(
      classifyInboundDocument(
        "servicos_vencto_10_08_2026_doc_19361_bol__cli_47365477000134_001.pdf",
      ),
      "mensalidade",
    );
    assert.equal(
      classifyInboundDocument("boleto-mensalidade-agosto.pdf"),
      "mensalidade",
    );
    assert.equal(
      classifyInboundDocument(
        "recibo_de_honorarios_contabeis_0000003851.pdf",
        "Boleto com linha de INSS / GPS",
      ),
      "mensalidade",
    );
    assert.equal(tipoFromKind("mensalidade"), "Mensalidade");
    assert.equal(isDocumentoOperacional("mensalidade"), true);
    assert.equal(isDocumentoOperacional("guia_parcelamento"), true);

    assert.equal(classifyInboundDocument("PARC. DAS - RAFAELE 10-56.pdf"), "guia_parcelamento");
    assert.equal(classifyInboundDocument("Divida ativa. Marciel 39-45.pdf"), "guia_parcelamento");
    assert.equal(
      classifyInboundDocument("M. G. DOS SANTOS - DARF INSS - AGO26 - R$178,31.pdf"),
      "guia_inss",
    );
    assert.equal(
      classifyInboundDocument("GuiaPagamento_62284007000130_110920261637555327.pdf"),
      "guia_inss",
    );
  });

  it("drops NFS-e, extracts, reports and email bodies", () => {
    assert.equal(classifyInboundDocument("NFSe19361_01530207000130.pdf"), "nfse");
    assert.equal(classifyInboundDocument("19361_20260727.xml"), "nfse");
    assert.equal(classifyInboundDocument("PGDASD-EXTRATO- 06_2026.pdf"), "extrato");
    assert.equal(
      classifyInboundDocument(
        "Relatorios_Impostos_SIMPLES_Nacional_Demonstrativo_das_Receitas_e_Imposto_a_Pagar - 06_2026.pdf",
      ),
      "relatorio",
    );
    assert.equal(classifyInboundDocument("corpo-email.txt", "assunto DAS"), "corpo_email");
    assert.equal(isDocumentoOperacional("nfse"), false);
    assert.equal(isDocumentoOperacional("extrato"), false);
    assert.equal(classifyInboundDocument("comprovante-aleatorio.pdf"), "ignorado");
  });
});

import type { ObrigacaoTipo } from "@/lib/types";

export type InboundKind =
  | "guia_das"
  | "guia_darf"
  | "guia_inss"
  | "guia_parcelamento"
  | "mensalidade"
  | "extrato"
  | "relatorio"
  | "nfse"
  | "corpo_email"
  | "ignorado";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hasWord(blob: string, word: string) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(blob);
}

export function classifyInboundDocument(fileName = "", text = ""): InboundKind {
  const name = normalize(fileName);
  const blob = `${name}\n${normalize(text)}`;

  if (!name || name === "corpo-email.txt") {
    return "corpo_email";
  }

  if (
    name.includes("nfse") ||
    blob.includes("nfse") ||
    blob.includes("nfeproc") ||
    name.endsWith(".xml")
  ) {
    return "nfse";
  }

  if (name.includes("extrato") || blob.includes("pgdasd-extrato")) {
    return "extrato";
  }

  if (
    name.includes("demonstrativo") ||
    (name.includes("relatorio") && name.includes("imposto"))
  ) {
    return "relatorio";
  }

  const looksLikeDarf =
    /(^|[^a-z])darf([^a-z]|$)/.test(name) ||
    blob.includes("documento de arrecadacao de receitas federais");

  const looksLikeDas =
    name.includes("exibirdas") ||
    name.includes("pgdasd-das") ||
    /(^|[^a-z])das([^a-z]|$)/.test(name) ||
    blob.includes("documento de arrecadacao do simples nacional");

  const looksLikeParcelamento =
    blob.includes("parcelamento") ||
    blob.includes("divida ativa") ||
    blob.includes("dividaativa") ||
    hasWord(blob, "pgfn") ||
    name.includes("parcelamento");

  if (looksLikeParcelamento && !looksLikeDas && !looksLikeDarf) {
    return "guia_parcelamento";
  }

  const looksLikeInss =
    hasWord(blob, "inss") ||
    hasWord(blob, "gps") ||
    blob.includes("guia da previdencia") ||
    blob.includes("guia de inss") ||
    blob.includes("contribuicao previdenciaria") ||
    blob.includes("documento de arrecadacao do inss");

  const looksLikeMensalidade =
    name.includes("honorario") ||
    blob.includes("honorario") ||
    blob.includes("mensalidade") ||
    name.includes("mensalidade") ||
    name.includes("servicos_vencto") ||
    name.includes("servicos-vencto");

  if (looksLikeInss && !looksLikeDas && !looksLikeMensalidade) {
    return "guia_inss";
  }
  if (looksLikeDarf && !looksLikeDas) {
    return "guia_darf";
  }
  if (looksLikeDas) {
    return "guia_das";
  }

  if (looksLikeMensalidade) {
    return "mensalidade";
  }

  return "ignorado";
}

export function isDocumentoOperacional(kind: InboundKind): boolean {
  switch (kind) {
    case "guia_das":
    case "guia_darf":
    case "guia_inss":
    case "guia_parcelamento":
    case "mensalidade":
      return true;
    case "extrato":
    case "relatorio":
    case "nfse":
    case "corpo_email":
    case "ignorado":
      return false;
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

export function tipoFromKind(kind: InboundKind): ObrigacaoTipo {
  switch (kind) {
    case "guia_das":
      return "DAS";
    case "guia_darf":
      return "DARF";
    case "guia_inss":
      return "INSS";
    case "guia_parcelamento":
      return "Parcelamento";
    case "mensalidade":
      return "Mensalidade";
    case "extrato":
    case "relatorio":
    case "nfse":
    case "corpo_email":
    case "ignorado":
      return "Outros";
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

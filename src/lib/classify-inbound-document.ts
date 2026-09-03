export type InboundKind =
  | "guia_das"
  | "guia_darf"
  | "extrato"
  | "relatorio"
  | "nfse"
  | "honorarios"
  | "boleto_servico"
  | "corpo_email"
  | "ignorado";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
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

  if (name.includes("honorario") || blob.includes("honorario")) {
    return "honorarios";
  }

  if (name.includes("servicos_vencto") || name.includes("servicos-vencto")) {
    return "boleto_servico";
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

  if (looksLikeDarf && !looksLikeDas) {
    return "guia_darf";
  }
  if (looksLikeDas) {
    return "guia_das";
  }

  if (name.includes("_bol_") || name.includes("boleto")) {
    return "boleto_servico";
  }

  return "ignorado";
}

export function isGuiaImposto(kind: InboundKind): boolean {
  switch (kind) {
    case "guia_das":
    case "guia_darf":
      return true;
    case "extrato":
    case "relatorio":
    case "nfse":
    case "honorarios":
    case "boleto_servico":
    case "corpo_email":
    case "ignorado":
      return false;
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

export function tipoFromKind(kind: InboundKind): "DAS" | "DARF" | "Outros" {
  switch (kind) {
    case "guia_das":
      return "DAS";
    case "guia_darf":
      return "DARF";
    case "extrato":
    case "relatorio":
    case "nfse":
    case "honorarios":
    case "boleto_servico":
    case "corpo_email":
    case "ignorado":
      return "Outros";
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

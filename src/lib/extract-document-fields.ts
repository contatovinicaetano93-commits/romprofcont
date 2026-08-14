export function normalizeCnpjDigits(cnpj: string) {
  return cnpj.replace(/\D/g, "");
}

export function formatCnpj(digits: string) {
  const d = normalizeCnpjDigits(digits);
  if (d.length !== 14) return digits;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function cnpjChecksum(digits: string, length: number) {
  const nums = digits.slice(0, length).split("").map(Number);
  const weights =
    length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const sum = nums.reduce((acc, n, i) => acc + n * weights[i], 0);
  const mod = sum % 11;
  return mod < 2 ? 0 : 11 - mod;
}

export function isValidCnpj(value: string) {
  const digits = normalizeCnpjDigits(value);
  if (digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  const d1 = cnpjChecksum(digits, 12);
  const d2 = cnpjChecksum(digits, 13);
  return d1 === Number(digits[12]) && d2 === Number(digits[13]);
}

export function extractCnpjCandidates(text: string) {
  const candidates = new Set<string>();
  const patterns = [
    /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g,
    /DARF-(\d{14})/gi,
    /CNPJ[:\s]*(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/gi,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const raw = match[1] ?? match[0];
      const digits = normalizeCnpjDigits(raw.replace(/^DARF-/i, ""));
      if (digits.length === 14) candidates.add(digits);
    }
  }

  return [...candidates].filter(isValidCnpj);
}

export function extractBestCnpj(...sources: string[]) {
  for (const source of sources) {
    const found = extractCnpjCandidates(source);
    if (found.length > 0) return formatCnpj(found[0]);
  }
  return undefined;
}

export function extractValorFromText(text: string) {
  const patterns = [
    /R\$\s*([\d.]+,\d{2})/gi,
    /R\$\s*([\d,]+\.\d{2})/gi,
    /valor[\s:]*R?\$?\s*([\d.]+,\d{2})/gi,
    /total[\s:]*R?\$?\s*([\d.]+,\d{2})/gi,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (!match) continue;
    const normalized = match[1].includes(",")
      ? match[1].replace(/\./g, "").replace(",", ".")
      : match[1].replace(/,/g, "");
    const value = parseFloat(normalized);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return undefined;
}

export function extractCompetenciaFromText(text: string) {
  const patterns = [
    /REF[\s.]*(\d{2})[./](\d{4})/i,
    /compet[eê]ncia[\s:]*(\d{2})[./](\d{4})/i,
    /(\d{2})[./](\d{4})\s*DAS/i,
    /DAS[\s-]*(\d{2})[./](\d{4})/i,
    /(\d{2})\.(\d{4})(?:\s|$|[^\d])/,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (!match) continue;
    const mm = match[1];
    const yyyy = match[2];
    const month = parseInt(mm, 10);
    if (month >= 1 && month <= 12 && yyyy.length === 4) {
      return `${mm}/${yyyy}`;
    }
  }
  return undefined;
}

export function guessTipoFromText(text: string): string {
  const upper = text.toUpperCase();
  if (upper.includes(" DAS ") || upper.includes("-DAS") || upper.startsWith("DAS")) {
    return "DAS";
  }
  if (upper.includes(" DARF ") || upper.includes("-DARF") || upper.startsWith("DARF")) {
    return "DARF";
  }
  if (upper.includes("MENSALIDADE")) return "Mensalidade PJ";
  if (upper.includes("BOLETO")) return "Outros";
  return "Outros";
}

export type ExtractedDoc = {
  cnpj?: string;
  tipo?: string;
  competencia?: string;
  valor?: number;
  dataVencimento?: string;
};

export function mergeExtracted(...parts: Array<ExtractedDoc | undefined>): ExtractedDoc {
  const merged: ExtractedDoc = {};
  for (const part of parts) {
    if (!part) continue;
    if (part.cnpj) merged.cnpj = part.cnpj;
    if (part.valor !== undefined) merged.valor = part.valor;
    if (part.competencia) merged.competencia = part.competencia;
    if (part.tipo && part.tipo !== "Outros") merged.tipo = part.tipo;
    if (part.dataVencimento) merged.dataVencimento = part.dataVencimento;
  }
  merged.tipo = merged.tipo ?? "Outros";
  return merged;
}

export function extractFromFileName(fileName: string): ExtractedDoc {
  const base = fileName.replace(/\.[^.]+$/, "");
  return {
    cnpj: extractBestCnpj(base),
    valor: extractValorFromText(base),
    competencia: extractCompetenciaFromText(base),
    tipo: guessTipoFromText(base),
  };
}

export function extractFromPlainText(text: string, hint = ""): ExtractedDoc {
  const combined = `${hint}\n${text}`;
  return {
    cnpj: extractBestCnpj(combined),
    valor: extractValorFromText(combined),
    competencia: extractCompetenciaFromText(combined),
    tipo: guessTipoFromText(combined),
  };
}

export function extractFromXml(xml: string): ExtractedDoc {
  const getTag = (tag: string) => {
    const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, "i"));
    return match?.[1]?.trim();
  };

  const cnpjRaw =
    getTag("CNPJ") ?? getTag("CNPJDest") ?? getTag("CNPJEmit") ?? undefined;
  const cnpj = cnpjRaw && isValidCnpj(cnpjRaw) ? formatCnpj(normalizeCnpjDigits(cnpjRaw)) : undefined;

  const valorStr = getTag("vNF") ?? getTag("vProd");
  const valor = valorStr ? parseFloat(valorStr) : undefined;

  const dhEmi = getTag("dhEmi") ?? getTag("dEmi");
  let competencia: string | undefined;
  if (dhEmi) {
    const date = new Date(dhEmi.slice(0, 10));
    if (!Number.isNaN(date.getTime())) {
      competencia = `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
    }
  }

  return {
    cnpj,
    tipo: "Outros",
    competencia,
    valor,
  };
}

export function extractFromContent(
  text: string,
  fileName?: string,
  hint = "",
): ExtractedDoc {
  const isXml =
    (fileName?.toLowerCase().endsWith(".xml") ?? false) ||
    text.includes("<nfeProc") ||
    text.includes("<NFe") ||
    text.includes("<?xml");

  if (isXml) {
    return mergeExtracted(extractFromXml(text), extractFromFileName(fileName ?? ""), extractFromPlainText("", hint));
  }

  return mergeExtracted(
    extractFromPlainText(text, hint),
    extractFromFileName(fileName ?? ""),
  );
}
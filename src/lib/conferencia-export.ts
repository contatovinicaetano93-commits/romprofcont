import { normalizeCnpj, normalizeDocumentoTipo } from "@/lib/types";
import { extractParcelaLabel, formatCnpj } from "@/lib/extract-document-fields";

export const CONFERENCIA_HEADERS = [
  "PROFISSIONAL",
  "CNPJ",
  "UNIDADE",
  "CONTABILIDADE",
  "VALOR MENSALIDADE",
  "DAS: MEI/SIMPLES",
  "VALOR DAS",
  "DARF INSS",
  "PARCELAMENTO",
  "VALOR PARCELAMENTO",
  "SITUAÇÃO",
  "FINANCEIRO (PAGAMENTO)",
] as const;

const MESES_COMPLETOS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export type ConferenciaProfissional = {
  id: string;
  name: string;
  cnpj: string | null;
  unidade: string | null;
  regimeTributario: string | null;
  contabilidadeName: string | null;
};

export type ConferenciaDocumento = {
  profissionalId: string | null;
  competencia: string;
  status: string;
  tipo: string | null;
  valor: string | number | null;
  fileName?: string | null;
  metadata?: unknown;
};

export type ConferenciaRow = {
  profissional: string;
  cnpj: string;
  unidade: string;
  contabilidade: string;
  valorMensalidade: number | "";
  dasMeiSimples: string;
  valorDas: number | "";
  darfInss: number | "";
  parcelamento: string;
  valorParcelamento: number | "";
  situacao: string;
  financeiro: string;
};

function parseAmount(value: string | number | null | undefined) {
  const n = typeof value === "string" ? parseFloat(value) : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function mapUnidadeExcel(unidade: string | null | undefined) {
  const value = (unidade ?? "").toLowerCase();
  if (value.includes("iguatemi")) return "IGUATEMI";
  if (value.includes("brasil")) return "AV. BRASIL";
  return (unidade ?? "").trim();
}

export function mapRegimeExcel(regime: string | null | undefined) {
  const value = (regime ?? "").toLowerCase();
  if (value.includes("mei")) return "MEI";
  if (value.includes("simples")) return "SIMPLES";
  return "";
}

export { extractParcelaLabel };

export function sheetNameForCompetencia(competencia: string) {
  const [mm] = competencia.split("/");
  const idx = parseInt(mm ?? "0", 10) - 1;
  return `GERAL - ${MESES_COMPLETOS[idx] ?? competencia}`;
}

export function formatCnpjExcel(cnpj: string | null | undefined) {
  const digits = normalizeCnpj(cnpj ?? "");
  if (digits.length !== 14) return (cnpj ?? "").trim() || "-";
  return formatCnpj(digits);
}

function parcelaFromDoc(doc: ConferenciaDocumento) {
  const metadata = doc.metadata && typeof doc.metadata === "object"
    ? (doc.metadata as { parcela?: unknown })
    : {};
  const stored = typeof metadata.parcela === "string" ? metadata.parcela : "";
  return stored || extractParcelaLabel(doc.fileName);
}

export function buildConferenciaRows(
  profissionais: ConferenciaProfissional[],
  documentos: ConferenciaDocumento[],
  competencia: string,
): ConferenciaRow[] {
  const approved = documentos.filter(
    (doc) => doc.status === "aprovado" && doc.competencia === competencia && doc.profissionalId,
  );

  const byProf = new Map<string, ConferenciaDocumento[]>();
  for (const doc of approved) {
    const id = doc.profissionalId as string;
    const list = byProf.get(id) ?? [];
    list.push(doc);
    byProf.set(id, list);
  }

  return [...profissionais]
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    .map((profissional) => {
      const docs = byProf.get(profissional.id) ?? [];
      let valorMensalidade = 0;
      let valorDas = 0;
      let darfInss = 0;
      let valorParcelamento = 0;
      const parcelaLabels = new Set<string>();

      for (const doc of docs) {
        const tipo = normalizeDocumentoTipo(doc.tipo);
        const amount = parseAmount(doc.valor);
        switch (tipo) {
          case "Mensalidade":
            valorMensalidade += amount;
            break;
          case "DAS":
            valorDas += amount;
            break;
          case "INSS":
          case "DARF":
            darfInss += amount;
            break;
          case "Parcelamento": {
            valorParcelamento += amount;
            const label = parcelaFromDoc(doc);
            if (label) parcelaLabels.add(label);
            break;
          }
          case "Outros":
            break;
          default: {
            const exhaustive: never = tipo;
            void exhaustive;
            break;
          }
        }
      }

      const hasApproved = docs.length > 0;
      const parcelamento =
        [...parcelaLabels].join(" | ") ||
        (valorParcelamento > 0 ? "Parcelamento" : "");

      return {
        profissional: profissional.name,
        cnpj: formatCnpjExcel(profissional.cnpj),
        unidade: mapUnidadeExcel(profissional.unidade),
        contabilidade: profissional.contabilidadeName ?? "",
        valorMensalidade: valorMensalidade > 0 ? roundMoney(valorMensalidade) : "",
        dasMeiSimples: mapRegimeExcel(profissional.regimeTributario),
        valorDas: valorDas > 0 ? roundMoney(valorDas) : "",
        darfInss: darfInss > 0 ? roundMoney(darfInss) : "",
        parcelamento,
        valorParcelamento: valorParcelamento > 0 ? roundMoney(valorParcelamento) : "",
        situacao: hasApproved ? "Envio Financeiro" : "",
        financeiro: "",
      };
    });
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function conferenciaFileName(competencia: string) {
  return `IMPOSTOS - CONFERENCIA ${competencia.replace("/", "-")}.xlsx`;
}

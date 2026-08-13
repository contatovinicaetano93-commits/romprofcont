export type DocumentoStatus =
  | "aprovado"
  | "pendente_validacao"
  | "reprovado"
  | "nao_identificado"
  | "arquivado";

export type ObrigacaoTipo = "DAS" | "DARF" | "Mensalidade PJ" | "Outros";

export type Periodicidade = "Mensal" | "Trimestral" | "Anual";

export type ValidacaoItem = {
  check: string;
  detail: string;
  result: string;
};

export const STATUS_LABELS: Record<DocumentoStatus, string> = {
  aprovado: "APROVADO",
  pendente_validacao: "PENDENTE DE VALIDAÇÃO",
  reprovado: "REPROVADO",
  nao_identificado: "NÃO IDENTIFICADO",
  arquivado: "ARQUIVADO",
};

export const STATUS_COLORS: Record<DocumentoStatus, string> = {
  aprovado: "bg-green-100 text-green-800",
  pendente_validacao: "bg-yellow-100 text-yellow-800",
  reprovado: "bg-red-100 text-red-800",
  nao_identificado: "bg-gray-100 text-gray-800",
  arquivado: "bg-blue-100 text-blue-800",
};

export const UNIDADES = ["ROM Brasil", "ROM Iguatemi"] as const;
export const REGIMES = ["Simples Nacional", "MEI", "Lucro Presumido"] as const;
export const OBRIGACAO_TIPOS: ObrigacaoTipo[] = [
  "DAS",
  "DARF",
  "Mensalidade PJ",
  "Outros",
];

export function formatCurrency(value: number | string | null | undefined) {
  const n = typeof value === "string" ? parseFloat(value) : Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(n) ? n : 0);
}

export function formatCompetenciaMonth(competencia: string) {
  const [mm, yyyy] = competencia.split("/");
  const months = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];
  const idx = parseInt(mm ?? "0", 10) - 1;
  return `${months[idx] ?? mm}/${yyyy ?? ""}`;
}

export function normalizeCnpj(cnpj: string) {
  return cnpj.replace(/\D/g, "");
}

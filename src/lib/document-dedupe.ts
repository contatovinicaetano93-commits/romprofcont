import { competenciaMonth } from "@/lib/competencia";
import { normalizeCnpj } from "@/lib/types";

export const LIVE_DUPLICATE_STATUSES = [
  "pendente_validacao",
  "nao_identificado",
  "aprovado",
] as const;

export const DUPLICATE_MOTIVO = "Duplicata do mesmo arquivo e valor";

export type DedupeCandidate = {
  id: string;
  status: string;
  createdAt: Date | string;
  fileName?: string | null;
  valor?: string | number | null;
  profissionalId?: string | null;
  cnpj?: string | null;
  tipo?: string | null;
  competencia?: string | null;
};

export function isLiveDuplicateStatus(status: string) {
  return (LIVE_DUPLICATE_STATUSES as readonly string[]).includes(status);
}

export function normalizeDedupeFileName(fileName: string | null | undefined) {
  return (fileName ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function normalizeDedupeValor(valor: string | number | null | undefined) {
  if (valor == null || valor === "") return null;
  const raw = typeof valor === "number" ? String(valor) : String(valor).trim();
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;
  const n = Number.parseFloat(normalized);
  if (!Number.isFinite(n)) return null;
  return n.toFixed(2);
}

function identityKey(profissionalId?: string | null, cnpj?: string | null) {
  if (profissionalId) return `p:${profissionalId}`;
  const digits = normalizeCnpj(cnpj ?? "");
  if (digits.length === 14) return `c:${digits}`;
  return null;
}

function normalizeDedupeCompetencia(competencia?: string | null) {
  if (competencia == null || competencia === "") return null;
  const month = competenciaMonth(competencia);
  return month || null;
}

export function documentDedupeKey(input: {
  fileName?: string | null;
  valor?: string | number | null;
  profissionalId?: string | null;
  cnpj?: string | null;
  tipo?: string | null;
  competencia?: string | null;
}) {
  const fileName = normalizeDedupeFileName(input.fileName);
  if (!fileName) return null;
  const valor = normalizeDedupeValor(input.valor);
  if (valor == null) return null;
  const competencia = normalizeDedupeCompetencia(input.competencia);
  if (competencia == null) return null;
  const identity = identityKey(input.profissionalId, input.cnpj);
  if (!identity) return null;
  const tipo = (input.tipo ?? "").trim().toLowerCase();
  return `${fileName}|${valor}|${tipo}|${identity}|${competencia}`;
}

function createdAtMs(value: Date | string) {
  const ms = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

export function pickKeptDocument<T extends { id: string; status: string; createdAt: Date | string }>(
  docs: T[],
) {
  const approved = docs.filter((doc) => doc.status === "aprovado");
  const pool = approved.length > 0 ? approved : docs;
  return [...pool].sort((a, b) => {
    const byDate = createdAtMs(a.createdAt) - createdAtMs(b.createdAt);
    if (byDate !== 0) return byDate;
    return a.id.localeCompare(b.id);
  })[0];
}

export function extraDuplicateIds(docs: DedupeCandidate[]) {
  const groups = new Map<string, DedupeCandidate[]>();
  for (const doc of docs) {
    if (!isLiveDuplicateStatus(doc.status)) continue;
    const key = documentDedupeKey(doc);
    if (!key) continue;
    const list = groups.get(key) ?? [];
    list.push(doc);
    groups.set(key, list);
  }

  const extras: string[] = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const kept = pickKeptDocument(group);
    for (const doc of group) {
      if (doc.id !== kept.id) extras.push(doc.id);
    }
  }
  return extras;
}

export function findMatchingLiveDuplicate<T extends DedupeCandidate>(
  incoming: Omit<DedupeCandidate, "id" | "status" | "createdAt">,
  liveDocs: T[],
) {
  const key = documentDedupeKey(incoming);
  if (!key) return undefined;
  return liveDocs.find(
    (doc) => isLiveDuplicateStatus(doc.status) && documentDedupeKey(doc) === key,
  );
}

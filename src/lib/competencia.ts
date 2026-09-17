const COMPETENCIA_TZ = "America/Sao_Paulo";

function dateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: COMPETENCIA_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(date);

  const values: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") values[part.type] = part.value;
  }
  return {
    day: values.day ?? "01",
    month: values.month ?? "01",
    year: values.year ?? "1970",
  };
}

/** Exact send/receive date shown in the Competência column: DD/MM/YYYY (Brazil). */
export function competenciaFromDate(date = new Date()) {
  const { day, month, year } = dateParts(date);
  return `${day}/${month}/${year}`;
}

/** Month bucket used by filters, pendências and the conferência export: MM/YYYY. */
export function competenciaMonth(value: string) {
  const trimmed = value.trim();
  const fullDate = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (fullDate) return `${fullDate[2]}/${fullDate[3]}`;
  const monthOnly = trimmed.match(/^(\d{2})\/(\d{4})$/);
  if (monthOnly) return `${monthOnly[1]}/${monthOnly[2]}`;
  return trimmed;
}

export function isSameCompetenciaMonth(a: string, b: string) {
  return competenciaMonth(a) === competenciaMonth(b);
}

export function uniqueCompetenciaMonths(values: Iterable<string>) {
  const unique = [...new Set([...values].map(competenciaMonth).filter(Boolean))];
  return unique.sort((a, b) => {
    const [monthA, yearA] = competenciaMonth(a).split("/");
    const [monthB, yearB] = competenciaMonth(b).split("/");
    return `${yearB}-${monthB}`.localeCompare(`${yearA}-${monthA}`);
  });
}

export function competenciaForDocumento(input: {
  competencia: string;
  emailSentAt?: Date | string | null;
}) {
  if (!input.emailSentAt) return input.competencia;
  const date = input.emailSentAt instanceof Date
    ? input.emailSentAt
    : new Date(input.emailSentAt);
  if (Number.isNaN(date.getTime())) return input.competencia;
  return competenciaFromDate(date);
}

export function currentCompetencia(date = new Date()) {
  return competenciaMonth(competenciaFromDate(date));
}

export function recentCompetencias(count = 6, date = new Date()) {
  const { month, year } = dateParts(date);
  const cursor = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  const items: string[] = [];
  for (let i = 0; i < count; i += 1) {
    items.push(
      `${String(cursor.getUTCMonth() + 1).padStart(2, "0")}/${cursor.getUTCFullYear()}`,
    );
    cursor.setUTCMonth(cursor.getUTCMonth() - 1);
  }
  return items;
}

export function isPastEnvioDeadline(date = new Date()) {
  return Number(dateParts(date).day) > 15;
}

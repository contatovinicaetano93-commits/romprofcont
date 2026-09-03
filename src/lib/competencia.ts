export function currentCompetencia(date = new Date()) {
  const apuracao = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  return `${String(apuracao.getMonth() + 1).padStart(2, "0")}/${apuracao.getFullYear()}`;
}

export function recentCompetencias(count = 6, date = new Date()) {
  const cursor = new Date(date.getFullYear(), date.getMonth(), 1);
  const items: string[] = [];
  for (let i = 0; i < count; i += 1) {
    items.push(
      `${String(cursor.getMonth() + 1).padStart(2, "0")}/${cursor.getFullYear()}`,
    );
    cursor.setMonth(cursor.getMonth() - 1);
  }
  return items;
}

export function isPastEnvioDeadline(date = new Date()) {
  return date.getDate() > 15;
}

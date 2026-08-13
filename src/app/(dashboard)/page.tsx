import { asc, desc } from "drizzle-orm";
import {
  contabilidades,
  documentos,
  obrigacoes,
  profissionais,
} from "@/db/schema";
import { getDb } from "@/lib/db";
import { formatCompetenciaMonth } from "@/lib/types";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const db = getDb();

  const [docs, obrs, profs, conts] = await Promise.all([
    db.select().from(documentos).orderBy(desc(documentos.createdAt)),
    db.select().from(obrigacoes),
    db.select().from(profissionais),
    db.select().from(contabilidades).orderBy(asc(contabilidades.name)),
  ]);

  const competencias = [...new Set(docs.map((d) => d.competencia))].sort().reverse();
  const expectedMensal = obrs.filter((o) => o.periodicidade === "Mensal").length;

  const compliance = conts.map((c) => {
    const profIds = profs.filter((p) => p.contabilidadeId === c.id).map((p) => p.id);
    const expected = obrs.filter((o) => profIds.includes(o.profissionalId)).length;
    const received = docs.filter((d) => d.contabilidadeId === c.id).length;
    const approved = docs.filter(
      (d) => d.contabilidadeId === c.id && d.status === "aprovado",
    ).length;
    const pending = Math.max(0, expected - approved);
    const compliancePct = expected > 0 ? Math.round((approved / expected) * 100) : 100;
    return { id: c.id, name: c.name, expected, received, approved, pending, compliancePct };
  });

  const chartCompetencias = competencias.slice(0, 5).reverse().map((comp) => ({
    competencia: formatCompetenciaMonth(comp).split("/")[0],
    esperado: expectedMensal,
    recebido: docs.filter((d) => d.competencia === comp).length,
  }));

  return (
    <DashboardClient
      initialCompetencias={["todas", ...competencias]}
      initialDocs={docs}
      expectedMensal={expectedMensal}
      compliance={compliance}
      chartCompetencias={chartCompetencias}
    />
  );
}

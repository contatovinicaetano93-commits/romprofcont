import { desc } from "drizzle-orm";
import {
  contabilidades,
  documentos,
  profissionais,
} from "@/db/schema";
import { getDb } from "@/lib/db";
import { DashboardClient, type DashboardDoc, type DashboardProfissional } from "./dashboard-client";

export default async function DashboardPage() {
  const db = getDb();

  const [docs, profs, conts] = await Promise.all([
    db.select().from(documentos).orderBy(desc(documentos.createdAt)),
    db.select().from(profissionais),
    db.select().from(contabilidades),
  ]);

  const contById = new Map(conts.map((c) => [c.id, c.name]));
  const profById = new Map(profs.map((p) => [p.id, p]));

  const initialDocs: DashboardDoc[] = docs
    .filter((d) => d.status !== "arquivado")
    .map((d) => {
      const prof = d.profissionalId ? profById.get(d.profissionalId) : undefined;
      return {
        id: d.id,
        competencia: d.competencia,
        status: d.status,
        tipo: d.tipo,
        cnpj: d.cnpj,
        valor: d.valor,
        profissionalId: d.profissionalId,
        profissionalName: prof?.name ?? null,
        contabilidadeId: d.contabilidadeId ?? prof?.contabilidadeId ?? null,
        contabilidadeName:
          (d.contabilidadeId ? contById.get(d.contabilidadeId) : undefined) ??
          (prof ? contById.get(prof.contabilidadeId) : undefined) ??
          null,
      };
    });

  const profissionaisRows: DashboardProfissional[] = profs.map((p) => ({
    id: p.id,
    name: p.name,
    cnpj: p.cnpj,
    contabilidadeId: p.contabilidadeId,
    contabilidadeName: contById.get(p.contabilidadeId) ?? "Sem contabilidade",
  }));

  const competencias = [...new Set(initialDocs.map((d) => d.competencia))].sort().reverse();

  return (
    <DashboardClient
      initialCompetencias={["todas", ...competencias]}
      initialDocs={initialDocs}
      profissionais={profissionaisRows}
    />
  );
}

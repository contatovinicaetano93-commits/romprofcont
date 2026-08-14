/**
 * Reprocessa documentos importados por e-mail usando nome do arquivo + assunto.
 * Uso: npm run email:fix-docs
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";
import { documentos, emailLogs, obrigacoes, profissionais } from "../src/db/schema";
import { extractFromContent, isValidCnpj } from "../src/lib/extract-document-fields";
import { validateDocument } from "../src/lib/validate-document";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
  const rows = await db
    .select({
      id: documentos.id,
      fileName: documentos.fileName,
      emailLogId: documentos.emailLogId,
      assunto: emailLogs.assunto,
    })
    .from(documentos)
    .leftJoin(emailLogs, eq(documentos.emailLogId, emailLogs.id))
    .where(eq(documentos.origem, "email"));

  const [profs, obrs] = await Promise.all([
    db.select().from(profissionais),
    db.select().from(obrigacoes),
  ]);

  let updated = 0;
  let removed = 0;

  for (const row of rows) {
    if (row.fileName === "corpo-email.txt") {
      await db.delete(documentos).where(eq(documentos.id, row.id));
      removed += 1;
      continue;
    }

    const hint = row.assunto ?? "";
    const extracted = extractFromContent("", row.fileName ?? "", hint);
    if (extracted.cnpj && !isValidCnpj(extracted.cnpj)) {
      extracted.cnpj = undefined;
    }
    if (!extracted.cnpj && !extracted.valor && !extracted.competencia) continue;

    const result = validateDocument(
      extracted,
      profs.map((p) => ({
        id: p.id,
        name: p.name,
        cnpj: p.cnpj,
        contabilidadeId: p.contabilidadeId,
        unidade: p.unidade,
      })),
      obrs.map((o) => ({
        id: o.id,
        profissionalId: o.profissionalId,
        tipo: o.tipo,
        valorEsperado: o.valorEsperado,
        regras: o.regras,
      })),
    );

    const competencia =
      extracted.competencia ||
      `${String(new Date().getMonth() + 1).padStart(2, "0")}/${new Date().getFullYear()}`;

    await db
      .update(documentos)
      .set({
        cnpj: result.cnpj || extracted.cnpj || null,
        valor: (result.valor || extracted.valor) ? String(result.valor || extracted.valor) : null,
        tipo: extracted.tipo ?? result.tipo,
        competencia,
        status: result.status,
        motivo: result.motivo,
        acaoNecessaria: result.acaoNecessaria,
        profissionalId: result.profissionalId,
        contabilidadeId: result.contabilidadeId,
        obrigacaoId: result.obrigacaoId,
        unidade: result.unidade,
        validacoes: result.validacoes,
      })
      .where(eq(documentos.id, row.id));

    updated += 1;
  }

  console.log({ updated, removed, total: rows.length });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

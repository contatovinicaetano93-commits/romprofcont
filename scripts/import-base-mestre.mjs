/**
 * Importa Base Mestre (profissionais + contabilidades) a partir do JSON
 * gerado por scripts/parse-base-mestre.py.
 *
 * Uso:
 *   python3 scripts/parse-base-mestre.py planilha.xlsx \
 *     | node --env-file=.env.local scripts/import-base-mestre.mjs
 */
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

function normalizeCnpj(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function readPayload() {
  const input = process.argv[2]
    ? readFileSync(process.argv[2], "utf8")
    : readFileSync(0, "utf8");
  return JSON.parse(input);
}

const sql = neon(DATABASE_URL);

async function upsertContabilidade(name) {
  const existing = await sql`
    SELECT id, name FROM contabilidades
    WHERE lower(name) = ${name.toLowerCase()}
    LIMIT 1
  `;
  if (existing[0]) {
    if (existing[0].name !== name) {
      await sql`
        UPDATE contabilidades
        SET name = ${name}, updated_at = now()
        WHERE id = ${existing[0].id}
      `;
    }
    return existing[0].id;
  }
  const inserted = await sql`
    INSERT INTO contabilidades (name, active)
    VALUES (${name}, true)
    RETURNING id
  `;
  return inserted[0].id;
}

async function main() {
  const payload = readPayload();
  const profissionais = payload.profissionais ?? [];
  const contabilidadeNames = payload.contabilidades ?? [];

  console.log(
    `Importando ${contabilidadeNames.length} contabilidades e ${profissionais.length} profissionais`,
  );

  const contMap = new Map();
  for (const name of contabilidadeNames) {
    const id = await upsertContabilidade(name);
    contMap.set(name.toLowerCase(), id);
  }

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const profissional of profissionais) {
    const contId = contMap.get(profissional.contabilidade.toLowerCase());
    if (!contId) {
      skipped += 1;
      console.warn(`Sem contabilidade para ${profissional.name}`);
      continue;
    }

    const digits = normalizeCnpj(profissional.cnpj);
    const existing = await sql`
      SELECT id, cnpj FROM profissionais
      WHERE regexp_replace(coalesce(cnpj, ''), '[^0-9]', '', 'g') = ${digits}
      LIMIT 1
    `;

    if (existing[0]) {
      await sql`
        UPDATE profissionais
        SET
          name = ${profissional.name},
          cnpj = ${profissional.cnpj},
          contabilidade_id = ${contId},
          unidade = ${profissional.unidade},
          active = true,
          updated_at = now()
        WHERE id = ${existing[0].id}
      `;
      updated += 1;
      continue;
    }

    await sql`
      INSERT INTO profissionais (
        name, cnpj, contabilidade_id, unidade, regime_tributario, active
      )
      VALUES (
        ${profissional.name},
        ${profissional.cnpj},
        ${contId},
        ${profissional.unidade},
        'Simples Nacional',
        true
      )
    `;
    inserted += 1;
  }

  const relinked = await sql`
    UPDATE documentos d
    SET
      profissional_id = p.id,
      contabilidade_id = p.contabilidade_id,
      unidade = p.unidade,
      status = CASE
        WHEN d.status = 'nao_identificado' THEN 'pendente_validacao'::documento_status
        ELSE d.status
      END,
      motivo = CASE
        WHEN d.status = 'nao_identificado'
          THEN 'Profissional identificado na Base Mestre; obrigação ainda não cadastrada'
        ELSE d.motivo
      END,
      acao_necessaria = CASE
        WHEN d.status = 'nao_identificado'
          THEN 'Cadastrar obrigação na Base Mestre e revisar o documento'
        ELSE d.acao_necessaria
      END,
      updated_at = now()
    FROM profissionais p
    WHERE regexp_replace(coalesce(d.cnpj, ''), '[^0-9]', '', 'g')
      = regexp_replace(coalesce(p.cnpj, ''), '[^0-9]', '', 'g')
      AND regexp_replace(coalesce(d.cnpj, ''), '[^0-9]', '', 'g') <> ''
    RETURNING d.id
  `;

  const [counts] = await sql`
    SELECT
      (SELECT count(*)::int FROM contabilidades) AS contabilidades,
      (SELECT count(*)::int FROM profissionais) AS profissionais,
      (SELECT count(*)::int FROM profissionais WHERE unidade = 'ROM Brasil') AS rom_brasil,
      (SELECT count(*)::int FROM profissionais WHERE unidade = 'ROM Iguatemi') AS rom_iguatemi,
      (SELECT count(*)::int FROM documentos WHERE status = 'nao_identificado') AS docs_nao_identificados,
      (SELECT count(*)::int FROM documentos WHERE profissional_id IS NOT NULL) AS docs_vinculados
  `;

  console.log(
    JSON.stringify(
      {
        inserted,
        updated,
        skipped,
        documentsRelinked: relinked.length,
        conflicts: payload.conflicts?.length ?? 0,
        totals: counts,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

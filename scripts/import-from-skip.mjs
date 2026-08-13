/**
 * Importa dados do Skip (PocketBase) para o Neon.
 *
 * Uso:
 *   SKIP_PB_URL=https://controle-de-obrigacoes-pj-e44be.shrd00.internal.goskip.dev \
 *   SKIP_EMAIL=seu@email.com \
 *   SKIP_PASSWORD=sua-senha \
 *   node --env-file=.env.local scripts/import-from-skip.mjs
 */

import { neon } from "@neondatabase/serverless";

const PB_URL = process.env.SKIP_PB_URL;
const SKIP_EMAIL = process.env.SKIP_EMAIL;
const SKIP_PASSWORD = process.env.SKIP_PASSWORD;
const DATABASE_URL = process.env.DATABASE_URL;

if (!PB_URL || !SKIP_EMAIL || !SKIP_PASSWORD || !DATABASE_URL) {
  console.error("Defina SKIP_PB_URL, SKIP_EMAIL, SKIP_PASSWORD e DATABASE_URL");
  process.exit(1);
}

async function pbFetch(path, options = {}) {
  const res = await fetch(`${PB_URL}${path}`, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

async function pbList(collection, token) {
  const items = [];
  let page = 1;
  while (true) {
    const data = await pbFetch(
      `/api/collections/${collection}/records?perPage=500&page=${page}`,
      { headers: { Authorization: token } },
    );
    items.push(...data.items);
    if (page >= data.totalPages) break;
    page += 1;
  }
  return items;
}

const sql = neon(DATABASE_URL);

async function main() {
  console.log("Autenticando no Skip...");
  const auth = await pbFetch("/api/collections/users/auth-with-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: SKIP_EMAIL, password: SKIP_PASSWORD }),
  });
  const token = auth.token;

  console.log("Baixando coleções...");
  const [conts, profs, obrs, docs] = await Promise.all([
    pbList("contabilidades", token),
    pbList("profissionais", token),
    pbList("obrigacoes", token),
    pbList("documentos", token),
  ]);

  console.log(`Encontrado: ${conts.length} contabilidades, ${profs.length} profissionais, ${obrs.length} obrigações, ${docs.length} documentos`);

  const contMap = new Map();
  for (const c of conts) {
    const rows = await sql`
      INSERT INTO contabilidades (name, email, skip_id)
      VALUES (${c.name}, ${c.email ?? null}, ${c.id})
      ON CONFLICT (skip_id) WHERE skip_id IS NOT NULL
      DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, updated_at = now()
      RETURNING id, skip_id
    `;
    contMap.set(c.id, rows[0].id);
  }

  const profMap = new Map();
  for (const p of profs) {
    const contId = contMap.get(p.contabilidade);
    if (!contId) continue;
    const rows = await sql`
      INSERT INTO profissionais (name, cnpj, cpf, contabilidade_id, unidade, regime_tributario, email_contabilidade, skip_id)
      VALUES (${p.nome ?? p.name}, ${p.cnpj ?? null}, ${p.cpf ?? null}, ${contId},
              ${p.unidade ?? "ROM Brasil"}, ${p.regime_tributario ?? "Simples Nacional"},
              ${p.email_contabilidade ?? null}, ${p.id})
      ON CONFLICT (skip_id) WHERE skip_id IS NOT NULL
      DO UPDATE SET name = EXCLUDED.name, cnpj = EXCLUDED.cnpj, updated_at = now()
      RETURNING id, skip_id
    `;
    profMap.set(p.id, rows[0].id);
  }

  for (const o of obrs) {
    const profId = profMap.get(o.profissional);
    if (!profId) continue;
    await sql`
      INSERT INTO obrigacoes (profissional_id, tipo, name, valor_esperado, periodicidade, vencimento, regras, skip_id)
      VALUES (${profId}, ${o.tipo}, ${o.tipo}, ${o.valor_esperado ?? null},
              ${o.periodicidade ?? "Mensal"}, ${o.vencimento ?? null}, ${o.regras ?? null}, ${o.id})
      ON CONFLICT (skip_id) WHERE skip_id IS NOT NULL
      DO UPDATE SET valor_esperado = EXCLUDED.valor_esperado, updated_at = now()
    `;
  }

  for (const d of docs) {
    const profId = profMap.get(d.profissional) ?? null;
    const contId = contMap.get(d.contabilidade) ?? null;
    await sql`
      INSERT INTO documentos (
        profissional_id, contabilidade_id, competencia, status, cnpj, tipo, valor,
        motivo, acao_necessaria, data_vencimento, unidade, validacoes, skip_id, origem
      )
      VALUES (
        ${profId}, ${contId}, ${d.competencia}, ${d.status}, ${d.cnpj ?? null}, ${d.tipo ?? null},
        ${d.valor ?? null}, ${d.motivo ?? null}, ${d.acao_necessaria ?? null},
        ${d.data_vencimento ?? null}, ${d.unidade ?? null},
        ${JSON.stringify(d.validacoes ?? [])}::jsonb, ${d.id}, 'import'
      )
      ON CONFLICT (skip_id) WHERE skip_id IS NOT NULL DO NOTHING
    `;
  }

  console.log("Importação concluída!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

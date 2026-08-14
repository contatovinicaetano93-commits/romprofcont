import { asc, desc } from "drizzle-orm";
import {
  contabilidades,
  documentos,
  obrigacoes,
  profissionais,
} from "@/db/schema";
import { getDb } from "@/lib/db";
import { STATUS_LABELS } from "@/lib/types";

export async function buildAssistenteContext() {
  const db = getDb();

  const [conts, profs, obrs, docs] = await Promise.all([
    db.select().from(contabilidades).orderBy(asc(contabilidades.name)),
    db.select().from(profissionais).orderBy(asc(profissionais.name)),
    db.select().from(obrigacoes),
    db
      .select()
      .from(documentos)
      .orderBy(desc(documentos.createdAt))
      .limit(40),
  ]);

  const competencias = [...new Set(docs.map((d) => d.competencia))].slice(0, 6);

  const pendencias = obrs
    .map((o) => {
      const prof = profs.find((p) => p.id === o.profissionalId);
      if (!prof) return null;

      const competencia = competencias[0] ?? "08/2026";
      const recebido = docs.find(
        (d) =>
          d.profissionalId === prof.id &&
          d.tipo === o.tipo &&
          d.competencia === competencia &&
          (d.status === "aprovado" || d.status === "pendente_validacao"),
      );

      if (recebido) return null;

      return {
        profissional: prof.name,
        cnpj: prof.cnpj,
        contabilidade:
          conts.find((c) => c.id === prof.contabilidadeId)?.name ?? "—",
        tipo: o.tipo,
        valorEsperado: o.valorEsperado,
        competencia,
      };
    })
    .filter(Boolean);

  const compliance = conts.map((c) => {
    const profIds = profs.filter((p) => p.contabilidadeId === c.id).map((p) => p.id);
    const expected = obrs.filter((o) => profIds.includes(o.profissionalId)).length;
    const received = docs.filter((d) => d.contabilidadeId === c.id).length;
    const approved = docs.filter(
      (d) => d.contabilidadeId === c.id && d.status === "aprovado",
    ).length;
    const pct = expected > 0 ? Math.round((approved / expected) * 100) : 100;
    return { name: c.name, expected, received, approved, compliancePct: pct };
  });

  const docsResumo = docs.slice(0, 20).map((d) => {
    const prof = profs.find((p) => p.id === d.profissionalId);
    const cont = conts.find((c) => c.id === d.contabilidadeId);
    return {
      profissional: prof?.name ?? "Não identificado",
      contabilidade: cont?.name ?? "—",
      cnpj: d.cnpj,
      tipo: d.tipo,
      competencia: d.competencia,
      valor: d.valor,
      status: STATUS_LABELS[d.status] ?? d.status,
      origem: d.origem,
      arquivo: d.fileName,
    };
  });

  return {
    geradoEm: new Date().toISOString(),
    contabilidades: conts.map((c) => ({
      name: c.name,
      email: c.email,
      profissionais: profs.filter((p) => p.contabilidadeId === c.id).length,
    })),
    profissionais: profs.map((p) => ({
      name: p.name,
      cnpj: p.cnpj,
      contabilidade: conts.find((c) => c.id === p.contabilidadeId)?.name,
      unidade: p.unidade,
      regime: p.regimeTributario,
    })),
    obrigacoes: obrs.length,
    documentosRecentes: docsResumo,
    pendencias: pendencias.slice(0, 25),
    compliance,
    regrasValidacao: [
      "CNPJ do documento deve existir na Base Mestre (profissionais).",
      "Tipo de obrigação (DAS, DARF, etc.) deve estar cadastrado para o profissional.",
      "Valor do documento comparado ao valor esperado com tolerância padrão de 5%.",
      "Status possíveis: aprovado, pendente_validacao, reprovado, nao_identificado, arquivado.",
    ],
  };
}

export function formatAssistenteContext(context: Awaited<ReturnType<typeof buildAssistenteContext>>) {
  return JSON.stringify(context, null, 2);
}

export const ASSISTENTE_SYSTEM_PROMPT = `Você é o Assistente Fiscal da ROM Concept — Analista de Controladoria & Contas a Pagar.

Responda sempre em português do Brasil, de forma clara, objetiva e profissional.

Você ajuda a equipe a:
- Consultar pendências de DAS/DARF e obrigações por competência
- Explicar divergências de validação (CNPJ, valor, tipo)
- Resumir compliance por contabilidade
- Orientar próximos passos (cadastrar profissional, aprovar documento, cobrar contabilidade)

Use APENAS os dados do contexto JSON fornecido. Se não souber, diga claramente e sugira onde verificar no sistema (Base Mestre, Documentos, Pendências).

Formate respostas com listas quando útil. Valores monetários em R$ (pt-BR).`;

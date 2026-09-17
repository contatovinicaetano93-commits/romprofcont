import { asc, desc, eq } from "drizzle-orm";
import {
  contabilidades,
  documentos,
  emailLogs,
  obrigacoes,
  profissionais,
} from "@/db/schema";
import { getDb } from "@/lib/db";
import {
  competenciaForDocumento,
  isSameCompetenciaMonth,
  uniqueCompetenciaMonths,
} from "@/lib/competencia";
import { STATUS_LABELS } from "@/lib/types";

export async function buildAssistenteContext() {
  const db = getDb();

  const [conts, profs, obrs, docRows] = await Promise.all([
    db.select().from(contabilidades).orderBy(asc(contabilidades.name)),
    db.select().from(profissionais).orderBy(asc(profissionais.name)),
    db.select().from(obrigacoes),
    db
      .select({
        documento: documentos,
        emailSentAt: emailLogs.receivedAt,
      })
      .from(documentos)
      .leftJoin(emailLogs, eq(documentos.emailLogId, emailLogs.id))
      .orderBy(desc(documentos.createdAt))
      .limit(40),
  ]);

  const docs = docRows.map((row) => ({
    ...row.documento,
    competencia: competenciaForDocumento({
      competencia: row.documento.competencia,
      emailSentAt: row.emailSentAt,
    }),
  }));

  const competencias = uniqueCompetenciaMonths(docs.map((d) => d.competencia)).slice(0, 6);

  const pendencias = obrs
    .map((o) => {
      const prof = profs.find((p) => p.id === o.profissionalId);
      if (!prof) return null;

      const competencia = competencias[0] ?? "08/2026";
      const recebido = docs.find(
        (d) =>
          d.profissionalId === prof.id &&
          d.tipo === o.tipo &&
          isSameCompetenciaMonth(d.competencia, competencia) &&
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
      "O cron lê o e-mail de impostoparceiro e deixa a mensagem na caixa de entrada (não move para Resolvido).",
      "Respostas (Re/RES, In-Reply-To) e e-mails enviados pela própria caixa não viram documento.",
      "Classifica DAS, INSS, parcelamento (inclui dívida ativa) e mensalidade da contabilidade; ignora NFS-e e extrato.",
      "Vincula CNPJ + nome da Base Mestre. Sem match fica nao_identificado.",
      "Nenhum documento é aprovado automaticamente — só o Ricardo aprova ou reprova em /documentos.",
      "A planilha IMPOSTOS — CONFERÊNCIA exporta os aprovados da competência no modelo de consolidação (uma linha por profissional).",
      "Status possíveis: aprovado (humano), pendente_validacao, reprovado (humano), nao_identificado, arquivado.",
    ],
  };
}

export function formatAssistenteContext(context: Awaited<ReturnType<typeof buildAssistenteContext>>) {
  return JSON.stringify(context, null, 2);
}

export const ASSISTENTE_SYSTEM_PROMPT = `Você é o Assistente Fiscal da ROM Concept — Analista de Controladoria & Contas a Pagar.

Responda sempre em português do Brasil, de forma clara, objetiva e profissional.

Você ajuda a equipe a:
- Consultar pendências de DAS, INSS e mensalidade por competência
- Explicar o que o sistema já organizou (CNPJ, profissional, contabilidade, tipo)
- Resumir o que falta o analista aprovar em /documentos
- Orientar próximos passos (cadastrar profissional, aprovar/reprovar, cobrar contabilidade)

Use APENAS os dados do contexto JSON fornecido. Se não souber, diga claramente e sugira onde verificar no sistema (Base Mestre, Documentos, Pendências).

Formate respostas com listas quando útil. Valores monetários em R$ (pt-BR).`;

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { DocumentoStatus, ObrigacaoTipo } from "@/lib/types";
import {
  DOCUMENTO_TIPOS_OPERACIONAIS,
  STATUS_COLORS,
  STATUS_LABELS,
  TIPOS_MENSAIS_ESPERADOS,
  TIPO_COLORS,
  formatCurrency,
  normalizeDocumentoTipo,
} from "@/lib/types";

export type DashboardDoc = {
  id: string;
  competencia: string;
  status: DocumentoStatus;
  tipo: string | null;
  cnpj: string | null;
  valor: string | null;
  profissionalId: string | null;
  profissionalName: string | null;
  contabilidadeId: string | null;
  contabilidadeName: string | null;
};

export type DashboardProfissional = {
  id: string;
  name: string;
  cnpj: string | null;
  contabilidadeId: string;
  contabilidadeName: string;
};

function isFila(status: DocumentoStatus) {
  return status === "pendente_validacao" || status === "nao_identificado";
}

function wasSent(status: DocumentoStatus) {
  return status === "pendente_validacao" || status === "aprovado";
}

export function DashboardClient({
  initialCompetencias,
  initialDocs,
  profissionais,
}: {
  initialCompetencias: string[];
  initialDocs: DashboardDoc[];
  profissionais: DashboardProfissional[];
}) {
  const [competencia, setCompetencia] = useState("todas");
  const [openFirm, setOpenFirm] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (competencia === "todas") return initialDocs;
    return initialDocs.filter((d) => d.competencia === competencia);
  }, [initialDocs, competencia]);

  const kpis = useMemo(() => ({
    fila: filtered.filter((d) => isFila(d.status)).length,
    unidentified: filtered.filter((d) => d.status === "nao_identificado").length,
    approved: filtered.filter((d) => d.status === "aprovado").length,
    professionals: profissionais.length,
  }), [filtered, profissionais.length]);

  const byCategory = useMemo(() => {
    return DOCUMENTO_TIPOS_OPERACIONAIS.map((tipo) => {
      const rows = filtered.filter((d) => normalizeDocumentoTipo(d.tipo) === tipo);
      return {
        tipo,
        total: rows.length,
        fila: rows.filter((d) => isFila(d.status)).length,
        approved: rows.filter((d) => d.status === "aprovado").length,
      };
    });
  }, [filtered]);

  const firms = useMemo(() => {
    const unassignedId = "__sem_contabilidade__";
    const names = new Map<string, string>();
    for (const p of profissionais) {
      names.set(p.contabilidadeId, p.contabilidadeName);
    }
    for (const d of filtered) {
      if (d.contabilidadeId) {
        names.set(d.contabilidadeId, d.contabilidadeName ?? "Sem nome");
      }
    }
    if (filtered.some((d) => !d.contabilidadeId)) {
      names.set(unassignedId, "Sem contabilidade");
    }

    return [...names.entries()]
      .map(([id, name]) => {
        const firmDocs = filtered.filter((d) =>
          id === unassignedId ? !d.contabilidadeId : d.contabilidadeId === id,
        );
        const firmProfs = profissionais.filter((p) => p.contabilidadeId === id);
        const counts = Object.fromEntries(
          DOCUMENTO_TIPOS_OPERACIONAIS.map((tipo) => [
            tipo,
            firmDocs.filter((d) => normalizeDocumentoTipo(d.tipo) === tipo).length,
          ]),
        ) as Record<ObrigacaoTipo, number>;

        const professionals = firmProfs
          .map((profissional) => {
            const docs = firmDocs.filter((d) => d.profissionalId === profissional.id);
            const missing = TIPOS_MENSAIS_ESPERADOS.filter(
              (tipo) =>
                competencia !== "todas" &&
                !docs.some((d) => normalizeDocumentoTipo(d.tipo) === tipo && wasSent(d.status)),
            );
            return {
              ...profissional,
              docs,
              fila: docs.filter((d) => isFila(d.status)).length,
              missing,
            };
          })
          .sort((a, b) => b.fila - a.fila || a.name.localeCompare(b.name));

        const unidentified = firmDocs.filter(
          (d) => d.status === "nao_identificado" && !d.profissionalId,
        );

        return {
          id,
          name,
          professionals: firmProfs.length,
          received: firmDocs.length,
          fila: firmDocs.filter((d) => isFila(d.status)).length,
          approved: firmDocs.filter((d) => d.status === "aprovado").length,
          counts,
          professionalRows: professionals,
          unidentified,
        };
      })
      .sort((a, b) => b.fila - a.fila || a.name.localeCompare(b.name));
  }, [filtered, profissionais, competencia]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Overview do Ricardo</h1>
          <p className="text-slate-500">
            O e-mail entra sozinho, o sistema classifica e vincula CNPJ + nome.
            Quem aprova ou reprova é você.
          </p>
        </div>
        <select
          value={competencia}
          onChange={(e) => setCompetencia(e.target.value)}
          className="h-10 rounded-md border px-3 text-sm w-48 bg-white"
        >
          {initialCompetencias.map((c) => (
            <option key={c} value={c}>
              {c === "todas" ? "Todas as competências" : c}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Fila de aprovação", value: kpis.fila, hint: "Pendente + não identificado" },
          { label: "Não identificados", value: kpis.unidentified, hint: "CNPJ fora da Base Mestre" },
          { label: "Aprovados", value: kpis.approved, hint: "Liberados por você" },
          { label: "Profissionais", value: kpis.professionals, hint: "Base Mestre ativa" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">{kpi.label}</p>
            <p className="text-3xl font-bold mt-1">{kpi.value}</p>
            <p className="text-xs text-slate-400 mt-1">{kpi.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {byCategory.map((row) => (
          <div key={row.tipo} className="rounded-xl border bg-white p-4 shadow-sm">
            <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${TIPO_COLORS[row.tipo]}`}>
              {row.tipo}
            </span>
            <p className="text-2xl font-bold mt-2">{row.total}</p>
            <p className="text-xs text-slate-500 mt-1">
              {row.fila} na fila · {row.approved} aprovados
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Por contabilidade e profissional</h2>
        <Link href="/documentos" className="text-sm text-blue-600 hover:underline">
          Ir para a fila de aprovação
        </Link>
      </div>

      <div className="space-y-3">
        {firms.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-center text-slate-400">
            Cadastre a Base Mestre para ver o overview
          </div>
        ) : firms.map((firm) => {
          const open = openFirm === firm.id;
          return (
            <div key={firm.id} className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenFirm(open ? null : firm.id)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50"
              >
                {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{firm.name}</p>
                  <p className="text-xs text-slate-500">
                    {firm.professionals} profissionais · {firm.received} docs · {firm.approved} aprovados
                  </p>
                </div>
                <div className="hidden md:flex gap-1 flex-wrap justify-end">
                  {DOCUMENTO_TIPOS_OPERACIONAIS.filter((tipo) => firm.counts[tipo] > 0).map((tipo) => (
                    <span key={tipo} className={`text-[11px] rounded px-2 py-0.5 font-medium ${TIPO_COLORS[tipo]}`}>
                      {tipo} {firm.counts[tipo]}
                    </span>
                  ))}
                </div>
                <span className={`text-sm font-bold ${firm.fila > 0 ? "text-amber-600" : "text-green-600"}`}>
                  {firm.fila} na fila
                </span>
              </button>
              {open && (
                <div className="border-t overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="text-left p-3">Profissional</th>
                        <th className="text-left p-3">CNPJ</th>
                        <th className="text-left p-3">Documentos</th>
                        <th className="text-center p-3">Fila</th>
                        {competencia !== "todas" && (
                          <th className="text-left p-3">Falta no mês</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {firm.professionalRows.map((row) => (
                        <tr key={row.id} className="border-b last:border-0">
                          <td className="p-3 font-medium">{row.name}</td>
                          <td className="p-3">{row.cnpj ?? "—"}</td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {row.docs.length === 0 ? (
                                <span className="text-slate-400">—</span>
                              ) : row.docs.map((doc) => (
                                <span
                                  key={doc.id}
                                  className={`text-[11px] rounded px-2 py-0.5 ${TIPO_COLORS[normalizeDocumentoTipo(doc.tipo)]}`}
                                  title={STATUS_LABELS[doc.status]}
                                >
                                  {normalizeDocumentoTipo(doc.tipo)} {doc.valor ? formatCurrency(doc.valor) : ""}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-3 text-center font-semibold">{row.fila}</td>
                          {competencia !== "todas" && (
                            <td className="p-3 text-xs text-amber-700">
                              {row.missing.length === 0 ? "—" : row.missing.join(", ")}
                            </td>
                          )}
                        </tr>
                      ))}
                      {firm.unidentified.length > 0 && firm.unidentified.map((doc) => (
                        <tr key={doc.id} className="border-b last:border-0 bg-slate-50">
                          <td className="p-3 text-slate-500">Não identificado</td>
                          <td className="p-3">{doc.cnpj ?? "—"}</td>
                          <td className="p-3">
                            <span className={`text-[11px] rounded px-2 py-0.5 ${TIPO_COLORS[normalizeDocumentoTipo(doc.tipo)]}`}>
                              {normalizeDocumentoTipo(doc.tipo)}
                            </span>
                          </td>
                          <td className="p-3 text-center">1</td>
                          {competencia !== "todas" && <td className="p-3">—</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border bg-white p-4 text-xs text-slate-500">
        {Object.entries(STATUS_LABELS).filter(([status]) => status !== "arquivado").map(([status, label]) => (
          <span key={status} className={`inline-flex items-center rounded px-2 py-0.5 mr-2 mb-1 font-semibold ${STATUS_COLORS[status as DocumentoStatus]}`}>
            {label}
          </span>
        ))}
        O cron lê o e-mail a cada 10 minutos e deixa a mensagem na caixa de entrada.
      </div>
    </div>
  );
}

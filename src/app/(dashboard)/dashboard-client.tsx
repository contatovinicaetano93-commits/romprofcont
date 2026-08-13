"use client";

import { useMemo, useState } from "react";
import type { DocumentoStatus } from "@/lib/types";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/types";

type Doc = {
  id: string;
  competencia: string;
  status: DocumentoStatus;
  contabilidadeId: string | null;
};

type ComplianceRow = {
  id: string;
  name: string;
  expected: number;
  received: number;
  approved: number;
  pending: number;
  compliancePct: number;
};

export function DashboardClient({
  initialCompetencias,
  initialDocs,
  expectedMensal,
  compliance,
  chartCompetencias,
}: {
  initialCompetencias: string[];
  initialDocs: Doc[];
  expectedMensal: number;
  compliance: ComplianceRow[];
  chartCompetencias: Array<{ competencia: string; esperado: number; recebido: number }>;
}) {
  const [competencia, setCompetencia] = useState("todas");

  const filtered = useMemo(() => {
    if (competencia === "todas") return initialDocs;
    return initialDocs.filter((d) => d.competencia === competencia);
  }, [initialDocs, competencia]);

  const kpis = useMemo(() => ({
    expected: expectedMensal,
    received: filtered.length,
    approved: filtered.filter((d) => d.status === "aprovado").length,
    pending: filtered.filter((d) => d.status === "pendente_validacao").length,
    rejected: filtered.filter((d) => d.status === "reprovado").length,
  }), [filtered, expectedMensal]);

  const statusChart = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of filtered) {
      counts[d.status] = (counts[d.status] ?? 0) + 1;
    }
    return Object.entries(counts).map(([status, value]) => ({
      status: status as DocumentoStatus,
      value,
      color: STATUS_COLORS[status as DocumentoStatus]?.includes("green") ? "#22c55e"
        : STATUS_COLORS[status as DocumentoStatus]?.includes("yellow") ? "#eab308"
        : STATUS_COLORS[status as DocumentoStatus]?.includes("red") ? "#ef4444"
        : "#6b7280",
    }));
  }, [filtered]);

  const cards = [
    { label: "Esperados", value: kpis.expected, color: "bg-indigo-600" },
    { label: "Recebidos", value: kpis.received, color: "bg-blue-600" },
    { label: "Aprovados", value: kpis.approved, color: "bg-green-600" },
    { label: "Pendentes", value: kpis.pending, color: "bg-yellow-500" },
    { label: "Reprovados", value: kpis.rejected, color: "bg-red-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Controle de fiscal e contabil parceiros/profissionais</h1>
          <p className="text-slate-500">Visão geral e conferência de obrigações</p>
        </div>
        <select
          value={competencia}
          onChange={(e) => setCompetencia(e.target.value)}
          className="h-10 rounded-md border px-3 text-sm w-48"
        >
          {initialCompetencias.map((c) => (
            <option key={c} value={c}>
              {c === "todas" ? "Todas as Competências" : c}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((kpi) => (
          <div key={kpi.label} className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">{kpi.label}</p>
            <p className="text-3xl font-bold mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="font-semibold mb-4">Status dos Documentos</h2>
          <div className="space-y-2">
            {statusChart.length === 0 ? (
              <p className="text-sm text-slate-400">Sem documentos ainda</p>
            ) : statusChart.map((s) => (
              <div key={s.status} className="flex items-center justify-between text-sm">
                <span>{STATUS_LABELS[s.status]}</span>
                <span className="font-semibold">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="font-semibold mb-4">Esperado vs Recebido por Competência</h2>
          <div className="space-y-3">
            {chartCompetencias.map((row) => (
              <div key={row.competencia} className="text-sm">
                <div className="flex justify-between mb-1">
                  <span>{row.competencia}</span>
                  <span>{row.recebido}/{row.esperado}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${row.esperado ? Math.min(100, (row.recebido / row.esperado) * 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-x-auto">
        <div className="p-4 border-b font-semibold">Controle por Contabilidade (Compliance)</div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left p-3">Contabilidade</th>
              <th className="text-center p-3">Esperados</th>
              <th className="text-center p-3">Recebidos</th>
              <th className="text-center p-3">Aprovados</th>
              <th className="text-center p-3">Pendentes</th>
              <th className="text-right p-3">Conformidade</th>
            </tr>
          </thead>
          <tbody>
            {compliance.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-slate-400">Cadastre contabilidades na Base Mestre</td></tr>
            ) : compliance.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3 text-center">{c.expected}</td>
                <td className="p-3 text-center">{c.received}</td>
                <td className="p-3 text-center text-green-600 font-medium">{c.approved}</td>
                <td className="p-3 text-center">{c.pending}</td>
                <td className={`p-3 text-right font-bold ${c.compliancePct === 100 ? "text-green-600" : c.compliancePct >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                  {c.compliancePct}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

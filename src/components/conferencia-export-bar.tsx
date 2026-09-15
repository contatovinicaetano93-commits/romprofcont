"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { conferenciaFileName } from "@/lib/conferencia-export";

export async function downloadConferencia(competencia: string) {
  const res = await fetch(
    `/api/documentos/export?competencia=${encodeURIComponent(competencia)}`,
  );
  if (!res.ok) {
    throw new Error("Não foi possível gerar a planilha.");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = conferenciaFileName(competencia);
  link.click();
  URL.revokeObjectURL(url);
}

export function ConferenciaExportBar({
  competencias,
  competencia,
  approvedCount,
  onCompetenciaChange,
}: {
  competencias: string[];
  competencia: string;
  approvedCount: number;
  onCompetenciaChange?: (value: string) => void;
}) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  if (approvedCount <= 0) return null;

  async function handleExport() {
    setExporting(true);
    setError("");
    try {
      await downloadConferencia(competencia);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível gerar a planilha.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[220px] flex-1">
          <p className="font-semibold text-green-950">Planilha liberada</p>
          <p className="text-sm text-green-800">
            {approvedCount} guia(s) aprovada(s). Exporte IMPOSTOS — CONFERÊNCIA desta competência.
          </p>
        </div>
        {onCompetenciaChange ? (
          <select
            value={competencia}
            onChange={(e) => onCompetenciaChange(e.target.value)}
            className="h-10 rounded-md border border-green-300 bg-white px-3 text-sm"
          >
            {competencias.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        ) : null}
        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={exporting || !competencia}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-green-700 px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {exporting ? "Gerando planilha..." : "Exportar planilha"}
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

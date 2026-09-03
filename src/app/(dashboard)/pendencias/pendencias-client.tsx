"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import {
  currentCompetencia,
  isPastEnvioDeadline,
  recentCompetencias,
} from "@/lib/competencia";
import type { DocumentoStatus } from "@/lib/types";

type Profissional = {
  id: string;
  name: string;
  cnpj: string | null;
  contabilidadeName?: string;
  unidade?: string | null;
};

type Documento = {
  profissionalId: string | null;
  tipo: string | null;
  competencia: string;
  status: DocumentoStatus;
};

function isGuiaTipo(tipo: string | null) {
  const value = (tipo ?? "").toUpperCase();
  return value === "DAS" || value === "DARF";
}

function wasSent(status: DocumentoStatus) {
  return status === "pendente_validacao" || status === "aprovado";
}

export function PendenciasClient() {
  const competencias = useMemo(() => recentCompetencias(6), []);
  const [competencia, setCompetencia] = useState(currentCompetencia);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [pRes, dRes] = await Promise.all([
      fetch("/api/profissionais"),
      fetch("/api/documentos"),
    ]);
    setProfissionais(await pRes.json());
    setDocumentos(await dRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pendencias = useMemo(() => {
    return profissionais
      .filter((profissional) => {
        const enviado = documentos.some(
          (documento) =>
            documento.profissionalId === profissional.id &&
            documento.competencia === competencia &&
            isGuiaTipo(documento.tipo) &&
            wasSent(documento.status),
        );
        return !enviado;
      })
      .map((profissional) => ({
        profissionalNome: profissional.name,
        cnpj: profissional.cnpj ?? "—",
        contabilidadeNome: profissional.contabilidadeName ?? "Contabilidade Não Identificada",
        unidade: profissional.unidade ?? "—",
      }));
  }, [profissionais, documentos, competencia]);

  const contabilidadesAfetadas = new Set(pendencias.map((p) => p.contabilidadeNome)).size;
  const atraso = isPastEnvioDeadline();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pendências</h1>
          <p className="text-slate-500">
            Profissionais da Base Mestre sem guia DAS/DARF enviada na competência.
            Prazo de envio: dia 15.
          </p>
        </div>
        <select
          value={competencia}
          onChange={(e) => setCompetencia(e.target.value)}
          className="h-10 rounded-md border px-3 text-sm"
        >
          {competencias.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {atraso && competencia === currentCompetencia() && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Já passou o dia 15. Estes profissionais ainda não enviaram a guia deste mês.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Ainda não enviaram</p>
          <p className="text-3xl font-bold">{pendencias.length}</p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Contabilidades afetadas</p>
          <p className="text-3xl font-bold">{contabilidadesAfetadas}</p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Base Mestre</p>
          <p className="text-3xl font-bold">{profissionais.length}</p>
        </div>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left p-3">Profissional</th>
              <th className="text-left p-3">CNPJ</th>
              <th className="text-left p-3">Unidade</th>
              <th className="text-left p-3">Contabilidade</th>
            </tr>
          </thead>
          <tbody>
            {pendencias.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-green-600 font-medium">
                  Todos enviaram nesta competência
                </td>
              </tr>
            ) : (
              pendencias.map((item) => (
                <tr key={`${item.cnpj}-${item.profissionalNome}`} className="border-b">
                  <td className="p-3">{item.profissionalNome}</td>
                  <td className="p-3">{item.cnpj}</td>
                  <td className="p-3">{item.unidade}</td>
                  <td className="p-3">{item.contabilidadeNome}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

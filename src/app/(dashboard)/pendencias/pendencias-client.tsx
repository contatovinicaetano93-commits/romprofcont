"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency } from "@/lib/types";
import type { DocumentoStatus } from "@/lib/types";

type Obrigacao = {
  id: string;
  profissionalId: string;
  tipo: string | null;
  valorEsperado: string | null;
  profissionalName?: string;
};

type Profissional = {
  id: string;
  name: string;
  cnpj: string | null;
  contabilidadeId: string;
  contabilidadeName?: string;
  emailContabilidade?: string | null;
  unidade?: string | null;
};

type Documento = {
  profissionalId: string | null;
  tipo: string | null;
  competencia: string;
  status: DocumentoStatus;
};

const COMPETENCIAS = ["07/2026", "08/2026", "06/2026"];

export function PendenciasClient() {
  const [competencia, setCompetencia] = useState("07/2026");
  const [obrigacoes, setObrigacoes] = useState<Obrigacao[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [oRes, pRes, dRes] = await Promise.all([
      fetch("/api/obrigacoes"),
      fetch("/api/profissionais"),
      fetch("/api/documentos"),
    ]);
    setObrigacoes(await oRes.json());
    setProfissionais(await pRes.json());
    setDocumentos(await dRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pendencias = useMemo(() => {
    const items: Array<{
      profissionalNome: string;
      cnpj: string;
      contabilidadeNome: string;
      tipoObrigacao: string;
      valorEsperado: number;
      statusDoc: string;
    }> = [];

    for (const obrigacao of obrigacoes) {
      const profissional = profissionais.find((p) => p.id === obrigacao.profissionalId);
      if (!profissional) continue;

      const hasApproved = documentos.some(
        (d) =>
          d.profissionalId === profissional.id &&
          d.tipo === obrigacao.tipo &&
          d.competencia === competencia &&
          d.status === "aprovado",
      );

      if (!hasApproved) {
        const existing = documentos.find(
          (d) =>
            d.profissionalId === profissional.id &&
            d.tipo === obrigacao.tipo &&
            d.competencia === competencia,
        );
        items.push({
          profissionalNome: profissional.name,
          cnpj: profissional.cnpj ?? "—",
          contabilidadeNome: profissional.contabilidadeName ?? "Contabilidade Não Identificada",
          tipoObrigacao: obrigacao.tipo ?? "—",
          valorEsperado: parseFloat(obrigacao.valorEsperado ?? "0"),
          statusDoc: existing ? existing.status : "não enviado",
        });
      }
    }
    return items;
  }, [obrigacoes, profissionais, documentos, competencia]);

  const totalValor = pendencias.reduce((s, p) => s + p.valorEsperado, 0);
  const contabilidadesAfetadas = new Set(pendencias.map((p) => p.contabilidadeNome)).size;

  if (loading) {
    return <div className="flex items-center gap-2 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pendências</h1>
          <p className="text-slate-500">Obrigações sem documento aprovado na competência</p>
        </div>
        <select value={competencia} onChange={(e) => setCompetencia(e.target.value)} className="h-10 rounded-md border px-3 text-sm">
          {COMPETENCIAS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">Total de Pendências</p><p className="text-3xl font-bold">{pendencias.length}</p></div>
        <div className="rounded-xl border bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">Contabilidades Afetadas</p><p className="text-3xl font-bold">{contabilidadesAfetadas}</p></div>
        <div className="rounded-xl border bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">Valor Esperado Retido</p><p className="text-3xl font-bold">{formatCurrency(totalValor)}</p></div>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left p-3">Profissional</th>
              <th className="text-left p-3">CNPJ</th>
              <th className="text-left p-3">Contabilidade</th>
              <th className="text-left p-3">Tipo</th>
              <th className="text-right p-3">Valor</th>
              <th className="text-left p-3">Status Doc.</th>
            </tr>
          </thead>
          <tbody>
            {pendencias.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-green-600 font-medium">Nenhuma pendência 🎉</td></tr>
            ) : pendencias.map((p, i) => (
              <tr key={i} className="border-b">
                <td className="p-3">{p.profissionalNome}</td>
                <td className="p-3">{p.cnpj}</td>
                <td className="p-3">{p.contabilidadeNome}</td>
                <td className="p-3">{p.tipoObrigacao}</td>
                <td className="p-3 text-right">{formatCurrency(p.valorEsperado)}</td>
                <td className="p-3">
                  {p.statusDoc === "não enviado" ? (
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-100">{p.statusDoc}</span>
                  ) : (
                    <StatusBadge status={p.statusDoc as DocumentoStatus} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

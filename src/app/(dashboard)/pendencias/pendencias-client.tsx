"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  currentCompetencia,
  isPastEnvioDeadline,
  recentCompetencias,
} from "@/lib/competencia";
import {
  TIPOS_MENSAIS_ESPERADOS,
  TIPO_COLORS,
  normalizeDocumentoTipo,
} from "@/lib/types";
import type { DocumentoStatus, ObrigacaoTipo } from "@/lib/types";

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
      .map((profissional) => {
        const enviados = new Set(
          documentos
            .filter(
              (documento) =>
                documento.profissionalId === profissional.id &&
                documento.competencia === competencia &&
                wasSent(documento.status),
            )
            .map((documento) => normalizeDocumentoTipo(documento.tipo)),
        );
        const faltando = TIPOS_MENSAIS_ESPERADOS.filter((tipo) => !enviados.has(tipo));
        return {
          profissionalId: profissional.id,
          profissionalNome: profissional.name,
          cnpj: profissional.cnpj ?? "—",
          contabilidadeNome: profissional.contabilidadeName ?? "Contabilidade não identificada",
          unidade: profissional.unidade ?? "—",
          faltando,
        };
      })
      .filter((item) => item.faltando.length > 0);
  }, [profissionais, documentos, competencia]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof pendencias>();
    for (const item of pendencias) {
      const list = map.get(item.contabilidadeNome) ?? [];
      list.push(item);
      map.set(item.contabilidadeNome, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [pendencias]);

  const missingCounts = useMemo(() => {
    const counts = Object.fromEntries(TIPOS_MENSAIS_ESPERADOS.map((tipo) => [tipo, 0])) as Record<
      ObrigacaoTipo,
      number
    >;
    for (const item of pendencias) {
      for (const tipo of item.faltando) counts[tipo] += 1;
    }
    return counts;
  }, [pendencias]);

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
            Profissionais da Base Mestre sem DAS, INSS ou mensalidade nesta competência.
            Prazo de envio: dia 15. Parcelamento só entra na fila quando chegar.
          </p>
        </div>
        <select
          value={competencia}
          onChange={(e) => setCompetencia(e.target.value)}
          className="h-10 rounded-md border px-3 text-sm bg-white"
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
          Já passou o dia 15. Ainda faltam envios deste mês.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Profissionais em atraso</p>
          <p className="text-3xl font-bold">{pendencias.length}</p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Contabilidades</p>
          <p className="text-3xl font-bold">{grouped.length}</p>
        </div>
        {TIPOS_MENSAIS_ESPERADOS.map((tipo) => (
          <div key={tipo} className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Falta {tipo}</p>
            <p className="text-3xl font-bold">{missingCounts[tipo]}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {grouped.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-center text-green-600 font-medium">
            Todos enviaram DAS, INSS e mensalidade nesta competência
          </div>
        ) : grouped.map(([firm, rows]) => (
          <div key={firm} className="rounded-xl border bg-white shadow-sm overflow-x-auto">
            <div className="px-4 py-3 border-b font-semibold bg-slate-50">
              {firm}
              <span className="ml-2 text-sm font-normal text-slate-500">{rows.length} profissional(is)</span>
            </div>
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left p-3">Profissional</th>
                  <th className="text-left p-3">CNPJ</th>
                  <th className="text-left p-3">Unidade</th>
                  <th className="text-left p-3">Falta enviar</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.profissionalId} className="border-b last:border-0">
                    <td className="p-3 font-medium">{item.profissionalNome}</td>
                    <td className="p-3">{item.cnpj}</td>
                    <td className="p-3">{item.unidade}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {item.faltando.map((tipo) => (
                          <span key={tipo} className={`text-[11px] rounded px-2 py-0.5 font-semibold ${TIPO_COLORS[tipo]}`}>
                            {tipo}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}

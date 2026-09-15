"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Download, Loader2, Mail, Upload } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import {
  DOCUMENTO_TIPOS_OPERACIONAIS,
  TIPO_COLORS,
  formatCurrency,
  normalizeDocumentoTipo,
} from "@/lib/types";
import type { DocumentoStatus } from "@/lib/types";
import { currentCompetencia } from "@/lib/competencia";

type Documento = {
  id: string;
  profissionalName?: string | null;
  contabilidadeName?: string | null;
  cnpj: string | null;
  tipo: string | null;
  competencia: string;
  valor: string | null;
  status: DocumentoStatus;
  motivo: string | null;
  fileName?: string | null;
};

function TipoBadge({ tipo }: { tipo: string | null }) {
  const value = normalizeDocumentoTipo(tipo);
  return (
    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${TIPO_COLORS[value]}`}>
      {tipo ?? "Outros"}
    </span>
  );
}

export function DocumentosClient() {
  const [docs, setDocs] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"lista" | "upload" | "email">("lista");
  const [statusFilter, setStatusFilter] = useState("fila");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [firmFilter, setFirmFilter] = useState("todas");
  const [exportCompetencia, setExportCompetencia] = useState(currentCompetencia);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [emailContent, setEmailContent] = useState("");
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/documentos");
    setDocs(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const firms = useMemo(() => {
    return [...new Set(docs.map((d) => d.contabilidadeName).filter(Boolean))].sort() as string[];
  }, [docs]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return docs.filter((d) => {
      if (d.status === "arquivado" && statusFilter !== "arquivado") return false;
      if (statusFilter === "fila") {
        if (d.status !== "pendente_validacao" && d.status !== "nao_identificado") return false;
      } else if (statusFilter !== "todos" && d.status !== statusFilter) {
        return false;
      }
      if (tipoFilter !== "todos" && normalizeDocumentoTipo(d.tipo) !== tipoFilter) return false;
      if (firmFilter !== "todas" && d.contabilidadeName !== firmFilter) return false;
      return (
        (d.profissionalName ?? "").toLowerCase().includes(q) ||
        (d.contabilidadeName ?? "").toLowerCase().includes(q) ||
        (d.cnpj ?? "").includes(q) ||
        (d.tipo ?? "").toLowerCase().includes(q) ||
        d.competencia.includes(q)
      );
    });
  }, [docs, search, statusFilter, tipoFilter, firmFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, Documento[]>();
    for (const doc of filtered) {
      const key = doc.contabilidadeName?.trim() || "Sem contabilidade";
      const list = map.get(key) ?? [];
      list.push(doc);
      map.set(key, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!files?.length) return;
    setProcessing(true);
    setMessage("");
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("files", f));
    const res = await fetch("/api/documents/upload", { method: "POST", body: fd });
    const data = await res.json();
    setMessage(res.ok ? `${data.count} documento(s) organizado(s) na fila` : data.error);
    setProcessing(false);
    if (res.ok) {
      setFiles(null);
      await load();
      setTab("lista");
    }
  }

  async function handleEmail(e: FormEvent) {
    e.preventDefault();
    setProcessing(true);
    setMessage("");
    const res = await fetch("/api/documents/process-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: emailContent }),
    });
    const data = await res.json();
    setMessage(res.ok ? `${data.count} documento(s) criado(s)` : data.error);
    setProcessing(false);
    if (res.ok) {
      setEmailContent("");
      await load();
      setTab("lista");
    }
  }

  const competencias = useMemo(() => {
    const values = new Set(docs.map((d) => d.competencia));
    values.add(currentCompetencia());
    return [...values].sort().reverse();
  }, [docs]);

  async function exportConferencia() {
    setExporting(true);
    try {
      const res = await fetch(
        `/api/documentos/export?competencia=${encodeURIComponent(exportCompetencia)}`,
      );
      if (!res.ok) {
        setMessage("Não foi possível gerar a planilha.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `IMPOSTOS - CONFERENCIA ${exportCompetencia.replace("/", "-")}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function updateStatus(id: string, status: DocumentoStatus, motivo: string) {
    await fetch(`/api/documentos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, motivo }),
    });
    await load();
  }

  if (loading) {
    return <div className="flex items-center gap-2 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>;
  }

  const filaCount = docs.filter(
    (d) => d.status === "pendente_validacao" || d.status === "nao_identificado",
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fila de aprovação</h1>
        <p className="text-slate-500">
          DAS, INSS, parcelamento e mensalidade já vinculados a CNPJ + nome.
          Ricardo aprova ou reprova. A planilha de conferência sai no modelo IMPOSTOS — CONFERÊNCIA, com os aprovados da competência.
        </p>
      </div>

      <div className="flex gap-2 border-b flex-wrap">
        {([
          ["lista", `Fila (${filaCount})`],
          ["upload", "Upload em lote"],
          ["email", "Colar e-mail"],
        ] as const).map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === key ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500"}`}>{label}</button>
        ))}
      </div>

      {tab === "lista" && (
        <>
          <div className="flex gap-3 flex-wrap">
            <input
              placeholder="Buscar nome, CNPJ ou contabilidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 rounded-md border px-3 text-sm min-w-[220px] flex-1"
            />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-md border px-3 text-sm bg-white">
              <option value="fila">Fila (pendente + não identificado)</option>
              <option value="todos">Todos os status</option>
              <option value="pendente_validacao">Pendente de aprovação</option>
              <option value="nao_identificado">Não identificado</option>
              <option value="aprovado">Aprovado</option>
              <option value="reprovado">Reprovado</option>
            </select>
            <select value={tipoFilter} onChange={(e) => setTipoFilter(e.target.value)} className="h-10 rounded-md border px-3 text-sm bg-white">
              <option value="todos">Todas as categorias</option>
              {DOCUMENTO_TIPOS_OPERACIONAIS.map((tipo) => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
            <select value={firmFilter} onChange={(e) => setFirmFilter(e.target.value)} className="h-10 rounded-md border px-3 text-sm bg-white">
              <option value="todas">Todas as contabilidades</option>
              {firms.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <select
              value={exportCompetencia}
              onChange={(e) => setExportCompetencia(e.target.value)}
              className="h-10 rounded-md border px-3 text-sm bg-white"
            >
              {competencias.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void exportConferencia()}
              disabled={exporting}
              className="h-10 px-3 rounded-md border text-sm inline-flex items-center gap-2 bg-white disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {exporting ? "Gerando planilha..." : "Exportar conferência"}
            </button>
          </div>
          {message && tab === "lista" && (
            <p className="text-sm text-red-600">{message}</p>
          )}

          {grouped.length === 0 ? (
            <div className="rounded-xl border bg-white p-10 text-center text-slate-400">
              Nada nesta fila. Quando o cron puxar o e-mail, os documentos aparecem aqui agrupados.
            </div>
          ) : grouped.map(([firm, rows]) => {
            const closed = collapsed[firm] === true;
            return (
              <div key={firm} className="rounded-xl border bg-white shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setCollapsed((prev) => ({ ...prev, [firm]: !closed }))}
                  className="w-full flex items-center gap-2 px-4 py-3 border-b bg-slate-50 text-left"
                >
                  {closed ? <ChevronRight className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  <span className="font-semibold flex-1">{firm}</span>
                  <span className="text-sm text-slate-500">{rows.length} documento(s)</span>
                </button>
                {!closed && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-white border-b">
                        <tr>
                          <th className="text-left p-3">Profissional</th>
                          <th className="text-left p-3">CNPJ</th>
                          <th className="text-left p-3">Categoria</th>
                          <th className="text-left p-3">Competência</th>
                          <th className="text-right p-3">Valor</th>
                          <th className="text-left p-3">Status</th>
                          <th className="p-3">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((d) => (
                          <tr key={d.id} className="border-b last:border-0">
                            <td className="p-3">
                              <p className="font-medium">{d.profissionalName ?? "Não identificado"}</p>
                              {d.fileName && <p className="text-[11px] text-slate-400 truncate max-w-[220px]">{d.fileName}</p>}
                            </td>
                            <td className="p-3 whitespace-nowrap">{d.cnpj ?? "—"}</td>
                            <td className="p-3"><TipoBadge tipo={d.tipo} /></td>
                            <td className="p-3">{d.competencia}</td>
                            <td className="p-3 text-right">{formatCurrency(d.valor)}</td>
                            <td className="p-3"><StatusBadge status={d.status} /></td>
                            <td className="p-3 space-x-1 whitespace-nowrap">
                              <button type="button" onClick={() => updateStatus(d.id, "aprovado", "Aprovado pelo Ricardo")} className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">Aprovar</button>
                              <button type="button" onClick={() => updateStatus(d.id, "reprovado", "Reprovado pelo Ricardo")} className="text-xs px-2 py-1 rounded bg-red-100 text-red-800">Reprovar</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {tab === "upload" && (
        <form onSubmit={handleUpload} className="rounded-xl border bg-white p-6 space-y-4 shadow-sm max-w-xl">
          <h2 className="font-semibold flex items-center gap-2"><Upload className="h-4 w-4" /> Upload em lote</h2>
          <p className="text-sm text-slate-500">PDF de DAS, INSS, parcelamento ou mensalidade. O sistema organiza; a aprovação continua manual.</p>
          <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.xml" onChange={(e) => setFiles(e.target.files)} className="text-sm" />
          <button type="submit" disabled={processing || !files?.length} className="h-10 px-4 rounded-md bg-blue-600 text-white text-sm disabled:opacity-50">
            {processing ? "Processando..." : "Organizar na fila"}
          </button>
          {message && <p className="text-sm text-slate-600">{message}</p>}
        </form>
      )}

      {tab === "email" && (
        <form onSubmit={handleEmail} className="rounded-xl border bg-white p-6 space-y-4 shadow-sm">
          <h2 className="font-semibold flex items-center gap-2"><Mail className="h-4 w-4" /> Colar e-mail</h2>
          <textarea rows={12} value={emailContent} onChange={(e) => setEmailContent(e.target.value)} placeholder="Prefira o PDF em Upload — o texto do e-mail sozinho não identifica a guia." className="w-full rounded-md border px-3 py-2 text-sm font-mono" />
          <button type="submit" disabled={processing || emailContent.trim().length < 10} className="h-10 px-4 rounded-md bg-blue-600 text-white text-sm disabled:opacity-50">
            {processing ? "Processando..." : "Processar e organizar"}
          </button>
          {message && <p className="text-sm text-slate-600">{message}</p>}
        </form>
      )}
    </div>
  );
}

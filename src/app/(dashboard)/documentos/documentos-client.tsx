"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Mail, Upload } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency } from "@/lib/types";
import type { DocumentoStatus } from "@/lib/types";

type Documento = {
  id: string;
  profissionalName?: string;
  cnpj: string | null;
  tipo: string | null;
  competencia: string;
  valor: string | null;
  status: DocumentoStatus;
  motivo: string | null;
};

export function DocumentosClient() {
  const [docs, setDocs] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"lista" | "upload" | "email">("lista");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [search, setSearch] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [emailContent, setEmailContent] = useState("");
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/documentos");
    setDocs(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return docs.filter((d) => {
      if (statusFilter !== "todos" && d.status !== statusFilter) return false;
      return (
        (d.profissionalName ?? "").toLowerCase().includes(q) ||
        (d.cnpj ?? "").includes(q) ||
        d.competencia.includes(q)
      );
    });
  }, [docs, search, statusFilter]);

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!files?.length) return;
    setProcessing(true);
    setMessage("");
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("files", f));
    const res = await fetch("/api/documents/upload", { method: "POST", body: fd });
    const data = await res.json();
    setMessage(res.ok ? `${data.count} documento(s) processado(s)` : data.error);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Documentos</h1>
        <p className="text-slate-500">Notas recebidas e validação automática</p>
      </div>

      <div className="flex gap-2 border-b flex-wrap">
        {([
          ["lista", "Lista"],
          ["upload", "Upload em Lote"],
          ["email", "Colar E-mail"],
        ] as const).map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === key ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500"}`}>{label}</button>
        ))}
      </div>

      {tab === "lista" && (
        <>
          <div className="flex gap-3 flex-wrap">
            <input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 rounded-md border px-3 text-sm" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-md border px-3 text-sm">
              <option value="todos">Todos os status</option>
              <option value="aprovado">Aprovado</option>
              <option value="pendente_validacao">Pendente</option>
              <option value="reprovado">Reprovado</option>
              <option value="nao_identificado">Não identificado</option>
            </select>
          </div>
          <div className="rounded-xl border bg-white shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-3">Profissional</th>
                  <th className="text-left p-3">CNPJ</th>
                  <th className="text-left p-3">Tipo</th>
                  <th className="text-left p-3">Competência</th>
                  <th className="text-right p-3">Valor</th>
                  <th className="text-left p-3">Status</th>
                  <th className="p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-400">Nenhum documento</td></tr>
                ) : filtered.map((d) => (
                  <tr key={d.id} className="border-b">
                    <td className="p-3">{d.profissionalName ?? "—"}</td>
                    <td className="p-3">{d.cnpj ?? "—"}</td>
                    <td className="p-3">{d.tipo ?? "—"}</td>
                    <td className="p-3">{d.competencia}</td>
                    <td className="p-3 text-right">{formatCurrency(d.valor)}</td>
                    <td className="p-3"><StatusBadge status={d.status} /></td>
                    <td className="p-3 space-x-1">
                      <button type="button" onClick={() => updateStatus(d.id, "aprovado", "Aprovado manualmente")} className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">Aprovar</button>
                      <button type="button" onClick={() => updateStatus(d.id, "reprovado", "Reprovado pelo analista")} className="text-xs px-2 py-1 rounded bg-red-100 text-red-800">Reprovar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "upload" && (
        <form onSubmit={handleUpload} className="rounded-xl border bg-white p-6 space-y-4 shadow-sm max-w-xl">
          <h2 className="font-semibold flex items-center gap-2"><Upload className="h-4 w-4" /> Upload em Lote</h2>
          <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.xml" onChange={(e) => setFiles(e.target.files)} className="text-sm" />
          <button type="submit" disabled={processing || !files?.length} className="h-10 px-4 rounded-md bg-blue-600 text-white text-sm disabled:opacity-50">
            {processing ? "Processando..." : "Processar e Validar"}
          </button>
          {message && <p className="text-sm text-slate-600">{message}</p>}
        </form>
      )}

      {tab === "email" && (
        <form onSubmit={handleEmail} className="rounded-xl border bg-white p-6 space-y-4 shadow-sm">
          <h2 className="font-semibold flex items-center gap-2"><Mail className="h-4 w-4" /> Colar E-mail do Outlook</h2>
          <textarea rows={12} value={emailContent} onChange={(e) => setEmailContent(e.target.value)} placeholder="Cole aqui o conteúdo do e-mail..." className="w-full rounded-md border px-3 py-2 text-sm font-mono" />
          <button type="submit" disabled={processing || emailContent.trim().length < 10} className="h-10 px-4 rounded-md bg-blue-600 text-white text-sm disabled:opacity-50">
            {processing ? "Processando..." : "Processar E-mail e Validar"}
          </button>
          {message && <p className="text-sm text-slate-600">{message}</p>}
        </form>
      )}
    </div>
  );
}

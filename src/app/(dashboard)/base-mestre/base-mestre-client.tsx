"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { OBRIGACAO_TIPOS, REGIMES, UNIDADES, formatCurrency } from "@/lib/types";

type Contabilidade = { id: string; name: string };
type Profissional = {
  id: string;
  name: string;
  cnpj: string | null;
  unidade: string | null;
  regimeTributario: string | null;
  contabilidadeId: string;
  contabilidadeName?: string;
};
type Obrigacao = {
  id: string;
  profissionalId: string;
  tipo: string | null;
  valorEsperado: string | null;
  periodicidade: string;
  regras: string | null;
  profissionalName?: string;
};

export function BaseMestreClient() {
  const [tab, setTab] = useState<"profissionais" | "obrigacoes">("profissionais");
  const [contabilidades, setContabilidades] = useState<Contabilidade[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [obrigacoes, setObrigacoes] = useState<Obrigacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const [profForm, setProfForm] = useState({
    name: "",
    cnpj: "",
    contabilidadeId: "",
    unidade: "ROM Brasil" as (typeof UNIDADES)[number],
    regimeTributario: "Simples Nacional" as (typeof REGIMES)[number],
  });
  const [obForm, setObForm] = useState({
    profissionalId: "",
    tipo: "DAS" as (typeof OBRIGACAO_TIPOS)[number],
    valorEsperado: "1250.00",
    periodicidade: "Mensal" as "Mensal" | "Trimestral" | "Anual",
    regras: "Padrão (tolerância 5%)",
  });
  const [editProf, setEditProf] = useState<Profissional | null>(null);
  const [editOb, setEditOb] = useState<Obrigacao | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [cRes, pRes, oRes] = await Promise.all([
      fetch("/api/contabilidades"),
      fetch("/api/profissionais"),
      fetch("/api/obrigacoes"),
    ]);
    setContabilidades(await cRes.json());
    setProfissionais(await pRes.json());
    setObrigacoes(await oRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredProfs = useMemo(() => {
    const q = search.toLowerCase();
    return profissionais.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.cnpj ?? "").includes(q),
    );
  }, [profissionais, search]);

  const filteredObs = useMemo(() => {
    const q = search.toLowerCase();
    return obrigacoes.filter(
      (o) =>
        (o.profissionalName ?? "").toLowerCase().includes(q) ||
        (o.tipo ?? "").toLowerCase().includes(q),
    );
  }, [obrigacoes, search]);

  async function submitProf(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const url = editProf ? `/api/profissionais/${editProf.id}` : "/api/profissionais";
    await fetch(url, {
      method: editProf ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profForm),
    });
    setProfForm({
      name: "",
      cnpj: "",
      contabilidadeId: "",
      unidade: "ROM Brasil",
      regimeTributario: "Simples Nacional",
    });
    setEditProf(null);
    setSaving(false);
    await load();
  }

  async function submitOb(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const url = editOb ? `/api/obrigacoes/${editOb.id}` : "/api/obrigacoes";
    await fetch(url, {
      method: editOb ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(obForm),
    });
    setObForm({
      profissionalId: "",
      tipo: "DAS",
      valorEsperado: "1250.00",
      periodicidade: "Mensal",
      regras: "Padrão (tolerância 5%)",
    });
    setEditOb(null);
    setSaving(false);
    await load();
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando Base Mestre...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Base Mestre</h1>
          <p className="text-slate-500">Profissionais PJ e obrigações esperadas</p>
        </div>
        <input
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 rounded-md border px-3 text-sm w-full sm:w-64"
        />
      </div>

      <div className="flex gap-2 border-b">
        {(["profissionais", "obrigacoes"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500"
            }`}
          >
            {t === "profissionais" ? "Profissionais PJ" : "Obrigações Esperadas"}
          </button>
        ))}
      </div>

      {tab === "profissionais" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={submitProf} className="rounded-xl border bg-white p-6 space-y-3 shadow-sm">
            <h2 className="font-semibold">{editProf ? "Editar" : "Novo"} profissional</h2>
            <input required placeholder="Nome / Razão Social" value={profForm.name} onChange={(e) => setProfForm({ ...profForm, name: e.target.value })} className="w-full h-10 rounded-md border px-3 text-sm" />
            <input required placeholder="CNPJ" value={profForm.cnpj} onChange={(e) => setProfForm({ ...profForm, cnpj: e.target.value })} className="w-full h-10 rounded-md border px-3 text-sm" />
            <select required value={profForm.contabilidadeId} onChange={(e) => setProfForm({ ...profForm, contabilidadeId: e.target.value })} className="w-full h-10 rounded-md border px-3 text-sm">
              <option value="">Contabilidade</option>
              {contabilidades.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select value={profForm.unidade} onChange={(e) => setProfForm({ ...profForm, unidade: e.target.value as typeof profForm.unidade })} className="w-full h-10 rounded-md border px-3 text-sm">
              {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            <select value={profForm.regimeTributario} onChange={(e) => setProfForm({ ...profForm, regimeTributario: e.target.value as typeof profForm.regimeTributario })} className="w-full h-10 rounded-md border px-3 text-sm">
              {REGIMES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <button type="submit" disabled={saving} className="h-10 px-4 rounded-md bg-blue-600 text-white text-sm">{saving ? "Salvando..." : "Salvar"}</button>
          </form>
          <div className="rounded-xl border bg-white shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-3">Nome</th>
                  <th className="text-left p-3">CNPJ</th>
                  <th className="text-left p-3">Contabilidade</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {filteredProfs.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="p-3">{p.name}</td>
                    <td className="p-3">{p.cnpj}</td>
                    <td className="p-3">{p.contabilidadeName ?? "—"}</td>
                    <td className="p-3 text-right">
                      <button type="button" onClick={() => { setEditProf(p); setProfForm({ name: p.name, cnpj: p.cnpj ?? "", contabilidadeId: p.contabilidadeId, unidade: (p.unidade as typeof profForm.unidade) ?? "ROM Brasil", regimeTributario: (p.regimeTributario as typeof profForm.regimeTributario) ?? "Simples Nacional" }); }} className="p-1"><Pencil className="h-4 w-4" /></button>
                      <button type="button" onClick={async () => { if (confirm("Excluir?")) { await fetch(`/api/profissionais/${p.id}`, { method: "DELETE" }); load(); } }} className="p-1 text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={submitOb} className="rounded-xl border bg-white p-6 space-y-3 shadow-sm">
            <h2 className="font-semibold">{editOb ? "Editar" : "Nova"} obrigação</h2>
            <select required value={obForm.profissionalId} onChange={(e) => setObForm({ ...obForm, profissionalId: e.target.value })} className="w-full h-10 rounded-md border px-3 text-sm">
              <option value="">Profissional</option>
              {profissionais.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={obForm.tipo} onChange={(e) => setObForm({ ...obForm, tipo: e.target.value as typeof obForm.tipo })} className="w-full h-10 rounded-md border px-3 text-sm">
              {OBRIGACAO_TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input required placeholder="Valor esperado" value={obForm.valorEsperado} onChange={(e) => setObForm({ ...obForm, valorEsperado: e.target.value })} className="w-full h-10 rounded-md border px-3 text-sm" />
            <select value={obForm.periodicidade} onChange={(e) => setObForm({ ...obForm, periodicidade: e.target.value as typeof obForm.periodicidade })} className="w-full h-10 rounded-md border px-3 text-sm">
              {["Mensal", "Trimestral", "Anual"].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input placeholder="Regras" value={obForm.regras} onChange={(e) => setObForm({ ...obForm, regras: e.target.value })} className="w-full h-10 rounded-md border px-3 text-sm" />
            <button type="submit" disabled={saving} className="h-10 px-4 rounded-md bg-blue-600 text-white text-sm">{saving ? "Salvando..." : "Salvar"}</button>
          </form>
          <div className="rounded-xl border bg-white shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-3">Profissional</th>
                  <th className="text-left p-3">Tipo</th>
                  <th className="text-right p-3">Valor</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {filteredObs.map((o) => (
                  <tr key={o.id} className="border-b">
                    <td className="p-3">{o.profissionalName}</td>
                    <td className="p-3">{o.tipo}</td>
                    <td className="p-3 text-right">{formatCurrency(o.valorEsperado)}</td>
                    <td className="p-3 text-right">
                      <button type="button" onClick={() => { setEditOb(o); setObForm({ profissionalId: o.profissionalId, tipo: (o.tipo as typeof obForm.tipo) ?? "DAS", valorEsperado: o.valorEsperado ?? "0", periodicidade: o.periodicidade as typeof obForm.periodicidade, regras: o.regras ?? "" }); }} className="p-1"><Pencil className="h-4 w-4" /></button>
                      <button type="button" onClick={async () => { if (confirm("Excluir?")) { await fetch(`/api/obrigacoes/${o.id}`, { method: "DELETE" }); load(); } }} className="p-1 text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

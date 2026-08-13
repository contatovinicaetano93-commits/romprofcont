"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

type Contabilidade = {
  id: string;
  name: string;
  email: string | null;
  cnpj: string | null;
  phone: string | null;
};

type ProfCount = Record<string, number>;

export function ContabilidadesClient() {
  const [items, setItems] = useState<Contabilidade[]>([]);
  const [profCounts, setProfCounts] = useState<ProfCount>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", email: "", cnpj: "", phone: "" });
  const [editing, setEditing] = useState<Contabilidade | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [contRes, profRes] = await Promise.all([
      fetch("/api/contabilidades"),
      fetch("/api/profissionais"),
    ]);
    const conts = await contRes.json();
    const profs = await profRes.json();
    const counts: ProfCount = {};
    for (const p of profs) {
      counts[p.contabilidadeId] = (counts[p.contabilidadeId] ?? 0) + 1;
    }
    setItems(conts);
    setProfCounts(counts);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.email ?? "").toLowerCase().includes(q),
    );
  }, [items, search]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const url = editing ? `/api/contabilidades/${editing.id}` : "/api/contabilidades";
    const method = editing ? "PATCH" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ name: "", email: "", cnpj: "", phone: "" });
    setEditing(null);
    setSaving(false);
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir contabilidade?")) return;
    await fetch(`/api/contabilidades/${id}`, { method: "DELETE" });
    await load();
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contabilidades</h1>
          <p className="text-slate-500">Escritórios parceiros</p>
        </div>
        <input
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 rounded-md border px-3 text-sm w-full sm:w-72"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleSubmit} className="rounded-xl border bg-white p-6 space-y-4 shadow-sm">
          <h2 className="font-semibold flex items-center gap-2">
            {editing ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {editing ? "Editar contabilidade" : "Nova contabilidade"}
          </h2>
          <input
            required
            placeholder="Nome do Escritório / Razão Social"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full h-10 rounded-md border px-3 text-sm"
          />
          <input
            placeholder="E-mail para Cobrança"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full h-10 rounded-md border px-3 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="h-10 px-4 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Salvando..." : editing ? "Atualizar" : "Cadastrar"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setForm({ name: "", email: "", cnpj: "", phone: "" });
                }}
                className="h-10 px-4 rounded-md border text-sm"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>

        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-3">Nome</th>
                <th className="text-left p-3">E-mail</th>
                <th className="text-center p-3">Profissionais</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-400">
                    Nenhuma contabilidade cadastrada
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">{item.name}</td>
                    <td className="p-3 text-slate-500">{item.email ?? "—"}</td>
                    <td className="p-3 text-center">{profCounts[item.id] ?? 0}</td>
                    <td className="p-3 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(item);
                          setForm({
                            name: item.name,
                            email: item.email ?? "",
                            cnpj: item.cnpj ?? "",
                            phone: item.phone ?? "",
                          });
                        }}
                        className="p-1.5 rounded hover:bg-slate-100"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

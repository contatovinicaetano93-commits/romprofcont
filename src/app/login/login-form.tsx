"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { FileText, Loader2 } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Não foi possível entrar.");
        return;
      }

      const from = searchParams.get("from") || "/";
      router.push(from);
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(222_47%_11%)] p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600">
            <FileText className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-center text-xl font-bold leading-tight text-white">
            Controle de fiscal e contabil parceiros/profissionais
          </h1>
          <p className="mt-1 text-sm text-white/60">
            Sistema de validação e controle de obrigações
          </p>
        </div>

        <div className="rounded-xl border bg-white shadow-sm">
          <div className="space-y-1.5 border-b p-6">
            <h2 className="text-2xl font-semibold">Entrar</h2>
            <p className="text-sm text-slate-500">
              Acesse com suas credenciais autorizadas
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 p-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {error && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-10 w-full items-center justify-center rounded-md bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </button>

            <p className="text-center text-xs text-slate-500">
              Acesso restrito a usuários autorizados
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

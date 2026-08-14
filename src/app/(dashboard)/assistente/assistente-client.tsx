"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Bot, Loader2, Send, Sparkles, User } from "lucide-react";
import { FormEvent, useMemo, useRef, useEffect } from "react";

const SUGESTOES = [
  "Quais pendências temos na competência mais recente?",
  "Resuma o compliance por contabilidade.",
  "Quais documentos estão não identificados?",
  "Explique as regras de validação automática.",
  "O que devo cadastrar na Base Mestre para reduzir divergências?",
];

function MessageBubble({
  role,
  text,
}: {
  role: "user" | "assistant";
  text: string;
}) {
  const isUser = role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-blue-600 text-white" : "bg-slate-800 text-white"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-blue-600 text-white rounded-tr-sm"
            : "bg-slate-100 text-slate-800 rounded-tl-sm"
        }`}
      >
        {text}
      </div>
    </div>
  );
}

export function AssistenteClient() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/assistente/chat" }),
  });

  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, status]);

  const visibleMessages = useMemo(
    () =>
      messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          text: m.parts
            .filter((p) => p.type === "text")
            .map((p) => p.text)
            .join(""),
        }))
        .filter((m) => m.text.trim().length > 0),
    [messages],
  );

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem("prompt") as HTMLInputElement;
    const text = input.value.trim();
    if (!text || isBusy) return;
    sendMessage({ text });
    input.value = "";
  }

  function askSuggestion(text: string) {
    if (isBusy) return;
    sendMessage({ text });
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Assistente Fiscal</h1>
        </div>
        <p className="text-slate-500 mt-1">
          Analista de Controladoria & Contas a Pagar — consultas com IA sobre
          documentos, pendências e compliance.
        </p>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border bg-white shadow-sm">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {visibleMessages.length === 0 && (
            <div className="space-y-4 py-6">
              <div className="mx-auto max-w-lg text-center text-slate-500 text-sm">
                Olá! Posso ajudar com pendências, validações e resumo por
                contabilidade. Experimente uma pergunta:
              </div>
              <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
                {SUGESTOES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => askSuggestion(s)}
                    disabled={isBusy}
                    className="text-left text-xs px-3 py-2 rounded-full border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 transition disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {visibleMessages.map((m) => (
            <MessageBubble key={m.id} role={m.role} text={m.text} />
          ))}

          {isBusy && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analisando dados...
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error.message || "Erro ao consultar o assistente."}
            </div>
          )}
        </div>

        <form
          onSubmit={onSubmit}
          className="border-t p-4 flex gap-2 bg-slate-50/80"
        >
          <input
            name="prompt"
            type="text"
            placeholder="Pergunte sobre pendências, DAS, compliance..."
            disabled={isBusy}
            className="flex-1 rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isBusy}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}

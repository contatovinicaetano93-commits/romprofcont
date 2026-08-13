const checklist = [
  {
    phase: "Agora (você)",
    items: [
      "Criar projeto no Neon → copiar DATABASE_URL",
      "Copiar .env.example → .env.local e preencher variáveis",
      "Rodar db/001_schema.sql no SQL Editor do Neon",
    ],
  },
  {
    phase: "Em seguida (dev)",
    items: [
      "Login + sessão",
      "CRUD Contabilidades e Base Mestre",
      "Upload e validação de documentos (XML/PDF)",
      "Dashboard com KPIs",
    ],
  },
  {
    phase: "Integração e-mail",
    items: [
      "Deploy na Vercel",
      "Power Automate → impostoparceiro@romconcept.com",
      "POST /api/email/inbound com anexos",
    ],
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Controle de fiscal e contabil parceiros/profissionais
        </h1>
        <p className="text-slate-500 mt-1">
          Clone do Skip — Next.js + Neon. Veja o guia completo em{" "}
          <code className="text-sm bg-slate-100 px-1.5 py-0.5 rounded">
            docs/SETUP.md
          </code>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Esperados", value: "—", color: "bg-indigo-600" },
          { label: "Recebidos", value: "—", color: "bg-blue-600" },
          { label: "Aprovados", value: "—", color: "bg-green-600" },
          { label: "Pendentes", value: "—", color: "bg-yellow-500" },
          { label: "Reprovados", value: "—", color: "bg-red-600" },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border bg-white p-4 shadow-sm"
          >
            <p className="text-sm text-slate-500">{kpi.label}</p>
            <p className="text-3xl font-bold mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm space-y-6">
        <h2 className="text-lg font-semibold">O que criar — passo a passo</h2>
        {checklist.map((section) => (
          <div key={section.phase}>
            <h3 className="text-sm font-semibold text-blue-700 uppercase tracking-wide mb-2">
              {section.phase}
            </h3>
            <ul className="space-y-2">
              {section.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-0.5 h-4 w-4 rounded border border-slate-300 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

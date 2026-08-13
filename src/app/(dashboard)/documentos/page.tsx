function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-slate-500 mt-2">{description}</p>
      <p className="text-sm text-slate-400 mt-4">Em construção — Fase 4 do SETUP.md</p>
    </div>
  );
}

export default function DocumentosPage() {
  return (
    <PlaceholderPage
      title="Documentos"
      description="Notas fiscais recebidas (manual, upload ou e-mail automático)."
    />
  );
}

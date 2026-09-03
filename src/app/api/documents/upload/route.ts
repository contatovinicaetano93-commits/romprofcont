import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { requireSession } from "@/lib/require-session";
import { processInboundDocument } from "@/lib/process-inbound-document";

export async function POST(request: Request) {
  await requireSession();
  const form = await request.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  const hint = String(form.get("text") ?? "");

  if (files.length === 0) {
    return Response.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  }

  let count = 0;

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const lower = file.name.toLowerCase();
    let text = "";
    if (lower.endsWith(".pdf")) {
      try {
        const parsed = await pdfParse(buffer);
        text = parsed.text ?? "";
      } catch {
        text = "";
      }
    } else {
      text = new TextDecoder().decode(buffer);
    }

    const id = await processInboundDocument({
      text,
      fileName: file.name,
      hint,
      origem: "upload",
    });
    if (id) count += 1;
  }

  return Response.json({ count });
}

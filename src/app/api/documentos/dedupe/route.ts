import { requireSession } from "@/lib/require-session";
import { archiveLiveDuplicateDocuments } from "@/lib/process-inbound-document";

export async function POST() {
  await requireSession();
  const result = await archiveLiveDuplicateDocuments();
  return Response.json(result);
}

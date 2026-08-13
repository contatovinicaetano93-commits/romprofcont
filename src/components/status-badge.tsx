import type { DocumentoStatus } from "@/lib/types";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/types";

export function StatusBadge({ status }: { status: DocumentoStatus | string }) {
  const key = status as DocumentoStatus;
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[key] ?? "bg-gray-100 text-gray-800"}`}
    >
      {STATUS_LABELS[key] ?? status}
    </span>
  );
}

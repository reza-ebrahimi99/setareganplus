import type { ReadinessTone } from "@/content/admin";
import { ReadinessStatusIcon } from "./AdminIcons";

type AdminReadinessItemProps = {
  label: string;
  status: string;
  tone: ReadinessTone;
};

const toneStyles: Record<ReadinessTone, string> = {
  ready: "text-success",
  pending: "text-primary",
  planned: "text-muted",
};

export function AdminReadinessItem({
  label,
  status,
  tone,
}: AdminReadinessItemProps) {
  return (
    <li className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background px-4 py-3">
      <span className="text-sm text-foreground">{label}</span>
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-medium ${toneStyles[tone]}`}
      >
        <ReadinessStatusIcon tone={tone} />
        <span>{status}</span>
      </span>
    </li>
  );
}

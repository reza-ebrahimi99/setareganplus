import {
  COMMERCE_OPS_DELAY_LABELS,
  COMMERCE_OPS_HEALTH_LABELS,
  COMMERCE_OPS_PRIORITY_LABELS,
  type CommerceOpsHealthLevel,
  type CommerceOpsPriority,
} from "@/lib/commerce/orders/intelligence";
import { toPersianDigits } from "@/lib/persian";

const PRIORITY_CLASS: Record<CommerceOpsPriority, string> = {
  URGENT: "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-100",
  OVERDUE: "border-orange-300 bg-orange-50 text-orange-900 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-100",
  TODAY_PICKUP: "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100",
  VIP: "border-violet-300 bg-violet-50 text-violet-900 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-100",
  NORMAL: "border-border bg-background text-muted",
};

const HEALTH_CLASS: Record<CommerceOpsHealthLevel, string> = {
  healthy: "border-emerald-300 bg-emerald-50 text-emerald-800",
  warning: "border-amber-300 bg-amber-50 text-amber-900",
  critical: "border-rose-300 bg-rose-50 text-rose-800",
};

export function OrderPriorityBadge({
  priority,
}: {
  priority: CommerceOpsPriority;
}) {
  if (priority === "NORMAL") return null;
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${PRIORITY_CLASS[priority]}`}>
      {COMMERCE_OPS_PRIORITY_LABELS[priority]}
    </span>
  );
}

export function OrderHealthBadge({
  score,
  level,
}: {
  score: number;
  level: CommerceOpsHealthLevel;
}) {
  return (
    <span
      title={COMMERCE_OPS_HEALTH_LABELS[level]}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${HEALTH_CLASS[level]}`}
    >
      {toPersianDigits(score)}
      <span className="opacity-80">{COMMERCE_OPS_HEALTH_LABELS[level]}</span>
    </span>
  );
}

export function OrderDelayBadge({
  delayed,
  delayKind,
}: {
  delayed: boolean;
  delayKind: "production" | "ready" | null;
}) {
  if (!delayed || !delayKind) return null;
  const tone =
    delayKind === "production"
      ? "border-rose-400 bg-rose-50 text-rose-800"
      : "border-orange-400 bg-orange-50 text-orange-900";
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
      {COMMERCE_OPS_DELAY_LABELS[delayKind]}
    </span>
  );
}

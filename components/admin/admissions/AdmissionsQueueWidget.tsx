import Link from "next/link";
import type { WidgetPayload } from "@/lib/dashboard/contracts/widget";
import { AdmissionsWidgetFrame } from "@/components/admin/admissions/AdmissionsWidgetFrame";
import {
  opsEntityLabel,
  opsPriorityLabel,
  opsSlaLabel,
} from "@/lib/admin/labels";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";

type QueueItemView = {
  entityType: string;
  entityId: string;
  priority: string;
  dueAt: string | null;
  slaState: string;
  displayName?: string | null;
  leadId?: string | null;
};

function readQueue(data: unknown): { count: number; items: QueueItemView[] } {
  if (!data || typeof data !== "object") return { count: 0, items: [] };
  const row = data as Record<string, unknown>;
  const items = Array.isArray(row.items)
    ? row.items.filter(
        (item): item is QueueItemView =>
          !!item &&
          typeof item === "object" &&
          typeof (item as QueueItemView).entityId === "string" &&
          typeof (item as QueueItemView).entityType === "string",
      )
    : [];
  const count =
    typeof row.count === "number" ? row.count : items.length;
  return { count, items };
}

function entityHref(item: QueueItemView): string | null {
  if (item.entityType === "LEAD") return `/admin/leads/${item.entityId}`;
  if (item.entityType === "REGISTRATION") {
    return `/admin/registrations/${item.entityId}`;
  }
  if (item.entityType === "CRM_TASK" && item.leadId) {
    return `/admin/leads/${item.leadId}`;
  }
  return null;
}

function slaTone(slaState: string): string {
  if (slaState === "BREACHED") return "text-danger";
  if (slaState === "AT_RISK") return "text-amber-700";
  return "text-muted";
}

export function AdmissionsQueueWidget({
  widget,
  riseClassName,
}: {
  widget: WidgetPayload;
  riseClassName?: string;
}) {
  const { count, items } = readQueue(widget.data);

  return (
    <AdmissionsWidgetFrame widget={widget} riseClassName={riseClassName}>
      <p className="mb-3 text-xs text-muted">
        {toPersianDigits(count)} مورد
      </p>
      <ul className="divide-y divide-border/80">
        {items.map((item) => {
          const href = entityHref(item);
          const label =
            item.displayName?.trim() || opsEntityLabel(item.entityType);
          return (
            <li
              key={`${item.entityType}:${item.entityId}`}
              className="flex items-center justify-between gap-3 py-2.5 text-sm"
            >
              <div className="min-w-0">
                {href ? (
                  <Link
                    href={href}
                    className="block truncate font-medium text-primary hover:underline"
                  >
                    {label}
                  </Link>
                ) : (
                  <span className="block truncate font-medium text-primary">
                    {label}
                  </span>
                )}
                <p className="mt-0.5 text-xs text-muted">
                  اولویت {opsPriorityLabel(item.priority)}
                  {item.dueAt
                    ? ` · ${formatJalaliDateTimeShort(new Date(item.dueAt))}`
                    : ""}
                </p>
              </div>
              <span
                className={`shrink-0 text-[11px] font-medium ${slaTone(item.slaState)}`}
              >
                {opsSlaLabel(item.slaState)}
              </span>
            </li>
          );
        })}
      </ul>
    </AdmissionsWidgetFrame>
  );
}

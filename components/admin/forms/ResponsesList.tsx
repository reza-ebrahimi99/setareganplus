import Link from "next/link";
import { getFormSubmissionStatusLabel } from "@/lib/forms/form-submission-status-labels";
import type { ResponseListItem } from "@/lib/forms/load-form-responses";
import { toPersianDigits } from "@/lib/persian";

function formatDateTime(value: Date): string {
  return toPersianDigits(
    value.toLocaleString("fa-IR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  );
}

export function ResponsesList({
  formId,
  items,
}: {
  formId: string;
  items: ResponseListItem[];
}) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="admin-card p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-primary">
                  {item.displayName ?? "بدون نام"}
                </p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                  {getFormSubmissionStatusLabel(item.status)}
                </span>
                {item.isDuplicateInForm ? (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                    تکراری
                  </span>
                ) : null}
              </div>
              <dl className="grid gap-1 text-sm text-muted sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className="inline text-slate-500">تاریخ: </dt>
                  <dd className="inline text-foreground">
                    {formatDateTime(item.submittedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="inline text-slate-500">موبایل: </dt>
                  <dd className="inline font-mono text-foreground" dir="ltr">
                    {item.mobile
                      ? toPersianDigits(item.mobile)
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="inline text-slate-500">شعبه: </dt>
                  <dd className="inline text-foreground">{item.branchName}</dd>
                </div>
              </dl>
            </div>

            <Link
              href={`/admin/forms/${formId}/responses/${item.id}`}
              className="inline-flex shrink-0 items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-secondary/40 hover:bg-background"
            >
              مشاهده سریع
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}

import Link from "next/link";
import { formatJalaliDateShort } from "@/lib/datetime/jalali";
import { getFormModeLabel } from "@/lib/forms/form-mode-labels";
import { getFormPurposeLabel } from "@/lib/forms/form-purpose-labels";
import { getFormVersionStatusLabel } from "@/lib/forms/form-version-status-labels";
import { toPersianDigits } from "@/lib/persian";
import type {
  FormMode,
  FormPurpose,
  FormVersionStatus,
} from "@/generated/prisma/enums";

export type AdminFormListItem = {
  id: string;
  slug: string;
  purpose: FormPurpose;
  mode: FormMode;
  publishedVersionId: string | null;
  updatedAt: Date;
  latestVersion: {
    versionNumber: number;
    status: FormVersionStatus;
    title: string;
  } | null;
};

function formatAdminDate(value: Date): string {
  return formatJalaliDateShort(value);
}

export function FormsList({ forms }: { forms: AdminFormListItem[] }) {
  return (
    <ul className="space-y-3">
      {forms.map((form) => {
        const title = form.latestVersion?.title ?? "بدون عنوان نسخه";
        const versionNumber = form.latestVersion?.versionNumber;
        const status = form.latestVersion?.status;
        const isPublished = Boolean(form.publishedVersionId);
        const editorHref = `/admin/forms/${form.id}`;

        return (
          <li key={form.id} className="admin-card p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-primary">
                    <Link
                      href={editorHref}
                      className="hover:text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                    >
                      {title}
                    </Link>
                  </h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      isPublished
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {isPublished ? "منتشرشده" : "منتشرنشده"}
                  </span>
                </div>
                <dl className="grid gap-1 text-sm text-muted sm:grid-cols-2">
                  <div>
                    <dt className="inline text-slate-500">نامک: </dt>
                    <dd className="inline font-mono text-foreground" dir="ltr">
                      {form.slug}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline text-slate-500">هدف: </dt>
                    <dd className="inline text-foreground">
                      {getFormPurposeLabel(form.purpose)}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline text-slate-500">حالت: </dt>
                    <dd className="inline text-foreground">
                      {getFormModeLabel(form.mode)}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline text-slate-500">نسخه: </dt>
                    <dd className="inline text-foreground">
                      {versionNumber != null
                        ? toPersianDigits(versionNumber)
                        : "—"}
                      {status
                        ? ` · ${getFormVersionStatusLabel(status)}`
                        : ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline text-slate-500">آخرین به‌روزرسانی: </dt>
                    <dd className="inline text-foreground">
                      {formatAdminDate(form.updatedAt)}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <Link
                  href={`/admin/forms/${form.id}/responses`}
                  className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-secondary/40 hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                >
                  پاسخ‌ها
                </Link>
                <Link
                  href={editorHref}
                  className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-secondary/40 hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                >
                  ویرایش
                </Link>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

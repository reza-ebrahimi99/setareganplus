import { ExperienceFileKind } from "@/generated/prisma/enums";
import { PortalEmptyState } from "@/components/portal/PortalEmptyState";
import { formatJalaliDateShort } from "@/lib/datetime/jalali";
import type { ExperienceFilesPageDto } from "@/lib/sxp/hub/load-files";

const KIND_LABELS: Record<ExperienceFileKind, string> = {
  RECEIPT: "رسید",
  CERTIFICATE: "گواهی",
  INVOICE: "فاکتور",
  BOOKLET: "جزوه",
  BOOK: "کتاب",
  PDF: "PDF",
  MEDIA: "رسانه",
  OTHER: "سایر",
};

type ExperienceFilesListProps = {
  page: ExperienceFilesPageDto;
};

export function ExperienceFilesList({ page }: ExperienceFilesListProps) {
  return (
    <div className="mx-auto w-full max-w-[840px] space-y-6">
      <div>
        <h1 className="text-xl font-bold text-primary sm:text-2xl">فایل‌ها</h1>
        <p className="mt-1 text-sm text-muted">
          مرکز دانلود حساب {page.displayName}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["RECEIPT", "CERTIFICATE", "INVOICE", "BOOKLET", "BOOK", "PDF", "MEDIA"] as const).map(
          (kind) => (
            <span
              key={kind}
              className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted"
            >
              {KIND_LABELS[kind]}
            </span>
          ),
        )}
      </div>

      {page.files.length === 0 ? (
        <PortalEmptyState
          title="هنوز فایلی آماده نیست"
          description="وقتی ماژول فایل رویداد بفرستد، رسید، گواهی و سایر منابع اینجا می‌آید."
        />
      ) : (
        <ul className="space-y-3">
          {page.files.map((file) => (
            <li
              key={file.id}
              className="admin-card flex items-center justify-between gap-3 px-4 py-4"
            >
              <div className="min-w-0">
                <p className="text-xs text-muted">{KIND_LABELS[file.kind]}</p>
                <p className="mt-0.5 truncate text-sm font-semibold text-primary">
                  {file.title}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {formatJalaliDateShort(file.createdAt)}
                </p>
              </div>
              <a
                href={file.downloadHref}
                className="min-h-11 shrink-0 rounded-xl border border-secondary/30 bg-secondary/10 px-3 py-2 text-sm font-medium text-primary"
              >
                دانلود
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

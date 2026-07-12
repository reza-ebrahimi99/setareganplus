import Link from "next/link";
import { leadTableColumns, leadsEmptyState } from "@/content/admin";

export function LeadTableEmpty() {
  return (
    <div className="admin-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <caption className="sr-only">
            فهرست متقاضیان — بدون ردیف داده
          </caption>
          <thead className="border-b border-border bg-background">
            <tr>
              {leadTableColumns.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className="px-4 py-3 text-start font-semibold text-primary"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={leadTableColumns.length} className="px-4 py-10">
                <div className="mx-auto max-w-xl text-center">
                  <p className="text-base font-semibold text-primary">
                    {leadsEmptyState.title}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-muted">
                    {leadsEmptyState.description}
                  </p>
                  <Link
                    href={leadsEmptyState.ctaHref}
                    className="mt-5 inline-flex items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                  >
                    {leadsEmptyState.ctaLabel}
                  </Link>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

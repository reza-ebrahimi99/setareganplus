import Link from "next/link";
import type { Metadata } from "next";
import { setTopRankArchivePublishedAction } from "@/app/admin/(dashboard)/website/top-rank-archive/actions";
import { TopRankArchiveDeleteButton } from "@/components/admin/website/TopRankArchiveDeleteButton";
import { TopRankArchiveForm } from "@/components/admin/website/TopRankArchiveForm";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { requirePermission } from "@/lib/auth/require-admin";
import { toPersianDigits } from "@/lib/persian";
import { TOP_RANK_ARCHIVE_ADMIN_PATH } from "@/lib/website/top-rank-archive-constants";
import { listAdminTopRankArchives } from "@/lib/website/top-rank-archive-admin";

export const metadata: Metadata = { title: "آرشیو رتبه‌های برتر کنکور" };

export default async function TopRankArchiveAdminPage() {
  const session = await requirePermission("website.manage");
  const rows = await listAdminTopRankArchives(session.organization.id);

  return (
    <>
      <AdminPageHeader
        title="آرشیو رتبه‌های برتر کنکور"
        description="مدیریت تصاویر رتبه‌های برتر به تفکیک سال شمسی"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "وب‌سایت", href: "/admin/website/achievements" },
          { label: "آرشیو رتبه‌ها" },
        ]}
      />

      <div className="mb-6 grid gap-6 xl:grid-cols-12">
        <section className="xl:col-span-5">
          <h2 className="mb-3 text-sm font-semibold text-primary">رکورد جدید</h2>
          <TopRankArchiveForm mode="create" />
        </section>

        <section className="xl:col-span-7">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-primary">
              رکوردها ({toPersianDigits(rows.length)})
            </h2>
            <Link
              href="/achievements/top-ranks"
              className="text-sm text-secondary underline-offset-4 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              مشاهده صفحه عمومی
            </Link>
          </div>

          {rows.length === 0 ? (
            <p className="admin-card p-6 text-sm leading-7 text-muted">
              هنوز آرشیوی ثبت نشده است. اولین سال را از فرم کناری ایجاد کنید.
            </p>
          ) : (
            <ul className="space-y-3">
              {rows.map((row) => (
                <li key={row.id} className="admin-card overflow-hidden p-0">
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
                    <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-primary/[0.03] sm:w-40">
                      {row.imageUrl ? (
                        // Native img keeps aspect preview without forcing Next sizes.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row.imageUrl}
                          alt={row.imageAlt}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-muted">
                          بدون تصویر
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="text-base font-semibold text-primary">
                        {toPersianDigits(row.displayTitle)}
                      </p>
                      <p className="text-sm text-muted">
                        سال {toPersianDigits(row.year)} · ترتیب{" "}
                        {toPersianDigits(row.sortOrder)} ·{" "}
                        {row.isPublished ? "منتشر شده" : "پیش‌نویس"}
                      </p>
                      {row.description ? (
                        <p className="line-clamp-2 text-sm leading-7 text-muted">
                          {row.description}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Link
                          href={`${TOP_RANK_ARCHIVE_ADMIN_PATH}/${row.id}`}
                          className="inline-flex min-h-10 items-center rounded-xl border border-border bg-white px-3 text-sm"
                        >
                          ویرایش
                        </Link>
                        <form action={setTopRankArchivePublishedAction}>
                          <input type="hidden" name="archiveId" value={row.id} />
                          <input
                            type="hidden"
                            name="isPublished"
                            value={row.isPublished ? "false" : "true"}
                          />
                          <button
                            type="submit"
                            className="inline-flex min-h-10 items-center rounded-xl border border-border bg-white px-3 text-sm"
                          >
                            {row.isPublished ? "لغو انتشار" : "انتشار"}
                          </button>
                        </form>
                        <TopRankArchiveDeleteButton
                          archiveId={row.id}
                          year={row.year}
                        />
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

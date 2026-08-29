import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminBreadcrumbs } from "@/content/admin";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-admin";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { isGuidanceEnabled } from "@/lib/guidance/feature-flags";
import {
  listCounselorQueue,
  type CounselorQueueFilter,
} from "@/lib/guidance/counselor";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "مرکز بررسی مشاور" };

const FILTERS: { id: CounselorQueueFilter; label: string }[] = [
  { id: "all", label: "همه" },
  { id: "awaiting_review", label: "در انتظار بررسی" },
  { id: "in_review", label: "در حال بررسی" },
  { id: "needs_correction", label: "نیاز به اصلاح" },
  { id: "ready_for_session", label: "آماده جلسه" },
  { id: "pending_transcript", label: "کارنامه معلق" },
];

type PageProps = {
  searchParams?: Promise<{ filter?: string }>;
};

export default async function AdminGuidanceQueuePage({
  searchParams,
}: PageProps) {
  const session = await requirePermission("guidance.view");
  const enabled = await isGuidanceEnabled(session.organization.id);
  if (!enabled) notFound();

  const params = searchParams ? await searchParams : {};
  const filterRaw = params.filter ?? "all";
  const filter = (
    FILTERS.some((f) => f.id === filterRaw) ? filterRaw : "all"
  ) as CounselorQueueFilter;

  const items = await listCounselorQueue({
    organizationId: session.organization.id,
    filter,
  });

  const canReview = hasPermission(session, "guidance.review");

  return (
    <div className="counselor-review">
      <AdminPageHeader
        title="مرکز بررسی مشاور"
        description="صف پرونده‌های هدایت تحصیلی برای بررسی کارنامه، رغبت و پروفایل ۳۶۰."
        breadcrumbs={adminBreadcrumbs.guidance}
      />

      <div className="counselor-review__filters" role="tablist" aria-label="فیلتر صف">
        {FILTERS.map((f) => (
          <Link
            key={f.id}
            href={f.id === "all" ? "/admin/guidance" : `/admin/guidance?filter=${f.id}`}
            className={`counselor-review__filter${filter === f.id ? " is-active" : ""}`}
            role="tab"
            aria-selected={filter === f.id}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <p className="counselor-review__count">
        {toPersianDigits(items.length)} پرونده
        {canReview ? "" : " · فقط مشاهده"}
      </p>

      {items.length === 0 ? (
        <div className="admin-card counselor-review__empty">
          <p>پرونده‌ای با این فیلتر نیست.</p>
        </div>
      ) : (
        <ul className="counselor-review__queue">
          {items.map((item) => (
            <li key={item.publicId}>
              <Link href={item.href} className="counselor-review__card admin-card">
                <div className="counselor-review__card-top">
                  <strong>{item.studentName}</strong>
                  <span data-status={item.reviewStatus}>
                    {item.reviewStatusLabel}
                  </span>
                </div>
                <p className="counselor-review__meta">
                  {item.gradeName ?? "—"} · {item.examGroup} · کارنامه:{" "}
                  {item.transcriptStatusLabel}
                </p>
                <p className="counselor-review__meta">
                  رغبت: {item.interestStatus} · پروفایل: {item.profileStatus}
                </p>
                <p className="counselor-review__meta">
                  به‌روزرسانی:{" "}
                  {formatJalaliDateTimeShort(new Date(item.updatedAtIso))}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

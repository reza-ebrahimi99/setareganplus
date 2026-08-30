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
  isWorkspaceQueueFilter,
  listWorkspaceQueue,
  WORKSPACE_QUEUE_FILTER_LABELS,
  WORKSPACE_QUEUE_FILTERS,
  type WorkspaceQueueFilter,
} from "@/lib/guidance/workspace";
import { toPersianDigits } from "@/lib/persian";
import { GUIDANCE_PACKAGES } from "@/lib/guidance/journey/packages";
import { GUIDANCE_JOURNEY_STEPS } from "@/lib/guidance/journey/steps";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "میز کار مشاور" };

type PageProps = {
  searchParams?: Promise<{
    filter?: string;
    q?: string;
    step?: string;
    payment?: string;
    package?: string;
    booking?: string;
  }>;
};

export default async function AdminGuidanceQueuePage({
  searchParams,
}: PageProps) {
  const session = await requirePermission("guidance.view");
  const enabled = await isGuidanceEnabled(session.organization.id);
  if (!enabled) notFound();

  const params = searchParams ? await searchParams : {};
  const filterRaw = params.filter ?? "all";
  const filter: WorkspaceQueueFilter = isWorkspaceQueueFilter(filterRaw)
    ? filterRaw
    : "all";
  const query = (params.q ?? "").trim();
  const stepRaw = Number(params.step ?? "");
  const step = Number.isInteger(stepRaw) && stepRaw >= 1 && stepRaw <= 12 ? stepRaw : undefined;
  const payment =
    params.payment === "paid" || params.payment === "unpaid" ? params.payment : undefined;
  const packageCode = (params.package ?? "").trim() || undefined;
  const booking =
    params.booking === "booked" || params.booking === "none" ? params.booking : undefined;

  const items = await listWorkspaceQueue({
    organizationId: session.organization.id,
    filter,
    query,
    step,
    payment,
    packageCode,
    booking,
  });

  const canReview = hasPermission(session, "guidance.review");

  return (
    <div className="counselor-workspace">
      <AdminPageHeader
        title="میز کار مشاور"
        description="میز کار عملیاتی هدایت تحصیلی — بررسی، ویرایش، تأیید و گزارش پرونده‌ها."
        breadcrumbs={adminBreadcrumbs.guidance}
      />

      <p className="counselor-workspace__phase-note">
        جستجو با نام، کد ملی، موبایل، شناسه پرونده یا شماره قلم‌چی.
        {canReview ? "" : " · دسترسی شما فقط مشاهده است."}
      </p>

      <form className="counselor-workspace__search" method="get">
        {filter !== "all" ? (
          <input type="hidden" name="filter" value={filter} />
        ) : null}
        <label htmlFor="workspace-q">جستجو</label>
        <div className="counselor-workspace__search-row">
          <input
            id="workspace-q"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="نام، کد ملی، موبایل، شناسه"
            autoComplete="off"
          />
          <select name="step" defaultValue={step ? String(step) : ""} aria-label="مرحله">
            <option value="">همه مراحل</option>
            {GUIDANCE_JOURNEY_STEPS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.shortTitle}
              </option>
            ))}
          </select>
          <select name="payment" defaultValue={payment ?? ""} aria-label="پرداخت">
            <option value="">پرداخت (همه)</option>
            <option value="paid">پرداخت شده</option>
            <option value="unpaid">پرداخت نشده</option>
          </select>
          <select name="package" defaultValue={packageCode ?? ""} aria-label="بسته">
            <option value="">بسته (همه)</option>
            {GUIDANCE_PACKAGES.map((pkg) => (
              <option key={pkg.code} value={pkg.code}>
                {pkg.title}
              </option>
            ))}
          </select>
          <select name="booking" defaultValue={booking ?? ""} aria-label="رزرو">
            <option value="">رزرو (همه)</option>
            <option value="booked">دارای نوبت</option>
            <option value="none">بدون نوبت</option>
          </select>
          <button type="submit" className="counselor-btn counselor-btn--primary">
            جستجو
          </button>
        </div>
      </form>

      <div className="counselor-workspace__filters" role="tablist" aria-label="فیلتر صف">
        {WORKSPACE_QUEUE_FILTERS.map((id) => {
          const href =
            id === "all"
              ? query
                ? `/admin/guidance?q=${encodeURIComponent(query)}`
                : "/admin/guidance"
              : query
                ? `/admin/guidance?filter=${id}&q=${encodeURIComponent(query)}`
                : `/admin/guidance?filter=${id}`;
          return (
            <Link
              key={id}
              href={href}
              className={`counselor-workspace__filter${filter === id ? " is-active" : ""}`}
              role="tab"
              aria-selected={filter === id}
            >
              {WORKSPACE_QUEUE_FILTER_LABELS[id]}
            </Link>
          );
        })}
      </div>

      <p className="counselor-workspace__count">
        {toPersianDigits(items.length)} پرونده
      </p>

      {items.length === 0 ? (
        <div className="admin-card counselor-workspace__empty">
          <p>پرونده‌ای با این فیلتر نیست.</p>
        </div>
      ) : (
        <ul className="counselor-workspace__queue">
          {items.map((item) => (
            <li key={item.publicId}>
              <Link href={item.href} className="counselor-workspace__card admin-card">
                <div className="counselor-workspace__card-top">
                  <strong>{item.studentName}</strong>
                  <span data-status={item.reviewStatus}>{item.reviewStatusLabel}</span>
                </div>
                <p className="counselor-workspace__meta">
                  {item.gradeName ?? "—"} · {item.examGroupLabel} · مرحله{" "}
                  {toPersianDigits(item.currentStep)} از ۱۲ — {item.currentStepTitle}
                </p>
                <div
                  className="counselor-workspace__bar"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={item.completionPercentage}
                  aria-label="درصد تکمیل سفر"
                >
                  <span style={{ width: `${item.completionPercentage}%` }} />
                </div>
                <p className="counselor-workspace__meta">
                  تکمیل {toPersianDigits(item.completionPercentage)}٪
                  {item.packageTitle ? ` · ${item.packageTitle}` : ""}
                  {item.paid ? " · پرداخت شده" : ""}
                  {item.choicesApproved ? " · گزینه‌ها تأیید شده" : ""}
                  {item.finalApproved ? " · تأیید نهایی" : ""}
                </p>
                <p className="counselor-workspace__meta">
                  کارنامه: {item.transcriptStatusLabel} · به‌روزرسانی:{" "}
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

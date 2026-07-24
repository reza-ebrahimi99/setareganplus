import type { Metadata } from "next";
import Link from "next/link";
import { PromotionType } from "@/generated/prisma/enums";
import {
  deletePromotionAction,
  duplicatePromotionAction,
  togglePromotionActiveAction,
} from "@/app/admin/(dashboard)/promotions/actions";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-admin";
import { listPromotions } from "@/lib/promotions/admin";
import { PROMOTION_TYPE_LABELS } from "@/lib/promotions/types";
import { formatTomansFromRials } from "@/lib/registration/format";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "تخفیف‌ها و پروموشن" };

export default async function AdminPromotionsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    q?: string;
    type?: string;
    isActive?: string;
    page?: string;
    sort?: string;
  }>;
}) {
  const session = await requirePermission("promotions.view");
  const canManage = hasPermission(session, "promotions.manage");
  const params = searchParams ? await searchParams : {};
  const typeFilter =
    params.type &&
    Object.values(PromotionType).includes(params.type as PromotionType)
      ? (params.type as PromotionType)
      : "";
  const sort =
    params.sort === "usage" ||
    params.sort === "updated" ||
    params.sort === "title" ||
    params.sort === "priority"
      ? params.sort
      : "priority";
  const page = Math.max(1, Number(params.page) || 1);

  const result = await listPromotions(session.organization.id, {
    q: params.q,
    type: typeFilter,
    isActive:
      params.isActive === "true" || params.isActive === "false"
        ? params.isActive
        : "",
    page,
    pageSize: 20,
    sort,
  });
  const { items, totalPages, total } = result;

  function pageHref(target: number) {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (typeFilter) sp.set("type", typeFilter);
    if (params.isActive) sp.set("isActive", params.isActive);
    if (sort !== "priority") sp.set("sort", sort);
    if (target > 1) sp.set("page", String(target));
    const qs = sp.toString();
    return qs ? `/admin/promotions?${qs}` : "/admin/promotions";
  }

  return (
    <>
      <AdminPageHeader
        title="تخفیف‌ها و پروموشن"
        description="مدیریت تخفیف زمان‌دار، کد تخفیف، کد معرف و VIP"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "تخفیف‌ها و پروموشن" },
        ]}
        compact
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <form className="flex w-full flex-col gap-2 sm:max-w-4xl sm:flex-row">
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="جستجو عنوان یا کد…"
            className="w-full min-h-11 rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
          />
          <select
            name="type"
            defaultValue={typeFilter}
            className="min-h-11 rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
          >
            <option value="">همه انواع</option>
            {Object.values(PromotionType).map((type) => (
              <option key={type} value={type}>
                {PROMOTION_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          <select
            name="isActive"
            defaultValue={params.isActive ?? ""}
            className="min-h-11 rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
          >
            <option value="">همه وضعیت‌ها</option>
            <option value="true">فعال</option>
            <option value="false">غیرفعال</option>
          </select>
          <select
            name="sort"
            defaultValue={sort}
            className="min-h-11 rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
          >
            <option value="priority">اولویت</option>
            <option value="usage">بیشترین استفاده</option>
            <option value="updated">به‌روزترین</option>
            <option value="title">عنوان</option>
          </select>
          <button
            type="submit"
            className="min-h-11 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium"
          >
            فیلتر
          </button>
        </form>
        {canManage ? (
          <Link
            href="/admin/promotions/new"
            className="inline-flex min-h-11 justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white"
          >
            پروموشن جدید
          </Link>
        ) : null}
      </div>

      <p className="mb-3 text-xs text-muted">
        {toPersianDigits(String(total))} پروموشن · صفحه{" "}
        {toPersianDigits(String(page))} از {toPersianDigits(String(totalPages))}
      </p>

      {items.length === 0 ? (
        <AdminEmptyState
          title="پروموشنی ثبت نشده"
          description="اولین کد تخفیف یا معرف را بسازید."
        />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-border bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <Link
                    href={`/admin/promotions/${item.id}`}
                    className="text-base font-semibold text-primary hover:underline"
                  >
                    {item.title}
                  </Link>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      {PROMOTION_TYPE_LABELS[item.type]}
                    </span>
                    <span
                      className={`rounded-lg px-2 py-0.5 text-[11px] font-medium ${
                        item.isActive
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.isActive ? "فعال" : "غیرفعال"}
                    </span>
                    {item.code ? (
                      <span
                        className="rounded-lg border border-border px-2 py-0.5 font-mono text-[11px]"
                        dir="ltr"
                      >
                        {item.code}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted">
                    {item.flowTitle ? `${item.flowTitle} · ` : ""}
                    {item.ownerStaffName
                      ? `معرف: ${item.ownerStaffName} · `
                      : ""}
                    استفاده: {toPersianDigits(String(item.usageCount))}
                    {item.usageLimit != null
                      ? ` / ${toPersianDigits(String(item.usageLimit))}`
                      : ""}
                    {" · "}
                    تخفیف: {formatTomansFromRials(item.totalDiscountRials)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canManage ? (
                    <>
                      <form action={togglePromotionActiveAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <input
                          type="hidden"
                          name="isActive"
                          value={item.isActive ? "false" : "true"}
                        />
                        <button
                          type="submit"
                          className="min-h-10 rounded-lg border border-border px-3 py-1.5 text-xs"
                        >
                          {item.isActive ? "آرشیو / غیرفعال" : "فعال‌سازی"}
                        </button>
                      </form>
                      <form action={duplicatePromotionAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <button
                          type="submit"
                          className="min-h-10 rounded-lg border border-border px-3 py-1.5 text-xs"
                        >
                          کپی
                        </button>
                      </form>
                      <form action={deletePromotionAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <button
                          type="submit"
                          className="min-h-10 rounded-lg border border-red-200 px-3 py-1.5 text-xs text-danger"
                        >
                          حذف نرم
                        </button>
                      </form>
                    </>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 ? (
        <nav className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              className="rounded-lg border border-border px-3 py-2 text-xs"
            >
              قبلی
            </Link>
          ) : null}
          <span className="text-xs text-muted">
            {toPersianDigits(String(page))} / {toPersianDigits(String(totalPages))}
          </span>
          {page < totalPages ? (
            <Link
              href={pageHref(page + 1)}
              className="rounded-lg border border-border px-3 py-2 text-xs"
            >
              بعدی
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}

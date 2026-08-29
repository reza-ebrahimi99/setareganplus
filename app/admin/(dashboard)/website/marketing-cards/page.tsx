import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  moveMarketingCardAction,
  toggleMarketingCardActiveAction,
} from "@/app/admin/(dashboard)/website/marketing-cards/actions";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DeleteMarketingCardButton } from "@/components/admin/website/DeleteMarketingCardButton";
import { ImportLegacyMarketingCardsButton } from "@/components/admin/website/ImportLegacyMarketingCardsButton";
import { requirePermission } from "@/lib/auth/require-admin";
import { HOMEPAGE_QALAMCHI_SECTION_KEY } from "@/lib/website/marketing-card-constants";
import { listAdminMarketingCards } from "@/lib/website/marketing-cards-admin";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "کارت‌های نمایندگی" };

export default async function AdminMarketingCardsPage({
  searchParams,
}: {
  searchParams?: Promise<{ import?: string }>;
}) {
  const session = await requirePermission("website.manage");
  const params = searchParams ? await searchParams : {};
  const cards = await listAdminMarketingCards(
    session.organization.id,
    HOMEPAGE_QALAMCHI_SECTION_KEY,
  );

  return (
    <>
      <AdminPageHeader
        title="کارت‌های نمایندگی"
        description="مدیریت کارت‌های بخش نمایندگی قلم‌چی در صفحه اصلی"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "وب‌سایت" },
          { label: "کارت‌های نمایندگی" },
        ]}
        compact
      />

      {params.import === "ok" ? (
        <div
          role="status"
          className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-7 text-emerald-900"
        >
          دو کارت موجود درون‌ریزی شدند.
        </div>
      ) : null}
      {params.import === "already" ? (
        <div
          role="status"
          className="mb-4 rounded-xl border border-border bg-white px-4 py-3 text-sm leading-7 text-muted"
        >
          Already imported
        </div>
      ) : null}
      {params.import === "error" ? (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-7 text-red-800"
        >
          درون‌ریزی ناموفق بود.
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-3">
        <Link
          href="/admin/website/marketing-cards/new"
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white"
        >
          کارت جدید
        </Link>
        <Link
          href="/#qalamchi-section"
          className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm"
        >
          مشاهده در صفحه اصلی
        </Link>
        {cards.length === 0 ? <ImportLegacyMarketingCardsButton /> : null}
      </div>

      {cards.length === 0 ? (
        <AdminEmptyState
          title="هنوز کارتی ثبت نشده"
          description="تا وقتی کارت فعالی در پایگاه داده نباشد، صفحه اصلی همان دو کارت ثابت را نشان می‌دهد."
        />
      ) : (
        <ul className="space-y-3">
          {cards.map((card, index) => (
            <li
              key={card.id}
              className="admin-card flex flex-col gap-3 p-3 sm:flex-row sm:items-center"
            >
              <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-primary/[0.03]">
                {card.imageUrl ? (
                  <Image
                    src={card.imageUrl}
                    alt={card.imageAlt || card.title}
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="64px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[0.65rem] text-muted">
                    بدون تصویر
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium text-primary">
                  {toPersianDigits(card.title)}
                </p>
                <p className="mt-1 line-clamp-2 text-xs leading-6 text-muted">
                  {toPersianDigits(card.description) || "بدون توضیح"}
                </p>
                <p className="mt-1 text-xs text-muted">
                  ترتیب {toPersianDigits(String(card.sortOrder))} ·{" "}
                  {card.isActive ? "فعال" : "غیرفعال"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <form action={moveMarketingCardAction}>
                  <input type="hidden" name="cardId" value={card.id} />
                  <input
                    type="hidden"
                    name="sectionKey"
                    value={HOMEPAGE_QALAMCHI_SECTION_KEY}
                  />
                  <input type="hidden" name="direction" value="up" />
                  <button
                    type="submit"
                    disabled={index === 0}
                    className="min-h-11 rounded-xl border border-border bg-white px-3 text-sm disabled:opacity-40"
                  >
                    بالا
                  </button>
                </form>
                <form action={moveMarketingCardAction}>
                  <input type="hidden" name="cardId" value={card.id} />
                  <input
                    type="hidden"
                    name="sectionKey"
                    value={HOMEPAGE_QALAMCHI_SECTION_KEY}
                  />
                  <input type="hidden" name="direction" value="down" />
                  <button
                    type="submit"
                    disabled={index === cards.length - 1}
                    className="min-h-11 rounded-xl border border-border bg-white px-3 text-sm disabled:opacity-40"
                  >
                    پایین
                  </button>
                </form>
                <form action={toggleMarketingCardActiveAction}>
                  <input type="hidden" name="cardId" value={card.id} />
                  <input
                    type="hidden"
                    name="isActive"
                    value={card.isActive ? "false" : "true"}
                  />
                  <button
                    type="submit"
                    className="min-h-11 rounded-xl border border-border bg-white px-3 text-sm"
                  >
                    {card.isActive ? "غیرفعال" : "فعال"}
                  </button>
                </form>
                <Link
                  href={`/admin/website/marketing-cards/${card.id}`}
                  className="inline-flex min-h-11 items-center rounded-xl border border-border bg-white px-3 text-sm"
                >
                  ویرایش
                </Link>
                <DeleteMarketingCardButton cardId={card.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

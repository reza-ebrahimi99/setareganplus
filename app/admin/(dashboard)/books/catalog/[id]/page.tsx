import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BookSkuForm } from "@/components/admin/books/BookSkuForm";
import { adminBreadcrumbs } from "@/content/admin";
import { getBookSkuDetail } from "@/lib/books/catalog/list-service";
import { formatRials, priceKindLabel } from "@/lib/books/catalog/price";
import { loadCatalogTaxonomyOptions } from "@/lib/books/catalog/taxonomy-options";
import { requireBookCommerceAccess } from "@/lib/books/require";
import { toPersianDigits } from "@/lib/persian";
import { formatJalaliDateShort } from "@/lib/datetime/jalali";
import { updateBookSkuAction } from "../actions";

export const metadata: Metadata = {
  title: "ویرایش کتاب",
};
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditBookSkuPage({ params }: PageProps) {
  const session = await requireBookCommerceAccess("books.catalog.manage");
  const { id } = await params;
  const [sku, taxonomy] = await Promise.all([
    getBookSkuDetail(session.organization.id, id),
    loadCatalogTaxonomyOptions(session.organization.id),
  ]);
  if (!sku) notFound();

  const now = new Date();
  const openList = sku.prices.find((p) => p.kind === "LIST" && p.effectiveTo === null);
  const openSale = sku.prices.find((p) => p.kind === "SALE" && p.effectiveTo === null);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={sku.title.title}
        description={`کد داخلی: ${sku.internalCode}`}
        breadcrumbs={[...adminBreadcrumbs.booksCatalog, { label: sku.title.title }]}
      />

      <BookSkuForm
        mode="edit"
        skuId={sku.id}
        action={updateBookSkuAction}
        bookTypes={taxonomy.bookTypes}
        grades={taxonomy.grades}
        subjects={taxonomy.subjects}
        majors={taxonomy.majors}
        publishers={taxonomy.publishers}
        defaultValues={{
          title: sku.title.title,
          description: sku.title.description ?? "",
          keywords: sku.title.keywords ?? "",
          publisherId: sku.title.publisherId ?? "",
          bookTypeId: sku.title.bookTypeId ?? "",
          gradeId: sku.title.gradeId ?? "",
          subjectId: sku.title.subjectId ?? "",
          majorId: sku.title.majorId ?? "",
          internalCode: sku.internalCode,
          barcode: sku.barcode ?? "",
          editionLabel: sku.editionLabel ?? "",
          editionYear: sku.editionYear ?? "",
          status: sku.status,
          listPriceRials: openList ? String(openList.amountRials) : "",
          salePriceRials: openSale ? String(openSale.amountRials) : "",
          tagNames: sku.tags.map((t) => t.tag.name).join("، "),
        }}
      />

      <section className="admin-card p-5 sm:p-6">
        <h2 className="text-base font-semibold text-primary sm:text-lg">تاریخچه قیمت</h2>
        <p className="mt-1 text-sm leading-7 text-muted">
          قیمت هرگز بازنویسی نمی‌شود؛ هر تغییر یک ردیف تازه با تاریخ اثر است.
        </p>
        {sku.prices.length === 0 ? (
          <p className="mt-4 text-sm text-muted">تاریخچه قیمتی ثبت نشده است.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {sku.prices.map((price) => {
              const isOpen = price.effectiveTo === null;
              const isFuture = price.effectiveFrom.getTime() > now.getTime();
              return (
                <li
                  key={price.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-primary">
                      {priceKindLabel(price.kind)} — {formatRials(price.amountRials)} ریال
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      از {formatJalaliDateShort(price.effectiveFrom)}
                      {price.effectiveTo ? ` تا ${formatJalaliDateShort(price.effectiveTo)}` : ""}
                    </p>
                  </div>
                  <span
                    className={
                      isOpen && !isFuture
                        ? "rounded-full border border-secondary/30 bg-secondary/10 px-2.5 py-1 text-xs text-primary"
                        : isFuture
                          ? "rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted"
                          : "rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted"
                    }
                  >
                    {isFuture ? "آینده" : isOpen ? "جاری" : "تاریخی"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {sku.tags.length > 0 ? (
        <section className="admin-card p-5 sm:p-6">
          <h2 className="text-base font-semibold text-primary sm:text-lg">برچسب‌ها</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {sku.tags.map((t) => (
              <span
                key={t.id}
                className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted"
              >
                {t.tag.name}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <p className="text-xs text-muted">
        شناسه پرتال: {toPersianDigits(sku.id.slice(-8))}
      </p>
    </div>
  );
}

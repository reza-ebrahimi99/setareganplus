import Image from "next/image";
import { notFound } from "next/navigation";
import { ShopCheckoutForm } from "@/components/shop/ShopCheckoutForm";
import { PublicFormShell } from "@/components/forms/PublicFormShell";
import {
  COMMERCE_BINDING_TYPE_LABELS,
  COMMERCE_FORMAT_SIZE_LABELS,
  COMMERCE_PRINT_TYPE_LABELS,
  PICKUP_ONSITE_NOTICE,
  type CommerceBindingTypeValue,
  type CommerceFormatSizeValue,
  type CommercePrintTypeValue,
} from "@/lib/commerce/booklet";
import { getPublicCommerceProductBySlug } from "@/lib/commerce/catalog/service";
import { formatJalaliDateShort } from "@/lib/datetime/jalali";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { formatRials } from "@/lib/registration/format";
import { createPageMetadata } from "@/lib/seo/create-page-metadata";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return createPageMetadata({
    path: `/shop/${slug}`,
    title: `فروشگاه | ${slug}`,
    description: "خرید جزوه فیزیکی با تحویل حضوری از مؤسسه آموزشی ستارگان",
  });
}

export default async function ShopProductPage({ params }: PageProps) {
  const { slug } = await params;
  let organization;
  try {
    organization = await getCurrentOrganization();
  } catch {
    notFound();
  }

  const product = await getPublicCommerceProductBySlug({
    organizationId: organization.id,
    slug,
  });
  if (!product) notFound();

  const { pricing } = product;
  const specs: Array<{ label: string; value: string }> = [
    { label: "مؤلف", value: product.authors || "—" },
    {
      label: "صفحات",
      value:
        product.pageCount != null
          ? toPersianDigits(String(product.pageCount))
          : "—",
    },
    {
      label: "نوع چاپ",
      value: product.printType
        ? COMMERCE_PRINT_TYPE_LABELS[
            product.printType as CommercePrintTypeValue
          ]
        : "—",
    },
    {
      label: "صحافی",
      value: product.bindingType
        ? COMMERCE_BINDING_TYPE_LABELS[
            product.bindingType as CommerceBindingTypeValue
          ]
        : "—",
    },
    {
      label: "قطع",
      value: product.formatSize
        ? COMMERCE_FORMAT_SIZE_LABELS[
            product.formatSize as CommerceFormatSizeValue
          ]
        : "—",
    },
    {
      label: "سال ویرایش",
      value:
        product.editionYear != null
          ? toPersianDigits(String(product.editionYear))
          : "—",
    },
  ];

  return (
    <PublicFormShell>
      <article className="mx-auto max-w-lg space-y-5 pb-10">
        <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_16px_48px_rgb(15_23_42_/_0.08)]">
          <div className="relative aspect-[3/4] w-full bg-gradient-to-b from-slate-100 to-slate-200">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.imageAlt ?? product.title}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 512px"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted">
                بدون تصویر جلد
              </div>
            )}
            {!product.inStock ? (
              <span className="absolute left-3 top-3 rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white">
                ناموجود
              </span>
            ) : null}
          </div>

          <div className="space-y-4 px-5 py-6">
            <div>
              <p className="text-xs text-muted">
                {[product.gradeLabel, product.subject, product.categoryTitle]
                  .filter(Boolean)
                  .join(" · ") || "جزوه آموزشی"}
              </p>
              <h1 className="mt-2 text-2xl font-bold leading-9 text-foreground">
                {product.title}
              </h1>
              {product.authors ? (
                <p className="mt-2 text-sm text-muted">مؤلف: {product.authors}</p>
              ) : null}
            </div>

            <div className="rounded-2xl bg-background px-4 py-3">
              {pricing.isOnSale ? (
                <div className="flex flex-wrap items-end gap-3">
                  <span className="text-sm text-muted line-through">
                    {formatRials(pricing.basePriceRials)}
                  </span>
                  <span className="text-2xl font-bold text-primary">
                    {formatRials(pricing.finalPriceRials)}
                  </span>
                  {pricing.discountPercent != null ? (
                    <span className="rounded-md bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">
                      {toPersianDigits(String(pricing.discountPercent))}٪ تخفیف
                    </span>
                  ) : null}
                </div>
              ) : (
                <p className="text-2xl font-bold text-primary">
                  {formatRials(pricing.finalPriceRials)}
                </p>
              )}
              {pricing.saleEndsAt ? (
                <p className="mt-2 text-xs text-muted">
                  پایان تخفیف: {formatJalaliDateShort(pricing.saleEndsAt)}
                </p>
              ) : null}
              <p className="mt-2 text-sm text-muted">
                موجودی:{" "}
                {product.stockQuantity == null
                  ? "نامحدود"
                  : toPersianDigits(String(product.stockQuantity))}
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-950">
              {PICKUP_ONSITE_NOTICE}
            </div>

            {product.shortDescription ? (
              <p className="text-sm leading-7 text-foreground/90">
                {product.shortDescription}
              </p>
            ) : null}

            <section>
              <h2 className="mb-2 text-sm font-bold">مشخصات</h2>
              <dl className="overflow-hidden rounded-2xl border border-border">
                {specs.map((row) => (
                  <div
                    key={row.label}
                    className="flex justify-between gap-3 border-b border-border px-3 py-2.5 text-sm last:border-b-0"
                  >
                    <dt className="text-muted">{row.label}</dt>
                    <dd className="font-medium">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {product.features.length > 0 ? (
              <section>
                <h2 className="mb-2 text-sm font-bold">سرفصل‌ها و ویژگی‌ها</h2>
                <ul className="list-disc space-y-1.5 pr-5 text-sm leading-7">
                  {product.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            {product.description ? (
              <section>
                <h2 className="mb-2 text-sm font-bold">توضیحات</h2>
                <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/90">
                  {product.description}
                </p>
              </section>
            ) : null}
          </div>
        </div>

        <ShopCheckoutForm
          itemId={product.id}
          disabled={!product.inStock}
          finalPriceLabel={formatRials(pricing.finalPriceRials)}
        />
      </article>
    </PublicFormShell>
  );
}

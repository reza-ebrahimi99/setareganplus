import Link from "next/link";
import { notFound } from "next/navigation";
import { ShopCheckoutForm } from "@/components/shop/ShopCheckoutForm";
import { StarBookCheckoutChrome } from "@/components/starbook/StarBookCheckoutChrome";
import { StarBookFrame } from "@/components/starbook/StarBookFrame";
import { StarBookGallery } from "@/components/starbook/StarBookGallery";
import { StarBookProductActions } from "@/components/starbook/StarBookProductActions";
import { StarBookReviews } from "@/components/starbook/StarBookReviews";
import { StarBookRail } from "@/components/starbook/StarBookRail";
import { StarBookReveal } from "@/components/starbook/StarBookMotion";
import { StarBookStickyBuy } from "@/components/starbook/StarBookStickyBuy";
import {
  COMMERCE_BINDING_TYPE_LABELS,
  COMMERCE_FORMAT_SIZE_LABELS,
  COMMERCE_PRINT_TYPE_LABELS,
  PICKUP_ONSITE_NOTICE,
  type CommerceBindingTypeValue,
  type CommerceFormatSizeValue,
  type CommercePrintTypeValue,
} from "@/lib/commerce/booklet";
import {
  getPublicCommerceProductBySlug,
  listPublicCommerceProducts,
} from "@/lib/commerce/catalog/service";
import { relatedStarBookProducts } from "@/lib/commerce/starbook/merchandising";
import { listCommerceBranchesForOps } from "@/lib/commerce/orders/service";
import { formatJalaliDateShort } from "@/lib/datetime/jalali";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { formatRials } from "@/lib/registration/format";
import { createPageMetadata } from "@/lib/seo/create-page-metadata";
import { toPersianDigits } from "@/lib/persian";
import { starBookHref } from "@/lib/starbook/paths";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return createPageMetadata({
    path: starBookHref(`/book/${slug}`),
    title: `استاربوک | ${slug}`,
    description: "خرید کتاب و جزوه آموزشی ستارگان پلاس با تحویل حضوری",
  });
}

export default async function StarBookProductPage({ params }: PageProps) {
  const { slug } = await params;
  let organization;
  try {
    organization = await getCurrentOrganization();
  } catch {
    notFound();
  }

  const [product, branches, catalog] = await Promise.all([
    getPublicCommerceProductBySlug({
      organizationId: organization.id,
      slug,
    }),
    listCommerceBranchesForOps({ organizationId: organization.id }),
    listPublicCommerceProducts({ organizationId: organization.id, limit: 40 }),
  ]);
  if (!product) notFound();

  const related = relatedStarBookProducts(product, catalog);
  const together = related.slice(0, 3);
  const { pricing } = product;
  const audience =
    [product.gradeLabel, product.subject].filter(Boolean).join(" · ") || "دانش‌آموز ستارگان";
  const examHint = product.pricing.isOnSale
    ? "مناسب موج حراج و شب امتحان"
    : product.subject
      ? `مرتبط با مسیر ${product.subject}`
      : "مرتبط با مسیر تحصیلی تو";

  const specs: Array<{ label: string; value: string }> = [
    { label: "مؤلف", value: product.authors || "ستارگان پلاس" },
    {
      label: "صفحات",
      value: product.pageCount != null ? toPersianDigits(product.pageCount) : "—",
    },
    {
      label: "چاپ",
      value: product.printType
        ? COMMERCE_PRINT_TYPE_LABELS[product.printType as CommercePrintTypeValue]
        : "—",
    },
    {
      label: "صحافی",
      value: product.bindingType
        ? COMMERCE_BINDING_TYPE_LABELS[product.bindingType as CommerceBindingTypeValue]
        : "—",
    },
    {
      label: "قطع",
      value: product.formatSize
        ? COMMERCE_FORMAT_SIZE_LABELS[product.formatSize as CommerceFormatSizeValue]
        : "—",
    },
  ];

  return (
    <StarBookFrame
      activePath={starBookHref("/browse")}
      products={catalog}
      grades={[]}
      subjects={[]}
    >
      <article className="starbook-section grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <StarBookReveal>
          <StarBookGallery
            imageUrl={product.imageUrl}
            imageAlt={product.imageAlt ?? product.title}
            title={product.title}
            pageCount={product.pageCount}
          />
        </StarBookReveal>
        <StarBookReveal delay={0.08}>
          <div className="starbook-panel starbook-glass space-y-4">
            <p className="starbook-kicker">
              {[product.gradeLabel, product.subject, product.categoryTitle]
                .filter(Boolean)
                .join(" · ") || "کتاب آموزشی"}
            </p>
            <h1 className="text-3xl font-black leading-tight sm:text-4xl">{product.title}</h1>
            <p className="text-[var(--sb-muted)]">مؤلف: {product.authors || "ستارگان پلاس"}</p>
            <div className="starbook-price text-3xl">
              {formatRials(pricing.finalPriceRials)}
              {pricing.isOnSale ? <s>{formatRials(pricing.basePriceRials)}</s> : null}
            </div>
            {pricing.saleEndsAt ? (
              <p className="text-sm text-[var(--sb-amber)]">
                پایان فلش: {formatJalaliDateShort(pricing.saleEndsAt)}
              </p>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-2xl bg-[rgb(61_123_255/0.12)] px-4 py-3 text-sm">
                <p className="text-[var(--sb-muted)]">مخاطب هدف</p>
                <p className="mt-1 font-bold">{audience}</p>
              </div>
              <div className="rounded-2xl bg-[rgb(255_77_184/0.12)] px-4 py-3 text-sm">
                <p className="text-[var(--sb-muted)]">ارتباط با امتحان</p>
                <p className="mt-1 font-bold">{examHint}</p>
              </div>
            </div>
            <p className="text-sm text-[var(--sb-muted)]">
              موجودی شعبه:{" "}
              {product.stockQuantity == null
                ? "آماده تحویل"
                : `${toPersianDigits(product.stockQuantity)} نسخه`}
            </p>
            <p className="rounded-2xl bg-[rgb(255_200_87/0.12)] px-4 py-3 text-sm leading-7">
              {PICKUP_ONSITE_NOTICE}
            </p>
            <p className="text-sm leading-8 text-[var(--sb-muted)]">
              زمان آماده‌سازی معمول: ۱ تا ۲ روز کاری بعد از پرداخت. تحویل فقط حضوری.
            </p>
            <StarBookProductActions product={product} />
            <StarBookStickyBuy product={product} />
          </div>
        </StarBookReveal>
      </article>

      <StarBookReveal>
        <section className="starbook-section grid gap-4 lg:grid-cols-2">
          <div className="starbook-panel starbook-glass">
            <h2 className="mb-3 text-xl font-black">داستان این کتاب</h2>
            <p className="whitespace-pre-wrap text-sm leading-8 text-[var(--sb-muted)]">
              {product.description ||
                product.shortDescription ||
                "این منبع برای مسیر تحصیلی ستارگان انتخاب شده است."}
            </p>
            {product.features.length > 0 ? (
              <ul className="mt-4 space-y-2 text-sm">
                {product.features.map((feature) => (
                  <li key={feature}>✦ {feature}</li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="starbook-panel starbook-glass">
            <h2 className="mb-3 text-xl font-black">مسیر مطالعه</h2>
            <ol className="space-y-3 text-sm leading-7">
              <li>
                <strong>۱ · شروع:</strong> فصل‌های پایه را در هفته اول مرور کن.
              </li>
              <li>
                <strong>۲ · تمرین:</strong> هر دو روز یک مجموعه تست کوتاه.
              </li>
              <li>
                <strong>۳ · جمع‌بندی:</strong> شب امتحان فقط نکات هایلایت‌شده.
              </li>
            </ol>
            <div className="mt-5 space-y-3 text-sm leading-7">
              <p>
                <strong>پیشنهاد دبیر:</strong> برای کلاس و تکلیف هفتگی همین جلد کافی است.
              </p>
              <p>
                <strong>پیشنهاد مشاور:</strong> اگر هدفت جمع‌بندی است، این کتاب را با یک آزمون هم‌پایه
                جفت کن.
              </p>
            </div>
            <dl className="mt-5 space-y-2 text-sm">
              {specs.map((row) => (
                <div
                  key={row.label}
                  className="flex justify-between gap-4 border-b border-[var(--sb-line)] py-2"
                >
                  <dt className="text-[var(--sb-muted)]">{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </StarBookReveal>

      {together.length > 0 ? (
        <StarBookReveal>
          <section className="starbook-section">
            <div className="starbook-panel starbook-glass">
              <h2 className="text-xl font-black">معمولاً با هم می‌خرند</h2>
              <p className="mt-2 text-sm text-[var(--sb-muted)]">
                سبد را کامل‌تر کن؛ پرداخت هر کتاب جدا و سریع است.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {together.map((item) => (
                  <Link
                    key={item.id}
                    href={starBookHref(`/book/${item.slug}`)}
                    className="starbook-chip"
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </StarBookReveal>
      ) : null}

      <StarBookReveal>
        <section className="starbook-section">
          <StarBookReviews skuId={product.id} title={product.title} />
        </section>
      </StarBookReveal>

      <StarBookRail title="کتاب‌های نزدیک به سلیقه تو" products={related} />

      <section className="starbook-section" id="checkout">
        <StarBookCheckoutChrome>
          <ShopCheckoutForm
            itemId={product.id}
            disabled={!product.inStock}
            finalPriceLabel={formatRials(pricing.finalPriceRials)}
            branches={branches.map((branch) => ({
              id: branch.id,
              name: branch.shortName || branch.name,
              address: branch.address,
            }))}
          />
        </StarBookCheckoutChrome>
      </section>
    </StarBookFrame>
  );
}

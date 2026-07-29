import Link from "next/link";
import type { PublicCommerceProduct } from "@/lib/commerce/catalog/service";
import { formatRials } from "@/lib/registration/format";
import { toPersianDigits } from "@/lib/persian";
import { ShopProductCover } from "./ShopProductCover";

type ShopProductCardProps = {
  product: PublicCommerceProduct;
  priority?: boolean;
};

export function ShopProductCard({
  product,
  priority = false,
}: ShopProductCardProps) {
  const meta = [product.subject, product.gradeLabel].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/shop/${product.slug}`}
      className="group block overflow-hidden rounded-3xl border border-border/70 bg-surface shadow-[0_16px_48px_rgb(15_23_42_/_0.08)] transition-transform hover:-translate-y-1 hover:shadow-[0_24px_60px_rgb(15_23_42_/_0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-background">
        <ShopProductCover
          imageUrl={product.imageUrl}
          imageAlt={product.imageAlt ?? product.title}
          priority={priority}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
        />
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          {product.pricing.discountPercent != null ? (
            <span className="rounded-full bg-rose-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
              {toPersianDigits(String(product.pricing.discountPercent))}٪ تخفیف
            </span>
          ) : (
            <span />
          )}
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium shadow-sm ${
              product.inStock
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {product.inStock ? "موجود" : "ناموجود"}
          </span>
        </div>
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        <div className="space-y-1.5">
          <p className="text-xs text-muted">{meta || "محصول آموزشی ستارگان"}</p>
          <h3 className="line-clamp-2 text-base font-bold leading-7 text-primary transition-colors group-hover:text-primary/85">
            {product.title}
          </h3>
          <p className="text-sm text-muted">
            مؤلف: {product.authors || "ستارگان پلاس"}
          </p>
        </div>

        <div className="rounded-2xl bg-background/80 px-3 py-3">
          {product.pricing.isOnSale ? (
            <div className="flex flex-wrap items-end gap-2.5">
              <span className="text-xs text-muted line-through sm:text-sm">
                {formatRials(product.pricing.basePriceRials)}
              </span>
              <span className="text-lg font-bold text-primary sm:text-xl">
                {formatRials(product.pricing.finalPriceRials)}
              </span>
            </div>
          ) : (
            <span className="text-lg font-bold text-primary sm:text-xl">
              {formatRials(product.pricing.finalPriceRials)}
            </span>
          )}
        </div>

        <span className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors group-hover:bg-primary/92">
          مشاهده و خرید
        </span>
      </div>
    </Link>
  );
}

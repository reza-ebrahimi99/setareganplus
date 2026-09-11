"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import type { PublicCommerceProduct } from "@/lib/commerce/catalog/service";
import { ShopProductCover } from "@/components/shop/ShopProductCover";
import { awardStarBookPlay, bumpStarBookMission } from "@/lib/commerce/starbook/play-store";
import {
  addStarBookCartLine,
  readStarBookRating,
  readStarBookWishlist,
  toggleStarBookWishlist,
} from "@/lib/commerce/starbook/store";
import { formatRials } from "@/lib/registration/format";
import { toPersianDigits } from "@/lib/persian";

type StarBookCardProps = {
  product: PublicCommerceProduct;
  tone?: "default" | "sale" | "hero";
  priority?: boolean;
};

const FORTNIGHT = 14 * 24 * 60 * 60 * 1000;

export function StarBookCard({
  product,
  tone = "default",
  priority = false,
}: StarBookCardProps) {
  const reduce = useReducedMotion();
  const meta = [product.gradeLabel, product.subject].filter(Boolean).join(" · ");
  const isNew = Date.now() - product.updatedAt.getTime() < FORTNIGHT;
  const [wished, setWished] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setWished(readStarBookWishlist().includes(product.id));
    setRating(readStarBookRating(product.id)?.score ?? null);
  }, [product.id]);

  return (
    <motion.div
      whileHover={reduce ? undefined : { y: -10, rotate: tone === "sale" ? 0.7 : -0.55 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className="starbook-card-wrap"
    >
      <article className="starbook-card starbook-card-collectible" data-tone={tone}>
        <Link href={`/book/${product.slug}`} className="block">
          <div className="starbook-cover">
            <ShopProductCover
              imageUrl={product.imageUrl}
              imageAlt={product.imageAlt ?? product.title}
              priority={priority}
              sizes="(max-width: 640px) 50vw, 240px"
            />
            <div className="starbook-card-badges">
              {product.pricing.discountPercent != null ? (
                <span className="starbook-pill starbook-pill-sale">
                  {toPersianDigits(product.pricing.discountPercent)}٪
                </span>
              ) : null}
              {product.isFeatured ? (
                <span className="starbook-pill starbook-pill-feat">ویژه</span>
              ) : null}
              {isNew ? <span className="starbook-pill starbook-pill-live">تازه</span> : null}
              {product.isFeatured && product.pricing.isOnSale ? (
                <span className="starbook-pill starbook-pill-gift">هدیه</span>
              ) : null}
            </div>
            {!product.inStock ? (
              <span className="starbook-pill starbook-pill-sale" style={{ bottom: "0.65rem", top: "auto" }}>
                ناموجود
              </span>
            ) : null}
          </div>
          <div className="starbook-card-body">
            <p className="starbook-meta">{meta || "کتاب آموزشی"}</p>
            <h3 className="line-clamp-2">{product.title}</h3>
            {product.isFeatured ? (
              <p className="starbook-card-quote">پیشنهاد دبیر: همین جلد برای کلاس کافی است.</p>
            ) : null}
            <p className="starbook-price">
              {formatRials(product.pricing.finalPriceRials)}
              {product.pricing.isOnSale ? <s>{formatRials(product.pricing.basePriceRials)}</s> : null}
            </p>
            <div className="mt-1 flex items-center justify-between gap-2 text-xs">
              {rating ? (
                <span className="text-[var(--sb-amber)]">★ {toPersianDigits(rating)}</span>
              ) : (
                <span className="text-[var(--sb-muted)]">بدون امتیاز تو</span>
              )}
              <span className="text-[var(--sb-muted)]">
                {product.inStock ? "موجود شعبه" : "ناموجود"}
              </span>
            </div>
          </div>
        </Link>
        <div className="starbook-card-actions">
          <Link href={`/book/${product.slug}`} className="starbook-mini" aria-label="پیش‌نمایش">
            ◉
          </Link>
          <button
            type="button"
            className="starbook-mini"
            aria-label="علاقه‌مندی"
            onClick={() => {
              const next = toggleStarBookWishlist(product.id);
              setWished(next.includes(product.id));
              if (next.includes(product.id)) {
                awardStarBookPlay({ xp: 8, stars: 2, badge: "firstWish", subject: product.subject });
                bumpStarBookMission();
              }
            }}
          >
            {wished ? "♥" : "♡"}
          </button>
          <button
            type="button"
            className="starbook-mini"
            aria-label="افزودن سریع"
            onClick={() => {
              addStarBookCartLine({
                id: product.id,
                slug: product.slug,
                title: product.title,
                imageUrl: product.imageUrl,
                priceRials: product.pricing.finalPriceRials,
              });
              awardStarBookPlay({ xp: 12, stars: 3, badge: "firstCart" });
              setAdded(true);
            }}
          >
            {added ? "✓" : "+"}
          </button>
        </div>
      </article>
    </motion.div>
  );
}

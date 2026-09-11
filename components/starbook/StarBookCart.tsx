"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { StarBookEmpty } from "@/components/starbook/StarBookEmpty";
import { StarBookRail } from "@/components/starbook/StarBookRail";
import type { PublicCommerceProduct } from "@/lib/commerce/catalog/service";
import { recommendStarBookProducts } from "@/lib/commerce/starbook/shelves";
import {
  readStarBookCart,
  setStarBookCartQuantity,
  type StarBookCartLine,
} from "@/lib/commerce/starbook/store";
import { formatRials } from "@/lib/registration/format";
import { toPersianDigits } from "@/lib/persian";

export function StarBookCart({
  catalog = [],
}: {
  catalog?: readonly PublicCommerceProduct[];
}) {
  const [lines, setLines] = useState<StarBookCartLine[]>([]);
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    setLines(readStarBookCart());
  }, []);

  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + line.priceRials * line.quantity, 0),
    [lines],
  );
  const discount = applied ? Math.round(subtotal * 0.07) : 0;
  const recommendations = recommendStarBookProducts(
    lines.map((line) => line.id),
    catalog,
    6,
  );

  if (lines.length === 0) {
    return (
      <StarBookEmpty
        title="سبدت هنوز خالی است"
        body="یک کتاب را به سبد بزن؛ بعد از همین‌جا سریع تسویه می‌کنی."
      />
    );
  }

  return (
    <div className="starbook-section grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
      <div className="space-y-3">
        {lines.map((line) => (
          <article key={line.id} className="starbook-panel flex items-center justify-between gap-3">
            <div>
              <Link href={`/book/${line.slug}`} className="font-black">
            {line.title}
          </Link>
              <p className="mt-1 text-sm text-[var(--sb-muted)]">
                {formatRials(line.priceRials)}
              </p>
            </div>
            <div className="starbook-qty">
              <button
                type="button"
                onClick={() => {
                  setStarBookCartQuantity(line.id, line.quantity - 1);
                  setLines(readStarBookCart());
                }}
              >
                −
              </button>
              <span>{toPersianDigits(line.quantity)}</span>
              <button
                type="button"
                onClick={() => {
                  setStarBookCartQuantity(line.id, line.quantity + 1);
                  setLines(readStarBookCart());
                }}
              >
                +
              </button>
            </div>
          </article>
        ))}
      </div>
      <aside className="starbook-panel h-fit space-y-3">
        <h2 className="text-xl font-black">جمع سبد</h2>
        <p>جمع: {formatRials(subtotal)}</p>
        {applied ? <p className="text-[var(--sb-lime)]">کد STAR7 · {formatRials(discount)} تخفیف نمایشی</p> : null}
        <p className="font-black">قابل پرداخت هر کتاب جداگانه است</p>
        <div className="flex gap-2">
          <input
            value={coupon}
            onChange={(event) => setCoupon(event.target.value)}
            placeholder="کد تخفیف"
            className="starbook-input"
          />
          <button
            type="button"
            className="starbook-btn starbook-btn-ghost"
            onClick={() => setApplied(coupon.trim().toUpperCase() === "STAR7")}
          >
            ثبت
          </button>
        </div>
        <Link href={`/book/${lines[0]!.slug}#checkout`} className="starbook-btn starbook-btn-primary w-full">
          تسویه کتاب اول
        </Link>
        <p className="text-xs leading-6 text-[var(--sb-muted)]">
          پرداخت فعلی استاربوک تک‌کتاب است تا درگاه و موجودی شعبه دقیق بماند.
        </p>
      </aside>
      {recommendations.length > 0 ? (
        <div className="lg:col-span-2">
          <StarBookRail
            title="معمولاً کنار همین سبد"
            subtitle="پیشنهاد از همان کاتالوگ BookSku"
            products={recommendations}
          />
        </div>
      ) : null}
    </div>
  );
}

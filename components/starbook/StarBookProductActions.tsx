"use client";

import { useEffect, useState } from "react";
import type { PublicCommerceProduct } from "@/lib/commerce/catalog/service";
import { awardStarBookPlay, bumpStarBookMission } from "@/lib/commerce/starbook/play-store";
import {
  addStarBookCartLine,
  pushStarBookRecent,
  readStarBookWishlist,
  toggleStarBookWishlist,
} from "@/lib/commerce/starbook/store";

type StarBookProductActionsProps = {
  product: Pick<
    PublicCommerceProduct,
    "id" | "slug" | "title" | "imageUrl" | "pricing"
  >;
};

export function StarBookProductActions({ product }: StarBookProductActionsProps) {
  const [wished, setWished] = useState(false);
  const [copied, setCopied] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    pushStarBookRecent(product.id);
    setWished(readStarBookWishlist().includes(product.id));
  }, [product.id]);

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <button
        type="button"
        className="starbook-btn starbook-btn-primary"
        onClick={() => {
          addStarBookCartLine({
            id: product.id,
            slug: product.slug,
            title: product.title,
            imageUrl: product.imageUrl,
            priceRials: product.pricing.finalPriceRials,
          });
          setAdded(true);
          awardStarBookPlay({ xp: 12, stars: 3, badge: "firstCart" });
        }}
      >
        {added ? "به سبد اضافه شد ✓" : "افزودن به سبد"}
      </button>
      <button
        type="button"
        className="starbook-btn starbook-btn-ghost"
        onClick={() => {
          const next = toggleStarBookWishlist(product.id);
          setWished(next.includes(product.id));
          if (next.includes(product.id)) {
            awardStarBookPlay({ xp: 8, stars: 2, badge: "firstWish" });
            bumpStarBookMission();
          }
        }}
      >
        {wished ? "در علاقه‌مندی‌ها" : "علاقه‌مندی"}
      </button>
      <button
        type="button"
        className="starbook-btn starbook-btn-ghost"
        onClick={async () => {
          const url = `${window.location.origin}/book/${product.slug}`;
          await navigator.clipboard?.writeText(url);
          setCopied(true);
        }}
      >
        {copied ? "لینک کپی شد" : "اشتراک"}
      </button>
    </div>
  );
}

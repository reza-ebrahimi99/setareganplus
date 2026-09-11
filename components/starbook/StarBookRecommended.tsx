"use client";

import { useEffect, useMemo, useState } from "react";
import type { PublicCommerceProduct } from "@/lib/commerce/catalog/service";
import { recommendStarBookProducts } from "@/lib/commerce/starbook/shelves";
import { readStarBookRecent } from "@/lib/commerce/starbook/store";
import { StarBookRail } from "@/components/starbook/StarBookRail";

export function StarBookRecommended({
  catalog,
}: {
  catalog: readonly PublicCommerceProduct[];
}) {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    setIds(readStarBookRecent());
  }, []);
  const products = useMemo(
    () => recommendStarBookProducts(ids, catalog),
    [catalog, ids],
  );
  if (products.length === 0) return null;
  return (
    <StarBookRail
      title="برای تو"
      subtitle="از روی کتاب‌هایی که دیدی و درس‌هایی که دنبال کردی."
      href="/shop/browse?sort=featured"
      products={products}
      tone="hero"
    />
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import type { PublicCommerceProduct } from "@/lib/commerce/catalog/service";
import { StarBookRail } from "@/components/starbook/StarBookRail";
import { readStarBookRecent } from "@/lib/commerce/starbook/store";

export function StarBookRecentlyViewed({
  catalog,
}: {
  catalog: readonly PublicCommerceProduct[];
}) {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    setIds(readStarBookRecent());
  }, []);
  const products = useMemo(
    () => ids.map((id) => catalog.find((item) => item.id === id)).filter(Boolean) as PublicCommerceProduct[],
    [catalog, ids],
  );
  if (products.length === 0) return null;
  return (
    <StarBookRail
      title="همین الان دیدی"
      subtitle="ادامه بده؛ ذهن‌ات هنوز گرم است."
      products={products}
      tone="hero"
    />
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import type { PublicCommerceProduct } from "@/lib/commerce/catalog/service";
import { StarBookCard } from "@/components/starbook/StarBookCard";
import { StarBookEmpty } from "@/components/starbook/StarBookEmpty";
import { readStarBookWishlist } from "@/lib/commerce/starbook/store";

export function StarBookWishlist({
  catalog,
}: {
  catalog: readonly PublicCommerceProduct[];
}) {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    setIds(readStarBookWishlist());
  }, []);
  const products = useMemo(
    () => ids.map((id) => catalog.find((item) => item.id === id)).filter(Boolean) as PublicCommerceProduct[],
    [catalog, ids],
  );

  if (products.length === 0) {
    return (
      <StarBookEmpty title="لیست علاقه‌مندی خالی است" body="روی هر کتاب، قلب را بزن." href="/" />
    );
  }

  return (
    <section className="starbook-section starbook-grid">
      {products.map((product) => (
        <StarBookCard key={product.id} product={product} tone="hero" />
      ))}
    </section>
  );
}

"use client";

import type { PublicCommerceProduct } from "@/lib/commerce/catalog/service";
import { StarBookCard } from "@/components/starbook/StarBookCard";
import { StarBookReveal } from "@/components/starbook/StarBookMotion";
import Link from "next/link";

type StarBookRailProps = {
  title: string;
  subtitle?: string;
  href?: string;
  products: readonly PublicCommerceProduct[];
  tone?: "default" | "sale" | "hero";
};

export function StarBookRail({
  title,
  subtitle,
  href,
  products,
  tone = "default",
}: StarBookRailProps) {
  if (products.length === 0) return null;

  return (
    <StarBookReveal>
      <section className="starbook-section">
        <div className="starbook-section-head">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {href ? (
            <Link href={href} className="starbook-chip">
              همه →
            </Link>
          ) : null}
        </div>
        <div className="starbook-rail">
          {products.map((product, index) => (
            <StarBookCard
              key={product.id}
              product={product}
              tone={tone}
              priority={index < 2}
            />
          ))}
        </div>
      </section>
    </StarBookReveal>
  );
}

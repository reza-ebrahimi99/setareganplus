"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { PublicCommerceProduct } from "@/lib/commerce/catalog/service";
import { formatRials } from "@/lib/registration/format";

export function StarBookStickyBuy({ product }: { product: PublicCommerceProduct }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className="starbook-sticky-buy starbook-panel starbook-glass mt-4 flex flex-wrap items-center justify-between gap-3"
      initial={reduce ? false : { y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
    >
      <div>
        <p className="text-xs text-[var(--sb-muted)]">همین حالا بردار</p>
        <p className="font-black">{formatRials(product.pricing.finalPriceRials)}</p>
      </div>
      <Link href="#checkout" className="starbook-btn starbook-btn-primary starbook-btn-breathe">
        خرید همین حالا
      </Link>
    </motion.div>
  );
}

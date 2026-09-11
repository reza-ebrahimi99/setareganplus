"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { listenStarBookStore, readStarBookCart } from "@/lib/commerce/starbook/store";
import { toPersianDigits } from "@/lib/persian";

export function StarBookFloatCart() {
  const reduce = useReducedMotion();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const sync = () =>
      setCount(readStarBookCart().reduce((sum, line) => sum + line.quantity, 0));
    sync();
    return listenStarBookStore(sync);
  }, []);

  if (count === 0) return null;

  return (
    <motion.div
      initial={reduce ? false : { y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <Link href="/cart" className="starbook-float-cart">
        سبد زنده
        <span className="starbook-badge relative top-0 left-0">
          {toPersianDigits(count)}
        </span>
      </Link>
    </motion.div>
  );
}

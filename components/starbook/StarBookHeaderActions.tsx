"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  listenStarBookStore,
  readStarBookCart,
  readStarBookWishlist,
} from "@/lib/commerce/starbook/store";
import { toPersianDigits } from "@/lib/persian";

export function StarBookHeaderActions({ onSearch }: { onSearch?: () => void }) {
  const [cart, setCart] = useState(0);
  const [wish, setWish] = useState(0);

  useEffect(() => {
    const sync = () => {
      setCart(readStarBookCart().reduce((sum, line) => sum + line.quantity, 0));
      setWish(readStarBookWishlist().length);
    };
    sync();
    return listenStarBookStore(sync);
  }, []);

  return (
    <div className="starbook-actions">
      <button type="button" className="starbook-icon-btn" aria-label="جستجو" onClick={onSearch}>
        ⌕
      </button>
      <Link href="/shop/wishlist" className="starbook-icon-btn" aria-label="علاقه‌مندی">
        ♥
        {wish > 0 ? <span className="starbook-badge">{toPersianDigits(wish)}</span> : null}
      </Link>
      <Link href="/shop/cart" className="starbook-icon-btn" aria-label="سبد خرید">
        ◫
        {cart > 0 ? <span className="starbook-badge">{toPersianDigits(cart)}</span> : null}
      </Link>
    </div>
  );
}

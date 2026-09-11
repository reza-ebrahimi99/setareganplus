"use client";

import { useEffect, useState } from "react";
import { readStarBookPoints, readStarBookWishlist } from "@/lib/commerce/starbook/store";
import { toPersianDigits } from "@/lib/persian";

export function StarBookAccountPanel() {
  const [points, setPoints] = useState(120);
  const [wishes, setWishes] = useState(0);

  useEffect(() => {
    setPoints(readStarBookPoints());
    setWishes(readStarBookWishlist().length);
  }, []);

  return (
    <section className="starbook-section grid gap-3 sm:grid-cols-3">
      <article className="starbook-panel">
        <p className="text-sm text-[var(--sb-muted)]">ستاره‌های وفاداری</p>
        <p className="mt-2 text-3xl font-black">{toPersianDigits(points)}</p>
      </article>
      <article className="starbook-panel">
        <p className="text-sm text-[var(--sb-muted)]">علاقه‌مندی</p>
        <p className="mt-2 text-3xl font-black">{toPersianDigits(wishes)}</p>
      </article>
      <article className="starbook-panel">
        <p className="text-sm text-[var(--sb-muted)]">آدرس تحویل</p>
        <p className="mt-2 text-sm leading-7">شعبه انتخابی هنگام خرید · تحویل فقط حضوری</p>
      </article>
    </section>
  );
}

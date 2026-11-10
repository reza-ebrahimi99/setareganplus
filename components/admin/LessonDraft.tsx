"use client";

import { useRef } from "react";
import { parseAparatHash } from "@/lib/classes/catalog";

/** Link, order, and premium flag for the add-lesson form. Pasting a video link keeps premium on and puts the lesson first. */
export function LessonDraft({ defaultOrder, firstPremiumOrder }: { defaultOrder: number; firstPremiumOrder: number }) {
  const orderTouched = useRef(false);
  return (
    <>
      <label className="block">
        <span className="label">لینک یا شناسهٔ ویدیو</span>
        <input
          name="link"
          dir="ltr"
          required
          className="input"
          placeholder="https://www.aparat.com/v/…"
          onChange={(e) => {
            if (!parseAparatHash(e.target.value)) return;
            const box = e.currentTarget.form?.elements.namedItem("isPremium");
            if (box instanceof HTMLInputElement) box.checked = true;
            const order = e.currentTarget.form?.elements.namedItem("sortOrder");
            if (!orderTouched.current && order instanceof HTMLInputElement) order.value = String(firstPremiumOrder);
          }}
        />
        <span className="mt-1 block text-xs text-muted">همان لینک اشتراک‌گذاری. برای دانش‌آموز نمایش داده نمی‌شود.</span>
      </label>
      <label className="block">
        <span className="label">ترتیب</span>
        <input name="sortOrder" type="number" defaultValue={defaultOrder} className="input" onChange={() => { orderTouched.current = true; }} />
      </label>
      <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold">
        <input type="checkbox" name="isPremium" defaultChecked className="size-4 accent-navy" />
        پریمیوم
      </label>
    </>
  );
}

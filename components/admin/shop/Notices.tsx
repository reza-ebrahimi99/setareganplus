"use client";
import { useEffect, useRef } from "react";
import { NOTICE_CLS, type Notice } from "@/lib/shop/stage-notice";

/** Result banners. Scrolled into view, so on a phone the message is seen even if the button was far down the list. */
export function Notices({ items, stamp }: { items: Notice[]; stamp?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (items.length) ref.current?.scrollIntoView({ block: "center" });
  }, [items.length, stamp]);
  if (!items.length) return null;
  return (
    <div ref={ref} className="mb-4 space-y-2 scroll-mt-20">
      {items.map((n, i) => (
        <div key={i} role={n.tone === "err" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm font-semibold ${NOTICE_CLS[n.tone]}`}>{n.text}</div>
      ))}
    </div>
  );
}

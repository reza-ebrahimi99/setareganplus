"use client";
import { useState } from "react";
import { BALE_BRAND, baleShareUrl } from "@/lib/bale";

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const u = encodeURIComponent(url), t = encodeURIComponent(title);
  const links: { label: string; href: string; cls: string; brand?: boolean }[] = [
    { label: "تلگرام", href: `https://t.me/share/url?url=${u}&text=${t}`, cls: "bg-[#229ED9] text-navy" },
    { label: "بله", href: baleShareUrl(url, title), cls: "text-white", brand: true },
    { label: "ایتا", href: `https://eitaa.com/share/url?url=${u}&text=${t}`, cls: "bg-[#EE7F22] text-navy" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-bold text-navy">اشتراک‌گذاری:</span>
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noopener nofollow"
          className={`rounded-full px-4 py-2 text-xs font-bold ${l.cls} hover:opacity-90`}
          style={l.brand ? { backgroundColor: BALE_BRAND } : undefined}
        >
          {l.label}
        </a>
      ))}
      <button
        type="button"
        onClick={async () => {
          try {
            if (typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches) await navigator.share({ title, url });
            else {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }
          } catch {}
        }}
        className="rounded-full border border-line bg-paper px-4 py-2 text-xs font-bold text-navy hover:border-navy/30"
      >
        {copied ? "کپی شد ✓" : "کپی پیوند"}
      </button>
    </div>
  );
}

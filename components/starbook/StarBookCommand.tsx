"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PublicCommerceProduct } from "@/lib/commerce/catalog/service";
import { awardStarBookPlay } from "@/lib/commerce/starbook/play-store";
import { pushStarBookSearch, readStarBookSearches } from "@/lib/commerce/starbook/store";
import { STARBOOK_CAMPAIGNS } from "@/lib/commerce/starbook/campaigns";

type Props = {
  products?: readonly Pick<
    PublicCommerceProduct,
    "id" | "slug" | "title" | "gradeLabel" | "subject"
  >[];
  grades?: readonly string[];
  subjects?: readonly string[];
  open: boolean;
  onClose: () => void;
};

export function StarBookCommand({
  products = [],
  grades = [],
  subjects = [],
  open,
  onClose,
}: Props) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setRecent(readStarBookSearches());
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const suggestions = (() => {
    const needle = q.trim();
    if (needle.length < 1) return [];
    return products
      .filter((item) =>
        `${item.title} ${item.subject ?? ""} ${item.gradeLabel ?? ""}`.includes(needle),
      )
      .slice(0, 6);
  })();

  function go(query: string) {
    pushStarBookSearch(query);
    awardStarBookPlay({ xp: 3 });
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    router.push(`/shop/browse?${params.toString()}`);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="starbook-command" role="dialog" aria-modal="true" aria-label="جستجوی استاربوک">
      <button type="button" className="starbook-command-scrim" aria-label="بستن" onClick={onClose} />
      <div className="starbook-command-panel starbook-panel starbook-glass space-y-3">
        <input
          autoFocus
          value={q}
          onChange={(event) => setQ(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") go(q);
          }}
          className="starbook-input"
          placeholder="کتاب، درس، پایه، کمپین…"
        />
        {suggestions.map((item) => (
          <Link
            key={item.id}
            href={`/shop/${item.slug}`}
            className="block rounded-xl px-2 py-2 hover:bg-[rgb(255_255_255/0.06)]"
            onClick={onClose}
          >
            {item.title}
          </Link>
        ))}
        {q.trim() === "" ? (
          <>
            {recent.length > 0 ? (
              <p className="text-[11px] text-[var(--sb-muted)]">جستجوهای اخیر</p>
            ) : null}
            {recent.map((item) => (
              <button key={item} type="button" className="block w-full text-right" onClick={() => go(item)}>
                {item}
              </button>
            ))}
            <p className="text-[11px] text-[var(--sb-muted)]">محبوب دانش‌آموزها</p>
            {["ریاضی", "کنکور", "دهم", "فیزیک"].map((item) => (
              <button key={item} type="button" className="block w-full text-right" onClick={() => go(item)}>
                {item}
              </button>
            ))}
            <p className="text-[11px] text-[var(--sb-muted)]">کمپین‌ها</p>
            <div className="flex flex-wrap gap-2">
              {STARBOOK_CAMPAIGNS.map((campaign) => (
                <Link
                  key={campaign.slug}
                  href={campaign.href}
                  className="starbook-chip"
                  onClick={onClose}
                >
                  {campaign.title}
                </Link>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {grades.slice(0, 4).map((grade) => (
                <Link
                  key={grade}
                  href={`/shop/grade/${encodeURIComponent(grade)}`}
                  className="starbook-chip"
                  onClick={onClose}
                >
                  {grade}
                </Link>
              ))}
              {subjects.slice(0, 4).map((subject) => (
                <Link
                  key={subject}
                  href={`/shop/subject/${encodeURIComponent(subject)}`}
                  className="starbook-chip"
                  onClick={onClose}
                >
                  {subject}
                </Link>
              ))}
            </div>
          </>
        ) : null}
        <button type="button" className="starbook-btn starbook-btn-ghost w-full" onClick={onClose}>
          بستن
        </button>
      </div>
    </div>
  );
}

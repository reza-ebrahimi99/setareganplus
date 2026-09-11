"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicCommerceProduct } from "@/lib/commerce/catalog/service";
import { pushStarBookSearch, readStarBookSearches } from "@/lib/commerce/starbook/store";

type StarBookSearchProps = {
  products: readonly Pick<PublicCommerceProduct, "id" | "slug" | "title" | "gradeLabel" | "subject">[];
  grades: readonly string[];
  subjects: readonly string[];
  popular?: readonly string[];
  defaultQuery?: string;
  defaultGrade?: string;
  defaultSubject?: string;
};

export function StarBookSearch({
  products,
  grades,
  subjects,
  popular = ["ریاضی", "فیزیک", "کنکور", "دهم"],
  defaultQuery = "",
  defaultGrade = "",
  defaultSubject = "",
}: StarBookSearchProps) {
  const router = useRouter();
  const [q, setQ] = useState(defaultQuery);
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    setRecent(readStarBookSearches());
  }, []);

  const suggestions = useMemo(() => {
    const needle = q.trim();
    if (needle.length < 1) return [];
    return products
      .filter((item) => `${item.title} ${item.subject ?? ""} ${item.gradeLabel ?? ""}`.includes(needle))
      .slice(0, 6);
  }, [products, q]);

  function go(query = q, grade = defaultGrade, subject = defaultSubject) {
    pushStarBookSearch(query);
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (grade) params.set("grade", grade);
    if (subject) params.set("subject", subject);
    router.push(`/shop/browse?${params.toString()}`);
    setOpen(false);
  }

  return (
    <form
      className="starbook-search"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        go(
          String(form.get("q") ?? ""),
          String(form.get("grade") ?? ""),
          String(form.get("subject") ?? ""),
        );
      }}
    >
      <div className="relative">
        <input
          name="q"
          value={q}
          onChange={(event) => {
            setQ(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="جستجوی آنی: کتاب، درس، پایه، مؤلف…"
          className="starbook-input"
          autoComplete="off"
        />
        {open ? (
          <div className="starbook-suggest">
            {suggestions.map((item) => (
              <a key={item.id} href={`/shop/${item.slug}`}>
                {item.title}
              </a>
            ))}
            {q.trim() === "" ? (
              <>
                {recent.length > 0 ? (
                  <p className="px-3 pt-2 text-[11px] text-[var(--sb-muted)]">جستجوهای اخیر</p>
                ) : null}
                {recent.map((item) => (
                  <button key={item} type="button" onClick={() => go(item)}>
                    {item}
                  </button>
                ))}
                <p className="px-3 pt-2 text-[11px] text-[var(--sb-muted)]">محبوب دانش‌آموزها</p>
                {popular.map((item) => (
                  <button key={item} type="button" onClick={() => go(item)}>
                    {item}
                  </button>
                ))}
              </>
            ) : null}
          </div>
        ) : null}
      </div>
      <select name="grade" defaultValue={defaultGrade} className="starbook-select">
        <option value="">همه پایه‌ها</option>
        {grades.map((grade) => (
          <option key={grade} value={grade}>
            {grade}
          </option>
        ))}
      </select>
      <select name="subject" defaultValue={defaultSubject} className="starbook-select">
        <option value="">همه درس‌ها</option>
        {subjects.map((subject) => (
          <option key={subject} value={subject}>
            {subject}
          </option>
        ))}
      </select>
      <button type="submit" className="starbook-btn starbook-btn-primary">
        برو
      </button>
    </form>
  );
}

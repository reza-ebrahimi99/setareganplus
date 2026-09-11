"use client";

import { useEffect, useState } from "react";
import { awardStarBookPlay } from "@/lib/commerce/starbook/play-store";
import {
  readStarBookRating,
  writeStarBookRating,
} from "@/lib/commerce/starbook/store";
import { toPersianDigits } from "@/lib/persian";

export function StarBookReviews({ skuId, title }: { skuId: string; title: string }) {
  const [score, setScore] = useState(0);
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const current = readStarBookRating(skuId);
    if (!current) return;
    setScore(current.score);
    setText(current.text);
    setSaved(true);
  }, [skuId]);

  return (
    <section className="starbook-panel space-y-4">
      <h2 className="text-xl font-black">امتیاز تو به {title}</h2>
      <p className="text-sm text-[var(--sb-muted)]">
        ستاره‌ات روی همین دستگاه می‌ماند. نظر عمومی مؤسسه همان پیشنهاد دبیر و مشاور است.
      </p>
      <div className="starbook-stars" role="radiogroup" aria-label="امتیاز">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            aria-checked={score === value}
            onClick={() => {
              setScore(value);
              setSaved(false);
            }}
          >
            {value <= score ? "★" : "☆"}
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setSaved(false);
        }}
        rows={3}
        className="starbook-input !h-auto py-3"
        placeholder="یک جمله برای خودت بنویس؛ مثلاً «برای شب امتحان شیمی عالیه»"
      />
      <button
        type="button"
        className="starbook-btn starbook-btn-primary"
        onClick={() => {
          if (score < 1) return;
          writeStarBookRating(skuId, { score, text: text.trim() });
          awardStarBookPlay({ xp: 10, stars: 2, badge: "rater" });
          setSaved(true);
        }}
      >
        {saved ? `ثبت شد · ${toPersianDigits(score)} ستاره` : "ثبت امتیاز"}
      </button>
    </section>
  );
}

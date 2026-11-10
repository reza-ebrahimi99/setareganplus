"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fa } from "@/lib/format";
import { submitQuiz } from "@/app/(site)/classes/actions";

type Q = { id: string; html: string; image?: string | null; source?: string | null; choices: { id: string; html: string }[] };
type Review = { score: number; total: number; points: number; items: { id: string; correct: boolean; explanationHtml: string; choiceHtml: string; images?: string[] }[] };

export function QuizBox({ token, questions, heading = "آزمون این جلسه", blurb = "پنج سؤال از همین مبحث. نتیجه همان لحظه معلوم می‌شود." }: { token: string; questions: Q[]; heading?: string; blurb?: string }) {
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [review, setReview] = useState<Review | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const byId = new Map(review?.items.map((i) => [i.id, i]));

  return (
    <form
      className="cl-card space-y-5 p-5 sm:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        start(async () => {
          const res = await submitQuiz(token, picked);
          if (!res.ok) return setError(res.error);
          setReview(res.review);
          router.refresh();
        });
      }}
    >
      <div>
        <p className="cl-display text-xl">{heading}</p>
        <p className="cl-muted text-sm">{blurb}</p>
      </div>
      {questions.map((q, i) => {
        const item = byId.get(q.id);
        return (
          <fieldset key={q.id} className="space-y-2" disabled={!!review}>
            <legend className="font-extrabold leading-8" dangerouslySetInnerHTML={{ __html: `${fa(i + 1)}. ${q.html}` }} />
            {q.image && <img src={q.image} alt="" className="max-h-72 rounded-2xl border border-black/5 bg-white" />}
            {q.source && <p className="text-xs text-black/45">{q.source}</p>}
            {q.choices.map((c) => (
              <label key={c.id} className={`flex cursor-pointer items-start gap-2 rounded-2xl border px-3 py-2 text-sm ${picked[q.id] === c.id ? "border-[#2f5bea] bg-[#2f5bea]/5" : "border-transparent bg-black/5"}`}>
                <input type="radio" name={q.id} className="mt-1" checked={picked[q.id] === c.id} onChange={() => setPicked((p) => ({ ...p, [q.id]: c.id }))} />
                <span dangerouslySetInnerHTML={{ __html: c.html }} />
              </label>
            ))}
            {item && (
              <div className={`rounded-2xl px-3 py-2 text-sm leading-7 ${item.correct ? "cl-ok" : "cl-bad"}`}>
                <b>{item.correct ? "درست" : "نادرست"}.</b>
                {!item.correct && <span> پاسخ: <span dangerouslySetInnerHTML={{ __html: item.choiceHtml }} /></span>}
                {item.explanationHtml && (
                  <div className="mt-2">
                    <b>پاسخ تشریحی. </b>
                    <span dangerouslySetInnerHTML={{ __html: item.explanationHtml }} />
                  </div>
                )}
                {item.images?.map((src) => <img key={src} src={src} alt="" className="mt-2 max-h-72 rounded-xl bg-white" />)}
              </div>
            )}
          </fieldset>
        );
      })}
      {review && <p className="font-extrabold">نمرهٔ تو: {fa(review.score)} از {fa(review.total)}{review.points > 0 ? ` · ${fa(review.points)} امتیاز` : ""}</p>}
      {error && <p className="text-sm font-bold text-red-700">{error}</p>}
      {!review && <button className="btn-primary" disabled={pending || questions.some((q) => !picked[q.id])}>{pending ? "در حال بررسی…" : "ثبت پاسخ‌ها"}</button>}
      {review && <button type="button" className="btn-ghost" onClick={() => { setReview(null); setPicked({}); router.refresh(); }}>سؤال‌های تازه</button>}
    </form>
  );
}

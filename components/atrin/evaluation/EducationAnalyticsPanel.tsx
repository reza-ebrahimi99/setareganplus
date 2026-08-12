"use client";

import { useEffect, useState } from "react";
import {
  loadEvaluationAnalytics,
  type EvaluationAnalyticsSnapshot,
} from "@/lib/atrin/evaluation";

/**
 * Local-only analytics dashboard (no backend).
 */
export function EducationAnalyticsPanel() {
  const [snap, setSnap] = useState<EvaluationAnalyticsSnapshot | null>(null);

  useEffect(() => {
    setSnap(loadEvaluationAnalytics());
  }, []);

  if (!snap || !snap.updatedAt) {
    return (
      <aside
        className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-right text-xs text-white/55"
        aria-label="تحلیل آموزش محلی"
      >
        هنوز داده تحلیلی محلی ثبت نشده است.
      </aside>
    );
  }

  return (
    <aside
      className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-right"
      aria-label="داشبورد تحلیل آموزش آترین"
    >
      <h3 className="text-sm font-medium text-white">تحلیل محلی آموزش</h3>
      <section>
        <h4 className="text-[11px] text-white/45">پرسش‌شده‌ترین دروس</h4>
        <ul className="mt-1 space-y-1 text-xs text-white/75">
          {snap.mostAskedSubjects.slice(0, 5).map((s) => (
            <li key={s.subject}>
              {s.subject}: {s.count}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h4 className="text-[11px] text-white/45">پایه‌های پرتقاضا</h4>
        <ul className="mt-1 space-y-1 text-xs text-white/75">
          {snap.mostRequestedGrades.slice(0, 5).map((g) => (
            <li key={g.grade}>
              {g.grade}: {g.count}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h4 className="text-[11px] text-white/45">موضوعات محبوب</h4>
        <ul className="mt-1 space-y-1 text-xs text-white/75">
          {snap.popularTopics.slice(0, 5).map((t) => (
            <li key={t.topic}>
              {t.topic}: {t.count}
            </li>
          ))}
        </ul>
      </section>
      <p className="text-[11px] text-white/40">
        ضعیف‌ترین تشخیص: {snap.weakestDetection ?? "—"}
      </p>
      {snap.commonMistakes[0] ? (
        <p className="text-[11px] leading-5 text-amber-200/80">
          خطای رایج: {snap.commonMistakes[0]}
        </p>
      ) : null}
    </aside>
  );
}

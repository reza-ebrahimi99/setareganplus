"use client";

/**
 * Guidance Journey Engine — Step 10: AI Arrangement (student view).
 * Read-only until the counselor approves; then the student reviews and continues.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitGuidanceStep10Action } from "@/app/portal/student/services/guidance/steps/actions/step10";
import { GuidanceStepShell } from "@/components/guidance/steps/GuidanceStepShell";
import { guidanceJourneyStepPath } from "@/lib/guidance/journey/steps";
import { toPersianDigits } from "@/lib/persian";
import type { GuidanceMajorChoiceRow } from "@/lib/guidance/journey/steps/step10-ai-arrangement";
import type { GuidanceJourneySidebarStep } from "@/lib/guidance/journey/types";

type AiArrangementStepProps = {
  sidebarSteps: readonly GuidanceJourneySidebarStep[];
  completionPercentage: number;
  approved: boolean;
  choices: readonly GuidanceMajorChoiceRow[];
};

export function AiArrangementStep({
  sidebarSteps,
  completionPercentage,
  approved,
  choices,
}: AiArrangementStepProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleContinue() {
    setError(null);
    startTransition(async () => {
      const result = await submitGuidanceStep10Action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCelebrating(true);
      setTimeout(() => router.push(guidanceJourneyStepPath(11)), 1400);
    });
  }

  return (
    <GuidanceStepShell
      stepId={10}
      stepCount={12}
      title="چیدمان هوشمند انتخاب رشته"
      description="۱۵۰ گزینه چیده‌شده بر اساس اطلاعات پرونده‌ات، پس از تأیید مشاور."
      sidebarSteps={sidebarSteps}
      completionPercentage={completionPercentage}
      celebrate={celebrating}
    >
      {error && (
        <p className="gpj-banner gpj-banner--error" role="alert">
          {error}
        </p>
      )}

      {!approved ? (
        <div className="gpj-card">
          <h2 className="gpj-card__title">در انتظار بررسی مشاور</h2>
          <p className="gpj-card__desc">
            اطلاعات پرونده‌ات برای مشاور ارسال شده و پس از چیدمان و بررسی، لیست
            ۱۵۰ گزینه اینجا نمایش داده می‌شود. لطفاً بعداً دوباره سر بزن یا در
            جلسه دوم مشاوره پیگیری کن.
          </p>
        </div>
      ) : (
        <>
          <p className="gpj-banner gpj-banner--success">
            چیدمان توسط مشاور تأیید شد. لیست زیر پیشنهاد نهایی است — در جلسه دوم
            مشاوره با هم بازبینی می‌کنید.
          </p>
          <div className="gpj-card">
            <h2 className="gpj-card__title">
              {toPersianDigits(choices.length)} گزینه پیشنهادی
            </h2>
            <div style={{ maxHeight: "26rem", overflowY: "auto" }}>
              <table style={{ width: "100%", fontSize: "0.8125rem", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "right", color: "var(--color-muted, #6b7280)" }}>
                    <th style={{ padding: "0.375rem 0.5rem" }}>#</th>
                    <th style={{ padding: "0.375rem 0.5rem" }}>دانشگاه</th>
                    <th style={{ padding: "0.375rem 0.5rem" }}>رشته</th>
                    <th style={{ padding: "0.375rem 0.5rem" }}>شهر</th>
                    <th style={{ padding: "0.375rem 0.5rem" }}>نوع دوره</th>
                  </tr>
                </thead>
                <tbody>
                  {choices
                    .slice()
                    .sort((a, b) => a.rank - b.rank)
                    .map((choice) => (
                      <tr key={choice.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "0.375rem 0.5rem", fontWeight: 700 }}>
                          {toPersianDigits(choice.rank)}
                        </td>
                        <td style={{ padding: "0.375rem 0.5rem" }}>{choice.university}</td>
                        <td style={{ padding: "0.375rem 0.5rem" }}>{choice.major}</td>
                        <td style={{ padding: "0.375rem 0.5rem" }}>{choice.city}</td>
                        <td style={{ padding: "0.375rem 0.5rem" }}>{choice.educationType}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="gpj-actions">
            <span />
            <button type="button" className="gpj-actions__continue" disabled={pending} onClick={handleContinue}>
              {pending ? "در حال ثبت…" : "ادامه به جلسه دوم مشاوره"}
            </button>
          </div>
        </>
      )}
    </GuidanceStepShell>
  );
}

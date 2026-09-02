"use client";

/**
 * Guidance Journey Engine — Step 9: Priority Weight.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitGuidanceStep9Action } from "@/app/portal/student/services/guidance/steps/actions/step9";
import { GuidanceStepActions } from "@/components/guidance/steps/GuidanceStepActions";
import { GuidanceStepShell } from "@/components/guidance/steps/GuidanceStepShell";
import { moveItem } from "@/lib/guidance/journey/preferences/reorder";
import { GUIDANCE_PRIORITY_FACTORS } from "@/lib/guidance/journey/reference-data/priority-factors";
import { guidanceJourneyStepPath } from "@/lib/guidance/journey/steps";
import { toPersianDigits } from "@/lib/persian";
import type { GuidanceJourneySidebarStep } from "@/lib/guidance/journey/types";

type PriorityWeightsStepProps = {
  sidebarSteps: readonly GuidanceJourneySidebarStep[];
  completionPercentage: number;
  initialOrderedCodes: string[];
  embed?: boolean;
  stayOnSuccess?: boolean;
  continueLabel?: string;
  counselorSubmit?: (
    orderedCodes: string[],
    reason: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
};

const LABELS: Record<string, string> = Object.fromEntries(
  GUIDANCE_PRIORITY_FACTORS.map((f) => [f.code, f.label]),
);

export function PriorityWeightsStep({
  sidebarSteps,
  completionPercentage,
  initialOrderedCodes,
  embed = false,
  stayOnSuccess = false,
  continueLabel,
  counselorSubmit,
}: PriorityWeightsStepProps) {
  const router = useRouter();
  const [codes, setCodes] = useState(initialOrderedCodes);
  const [error, setError] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("");

  function reorder(index: number, direction: -1 | 1) {
    setCodes((prev) => moveItem(prev, index, direction));
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      if (counselorSubmit && !reason.trim()) {
        setError("دلیل ویرایش مشاور الزامی است.");
        return;
      }
      const result = counselorSubmit
        ? await counselorSubmit(codes, reason.trim())
        : await submitGuidanceStep9Action(codes);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCelebrating(true);
      if (stayOnSuccess) return;
      setTimeout(() => router.push(guidanceJourneyStepPath(10)), 1400);
    });
  }

  return (
    <GuidanceStepShell
      stepId={9}
      stepCount={12}
      title="وزن‌دهی اولویت‌ها"
      description="مشخص کن چه چیزی برایت مهم‌تر است. ترتیب از بالا به پایین یعنی از مهم‌ترین به کم‌اهمیت‌ترین."
      sidebarSteps={sidebarSteps}
      completionPercentage={completionPercentage}
      celebrate={celebrating}
      embed={embed}
    >
      {error && (
        <p className="gpj-banner gpj-banner--error" role="alert">
          {error}
        </p>
      )}
      {embed ? (
        <div className="gpj-card" style={{ marginBottom: "0.75rem" }}>
          <label className="gpj-field__label" htmlFor="editReason9">
            دلیل ویرایش مشاور
          </label>
          <input
            id="editReason9"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="gpj-input"
          />
        </div>
      ) : null}

      <div className="gpj-card">
        <h2 className="gpj-card__title">اولویت‌های تصمیم‌گیری</h2>
        <p className="gpj-card__desc">با فلش‌ها جای هر عامل را در فهرست تغییر بده.</p>
        <ol style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {codes.map((code, index) => (
            <li
              key={code}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                borderRadius: "0.875rem",
                border: "1px solid #e2e8f0",
                padding: "0.625rem 0.875rem",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "1.75rem",
                  height: "1.75rem",
                  borderRadius: "999px",
                  background: "color-mix(in srgb, var(--gpj-purple) 10%, transparent)",
                  color: "var(--gpj-purple)",
                  fontWeight: 700,
                  fontSize: "0.8125rem",
                  flexShrink: 0,
                }}
              >
                {toPersianDigits(index + 1)}
              </span>
              <span style={{ fontWeight: 600, fontSize: "0.8437rem", flex: 1 }}>{LABELS[code] ?? code}</span>
              <div style={{ display: "flex", gap: "0.25rem" }}>
                <button
                  type="button"
                  className="gpj-actions__draft"
                  onClick={() => reorder(index, -1)}
                  disabled={index === 0}
                  aria-label="بالاتر"
                >
                  ▲
                </button>
                <button
                  type="button"
                  className="gpj-actions__draft"
                  onClick={() => reorder(index, 1)}
                  disabled={index === codes.length - 1}
                  aria-label="پایین‌تر"
                >
                  ▼
                </button>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <GuidanceStepActions
        continueLabel={continueLabel ?? "ادامه به چیدمان هوشمند"}
        continueType="button"
        onContinue={handleSubmit}
        showSaveDraft={false}
        backHref="/portal/student/services/guidance"
        backLabel="بازگشت به داشبورد"
      />
    </GuidanceStepShell>
  );
}

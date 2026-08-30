"use client";

/**
 * Guidance Journey Engine — Step 6: Education Type Preferences.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitGuidanceStep6Action } from "@/app/portal/student/services/guidance/steps/actions/step6";
import { GuidanceStepShell } from "@/components/guidance/steps/GuidanceStepShell";
import { moveItem } from "@/lib/guidance/journey/preferences/reorder";
import { guidanceEducationTypeLabel } from "@/lib/guidance/journey/reference-data/education-types";
import { guidanceJourneyStepPath } from "@/lib/guidance/journey/steps";
import { toPersianDigits } from "@/lib/persian";
import type { EducationPreferenceItem } from "@/lib/guidance/journey/steps/step6-education-preferences";
import type { GuidanceJourneySidebarStep } from "@/lib/guidance/journey/types";

type EducationPreferencesStepProps = {
  sidebarSteps: readonly GuidanceJourneySidebarStep[];
  completionPercentage: number;
  initialItems: EducationPreferenceItem[];
  embed?: boolean;
  stayOnSuccess?: boolean;
  continueLabel?: string;
  counselorSubmit?: (
    items: EducationPreferenceItem[],
    reason: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
};

export function EducationPreferencesStep({
  sidebarSteps,
  completionPercentage,
  initialItems,
  embed = false,
  stayOnSuccess = false,
  continueLabel,
  counselorSubmit,
}: EducationPreferencesStepProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("");

  function toggle(code: string) {
    setItems((prev) => prev.map((item) => (item.code === code ? { ...item, enabled: !item.enabled } : item)));
  }

  function reorder(index: number, direction: -1 | 1) {
    setItems((prev) => moveItem(prev, index, direction).map((item, i) => ({ ...item, rank: i + 1 })));
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      if (counselorSubmit && !reason.trim()) {
        setError("دلیل ویرایش مشاور الزامی است.");
        return;
      }
      const result = counselorSubmit
        ? await counselorSubmit(items, reason.trim())
        : await submitGuidanceStep6Action(items);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCelebrating(true);
      if (stayOnSuccess) return;
      setTimeout(() => router.push(guidanceJourneyStepPath(7)), 1400);
    });
  }

  return (
    <GuidanceStepShell
      stepId={6}
      stepCount={12}
      title="ترجیحات نوع آموزش"
      description="دوره‌های قابل‌قبول را فعال کن و بر اساس اولویت مرتب کن."
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

      <div className="gpj-card">
        {embed ? (
          <div className="gpj-field" style={{ marginBottom: "1rem" }}>
            <label className="gpj-field__label" htmlFor="editReason6">
              دلیل ویرایش مشاور
            </label>
            <input
              id="editReason6"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="gpj-input"
            />
          </div>
        ) : null}
        <h2 className="gpj-card__title">دوره‌های تحصیلی</h2>
        <p className="gpj-card__desc">فعال/غیرفعال کن و با فلش‌ها ترتیب اولویت را تغییر بده.</p>
        <ul style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {items.map((item, index) => (
            <li
              key={item.code}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                borderRadius: "0.875rem",
                border: "1px solid #e2e8f0",
                padding: "0.625rem 0.875rem",
                opacity: item.enabled ? 1 : 0.55,
              }}
            >
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1, cursor: "pointer" }}>
                <input type="checkbox" checked={item.enabled} onChange={() => toggle(item.code)} />
                <span style={{ fontWeight: 600, fontSize: "0.8437rem" }}>
                  {guidanceEducationTypeLabel(item.code)}
                </span>
              </label>
              {item.enabled && (
                <span style={{ fontSize: "0.75rem", color: "var(--gpj-purple)", fontWeight: 700 }}>
                  اولویت {toPersianDigits(index + 1)}
                </span>
              )}
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
                  disabled={index === items.length - 1}
                  aria-label="پایین‌تر"
                >
                  ▼
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="gpj-actions">
        <span />
        <button type="button" className="gpj-actions__continue" disabled={pending} onClick={handleSubmit}>
          {pending ? "در حال ثبت…" : continueLabel ?? "ادامه"}
        </button>
      </div>
    </GuidanceStepShell>
  );
}

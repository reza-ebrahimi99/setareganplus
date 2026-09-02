"use client";

/**
 * Guidance Journey Engine — Step 8: Major Preferences.
 * Majors shown are strictly scoped to the plan's exam group.
 */

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { majorHref } from "@/lib/guidance/discover/catalog";
import { getDiscoverMajorByCode } from "@/lib/guidance/discover/majors";
import { submitGuidanceStep8Action } from "@/app/portal/student/services/guidance/steps/actions/step8";
import { GuidanceStepShell } from "@/components/guidance/steps/GuidanceStepShell";
import { moveItem } from "@/lib/guidance/journey/preferences/reorder";
import { guidanceJourneyStepPath } from "@/lib/guidance/journey/steps";
import { toPersianDigits } from "@/lib/persian";
import type { MajorPreferenceItem } from "@/lib/guidance/journey/steps/step8-major-preferences";
import type { GuidanceJourneySidebarStep } from "@/lib/guidance/journey/types";

type MajorPreferencesStepProps = {
  sidebarSteps: readonly GuidanceJourneySidebarStep[];
  completionPercentage: number;
  initialItems: MajorPreferenceItem[];
  majorLabels: Record<string, string>;
  examGroupLabel: string;
  embed?: boolean;
  stayOnSuccess?: boolean;
  continueLabel?: string;
  counselorSubmit?: (
    items: MajorPreferenceItem[],
    reason: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
};

export function MajorPreferencesStep({
  sidebarSteps,
  completionPercentage,
  initialItems,
  majorLabels,
  examGroupLabel,
  embed = false,
  stayOnSuccess = false,
  continueLabel,
  counselorSubmit,
}: MajorPreferencesStepProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("");

  function toggle(code: string) {
    setItems((prev) => prev.map((item) => (item.code === code ? { ...item, enabled: !item.enabled } : item)));
  }

  function toggleFavorite(code: string) {
    setItems((prev) => prev.map((item) => (item.code === code ? { ...item, favorite: !item.favorite } : item)));
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
        : await submitGuidanceStep8Action(items);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCelebrating(true);
      if (stayOnSuccess) return;
      setTimeout(() => router.push(guidanceJourneyStepPath(9)), 1400);
    });
  }

  return (
    <GuidanceStepShell
      stepId={8}
      stepCount={12}
      title="ترجیحات رشته"
      description={`رشته‌های گروه آزمایشی «${examGroupLabel}» را فعال، مرتب و ستاره‌دار کن.`}
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
          <label className="gpj-field__label" htmlFor="editReason8">
            دلیل ویرایش مشاور
          </label>
          <input
            id="editReason8"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="gpj-input"
          />
        </div>
      ) : null}

      <div className="gpj-card">
        <h2 className="gpj-card__title">رشته‌های موجود برای گروه آزمایشی تو</h2>
        <p className="gpj-card__desc">فعال کن، در صورت نیاز ستاره بزن، و ترتیب اولویت را با فلش‌ها تنظیم کن.</p>
        <ul style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {items.map((item, index) => {
            const discoverMajor = getDiscoverMajorByCode(item.code);
            return (
            <li
              key={item.code}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.625rem",
                borderRadius: "0.875rem",
                border: "1px solid #e2e8f0",
                padding: "0.625rem 0.875rem",
                opacity: item.enabled ? 1 : 0.55,
              }}
            >
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1, cursor: "pointer" }}>
                <input type="checkbox" checked={item.enabled} onChange={() => toggle(item.code)} />
                <span style={{ fontWeight: 600, fontSize: "0.8437rem" }}>{majorLabels[item.code] ?? item.code}</span>
              </label>
              {discoverMajor ? (
                <Link
                  href={majorHref(discoverMajor.slug)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gpj-actions__draft"
                  style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}
                >
                  معرفی رشته
                </Link>
              ) : null}
              {item.enabled && (
                <>
                  <button
                    type="button"
                    onClick={() => toggleFavorite(item.code)}
                    aria-label="علاقه‌مندی ویژه"
                    style={{
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      fontSize: "1.125rem",
                      color: item.favorite ? "var(--gpj-gold)" : "#cbd5e1",
                    }}
                  >
                    ★
                  </button>
                  <span style={{ fontSize: "0.75rem", color: "var(--gpj-purple)", fontWeight: 700 }}>
                    اولویت {toPersianDigits(index + 1)}
                  </span>
                </>
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
            );
          })}
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

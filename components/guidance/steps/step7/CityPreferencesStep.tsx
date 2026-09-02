"use client";

/**
 * Guidance Journey Engine — Step 7: City / Geographic Preferences.
 * Interactive province selector + per-province city chooser + priority order.
 */

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitGuidanceStep7Action } from "@/app/portal/student/services/guidance/steps/actions/step7";
import { GuidanceStepActions } from "@/components/guidance/steps/GuidanceStepActions";
import { GuidanceStepShell } from "@/components/guidance/steps/GuidanceStepShell";
import { moveItem } from "@/lib/guidance/journey/preferences/reorder";
import { getCitiesForProvince } from "@/lib/guidance/journey/reference-data/cities";
import { guidanceJourneyStepPath } from "@/lib/guidance/journey/steps";
import { toPersianDigits } from "@/lib/persian";
import type { ProvincePreferenceItem } from "@/lib/guidance/journey/steps/step7-city-preferences";
import type { GuidanceJourneySidebarStep } from "@/lib/guidance/journey/types";

type CityPreferencesStepProps = {
  sidebarSteps: readonly GuidanceJourneySidebarStep[];
  completionPercentage: number;
  allProvinces: readonly string[];
  initialItems: ProvincePreferenceItem[];
  embed?: boolean;
  stayOnSuccess?: boolean;
  continueLabel?: string;
  counselorSubmit?: (
    items: ProvincePreferenceItem[],
    reason: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
};

export function CityPreferencesStep({
  sidebarSteps,
  completionPercentage,
  allProvinces,
  initialItems,
  embed = false,
  stayOnSuccess = false,
  continueLabel,
  counselorSubmit,
}: CityPreferencesStepProps) {
  const router = useRouter();
  const [items, setItems] = useState<ProvincePreferenceItem[]>(initialItems);
  const [error, setError] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("");

  const selectedProvinceNames = useMemo(
    () => new Set(items.map((item) => item.province)),
    [items],
  );

  function addProvince(province: string) {
    setItems((prev) => [
      ...prev,
      {
        province,
        enabled: true,
        rank: prev.length + 1,
        cities: [...getCitiesForProvince(province)],
      },
    ]);
  }

  function removeProvince(province: string) {
    setItems((prev) =>
      prev.filter((item) => item.province !== province).map((item, i) => ({ ...item, rank: i + 1 })),
    );
  }

  function toggleCity(province: string, city: string) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.province !== province) return item;
        const has = item.cities.includes(city);
        return {
          ...item,
          cities: has ? item.cities.filter((c) => c !== city) : [...item.cities, city],
        };
      }),
    );
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
        ? await counselorSubmit(items.map((i) => ({ ...i, enabled: true })), reason.trim())
        : await submitGuidanceStep7Action(items.map((i) => ({ ...i, enabled: true })));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCelebrating(true);
      if (stayOnSuccess) return;
      setTimeout(() => router.push(guidanceJourneyStepPath(8)), 1400);
    });
  }

  return (
    <GuidanceStepShell
      stepId={7}
      stepCount={12}
      title="ترجیحات جغرافیایی"
      description="استان‌های قابل‌قبول را انتخاب کن، شهرها را مشخص کن و اولویت را بچین."
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
          <label className="gpj-field__label" htmlFor="editReason7">
            دلیل ویرایش مشاور
          </label>
          <input
            id="editReason7"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="gpj-input"
          />
        </div>
      ) : null}

      <div className="gpj-card">
        <h2 className="gpj-card__title">همه استان‌ها</h2>
        <p className="gpj-card__desc">روی هر استان بزن تا به فهرست ترجیحات اضافه شود.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {allProvinces
            .filter((province) => !selectedProvinceNames.has(province))
            .map((province) => (
              <button
                key={province}
                type="button"
                className="gpj-actions__draft"
                style={{ border: "1px solid #e2e8f0", borderRadius: "999px", padding: "0.375rem 0.875rem" }}
                onClick={() => addProvince(province)}
              >
                + {province}
              </button>
            ))}
        </div>
      </div>

      <div className="gpj-card">
        <h2 className="gpj-card__title">استان‌های انتخاب‌شده (به ترتیب اولویت)</h2>
        {items.length === 0 ? (
          <p className="gpj-card__desc">هنوز استانی انتخاب نکرده‌ای.</p>
        ) : (
          <ul style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {items.map((item, index) => (
              <li key={item.province} style={{ borderRadius: "0.875rem", border: "1px solid #e2e8f0", padding: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.875rem" }}>
                    {toPersianDigits(index + 1)}. {item.province}
                  </span>
                  <div style={{ display: "flex", gap: "0.25rem" }}>
                    <button type="button" className="gpj-actions__draft" onClick={() => reorder(index, -1)} disabled={index === 0}>
                      ▲
                    </button>
                    <button
                      type="button"
                      className="gpj-actions__draft"
                      onClick={() => reorder(index, 1)}
                      disabled={index === items.length - 1}
                    >
                      ▼
                    </button>
                    <button type="button" className="gpj-actions__draft" onClick={() => removeProvince(item.province)}>
                      حذف
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                  {getCitiesForProvince(item.province).map((city) => {
                    const checked = item.cities.includes(city);
                    return (
                      <label
                        key={city}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          fontSize: "0.75rem",
                          borderRadius: "999px",
                          padding: "0.25rem 0.625rem",
                          border: "1px solid",
                          borderColor: checked ? "var(--gpj-purple)" : "#e2e8f0",
                          background: checked ? "color-mix(in srgb, var(--gpj-purple) 8%, transparent)" : "#fff",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCity(item.province, city)}
                          style={{ accentColor: "var(--gpj-purple)" }}
                        />
                        {city}
                      </label>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <GuidanceStepActions
        continueLabel={continueLabel ?? "ثبت و ادامه"}
        continueType="button"
        onContinue={handleSubmit}
        showSaveDraft={false}
        backHref="/portal/student/services/guidance"
        backLabel="بازگشت به داشبورد"
      />
    </GuidanceStepShell>
  );
}

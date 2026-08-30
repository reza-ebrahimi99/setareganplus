"use client";

/**
 * Guidance Journey Engine — Step 4: First Counseling Session.
 * Counselor controls schedule (via existing Booking admin). Student only reserves.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reserveGuidanceFirstSessionAction } from "@/app/portal/student/services/guidance/steps/actions/step4";
import { GuidanceStepShell } from "@/components/guidance/steps/GuidanceStepShell";
import { guidanceJourneyStepPath } from "@/lib/guidance/journey/steps";
import { toPersianDigits } from "@/lib/persian";
import type { GuidanceJourneySidebarStep } from "@/lib/guidance/journey/types";

export type FirstSessionSlotView = {
  id: string;
  label: string;
  advisorName: string;
  remainingCapacity: number;
};

type FirstSessionStepProps = {
  sidebarSteps: readonly GuidanceJourneySidebarStep[];
  completionPercentage: number;
  configured: boolean;
  slots: readonly FirstSessionSlotView[];
};

export function FirstSessionStep({
  sidebarSteps,
  completionPercentage,
  configured,
  slots,
}: FirstSessionStepProps) {
  const router = useRouter();
  const [pendingSlotId, setPendingSlotId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);

  async function handleReserve(slotId: string) {
    setError(null);
    setPendingSlotId(slotId);
    const result = await reserveGuidanceFirstSessionAction(slotId);
    setPendingSlotId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCelebrating(true);
    setTimeout(() => router.push(guidanceJourneyStepPath(5)), 1400);
  }

  return (
    <GuidanceStepShell
      stepId={4}
      stepCount={12}
      title="جلسه اول مشاوره"
      description="یک نوبت از تقویم مشاور رزرو کن. بدون رزرو نمی‌توانی ادامه دهی."
      sidebarSteps={sidebarSteps}
      completionPercentage={completionPercentage}
      celebrate={celebrating}
    >
      {error && (
        <p className="gpj-banner gpj-banner--error" role="alert">
          {error}
        </p>
      )}

      {!configured ? (
        <div className="gpj-card">
          <h2 className="gpj-card__title">تقویم مشاور هنوز آماده نشده</h2>
          <p className="gpj-card__desc">
            مشاور به‌زودی نوبت‌های در دسترس را منتشر می‌کند. لطفاً کمی بعد دوباره
            سر بزن.
          </p>
        </div>
      ) : slots.length === 0 ? (
        <div className="gpj-card">
          <h2 className="gpj-card__title">فعلاً نوبت خالی موجود نیست</h2>
          <p className="gpj-card__desc">
            همه نوبت‌های فعلی رزرو شده‌اند. لطفاً بعداً دوباره بررسی کن.
          </p>
        </div>
      ) : (
        <div className="gpj-card">
          <h2 className="gpj-card__title">نوبت‌های موجود</h2>
          <p className="gpj-card__desc">یک نوبت را انتخاب کن.</p>
          <ul style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {slots.map((slot) => (
              <li
                key={slot.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderRadius: "0.875rem",
                  border: "1px solid #e2e8f0",
                  padding: "0.75rem 1rem",
                }}
              >
                <div>
                  <p style={{ fontWeight: 700, fontSize: "0.875rem" }}>{slot.label}</p>
                  <p style={{ fontSize: "0.75rem", color: "var(--color-muted, #6b7280)" }}>
                    مشاور: {slot.advisorName} · {toPersianDigits(slot.remainingCapacity)} ظرفیت باقی
                  </p>
                </div>
                <button
                  type="button"
                  className="gpj-actions__continue"
                  disabled={pendingSlotId !== null}
                  onClick={() => handleReserve(slot.id)}
                >
                  {pendingSlotId === slot.id ? "در حال رزرو…" : "رزرو این نوبت"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </GuidanceStepShell>
  );
}

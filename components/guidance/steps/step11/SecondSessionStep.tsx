"use client";

/**
 * Guidance Journey Engine — Step 11: Second Counseling Session.
 * Counselor reviews the 150 arranged choices with the student in this session.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reserveGuidanceSecondSessionAction } from "@/app/portal/student/services/guidance/steps/actions/step11";
import { GuidanceStepShell } from "@/components/guidance/steps/GuidanceStepShell";
import { guidanceJourneyStepPath } from "@/lib/guidance/journey/steps";
import { toPersianDigits } from "@/lib/persian";
import type { GuidanceJourneySidebarStep } from "@/lib/guidance/journey/types";

export type SecondSessionSlotView = {
  id: string;
  label: string;
  advisorName: string;
  remainingCapacity: number;
};

type SecondSessionStepProps = {
  sidebarSteps: readonly GuidanceJourneySidebarStep[];
  completionPercentage: number;
  configured: boolean;
  slots: readonly SecondSessionSlotView[];
};

export function SecondSessionStep({
  sidebarSteps,
  completionPercentage,
  configured,
  slots,
}: SecondSessionStepProps) {
  const router = useRouter();
  const [pendingSlotId, setPendingSlotId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);

  async function handleReserve(slotId: string) {
    setError(null);
    setPendingSlotId(slotId);
    const result = await reserveGuidanceSecondSessionAction(slotId);
    setPendingSlotId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCelebrating(true);
    setTimeout(() => router.push(guidanceJourneyStepPath(12)), 1400);
  }

  return (
    <GuidanceStepShell
      stepId={11}
      stepCount={12}
      title="جلسه دوم مشاوره"
      description="در این جلسه، مشاور ۱۵۰ گزینه چیده‌شده را با تو بازبینی می‌کند."
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
          <h2 className="gpj-card__title">تقویم جلسه دوم هنوز آماده نشده</h2>
          <p className="gpj-card__desc">
            نوبت‌های جلسه دوم هنوز از دفتر مشاور منتشر نشده است. به‌محض اعلام، از
            همین صفحه رزرو می‌کنید.
          </p>
        </div>
      ) : slots.length === 0 ? (
        <div className="gpj-card">
          <h2 className="gpj-card__title">فعلاً نوبت خالی موجود نیست</h2>
          <p className="gpj-card__desc">لطفاً بعداً دوباره بررسی کن.</p>
        </div>
      ) : (
        <div className="gpj-card">
          <h2 className="gpj-card__title">نوبت‌های موجود</h2>
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

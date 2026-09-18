"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { submitGuidanceV2Step9Action } from "@/app/portal/student/services/guidance/journey/steps/actions/step9";
import { GuidanceJourneyV2Nav } from "@/components/guidance/journey-v2/GuidanceJourneyV2Nav";
import { GuidanceJourneyV2Shell } from "@/components/guidance/journey-v2/GuidanceJourneyV2Shell";
import { guidanceJourneyV2StepPath } from "@/lib/guidance/journey-v2/steps";
import { toPersianDigits } from "@/lib/persian";
import type { JourneyV2FormState } from "@/app/portal/student/services/guidance/journey/steps/actions/step1";
import type { GuidanceJourneySidebarStep } from "@/lib/guidance/journey/types";

type PriorityFactor = {
  code: string;
  label: string;
  description?: string;
};

type Props = {
  sidebarSteps: readonly GuidanceJourneySidebarStep[];
  completionPercentage: number;
  factors: readonly PriorityFactor[];
  initialOrderedCodes: string[];
};

const initialState: JourneyV2FormState = {};

function MajorIcon() {
  return (
    <svg viewBox="0 0 24 24" width="23" height="23" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <path d="m3 9 9-5 9 5-9 5-9-5Z" />
      <path d="M7 11.5V16c2.7 2.1 7.3 2.1 10 0v-4.5" />
    </svg>
  );
}

function CityIcon() {
  return (
    <svg viewBox="0 0 24 24" width="23" height="23" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function EducationTypeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="23" height="23" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9 12 4l9 5" />
      <path d="M5 10v8M9 10v8M15 10v8M19 10v8" />
      <path d="M3 19h18" />
      <path d="M2 21h20" />
    </svg>
  );
}

function FactorIcon({ code }: { code: string }) {
  if (code === "MAJOR") return <MajorIcon />;
  if (code === "CITY") return <CityIcon />;
  return <EducationTypeIcon />;
}

function ArrowIcon({
  direction,
}: {
  direction: "up" | "down";
}) {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      {direction === "up" ? (
        <path d="m6 15 6-6 6 6" />
      ) : (
        <path d="m6 9 6 6 6-6" />
      )}
    </svg>
  );
}

function PriorityIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <path d="M8 18V9M12 18V5M16 18v-6" />
      <path d="M5 21h14" />
    </svg>
  );
}

export function PriorityFactorsV2Step({
  sidebarSteps,
  completionPercentage,
  factors,
  initialOrderedCodes,
}: Props) {
  const router = useRouter();

  const [state, formAction, pending] = useActionState(
    submitGuidanceV2Step9Action,
    initialState,
  );

  const factorMap = useMemo(
    () =>
      new Map(
        factors.map((factor) => [
          factor.code,
          factor,
        ]),
      ),
    [factors],
  );

  const [orderedCodes, setOrderedCodes] = useState(() => {
    const valid = initialOrderedCodes.filter((code) =>
      factorMap.has(code),
    );

    const missing = factors
      .map((factor) => factor.code)
      .filter((code) => !valid.includes(code));

    return [...valid, ...missing];
  });

  useEffect(() => {
    if (state.ok) {
      router.replace(guidanceJourneyV2StepPath(10));
    }
  }, [state.ok, router]);

  function move(index: number, direction: -1 | 1) {
    setOrderedCodes((current) => {
      const target = index + direction;

      if (target < 0 || target >= current.length) {
        return current;
      }

      const next = [...current];

      [next[index], next[target]] = [
        next[target],
        next[index],
      ];

      return next;
    });
  }

  return (
    <GuidanceJourneyV2Shell
      stepId={9}
      stepCount={18}
      title="معیارهای اولویت‌بندی"
      description="مشخص کنید در انتخاب رشته نهایی، رشته، شهر یا نوع دانشگاه و دوره برای شما اهمیت بیشتری دارد."
      sidebarSteps={sidebarSteps}
      completionPercentage={completionPercentage}
    >
      <form action={formAction} className="gjv2-form-card">
        <input
          type="hidden"
          name="payload"
          value={JSON.stringify(orderedCodes)}
        />
        <input
          type="hidden"
          name="orderedCodes"
          value={JSON.stringify(orderedCodes)}
        />

        {state.error ? (
          <div
            className="gjv2-banner gjv2-banner--error"
            role="alert"
          >
            {state.error}
          </div>
        ) : null}

        <div className="gjv2-priority3-intro">
          <span className="gjv2-priority3-intro__icon">
            <PriorityIcon />
          </span>

          <div>
            <strong>
              کدام عامل برای شما مهم‌تر است؟
            </strong>
            <span>
              فقط ترتیب این سه معیار را مشخص کنید.
              گزینه مهم‌تر را بالاتر قرار دهید.
            </span>
          </div>
        </div>

        <section className="gjv2-section">
          <div className="gjv2-section__heading">
            <span className="gjv2-section__number">
              ۱
            </span>

            <div>
              <h2>ترتیب اهمیت</h2>
              <p>
                رتبه ۱ یعنی مهم‌ترین معیار در تصمیم‌گیری شما.
              </p>
            </div>
          </div>

          <div className="gjv2-priority3-scale">
            <span>مهم‌ترین</span>
            <span />
            <span>کم‌اهمیت‌تر</span>
          </div>

          <div className="gjv2-priority3-list">
            {orderedCodes.map((code, index) => {
              const factor = factorMap.get(code);

              if (!factor) return null;

              const isFirst = index === 0;
              const isLast =
                index === orderedCodes.length - 1;

              return (
                <article
                  key={code}
                  className={
                    isFirst
                      ? "gjv2-priority3-card gjv2-priority3-card--first"
                      : "gjv2-priority3-card"
                  }
                >
                  <span className="gjv2-priority3-rank">
                    {toPersianDigits(index + 1)}
                  </span>

                  <span
                    className={`gjv2-priority3-card__icon gjv2-priority3-card__icon--${code.toLowerCase()}`}
                  >
                    <FactorIcon code={code} />
                  </span>

                  <div className="gjv2-priority3-card__content">
                    <strong>{factor.label}</strong>

                    <span>
                      {code === "MAJOR"
                        ? "خود رشته تحصیلی"
                        : code === "CITY"
                          ? "شهر محل تحصیل"
                          : "نوع دانشگاه و دوره تحصیلی"}
                    </span>
                  </div>

                  {isFirst ? (
                    <span className="gjv2-priority3-card__badge">
                      مهم‌ترین
                    </span>
                  ) : null}

                  <div className="gjv2-priority3-controls">
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => move(index, -1)}
                      aria-label={`${factor.label} بالاتر`}
                      title="افزایش اولویت"
                    >
                      <ArrowIcon direction="up" />
                    </button>

                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => move(index, 1)}
                      aria-label={`${factor.label} پایین‌تر`}
                      title="کاهش اولویت"
                    >
                      <ArrowIcon direction="down" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <div className="gjv2-priority3-note">
          این انتخاب به سامانه کمک می‌کند هنگام مقایسه
          گزینه‌های نهایی، ترتیب ترجیحات شخصی شما را در نظر
          بگیرد.
        </div>

        <GuidanceJourneyV2Nav
          previous={{
            label: "بازگشت به اولویت رشته‌ها",
            onClick: () => router.push(guidanceJourneyV2StepPath(8)),
          }}
          next={{
            label: "ثبت اولویت‌ها و ادامه مسیر",
            disabled: pending || orderedCodes.length !== 10,
            pending,
            pendingLabel: "در حال ثبت...",
          }}
        />
      </form>
    </GuidanceJourneyV2Shell>
  );
}

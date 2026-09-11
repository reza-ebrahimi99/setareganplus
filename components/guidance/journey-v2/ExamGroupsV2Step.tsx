"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";

import { submitGuidanceV2Step2Action } from "@/app/portal/student/services/guidance/journey/steps/actions/step2";
import type { JourneyV2FormState } from "@/app/portal/student/services/guidance/journey/steps/actions/step1";
import { GuidanceJourneyV2Nav } from "@/components/guidance/journey-v2/GuidanceJourneyV2Nav";
import { GuidanceJourneyV2Shell } from "@/components/guidance/journey-v2/GuidanceJourneyV2Shell";
import {
  ExamGroupIcon,
  RequiredStar,
} from "@/components/guidance/journey-v2/GuidanceV2Icons";
import { guidanceJourneyV2StepPath } from "@/lib/guidance/journey-v2/steps";
import type { GuidanceJourneySidebarStep } from "@/lib/guidance/journey/types";

const initial: JourneyV2FormState = {};

const primary = [
  {
    value: "EXPERIMENTAL_SCIENCES",
    label: "علوم تجربی",
    description: "زیست‌شناسی و شیمی",
    icon: "experimental" as const,
  },
  {
    value: "MATHEMATICS",
    label: "ریاضی و فیزیک",
    description: "ریاضیات و فیزیک",
    icon: "math" as const,
  },
  {
    value: "HUMANITIES",
    label: "علوم انسانی",
    description: "ادبیات و علوم انسانی",
    icon: "humanities" as const,
  },
];

const secondary = [
  {
    value: "ARTS",
    label: "هنر",
    description: "آزمون گروه هنر",
    icon: "art" as const,
  },
  {
    value: "LANGUAGES",
    label: "زبان‌های خارجی",
    description: "آزمون گروه زبان",
    icon: "language" as const,
  },
];

export function ExamGroupsV2Step({
  sidebarSteps,
  completionPercentage,
  initialPrimary,
  initialSecondary,
}: {
  sidebarSteps: readonly GuidanceJourneySidebarStep[];
  completionPercentage: number;
  initialPrimary: string;
  initialSecondary: readonly string[];
}) {
  const router = useRouter();
  const [state, action] = useActionState(submitGuidanceV2Step2Action, initial);

  const [selectedPrimary, setSelectedPrimary] = useState(initialPrimary);
  const [selectedSecondary, setSelectedSecondary] = useState<string[]>([
    ...initialSecondary,
  ]);

  if (state.ok) {
    router.replace(guidanceJourneyV2StepPath(3));
  }

  function toggleSecondary(value: string) {
    setSelectedSecondary((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  return (
    <GuidanceJourneyV2Shell
      stepId={2}
      stepCount={18}
      title="گروه‌های آزمایشی"
      description="گروه اصلی کنکور و آزمون‌های شناوری که در آن‌ها شرکت کرده‌اید را مشخص کنید."
      sidebarSteps={sidebarSteps}
      completionPercentage={completionPercentage}
    >
      <form action={action} className="gjv2-form-card" noValidate>
        {state.error ? (
          <p className="gpj-banner gpj-banner--error">{state.error}</p>
        ) : null}

        <section className="gjv2-section">
          <div className="gjv2-section__heading">
            <span className="gjv2-section__number">۱</span>
            <div>
              <h2>
                گروه آزمایشی اصلی
                <RequiredStar />
              </h2>
              <p>گروه اصلی کنکور خود را انتخاب کنید.</p>
            </div>
          </div>

          <div className="gjv2-choice-grid gjv2-choice-grid--three">
            {primary.map((option) => (
              <label
                key={option.value}
                className={`gjv2-choice-card${
                  selectedPrimary === option.value
                    ? " gjv2-choice-card--selected"
                    : ""
                }`}
              >
                <input
                  type="radio"
                  name="primary"
                  value={option.value}
                  checked={selectedPrimary === option.value}
                  onChange={() => setSelectedPrimary(option.value)}
                />

                <ExamGroupIcon type={option.icon} />

                <strong>{option.label}</strong>
                <span>{option.description}</span>

                <i className="gjv2-choice-selector" aria-hidden="true" />
              </label>
            ))}
          </div>
        </section>

        <section className="gjv2-section">
          <div className="gjv2-section__heading">
            <span className="gjv2-section__number">۲</span>
            <div>
              <h2>گروه‌های شناور</h2>
              <p>اگر در آزمون هنر یا زبان هم شرکت کرده‌اید، انتخاب کنید.</p>
            </div>
          </div>

          <div className="gjv2-choice-grid gjv2-choice-grid--two">
            {secondary.map((option) => {
              const checked = selectedSecondary.includes(option.value);

              return (
                <label
                  key={option.value}
                  className={`gjv2-secondary-card${
                    checked ? " gjv2-secondary-card--selected" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    name="secondary"
                    value={option.value}
                    checked={checked}
                    onChange={() => toggleSecondary(option.value)}
                  />

                  <ExamGroupIcon type={option.icon} />

                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>

                  <i className="gjv2-check-box" aria-hidden="true">
                    {checked ? "✓" : ""}
                  </i>
                </label>
              );
            })}
          </div>
        </section>

        <GuidanceJourneyV2Nav
          previous={{
            label: "برگشت",
            onClick: () => router.push(guidanceJourneyV2StepPath(1)),
          }}
          next={{ label: "ذخیره و رفتن به مرحله بعد" }}
        />
      </form>
    </GuidanceJourneyV2Shell>
  );
}

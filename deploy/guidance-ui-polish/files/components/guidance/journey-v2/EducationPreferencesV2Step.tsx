"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { submitGuidanceV2Step6Action } from "@/app/portal/student/services/guidance/journey/steps/actions/step6";
import { GuidanceJourneyV2Nav } from "@/components/guidance/journey-v2/GuidanceJourneyV2Nav";
import { GuidanceJourneyV2Shell } from "@/components/guidance/journey-v2/GuidanceJourneyV2Shell";
import {
  GUIDANCE_EDUCATION_TYPES,
  guidanceEducationTypeLabel,
} from "@/lib/guidance/journey/reference-data/education-types";
import {
  guidanceJourneyV2StepPath,
} from "@/lib/guidance/journey-v2/steps";
import type { GuidanceJourneySidebarStep } from "@/lib/guidance/journey/types";
import type { GuidanceV2EducationPreferenceItem } from "@/lib/guidance/journey-v2/steps/step6-education-preferences";
import { toPersianDigits } from "@/lib/persian";

const initialState: {
  ok?: boolean;
  error?: string;
} = {};

const educationDescriptions: Record<string, string> = {
  DAILY: "دوره‌های روزانه دانشگاه‌های دولتی",
  NIGHT: "دوره نوبت دوم دانشگاه‌های دولتی",
  SELF_FUNDED: "دوره‌های شهریه‌پرداز و ظرفیت مازاد",
  AZAD: "واحدهای دانشگاه آزاد اسلامی",
  PAYAM_NOOR: "تحصیل در دانشگاه پیام نور",
  NON_PROFIT: "مؤسسات آموزش عالی غیرانتفاعی",
  APPLIED_SCIENCE: "دوره‌های مهارت‌محور علمی‌کاربردی",
  VIRTUAL: "دوره‌های آموزش الکترونیکی و مجازی",
  INTERNATIONAL: "پردیس‌ها و دوره‌های بین‌المللی",
  TEACHER_TRAINING: "مسیر تربیت معلم و دانشگاه فرهنگیان",
};

function normalize(
  items: GuidanceV2EducationPreferenceItem[],
): GuidanceV2EducationPreferenceItem[] {
  const enabled = items
    .filter((item) => item.enabled)
    .sort((a, b) => a.rank - b.rank)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

  const disabled = items
    .filter((item) => !item.enabled)
    .sort((a, b) => a.rank - b.rank)
    .map((item, index) => ({
      ...item,
      rank: enabled.length + index + 1,
    }));

  return [...enabled, ...disabled];
}

export function EducationPreferencesV2Step({
  sidebarSteps,
  completionPercentage,
  initialItems,
}: {
  sidebarSteps: readonly GuidanceJourneySidebarStep[];
  completionPercentage: number;
  initialItems: GuidanceV2EducationPreferenceItem[];
}) {
  const router = useRouter();

  const [state, action, pending] = useActionState(
    submitGuidanceV2Step6Action,
    initialState,
  );

  const [items, setItems] = useState(() => normalize(initialItems));

  if (state.ok) {
    router.replace(guidanceJourneyV2StepPath(7));
  }

  const enabledItems = useMemo(
    () => items.filter((item) => item.enabled),
    [items],
  );

  function toggle(code: string) {
    setItems((current) => {
      const next = current.map((item) =>
        item.code === code
          ? { ...item, enabled: !item.enabled }
          : item,
      );

      return normalize(next);
    });
  }

  function moveEnabled(code: string, direction: -1 | 1) {
    setItems((current) => {
      const enabled = current.filter((item) => item.enabled);
      const disabled = current.filter((item) => !item.enabled);

      const index = enabled.findIndex((item) => item.code === code);
      if (index === -1) return current;

      const target = index + direction;
      if (target < 0 || target >= enabled.length) return current;

      const reordered = [...enabled];
      [reordered[index], reordered[target]] = [
        reordered[target],
        reordered[index],
      ];

      const rankedEnabled = reordered.map((item, rankIndex) => ({
        ...item,
        rank: rankIndex + 1,
      }));

      return normalize([...rankedEnabled, ...disabled]);
    });
  }

  return (
    <GuidanceJourneyV2Shell
      stepId={6}
      stepCount={18}
      title="اولویت دوره‌های تحصیلی"
      description="دوره‌هایی را که حاضر هستید در انتخاب رشته بررسی شوند انتخاب کنید و سپس آن‌ها را به ترتیب ترجیح مرتب کنید."
      sidebarSteps={sidebarSteps}
      completionPercentage={completionPercentage}
    >
      <form action={action} className="gjv2-form-card" noValidate>
        <input
          type="hidden"
          name="items"
          value={JSON.stringify(items)}
        />

        {state.error ? (
          <p className="gpj-banner gpj-banner--error" role="alert">
            {state.error}
          </p>
        ) : null}

        <section className="gjv2-education-guide">
          <div className="gjv2-education-guide__icon" aria-hidden="true">
            📚
          </div>

          <div className="gjv2-education-guide__content">
            <strong>قبل از انتخاب، انواع دوره‌ها را بشناسید</strong>
            <p>
              تفاوت دوره‌های روزانه، نوبت دوم، آزاد، پیام نور،
              غیرانتفاعی و سایر دوره‌ها را در راهنمای اختصاصی
              ستارگان پلاس توضیح خواهیم داد.
            </p>
          </div>

          <button
            type="button"
            className="gjv2-education-guide__button"
            disabled
            aria-disabled="true"
          >
            آشنایی با انواع دوره‌ها
            <small>به‌زودی</small>
          </button>
        </section>

        <section className="gjv2-section">
          <div className="gjv2-section__heading">
            <span className="gjv2-section__number">۱</span>
            <div>
              <h2>دوره‌های قابل قبول برای من</h2>
              <p>
                هر دوره‌ای را که مایل هستید در پیشنهادهای انتخاب رشته
                شما بررسی شود، فعال کنید.
              </p>
            </div>
          </div>

          <div className="gjv2-education-grid">
            {GUIDANCE_EDUCATION_TYPES.map((type) => {
              const item = items.find(
                (entry) => entry.code === type.code,
              );

              const checked = Boolean(item?.enabled);

              return (
                <button
                  key={type.code}
                  type="button"
                  className={`gjv2-education-card${
                    checked
                      ? " gjv2-education-card--selected"
                      : ""
                  }`}
                  onClick={() => toggle(type.code)}
                  aria-pressed={checked}
                >
                  <span className="gjv2-education-card__selector">
                    {checked ? "✓" : ""}
                  </span>

                  <span className="gjv2-education-card__text">
                    <strong>
                      {guidanceEducationTypeLabel(type.code)}
                    </strong>
                    <small>
                      {educationDescriptions[type.code]}
                    </small>
                  </span>

                  {checked ? (
                    <span className="gjv2-education-card__status">
                      انتخاب شده
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        <section className="gjv2-section">
          <div className="gjv2-section__heading">
            <span className="gjv2-section__number">۲</span>
            <div>
              <h2>ترتیب اولویت دوره‌ها</h2>
              <p>
                فقط دوره‌های انتخاب‌شده در این فهرست دیده می‌شوند.
                اولویت شماره ۱ مهم‌ترین ترجیح شماست.
              </p>
            </div>
          </div>

          {enabledItems.length ? (
            <div className="gjv2-priority-list">
              {enabledItems.map((item, index) => (
                <div
                  key={item.code}
                  className="gjv2-priority-item"
                >
                  <span className="gjv2-priority-item__rank">
                    {toPersianDigits(index + 1)}
                  </span>

                  <div className="gjv2-priority-item__content">
                    <strong>
                      {guidanceEducationTypeLabel(item.code)}
                    </strong>
                    <small>
                      اولویت {toPersianDigits(index + 1)}
                    </small>
                  </div>

                  <div className="gjv2-priority-item__controls">
                    <button
                      type="button"
                      onClick={() => moveEnabled(item.code, -1)}
                      disabled={index === 0}
                      aria-label={`افزایش اولویت ${guidanceEducationTypeLabel(
                        item.code,
                      )}`}
                    >
                      ↑
                    </button>

                    <button
                      type="button"
                      onClick={() => moveEnabled(item.code, 1)}
                      disabled={index === enabledItems.length - 1}
                      aria-label={`کاهش اولویت ${guidanceEducationTypeLabel(
                        item.code,
                      )}`}
                    >
                      ↓
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="gjv2-priority-empty">
              حداقل یک دوره را از بخش بالا انتخاب کنید.
            </div>
          )}
        </section>

        <GuidanceJourneyV2Nav
          previous={{
            label: "برگشت",
            onClick: () => router.push(guidanceJourneyV2StepPath(5)),
          }}
          next={{
            label: "ذخیره و رفتن به مرحله بعد",
            disabled: pending || enabledItems.length === 0,
            pending,
            pendingLabel: "در حال ذخیره…",
          }}
        />
      </form>
    </GuidanceJourneyV2Shell>
  );
}

"use client";

import Link from "next/link";
import { getDiscoverMajorByCode } from "@/lib/guidance/discover/majors";
import {
  useActionState,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { submitGuidanceV2Step8Action } from "@/app/portal/student/services/guidance/journey/steps/actions/step8";
import { GuidanceJourneyV2Nav } from "@/components/guidance/journey-v2/GuidanceJourneyV2Nav";
import { GuidanceJourneyV2Shell } from "@/components/guidance/journey-v2/GuidanceJourneyV2Shell";
import { guidanceJourneyV2StepPath } from "@/lib/guidance/journey-v2/steps";
import { toPersianDigits } from "@/lib/persian";
import type { JourneyV2FormState } from "@/app/portal/student/services/guidance/journey/steps/actions/step1";
import type { GuidanceV2MajorPreferenceItem } from "@/lib/guidance/journey-v2/steps/step8-major-preferences";
import type { GuidanceJourneySidebarStep } from "@/lib/guidance/journey/types";

type MajorOption = {
  code: string;
  label: string;
};

type MajorGroup = {
  group:
    | "MATHEMATICS"
    | "EXPERIMENTAL_SCIENCES"
    | "HUMANITIES"
    | "ARTS"
    | "LANGUAGES";
  label: string;
  majors: readonly MajorOption[];
};

type Props = {
  sidebarSteps: readonly GuidanceJourneySidebarStep[];
  completionPercentage: number;
  initialItems: GuidanceV2MajorPreferenceItem[];
  majorsByGroup: readonly MajorGroup[];
};

const initialState: JourneyV2FormState = {};

function AcademicIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3 9 9-5 9 5-9 5-9-5Z" />
      <path d="M7 11.5V16c2.7 2.1 7.3 2.1 10 0v-4.5" />
      <path d="M21 9v6" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="21"
      height="21"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" />
      <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

function StarIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="19"
      height="19"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 3 2.75 5.57 6.15.9-4.45 4.33 1.05 6.12L12 17.03l-5.5 2.89 1.05-6.12L3.1 9.47l6.15-.9L12 3Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function ArrowIcon({
  direction,
}: {
  direction: "up" | "down";
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {direction === "up" ? (
        <path d="m6 15 6-6 6 6" />
      ) : (
        <path d="m6 9 6 6 6-6" />
      )}
    </svg>
  );
}

function GuideIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M9.7 9a2.5 2.5 0 1 1 3.7 2.2c-.9.5-1.4 1-1.4 2" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function ExamGroupIcon({
  group,
}: {
  group: MajorGroup["group"];
}) {
  const commonProps = {
    viewBox: "0 0 24 24",
    width: 19,
    height: 19,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (group) {
    case "MATHEMATICS":
      return (
        <svg {...commonProps}>
          <path d="M4 19 12 5l8 14H4Z" />
          <path d="M8.5 14h7" />
          <circle cx="12" cy="9.5" r="1" />
        </svg>
      );

    case "EXPERIMENTAL_SCIENCES":
      return (
        <svg {...commonProps}>
          <path d="M9 3h6" />
          <path d="M10 3v6l-5 8.5A2.3 2.3 0 0 0 7 21h10a2.3 2.3 0 0 0 2-3.5L14 9V3" />
          <path d="M8 15h8" />
          <circle cx="10" cy="17.5" r=".7" />
          <circle cx="14.5" cy="13" r=".7" />
        </svg>
      );

    case "HUMANITIES":
      return (
        <svg {...commonProps}>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" />
          <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z" />
        </svg>
      );

    case "ARTS":
      return (
        <svg {...commonProps}>
          <path d="M12 3a9 9 0 1 0 0 18h1.2a1.8 1.8 0 0 0 1.3-3.1 1.8 1.8 0 0 1 1.3-3.1H18A3 3 0 0 0 21 12a9 9 0 0 0-9-9Z" />
          <circle cx="7.5" cy="10" r="1" />
          <circle cx="10" cy="6.8" r="1" />
          <circle cx="14.2" cy="6.8" r="1" />
          <circle cx="17" cy="10" r="1" />
        </svg>
      );

    case "LANGUAGES":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3.5 12h17" />
          <path d="M12 3c2.5 2.5 3.8 5.5 3.8 9S14.5 18.5 12 21" />
          <path d="M12 3C9.5 5.5 8.2 8.5 8.2 12S9.5 18.5 12 21" />
        </svg>
      );

    default:
      return null;
  }
}

function normalizeItems(
  items: GuidanceV2MajorPreferenceItem[],
) {
  const enabled = items
    .filter((item) => item.enabled)
    .sort((a, b) => a.rank - b.rank)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

  const disabled = items
    .filter((item) => !item.enabled)
    .map((item, index) => ({
      ...item,
      favorite: false,
      rank: enabled.length + index + 1,
    }));

  return [...enabled, ...disabled];
}

export function MajorPreferencesV2Step({
  sidebarSteps,
  completionPercentage,
  initialItems,
  majorsByGroup,
}: Props) {
  const router = useRouter();

  const [state, formAction, pending] = useActionState(
    submitGuidanceV2Step8Action,
    initialState,
  );

  const [items, setItems] = useState(() =>
    normalizeItems(initialItems),
  );

  const [query, setQuery] = useState("");

  const [activeGroup, setActiveGroup] = useState(
    majorsByGroup[0]?.group ?? "MATHEMATICS",
  );

  const activeMajorGroup = useMemo(
    () =>
      majorsByGroup.find(
        (group) => group.group === activeGroup,
      ) ?? majorsByGroup[0],
    [majorsByGroup, activeGroup],
  );

  const activeMajors =
    activeMajorGroup?.majors ?? [];

  const allMajors = useMemo(
    () =>
      majorsByGroup.flatMap(
        (group) => group.majors,
      ),
    [majorsByGroup],
  );

  useEffect(() => {
    if (state.ok) {
      router.replace(guidanceJourneyV2StepPath(9));
    }
  }, [state.ok, router]);

  const labelByCode = useMemo(
    () =>
      new Map(
        allMajors.map((major) => [
          major.code,
          major.label,
        ]),
      ),
    [allMajors],
  );

  const enabledItems = useMemo(
    () =>
      items
        .filter((item) => item.enabled)
        .sort((a, b) => a.rank - b.rank),
    [items],
  );

  const favoriteCount = useMemo(
    () =>
      enabledItems.filter((item) => item.favorite)
        .length,
    [enabledItems],
  );

  const filteredMajors = useMemo(() => {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return activeMajors;
    }

    return activeMajors.filter((major) =>
      major.label.includes(normalizedQuery),
    );
  }, [activeMajors, query]);

  function toggleMajor(code: string) {
    setItems((current) => {
      const next = current.map((item) => {
        if (item.code !== code) return item;

        const enabled = !item.enabled;

        return {
          ...item,
          enabled,
          favorite: enabled
            ? item.favorite
            : false,
          rank: enabled
            ? current.filter(
                (candidate) => candidate.enabled,
              ).length + 1
            : item.rank,
        };
      });

      return normalizeItems(next);
    });
  }

  function toggleFavorite(code: string) {
    setItems((current) =>
      current.map((item) =>
        item.code === code && item.enabled
          ? {
              ...item,
              favorite: !item.favorite,
            }
          : item,
      ),
    );
  }

  function reorderEnabled(
    index: number,
    direction: -1 | 1,
  ) {
    setItems((current) => {
      const enabled = current
        .filter((item) => item.enabled)
        .sort((a, b) => a.rank - b.rank);

      const target = index + direction;

      if (
        target < 0 ||
        target >= enabled.length
      ) {
        return current;
      }

      [enabled[index], enabled[target]] = [
        enabled[target],
        enabled[index],
      ];

      const ranks = new Map(
        enabled.map((item, rankIndex) => [
          item.code,
          rankIndex + 1,
        ]),
      );

      return normalizeItems(
        current.map((item) =>
          item.enabled
            ? {
                ...item,
                rank: ranks.get(item.code) ?? item.rank,
              }
            : item,
        ),
      );
    });
  }

  return (
    <GuidanceJourneyV2Shell
      stepId={8}
      stepCount={18}
      title="اولویت رشته‌ها"
      description="رشته‌های مورد علاقه خود را از گروه‌های آزمایشی انتخاب‌شده مشخص کنید و سپس ترتیب اولویت آن‌ها را تعیین کنید."
      sidebarSteps={sidebarSteps}
      completionPercentage={completionPercentage}
    >
      <form
        action={formAction}
        className="gjv2-form-card"
      >
        <input
          type="hidden"
          name="items"
          value={JSON.stringify(items)}
        />

        {state.error ? (
          <div
            className="gjv2-banner gjv2-banner--error"
            role="alert"
          >
            {state.error}
          </div>
        ) : null}

        <div className="gjv2-major-guide">
          <span className="gjv2-major-guide__icon">
            <GuideIcon />
          </span>

          <div className="gjv2-major-guide__content">
            <strong>
              برای شناخت بهتر رشته‌ها نیاز به راهنما دارید؟
            </strong>
            <span>
              معرفی رشته، مهارت‌های لازم، مسیر تحصیلی و
              چشم‌انداز شغلی
            </span>
          </div>

          <Link href="/discover/majors" className="gjv2-major-guide__link">
            <BookIcon />
            <span>راهنمای شناخت رشته‌ها</span>
          </Link>
        </div>

        <section className="gjv2-section">
          <div className="gjv2-section__heading">
            <span className="gjv2-section__number">
              ۱
            </span>

            <div>
              <h2>رشته‌های مورد علاقه من</h2>
              <p>
                رشته‌هایی را انتخاب کنید که مایل هستید
                در انتخاب رشته نهایی بررسی شوند.
              </p>
            </div>
          </div>

          <div className="gjv2-major-summary">
            <div className="gjv2-major-summary__item">
              <span className="gjv2-major-summary__icon">
                <AcademicIcon />
              </span>
              <div>
                <strong>
                  {toPersianDigits(enabledItems.length)}
                </strong>
                <span>رشته انتخاب‌شده</span>
              </div>
            </div>

            <div className="gjv2-major-summary__divider" />

            <div className="gjv2-major-summary__item">
              <span className="gjv2-major-summary__icon gjv2-major-summary__icon--favorite">
                <StarIcon filled />
              </span>
              <div>
                <strong>
                  {toPersianDigits(favoriteCount)}
                </strong>
                <span>علاقه ویژه</span>
              </div>
            </div>
          </div>

          <div
            className="gjv2-major-tabs"
            role="tablist"
            aria-label="گروه‌های آزمایشی"
          >
            {majorsByGroup.map((group) => {
              const active =
                group.group === activeGroup;

              return (
                <button
                  key={group.group}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={
                    active
                      ? "gjv2-major-tab gjv2-major-tab--active"
                      : "gjv2-major-tab"
                  }
                  onClick={() => {
                    setActiveGroup(group.group);
                    setQuery("");
                  }}
                >
                  <span className="gjv2-major-tab__icon">
                    <ExamGroupIcon group={group.group} />
                  </span>

                  <span className="gjv2-major-tab__label">
                    {group.label}
                  </span>

                  <span className="gjv2-major-tab__count">
                    {toPersianDigits(group.majors.length)}
                  </span>
                </button>
              );
            })}
          </div>

          <label className="gjv2-search">
            <span className="gjv2-search__icon">
              <SearchIcon />
            </span>

            <input
              type="search"
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="جستجوی نام رشته..."
              aria-label="جستجوی رشته"
            />
          </label>

          <div className="gjv2-major-grid">
            {filteredMajors.map((major) => {
              const item = items.find(
                (candidate) =>
                  candidate.code === major.code,
              );

              const enabled = Boolean(item?.enabled);
              const favorite = Boolean(
                item?.favorite,
              );

              const discoverMajor =
                getDiscoverMajorByCode(major.code);

              const guideHref = discoverMajor
                ? `/discover/majors/${discoverMajor.slug}`
                : "/discover/majors";

              return (
                <article
                  key={major.code}
                  className={
                    enabled
                      ? "gjv2-major-card gjv2-major-card--selected"
                      : "gjv2-major-card"
                  }
                >
                  <button
                    type="button"
                    className="gjv2-major-card__select"
                    aria-pressed={enabled}
                    onClick={() =>
                      toggleMajor(major.code)
                    }
                  >
                    <span className="gjv2-major-card__academic">
                      <AcademicIcon />
                    </span>

                    <span className="gjv2-major-card__body">
                      <strong>{major.label}</strong>
                      <small>{activeMajorGroup?.label}</small>
                    </span>

                    <span
                      className={
                        enabled
                          ? "gjv2-major-card__check gjv2-major-card__check--selected"
                          : "gjv2-major-card__check"
                      }
                    >
                      {enabled ? <CheckIcon /> : null}
                    </span>
                  </button>

                  <div className="gjv2-major-card__guide">
                    <Link
                      href={guideHref}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <span aria-hidden="true">◉</span>
                      <span>معرفی رشته</span>
                    </Link>
                  </div>

                  {enabled ? (
                    <div className="gjv2-major-card__footer">
                      <span>
                        اولویت{" "}
                        {toPersianDigits(
                          enabledItems.findIndex(
                            (candidate) =>
                              candidate.code ===
                              major.code,
                          ) + 1,
                        )}
                      </span>

                      <button
                        type="button"
                        className={
                          favorite
                            ? "gjv2-major-favorite gjv2-major-favorite--active"
                            : "gjv2-major-favorite"
                        }
                        aria-pressed={favorite}
                        aria-label={
                          favorite
                            ? `حذف ${major.label} از علاقه ویژه`
                            : `افزودن ${major.label} به علاقه ویژه`
                        }
                        onClick={() =>
                          toggleFavorite(major.code)
                        }
                      >
                        <StarIcon filled={favorite} />
                        <span>
                          {favorite
                            ? "علاقه ویژه"
                            : "ستاره‌دار کن"}
                        </span>
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>

          {!filteredMajors.length ? (
            <div className="gjv2-empty-inline">
              رشته‌ای با این عبارت در گروه آزمایشی شما
              پیدا نشد.
            </div>
          ) : null}
        </section>

        <section className="gjv2-section">
          <div className="gjv2-section__heading">
            <span className="gjv2-section__number">
              ۲
            </span>

            <div>
              <h2>ترتیب اولویت رشته‌ها</h2>
              <p>
                رشته مهم‌تر را بالاتر قرار دهید. فقط
                رشته‌های انتخاب‌شده وارد این فهرست می‌شوند.
              </p>
            </div>
          </div>

          {enabledItems.length ? (
            <div className="gjv2-major-priority-list">
              {enabledItems.map((item, index) => {
                const label =
                  labelByCode.get(item.code) ??
                  item.code;

                return (
                  <div
                    key={item.code}
                    className={
                      item.favorite
                        ? "gjv2-major-priority gjv2-major-priority--favorite"
                        : "gjv2-major-priority"
                    }
                  >
                    <span className="gjv2-priority-rank">
                      {toPersianDigits(index + 1)}
                    </span>

                    <span className="gjv2-major-priority__icon">
                      <AcademicIcon />
                    </span>

                    <div className="gjv2-major-priority__content">
                      <strong>{label}</strong>

                      <span>
                        {item.favorite ? (
                          <>
                            <StarIcon filled />
                            علاقه ویژه
                          </>
                        ) : (
                          "رشته انتخاب‌شده"
                        )}
                      </span>
                    </div>

                    <div className="gjv2-priority-controls">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() =>
                          reorderEnabled(index, -1)
                        }
                        aria-label={`${label} بالاتر`}
                      >
                        <ArrowIcon direction="up" />
                      </button>

                      <button
                        type="button"
                        disabled={
                          index ===
                          enabledItems.length - 1
                        }
                        onClick={() =>
                          reorderEnabled(index, 1)
                        }
                        aria-label={`${label} پایین‌تر`}
                      >
                        <ArrowIcon direction="down" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="gjv2-major-empty">
              <span>
                <AcademicIcon />
              </span>
              <strong>
                هنوز رشته‌ای انتخاب نشده است
              </strong>
              <p>
                از بخش بالا حداقل یک رشته را انتخاب کنید.
              </p>
            </div>
          )}
        </section>

        <GuidanceJourneyV2Nav
          previous={{
            label: "بازگشت به اولویت استان‌ها",
            onClick: () => router.push(guidanceJourneyV2StepPath(7)),
          }}
          next={{
            label: "ثبت و ادامه به معیارهای اولویت‌بندی",
            disabled: pending || !enabledItems.length,
            pending,
            pendingLabel: "در حال ثبت...",
          }}
        />
      </form>
    </GuidanceJourneyV2Shell>
  );
}

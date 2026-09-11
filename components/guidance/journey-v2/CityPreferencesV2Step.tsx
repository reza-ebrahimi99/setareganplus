"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { submitGuidanceV2Step7Action } from "@/app/portal/student/services/guidance/journey/steps/actions/step7";
import { GuidanceJourneyV2Nav } from "@/components/guidance/journey-v2/GuidanceJourneyV2Nav";
import { GuidanceJourneyV2Shell } from "@/components/guidance/journey-v2/GuidanceJourneyV2Shell";
import { guidanceJourneyV2StepPath } from "@/lib/guidance/journey-v2/steps";
import { getCitiesForProvince } from "@/lib/guidance/journey/reference-data/cities";
import { toPersianDigits } from "@/lib/persian";
import type { JourneyV2FormState } from "@/app/portal/student/services/guidance/journey/steps/actions/step1";
import type { GuidanceV2ProvincePreferenceItem } from "@/lib/guidance/journey-v2/steps/step7-city-preferences";
import type { GuidanceJourneySidebarStep } from "@/lib/guidance/journey/types";

type Props = {
  sidebarSteps: readonly GuidanceJourneySidebarStep[];
  completionPercentage: number;
  allProvinces: readonly string[];
  initialItems: GuidanceV2ProvincePreferenceItem[];
};

const initialState: JourneyV2FormState = {};

function LocationIcon() {
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
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function CityIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="21"
      height="21"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 21h18" />
      <path d="M5 21V8l5-3v16" />
      <path d="M10 21V3l9 4v14" />
      <path d="M7 11h1M7 15h1M13 9h2M13 13h2M13 17h2" />
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

function ArrowIcon({ direction }: { direction: "up" | "down" }) {
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

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function normalizeRanks(
  items: GuidanceV2ProvincePreferenceItem[],
) {
  return items.map((item, index) => ({
    ...item,
    enabled: true,
    rank: index + 1,
  }));
}

export function CityPreferencesV2Step({
  sidebarSteps,
  completionPercentage,
  allProvinces,
  initialItems,
}: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    submitGuidanceV2Step7Action,
    initialState,
  );

  const [items, setItems] = useState(
    normalizeRanks(initialItems.filter((item) => item.enabled)),
  );
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (state.ok) {
      router.replace(guidanceJourneyV2StepPath(8));
    }
  }, [state.ok, router]);

  const selectedNames = useMemo(
    () => new Set(items.map((item) => item.province)),
    [items],
  );

  const availableProvinces = useMemo(() => {
    const normalizedQuery = query.trim();
    return allProvinces.filter(
      (province) =>
        !selectedNames.has(province) &&
        (!normalizedQuery ||
          province.includes(normalizedQuery)),
    );
  }, [allProvinces, query, selectedNames]);

  const totalCities = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + item.cities.length,
        0,
      ),
    [items],
  );

  function addProvince(province: string) {
    const cities = [...getCitiesForProvince(province)];

    setItems((current) =>
      normalizeRanks([
        ...current,
        {
          province,
          enabled: true,
          rank: current.length + 1,
          cities,
        },
      ]),
    );
  }

  function removeProvince(province: string) {
    setItems((current) =>
      normalizeRanks(
        current.filter(
          (item) => item.province !== province,
        ),
      ),
    );
  }

  function toggleCity(province: string, city: string) {
    setItems((current) =>
      current.map((item) => {
        if (item.province !== province) return item;

        const selected = item.cities.includes(city);

        return {
          ...item,
          cities: selected
            ? item.cities.filter(
                (currentCity) => currentCity !== city,
              )
            : [...item.cities, city],
        };
      }),
    );
  }

  function selectAllCities(province: string) {
    setItems((current) =>
      current.map((item) =>
        item.province === province
          ? {
              ...item,
              cities: [
                ...getCitiesForProvince(province),
              ],
            }
          : item,
      ),
    );
  }

  function clearCities(province: string) {
    setItems((current) =>
      current.map((item) =>
        item.province === province
          ? { ...item, cities: [] }
          : item,
      ),
    );
  }

  function reorder(index: number, direction: -1 | 1) {
    setItems((current) => {
      const target = index + direction;

      if (
        target < 0 ||
        target >= current.length
      ) {
        return current;
      }

      const next = [...current];
      [next[index], next[target]] = [
        next[target],
        next[index],
      ];

      return normalizeRanks(next);
    });
  }

  return (
    <GuidanceJourneyV2Shell
      stepId={7}
      stepCount={18}
      title="اولویت استان‌ها"
      description="استان‌ها و شهرهایی را که برای ادامه تحصیل می‌پذیرید انتخاب کنید و ترتیب اولویت خود را مشخص کنید."
      sidebarSteps={sidebarSteps}
      completionPercentage={completionPercentage}
    >
      <form action={formAction} className="gjv2-form-card">
        <input
          type="hidden"
          name="items"
          value={JSON.stringify(items)}
        />

        {state.error ? (
          <div className="gjv2-banner gjv2-banner--error" role="alert">
            {state.error}
          </div>
        ) : null}

        <section className="gjv2-section">
          <div className="gjv2-section__heading">
            <span className="gjv2-section__number">۱</span>
            <div>
              <h2>استان‌های مورد قبول من</h2>
              <p>
                استان‌هایی را انتخاب کنید که حاضر هستید برای تحصیل
                در دانشگاه‌های آن‌ها بررسی شوید.
              </p>
            </div>
          </div>

          <div className="gjv2-geo-summary">
            <div className="gjv2-geo-summary__icon">
              <LocationIcon />
            </div>
            <div>
              <strong>
                {toPersianDigits(items.length)} استان انتخاب‌شده
              </strong>
              <span>
                {toPersianDigits(totalCities)} شهر در محدوده انتخاب شما
              </span>
            </div>
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
              placeholder="جستجوی نام استان..."
              aria-label="جستجوی استان"
            />
          </label>

          <div className="gjv2-province-grid">
            {availableProvinces.map((province) => (
              <button
                key={province}
                type="button"
                className="gjv2-province-card"
                onClick={() => addProvince(province)}
              >
                <span className="gjv2-province-card__icon">
                  <LocationIcon />
                </span>

                <span className="gjv2-province-card__name">
                  {province}
                </span>

                <span className="gjv2-province-card__add">
                  +
                </span>
              </button>
            ))}
          </div>

          {availableProvinces.length === 0 ? (
            <div className="gjv2-empty-inline">
              {query.trim()
                ? "استان دیگری با این عبارت پیدا نشد."
                : "همه استان‌ها به انتخاب‌های شما اضافه شده‌اند."}
            </div>
          ) : null}
        </section>

        <section className="gjv2-section">
          <div className="gjv2-section__heading">
            <span className="gjv2-section__number">۲</span>
            <div>
              <h2>شهرهای قابل قبول</h2>
              <p>
                برای هر استان، شهرهایی را نگه دارید که امکان تحصیل
                در آن‌ها برای شما وجود دارد.
              </p>
            </div>
          </div>

          {!items.length ? (
            <div className="gjv2-geo-empty">
              <span className="gjv2-geo-empty__icon">
                <CityIcon />
              </span>
              <strong>هنوز استانی انتخاب نشده است</strong>
              <p>
                از بخش بالا حداقل یک استان را انتخاب کنید.
              </p>
            </div>
          ) : (
            <div className="gjv2-city-groups">
              {items.map((item) => {
                const allCities = [
                  ...getCitiesForProvince(item.province),
                ];

                return (
                  <article
                    key={item.province}
                    className="gjv2-city-group"
                  >
                    <header className="gjv2-city-group__header">
                      <div className="gjv2-city-group__identity">
                        <span className="gjv2-city-group__icon">
                          <LocationIcon />
                        </span>
                        <div>
                          <strong>{item.province}</strong>
                          <span>
                            {toPersianDigits(item.cities.length)} از{" "}
                            {toPersianDigits(allCities.length)} شهر
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="gjv2-city-group__remove"
                        onClick={() =>
                          removeProvince(item.province)
                        }
                      >
                        حذف استان
                      </button>
                    </header>

                    <div className="gjv2-city-group__toolbar">
                      <button
                        type="button"
                        onClick={() =>
                          selectAllCities(item.province)
                        }
                      >
                        انتخاب همه
                      </button>
                      <span />
                      <button
                        type="button"
                        onClick={() =>
                          clearCities(item.province)
                        }
                      >
                        پاک کردن
                      </button>
                    </div>

                    <div className="gjv2-city-chips">
                      {allCities.map((city) => {
                        const selected =
                          item.cities.includes(city);

                        return (
                          <button
                            key={city}
                            type="button"
                            className={
                              selected
                                ? "gjv2-city-chip gjv2-city-chip--selected"
                                : "gjv2-city-chip"
                            }
                            aria-pressed={selected}
                            onClick={() =>
                              toggleCity(
                                item.province,
                                city,
                              )
                            }
                          >
                            <span className="gjv2-city-chip__check">
                              {selected ? <CheckIcon /> : null}
                            </span>
                            {city}
                          </button>
                        );
                      })}
                    </div>

                    {!item.cities.length ? (
                      <p className="gjv2-city-group__warning">
                        حداقل یک شهر از این استان را انتخاب کنید.
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="gjv2-section">
          <div className="gjv2-section__heading">
            <span className="gjv2-section__number">۳</span>
            <div>
              <h2>ترتیب اولویت استان‌ها</h2>
              <p>
                استان مهم‌تر را بالاتر قرار دهید. این ترتیب در
                پیشنهادهای انتخاب رشته شما استفاده خواهد شد.
              </p>
            </div>
          </div>

          {items.length ? (
            <div className="gjv2-priority-list">
              {items.map((item, index) => (
                <div
                  key={item.province}
                  className="gjv2-priority-item gjv2-priority-item--geo"
                >
                  <span className="gjv2-priority-rank">
                    {toPersianDigits(index + 1)}
                  </span>

                  <span className="gjv2-priority-item__icon">
                    <LocationIcon />
                  </span>

                  <div className="gjv2-priority-content">
                    <strong>{item.province}</strong>
                    <span>
                      {item.cities.length
                        ? `${toPersianDigits(
                            item.cities.length,
                          )} شهر انتخاب‌شده`
                        : "بدون شهر انتخاب‌شده"}
                    </span>
                  </div>

                  <div className="gjv2-priority-controls">
                    <button
                      type="button"
                      onClick={() => reorder(index, -1)}
                      disabled={index === 0}
                      aria-label={`${item.province} بالاتر`}
                    >
                      <ArrowIcon direction="up" />
                    </button>
                    <button
                      type="button"
                      onClick={() => reorder(index, 1)}
                      disabled={
                        index === items.length - 1
                      }
                      aria-label={`${item.province} پایین‌تر`}
                    >
                      <ArrowIcon direction="down" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="gjv2-priority-empty">
              بعد از انتخاب استان‌ها، ترتیب اولویت در این قسمت
              نمایش داده می‌شود.
            </div>
          )}
        </section>

        <GuidanceJourneyV2Nav
          previous={{
            label: "بازگشت به دوره‌های تحصیلی",
            onClick: () => router.push(guidanceJourneyV2StepPath(6)),
          }}
          next={{
            label: "ثبت و ادامه به اولویت رشته‌ها",
            disabled:
              pending ||
              !items.length ||
              items.some((item) => !item.cities.length),
            pending,
            pendingLabel: "در حال ثبت...",
          }}
        />
      </form>
    </GuidanceJourneyV2Shell>
  );
}

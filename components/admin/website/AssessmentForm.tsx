"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useActionState } from "react";
import {
  createAssessment,
  updateAssessment,
  type AssessmentActionState,
} from "@/app/admin/(dashboard)/website/assessments/actions";
import { AssessmentFeaturedControls } from "@/components/admin/website/AssessmentFeaturedControls";
import { JalaliDatePicker } from "@/components/booking/JalaliDatePicker";
import { ASSESSMENT_TYPE_LABELS } from "@/lib/assessment/types";
import {
  FEATURED_RESULTS_LIMIT_DEFAULT,
  FEATURED_RESULTS_LIMIT_MAX,
  FEATURED_RESULTS_LIMIT_MIN,
} from "@/lib/assessment/featured-constants";
import {
  formatJalaliDateAscii,
  utcToJalaliInTehran,
  type JalaliDate,
} from "@/lib/datetime/jalali";

type Option = { id: string; name: string };

type AssessmentFormProps = {
  mode: "create" | "edit";
  providers: Option[];
  grades: Option[];
  assessment?: {
    id: string;
    providerId: string;
    gradeId: string;
    title: string;
    slug: string;
    assessmentType: string;
    /** ISO Gregorian date string or empty; converted to Jalali in the form. */
    assessmentDateIso: string | null;
    schoolYear: string | null;
    participants: number | null;
    maxScore: number | null;
    description: string;
    isPublished: boolean;
    publishFeaturedResults: boolean;
    featuredResultsLimit: number;
    featuredCount: number;
    archivedAt: Date | null;
  };
};

const initial: AssessmentActionState = {};
const inputClass =
  "mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm";

function isoToJalali(iso: string | null | undefined): JalaliDate | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return utcToJalaliInTehran(date);
}

export function AssessmentForm({
  mode,
  providers,
  grades,
  assessment,
}: AssessmentFormProps) {
  const action = mode === "create" ? createAssessment : updateAssessment;
  const [state, formAction, pending] = useActionState(action, initial);
  const [assessmentDate, setAssessmentDate] = useState<JalaliDate | null>(() =>
    isoToJalali(assessment?.assessmentDateIso),
  );

  const dateAscii = useMemo(
    () =>
      assessmentDate
        ? formatJalaliDateAscii(
            assessmentDate.jy,
            assessmentDate.jm,
            assessmentDate.jd,
          )
        : "",
    [assessmentDate],
  );

  const limitDefault =
    assessment?.featuredResultsLimit ?? FEATURED_RESULTS_LIMIT_DEFAULT;

  return (
    <div className="space-y-5">
      {state.formError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {state.formError}
        </div>
      ) : null}
      {state.successMessage ? (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          {state.successMessage}
        </div>
      ) : null}

      <form action={formAction} className="admin-card space-y-5 p-5 sm:p-6">
        {mode === "edit" && assessment ? (
          <input type="hidden" name="assessmentId" value={assessment.id} />
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            <span className="font-medium text-primary">عنوان آزمون</span>
            <input
              name="title"
              required
              defaultValue={assessment?.title ?? ""}
              className={inputClass}
            />
            {state.fieldErrors?.title ? (
              <span className="mt-1 block text-xs text-red-700">
                {state.fieldErrors.title}
              </span>
            ) : null}
          </label>

          <label className="text-sm">
            <span className="font-medium text-primary">ارائه‌دهنده</span>
            <select
              name="providerId"
              required
              defaultValue={assessment?.providerId ?? ""}
              className={inputClass}
            >
              <option value="">انتخاب ارائه‌دهنده</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="font-medium text-primary">پایه</span>
            <select
              name="gradeId"
              required
              defaultValue={assessment?.gradeId ?? ""}
              className={inputClass}
            >
              <option value="">انتخاب پایه</option>
              {grades.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {grade.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="font-medium text-primary">نوع آزمون</span>
            <select
              name="assessmentType"
              required
              defaultValue={assessment?.assessmentType ?? "OTHER"}
              className={inputClass}
            >
              {Object.entries(ASSESSMENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="font-medium text-primary">سال تحصیلی</span>
            <input
              name="schoolYear"
              defaultValue={assessment?.schoolYear ?? ""}
              className={inputClass}
              placeholder="۱۴۰۴-۱۴۰۵"
            />
          </label>

          <div className="text-sm sm:col-span-2">
            <span className="font-medium text-primary">تاریخ آزمون</span>
            <p className="mt-1 text-xs leading-6 text-muted">
              تاریخ را به‌صورت شمسی انتخاب کنید. در پایگاه‌داده به‌صورت میلادی
              (UTC) ذخیره می‌شود. فاصله زمانی اجباری نیست.
            </p>
            <input type="hidden" name="assessmentDate" value={dateAscii} />
            <div className="mt-2 max-w-md">
              <JalaliDatePicker
                value={assessmentDate}
                onChange={setAssessmentDate}
                onClear={() => setAssessmentDate(null)}
                label="انتخاب تاریخ آزمون"
              />
            </div>
            {state.fieldErrors?.assessmentDate ? (
              <span className="mt-1 block text-xs text-red-700">
                {state.fieldErrors.assessmentDate}
              </span>
            ) : null}
          </div>

          <label className="text-sm">
            <span className="font-medium text-primary">اسلاگ</span>
            <input
              name="slug"
              defaultValue={assessment?.slug ?? ""}
              className={inputClass}
              dir="ltr"
              placeholder="خودکار از عنوان"
            />
          </label>

          <label className="text-sm">
            <span className="font-medium text-primary">تعداد شرکت‌کننده</span>
            <input
              name="participants"
              type="number"
              defaultValue={assessment?.participants ?? ""}
              className={inputClass}
              dir="ltr"
            />
          </label>

          <label className="text-sm">
            <span className="font-medium text-primary">حداکثر نمره</span>
            <input
              name="maxScore"
              type="number"
              step="any"
              defaultValue={assessment?.maxScore ?? ""}
              className={inputClass}
              dir="ltr"
            />
          </label>

          <label className="text-sm sm:col-span-2">
            <span className="font-medium text-primary">توضیحات</span>
            <textarea
              name="description"
              rows={5}
              defaultValue={assessment?.description ?? ""}
              className={inputClass}
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="inline-flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isPublished"
              value="true"
              defaultChecked={assessment?.isPublished ?? false}
            />
            انتشار صفحه آزمون
          </label>
          {mode === "edit" ? (
            <label className="inline-flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="archived"
                value="true"
                defaultChecked={Boolean(assessment?.archivedAt)}
              />
              بایگانی
            </label>
          ) : null}
        </div>

        <section
          aria-labelledby="featured-publish-heading"
          className="space-y-4 rounded-2xl border border-border/80 bg-background/60 p-4 sm:p-5"
        >
          <div>
            <h2
              id="featured-publish-heading"
              className="text-base font-semibold text-primary"
            >
              انتشار برترین‌ها در سایت
            </h2>
            <p className="mt-1 text-sm leading-7 text-muted">
              کارنامه کامل و جزئیات درسی فقط در پرتال اولیا و دانش‌آموزان قابل
              مشاهده است. در سایت عمومی حداکثر نام، تصویر، پایه، رتبه و تراز
              برترین‌های انتخاب‌شده نمایش داده می‌شود.
            </p>
          </div>

          <label className="inline-flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="publishFeaturedResults"
              value="true"
              defaultChecked={assessment?.publishFeaturedResults ?? false}
            />
            انتشار عمومی برترین‌ها
          </label>

          <label className="block max-w-xs text-sm">
            <span className="font-medium text-primary">
              تعداد برترین‌های هر پایه
            </span>
            <select
              name="featuredResultsLimit"
              defaultValue={String(limitDefault)}
              className={inputClass}
            >
              {Array.from(
                {
                  length:
                    FEATURED_RESULTS_LIMIT_MAX - FEATURED_RESULTS_LIMIT_MIN + 1,
                },
                (_, index) => FEATURED_RESULTS_LIMIT_MIN + index,
              ).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            {state.fieldErrors?.featuredResultsLimit ? (
              <span className="mt-1 block text-xs text-red-700">
                {state.fieldErrors.featuredResultsLimit}
              </span>
            ) : null}
          </label>

          {mode === "edit" && assessment ? (
            <p className="text-sm text-muted">
              تعداد برترین‌های فعلی انتخاب‌شده:{" "}
              <strong className="text-primary">{assessment.featuredCount}</strong>
            </p>
          ) : (
            <p className="text-sm text-muted">
              پس از ثبت آزمون و ورود نتایج، می‌توانید برترین‌ها را به‌صورت
              خودکار یا دستی انتخاب کنید.
            </p>
          )}
        </section>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={pending}
            className="min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {pending
              ? "در حال ذخیره…"
              : mode === "create"
                ? "ثبت آزمون"
                : "ذخیره تغییرات"}
          </button>
          <Link
            href="/admin/website/assessments"
            className="inline-flex min-h-11 items-center rounded-xl border border-border px-5 py-2.5 text-sm"
          >
            بازگشت
          </Link>
          {mode === "edit" && assessment ? (
            <Link
              href={`/admin/website/assessment-results/import?assessmentId=${assessment.id}`}
              className="inline-flex min-h-11 items-center rounded-xl border border-border px-5 py-2.5 text-sm"
            >
              ورود نتایج
            </Link>
          ) : null}
          {mode === "edit" && assessment ? (
            <Link
              href={`/admin/website/assessment-results?assessmentId=${assessment.id}`}
              className="inline-flex min-h-11 items-center rounded-xl border border-border px-5 py-2.5 text-sm"
            >
              مدیریت نتایج
            </Link>
          ) : null}
        </div>
      </form>

      {mode === "edit" && assessment ? (
        <AssessmentFeaturedControls
          assessmentId={assessment.id}
          featuredCount={assessment.featuredCount}
          featuredResultsLimit={assessment.featuredResultsLimit}
          publishFeaturedResults={assessment.publishFeaturedResults}
          isPublished={assessment.isPublished}
        />
      ) : null}
    </div>
  );
}

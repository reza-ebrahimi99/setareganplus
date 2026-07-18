"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  createAssessment,
  updateAssessment,
  type AssessmentActionState,
} from "@/app/admin/(dashboard)/website/assessments/actions";
import { ASSESSMENT_TYPE_LABELS } from "@/lib/assessment/types";

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
    assessmentDate: string;
    schoolYear: string | null;
    participants: number | null;
    maxScore: number | null;
    description: string;
    isPublished: boolean;
    archivedAt: Date | null;
  };
};

const initial: AssessmentActionState = {};
const inputClass =
  "mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm";

export function AssessmentForm({
  mode,
  providers,
  grades,
  assessment,
}: AssessmentFormProps) {
  const action = mode === "create" ? createAssessment : updateAssessment;
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <div className="space-y-5">
      {state.formError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.formError}
        </div>
      ) : null}
      {state.successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
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
            <span className="font-medium text-primary">تاریخ آزمون</span>
            <input
              name="assessmentDate"
              type="date"
              defaultValue={assessment?.assessmentDate ?? ""}
              className={inputClass}
              dir="ltr"
            />
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
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isPublished"
              value="true"
              defaultChecked={assessment?.isPublished ?? false}
            />
            انتشار عمومی
          </label>
          {mode === "edit" ? (
            <label className="inline-flex items-center gap-2 text-sm">
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

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {pending
              ? "در حال ذخیره…"
              : mode === "create"
                ? "ثبت آزمون"
                : "ذخیره تغییرات"}
          </button>
          <Link
            href="/admin/website/assessments"
            className="rounded-xl border border-border px-5 py-2.5 text-sm"
          >
            بازگشت
          </Link>
          {mode === "edit" && assessment ? (
            <Link
              href={`/admin/website/assessment-results/import?assessmentId=${assessment.id}`}
              className="rounded-xl border border-border px-5 py-2.5 text-sm"
            >
              ورود نتایج
            </Link>
          ) : null}
        </div>
      </form>
    </div>
  );
}

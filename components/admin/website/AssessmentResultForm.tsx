"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  createAssessmentResult,
  updateAssessmentResult,
  type ResultActionState,
} from "@/app/admin/(dashboard)/website/assessment-results/actions";

type Option = { id: string; name: string };

type AssessmentResultFormProps = {
  mode: "create" | "edit";
  students: Option[];
  assessments: Option[];
  result?: {
    id: string;
    studentId: string;
    assessmentId: string;
    score: number | null;
    scaledScore: number | null;
    rankSchool: number | null;
    rankCity: number | null;
    rankProvince: number | null;
    rankCountry: number | null;
    percentile: number | null;
    growth: number | null;
    averageClass: number | null;
    averageGrade: number | null;
    notes: string | null;
    isFeatured: boolean;
  };
};

const initial: ResultActionState = {};
const inputClass =
  "mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm";

export function AssessmentResultForm({
  mode,
  students,
  assessments,
  result,
}: AssessmentResultFormProps) {
  const action =
    mode === "create" ? createAssessmentResult : updateAssessmentResult;
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
        {mode === "edit" && result ? (
          <input type="hidden" name="resultId" value={result.id} />
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="font-medium text-primary">دانش‌آموز</span>
            <select
              name="studentId"
              required
              disabled={mode === "edit"}
              defaultValue={result?.studentId ?? ""}
              className={inputClass}
            >
              <option value="">انتخاب دانش‌آموز</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="font-medium text-primary">آزمون</span>
            <select
              name="assessmentId"
              required
              disabled={mode === "edit"}
              defaultValue={result?.assessmentId ?? ""}
              className={inputClass}
            >
              <option value="">انتخاب آزمون</option>
              {assessments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          {(
            [
              ["score", "نمره", result?.score],
              ["scaledScore", "تراز", result?.scaledScore],
              ["percentile", "درصد / صدک", result?.percentile],
              ["growth", "رشد", result?.growth],
              ["rankSchool", "رتبه مدرسه", result?.rankSchool],
              ["rankCity", "رتبه شهر", result?.rankCity],
              ["rankProvince", "رتبه استان", result?.rankProvince],
              ["rankCountry", "رتبه کشور", result?.rankCountry],
              ["averageClass", "میانگین کلاس", result?.averageClass],
              ["averageGrade", "میانگین پایه", result?.averageGrade],
            ] as const
          ).map(([name, label, value]) => (
            <label key={name} className="text-sm">
              <span className="font-medium text-primary">{label}</span>
              <input
                name={name}
                type="number"
                step="any"
                defaultValue={value ?? ""}
                className={inputClass}
                dir="ltr"
              />
            </label>
          ))}

          <label className="text-sm sm:col-span-2">
            <span className="font-medium text-primary">یادداشت</span>
            <textarea
              name="notes"
              rows={3}
              defaultValue={result?.notes ?? ""}
              className={inputClass}
            />
          </label>
        </div>

        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isFeatured"
            value="true"
            defaultChecked={result?.isFeatured ?? false}
          />
          نمایش ویژه
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {pending ? "در حال ذخیره…" : "ذخیره"}
          </button>
          <Link
            href="/admin/website/assessment-results"
            className="rounded-xl border border-border px-5 py-2.5 text-sm"
          >
            بازگشت
          </Link>
        </div>
      </form>
    </div>
  );
}

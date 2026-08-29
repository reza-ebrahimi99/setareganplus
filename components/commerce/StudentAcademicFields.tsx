"use client";

import { useState } from "react";
import {
  COMMERCE_STUDENT_GRADE_LABELS,
  COMMERCE_STUDENT_GRADES,
  COMMERCE_STUDENT_MAJOR_LABELS,
  COMMERCE_STUDENT_MAJORS,
  commerceGradeRequiresMajor,
} from "@/lib/commerce/student-fields";

type Props = {
  disabled?: boolean;
  defaultGrade?: string;
  defaultMajor?: string | null;
  required?: boolean;
};

export function StudentAcademicFields({
  disabled = false,
  defaultGrade = "",
  defaultMajor = "",
  required = true,
}: Props) {
  const [grade, setGrade] = useState(defaultGrade);
  const showMajor = commerceGradeRequiresMajor(grade);

  return (
    <>
      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">پایه تحصیلی</span>
        <select
          name="studentGrade"
          required={required}
          disabled={disabled}
          value={grade}
          onChange={(event) => setGrade(event.target.value)}
          className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2.5 disabled:opacity-60"
        >
          <option value="">انتخاب پایه</option>
          {COMMERCE_STUDENT_GRADES.map((value) => (
            <option key={value} value={value}>
              {COMMERCE_STUDENT_GRADE_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
      {showMajor ? (
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">رشته تحصیلی</span>
          <select
            name="studentMajor"
            required
            disabled={disabled}
            defaultValue={defaultMajor ?? ""}
            className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2.5 disabled:opacity-60"
          >
            <option value="">انتخاب رشته</option>
            {COMMERCE_STUDENT_MAJORS.map((value) => (
              <option key={value} value={value}>
                {COMMERCE_STUDENT_MAJOR_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </>
  );
}

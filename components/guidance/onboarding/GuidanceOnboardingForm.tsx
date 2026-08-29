"use client";

/**
 * Guidance Platform — external candidate onboarding form.
 */

import { useActionState, useState, type FormEvent } from "react";
import { OtpSubmitButton } from "@/components/auth/OtpSubmitButton";
import {
  submitGuidanceOnboardingAction,
  type GuidanceOnboardingFormState,
} from "@/app/portal/student/services/guidance/onboarding/actions";
import { HIGH_SCHOOL_MAJOR_OPTIONS } from "@/lib/guidance/onboarding";
import { IRAN_PROVINCES } from "@/lib/registration/iran-locations";

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

const labelClass = "block text-sm font-medium text-foreground";

type GuidanceOnboardingFormProps = {
  mobile: string;
};

const initial: GuidanceOnboardingFormState = {};

export function GuidanceOnboardingForm({ mobile }: GuidanceOnboardingFormProps) {
  const [state, action] = useActionState(submitGuidanceOnboardingAction, initial);
  const [clientError, setClientError] = useState<string | null>(null);

  function validate(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const required = [
      "fullName",
      "nationalId",
      "birthDate",
      "gender",
      "province",
      "city",
      "graduationYear",
      "highSchoolMajor",
      "schoolName",
    ] as const;
    for (const name of required) {
      const el = form.elements.namedItem(name);
      const value =
        el && "value" in el && typeof el.value === "string" ? el.value.trim() : "";
      if (!value) {
        event.preventDefault();
        setClientError("لطفاً همه فیلدهای الزامی را تکمیل کنید.");
        if (el instanceof HTMLElement) el.focus();
        return;
      }
    }
    setClientError(null);
  }

  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form
      action={action}
      noValidate
      onSubmit={validate}
      className="space-y-5"
      dir="rtl"
    >
      <input type="hidden" name="mobile" value={mobile} />

      {(clientError || state.error) && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {clientError ?? state.error}
        </p>
      )}

      <div>
        <label htmlFor="fullName" className={labelClass}>
          نام و نام خانوادگی
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          className={fieldClass}
          aria-invalid={Boolean(fieldErrors.fullName)}
        />
        {fieldErrors.fullName ? (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.fullName}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="nationalId" className={labelClass}>
            کد ملی
          </label>
          <input
            id="nationalId"
            name="nationalId"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            className={fieldClass}
            aria-invalid={Boolean(fieldErrors.nationalId)}
          />
          {fieldErrors.nationalId ? (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.nationalId}</p>
          ) : null}
        </div>
        <div>
          <label htmlFor="birthDate" className={labelClass}>
            تاریخ تولد
          </label>
          <input
            id="birthDate"
            name="birthDate"
            type="date"
            className={fieldClass}
            aria-invalid={Boolean(fieldErrors.birthDate)}
          />
          {fieldErrors.birthDate ? (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.birthDate}</p>
          ) : null}
        </div>
      </div>

      <div>
        <span className={labelClass}>جنسیت</span>
        <div className="mt-1.5 flex gap-4">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="radio" name="gender" value="MALE" />
            پسر
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="radio" name="gender" value="FEMALE" />
            دختر
          </label>
        </div>
        {fieldErrors.gender ? (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.gender}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="province" className={labelClass}>
            استان
          </label>
          <select
            id="province"
            name="province"
            className={fieldClass}
            defaultValue=""
            aria-invalid={Boolean(fieldErrors.province)}
          >
            <option value="" disabled>
              انتخاب استان
            </option>
            {IRAN_PROVINCES.map((province) => (
              <option key={province} value={province}>
                {province}
              </option>
            ))}
          </select>
          {fieldErrors.province ? (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.province}</p>
          ) : null}
        </div>
        <div>
          <label htmlFor="city" className={labelClass}>
            شهر
          </label>
          <input
            id="city"
            name="city"
            type="text"
            className={fieldClass}
            aria-invalid={Boolean(fieldErrors.city)}
          />
          {fieldErrors.city ? (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.city}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="graduationYear" className={labelClass}>
            سال فارغ‌التحصیلی (شمسی)
          </label>
          <input
            id="graduationYear"
            name="graduationYear"
            type="text"
            inputMode="numeric"
            placeholder="مثلاً ۱۴۰۴"
            className={fieldClass}
            aria-invalid={Boolean(fieldErrors.graduationYear)}
          />
          {fieldErrors.graduationYear ? (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.graduationYear}</p>
          ) : null}
        </div>
        <div>
          <label htmlFor="highSchoolMajor" className={labelClass}>
            رشته دبیرستان
          </label>
          <select
            id="highSchoolMajor"
            name="highSchoolMajor"
            className={fieldClass}
            defaultValue=""
            aria-invalid={Boolean(fieldErrors.highSchoolMajor)}
          >
            <option value="" disabled>
              انتخاب رشته
            </option>
            {HIGH_SCHOOL_MAJOR_OPTIONS.map((major) => (
              <option key={major.id} value={major.id}>
                {major.label}
              </option>
            ))}
          </select>
          {fieldErrors.highSchoolMajor ? (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.highSchoolMajor}</p>
          ) : null}
        </div>
      </div>

      <div>
        <label htmlFor="schoolName" className={labelClass}>
          نام مدرسه
        </label>
        <input
          id="schoolName"
          name="schoolName"
          type="text"
          className={fieldClass}
          aria-invalid={Boolean(fieldErrors.schoolName)}
        />
        {fieldErrors.schoolName ? (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.schoolName}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="mobileDisplay" className={labelClass}>
            موبایل
          </label>
          <input
            id="mobileDisplay"
            type="tel"
            value={mobile}
            readOnly
            className={`${fieldClass} bg-slate-50 text-muted`}
          />
        </div>
        <div>
          <label htmlFor="parentMobile" className={labelClass}>
            موبایل والد (اختیاری)
          </label>
          <input
            id="parentMobile"
            name="parentMobile"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className={fieldClass}
            aria-invalid={Boolean(fieldErrors.parentMobile)}
          />
          {fieldErrors.parentMobile ? (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.parentMobile}</p>
          ) : null}
        </div>
      </div>

      <OtpSubmitButton
        idleLabel="ثبت و ورود به سامانه هدایت"
        pendingLabel="در حال ثبت…"
      />
    </form>
  );
}

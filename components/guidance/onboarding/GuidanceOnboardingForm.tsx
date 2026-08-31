"use client";

/**
 * Guidance Platform — identity + academic intake with section autosave.
 * Client-only: serializable props + Server Actions. No Prisma / server modules.
 */

import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { OtpSubmitButton } from "@/components/auth/OtpSubmitButton";
import {
  saveGuidanceOnboardingDraftAction,
  submitGuidanceOnboardingAction,
  type GuidanceOnboardingFormState,
} from "@/app/portal/student/services/guidance/onboarding/actions";
import { GUIDANCE_QUOTA_OPTIONS } from "@/lib/guidance/journey/reference-data/quota";

const fieldClass = "";

const labelClass = "";

export type GuidanceOnboardingFormOption = {
  id: string;
  label: string;
};

export type GuidanceOnboardingInitial = {
  fullName: string;
  nationalId: string;
  birthDate: string;
  gender: string;
  province: string;
  city: string;
  graduationYear: string;
  highSchoolMajor: string;
  schoolName: string;
  parentMobile: string;
  quota: string;
};

type GuidanceOnboardingFormProps = {
  mobile: string;
  provinces: readonly string[];
  majors: readonly GuidanceOnboardingFormOption[];
  initial?: GuidanceOnboardingInitial;
  mode?: "onboarding" | "identity" | "academic";
  continueHref?: string;
};

const emptyInitial: GuidanceOnboardingInitial = {
  fullName: "",
  nationalId: "",
  birthDate: "",
  gender: "",
  province: "",
  city: "",
  graduationYear: "",
  highSchoolMajor: "",
  schoolName: "",
  parentMobile: "",
  quota: "",
};

const formInitial: GuidanceOnboardingFormState = {};

export function GuidanceOnboardingForm({
  mobile,
  provinces,
  majors,
  initial,
  mode = "onboarding",
  continueHref,
}: GuidanceOnboardingFormProps) {
  const values = { ...emptyInitial, ...initial };
  const [state, action] = useActionState(
    submitGuidanceOnboardingAction,
    formInitial,
  );
  const [clientError, setClientError] = useState<string | null>(null);
  const [saveLabel, setSaveLabel] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function queueAutosave() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void persistDraft();
    }, 700);
  }

  async function persistDraft() {
    const form = formRef.current;
    if (!form) return;
    setSaveLabel("saving");
    const result = await saveGuidanceOnboardingDraftAction(new FormData(form));
    setSaveLabel(result.ok ? "saved" : "error");
  }

  function validate(event: FormEvent<HTMLFormElement>) {
    if (mode !== "onboarding") {
      event.preventDefault();
      void persistDraft();
      return;
    }
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
      "quota",
    ] as const;
    for (const name of required) {
      const el = form.elements.namedItem(name);
      const value =
        el && "value" in el && typeof el.value === "string"
          ? el.value.trim()
          : "";
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
  const showIdentity = mode === "onboarding" || mode === "identity";
  const showAcademic = mode === "onboarding" || mode === "academic";

  return (
    <form
      ref={formRef}
      action={action}
      noValidate
      onSubmit={validate}
      onInput={queueAutosave}
      onChange={queueAutosave}
      className="chamber-sheet"
      dir="rtl"
    >
      <input type="hidden" name="mobile" value={mobile} />

      <p
        className={`chamber-save${saveLabel === "idle" ? "" : " is-on"}`}
        aria-live="polite"
      >
        {saveLabel === "saving"
          ? "…"
          : saveLabel === "saved"
            ? "ثبت شد"
            : saveLabel === "error"
              ? "ذخیره نشد"
              : ""}
      </p>

      {(clientError || state.error) && (
        <p className="chamber-alert" role="alert">
          {clientError ?? state.error}
        </p>
      )}

      {showIdentity ? (
        <section aria-labelledby="intake-identity">
          <header>
            <p>تصویر اول</p>
            <h2 id="intake-identity">کی هستید</h2>
            <p>نام و جای شما. اگر بروید، همین کلمات منتظر می‌مانند.</p>
          </header>

          <div>
            <label htmlFor="fullName" className={labelClass}>
              نام و نام خانوادگی
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              defaultValue={values.fullName}
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
                defaultValue={values.nationalId}
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
                defaultValue={values.birthDate}
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
                <input
                  type="radio"
                  name="gender"
                  value="MALE"
                  defaultChecked={values.gender === "MALE"}
                />
                پسر
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="gender"
                  value="FEMALE"
                  defaultChecked={values.gender === "FEMALE"}
                />
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
                defaultValue={values.province}
                aria-invalid={Boolean(fieldErrors.province)}
              >
                <option value="" disabled>
                  انتخاب استان
                </option>
                {provinces.map((province) => (
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
                defaultValue={values.city}
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
                defaultValue={values.parentMobile}
                className={fieldClass}
                aria-invalid={Boolean(fieldErrors.parentMobile)}
              />
              {fieldErrors.parentMobile ? (
                <p className="mt-1 text-xs text-red-600">
                  {fieldErrors.parentMobile}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      ) : (
        <>
          <input type="hidden" name="fullName" value={values.fullName} />
          <input type="hidden" name="nationalId" value={values.nationalId} />
          <input type="hidden" name="birthDate" value={values.birthDate} />
          <input type="hidden" name="gender" value={values.gender} />
          <input type="hidden" name="province" value={values.province} />
          <input type="hidden" name="city" value={values.city} />
          <input type="hidden" name="parentMobile" value={values.parentMobile} />
        </>
      )}

      {showAcademic ? (
        <section aria-labelledby="intake-academic">
          <header>
            <p>تصویر دوم</p>
            <h2 id="intake-academic">تصویر تحصیلی</h2>
            <p>مدرسه، سهمیه و سالی که از آن می‌آیید — زمینهٔ انتخاب، نه یک ردیف اداری.</p>
          </header>

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
                defaultValue={values.graduationYear}
                className={fieldClass}
                aria-invalid={Boolean(fieldErrors.graduationYear)}
              />
              {fieldErrors.graduationYear ? (
                <p className="mt-1 text-xs text-red-600">
                  {fieldErrors.graduationYear}
                </p>
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
                defaultValue={values.highSchoolMajor}
                aria-invalid={Boolean(fieldErrors.highSchoolMajor)}
              >
                <option value="" disabled>
                  انتخاب رشته
                </option>
                {majors.map((major) => (
                  <option key={major.id} value={major.id}>
                    {major.label}
                  </option>
                ))}
              </select>
              {fieldErrors.highSchoolMajor ? (
                <p className="mt-1 text-xs text-red-600">
                  {fieldErrors.highSchoolMajor}
                </p>
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
              defaultValue={values.schoolName}
              className={fieldClass}
              aria-invalid={Boolean(fieldErrors.schoolName)}
            />
            {fieldErrors.schoolName ? (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.schoolName}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="quota" className={labelClass}>
              سهمیه پذیرش
            </label>
            <select
              id="quota"
              name="quota"
              className={fieldClass}
              defaultValue={values.quota}
              aria-invalid={Boolean(fieldErrors.quota)}
            >
              <option value="" disabled>
                انتخاب سهمیه
              </option>
              {GUIDANCE_QUOTA_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            {fieldErrors.quota ? (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.quota}</p>
            ) : null}
          </div>
        </section>
      ) : (
        <>
          <input type="hidden" name="graduationYear" value={values.graduationYear} />
          <input type="hidden" name="highSchoolMajor" value={values.highSchoolMajor} />
          <input type="hidden" name="schoolName" value={values.schoolName} />
          <input type="hidden" name="quota" value={values.quota} />
        </>
      )}

      {mode === "onboarding" ? (
        <OtpSubmitButton
          idleLabel="ورود به دفتر"
          pendingLabel="در حال گشودن دفتر…"
        />
      ) : continueHref ? (
        <a href={continueHref} className="chamber-go">
          ادامه مسیر
        </a>
      ) : null}
    </form>
  );
}

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

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="chamber-field__error">{message}</p>;
}

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
            <p>کاغذ رسمی</p>
            <h2 id="intake-identity">کی هستید</h2>
          </header>

          <div className="chamber-field">
            <label htmlFor="fullName">نام و نام خانوادگی</label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              defaultValue={values.fullName}
              aria-invalid={Boolean(fieldErrors.fullName)}
            />
            <FieldError message={fieldErrors.fullName} />
          </div>

          <div className="chamber-field">
            <label htmlFor="nationalId">کد ملی</label>
            <input
              id="nationalId"
              name="nationalId"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              defaultValue={values.nationalId}
              aria-invalid={Boolean(fieldErrors.nationalId)}
            />
            <FieldError message={fieldErrors.nationalId} />
          </div>

          <div className="chamber-field">
            <label htmlFor="birthDate">تاریخ تولد</label>
            <input
              id="birthDate"
              name="birthDate"
              type="date"
              defaultValue={values.birthDate}
              aria-invalid={Boolean(fieldErrors.birthDate)}
            />
            <FieldError message={fieldErrors.birthDate} />
          </div>

          <div className="chamber-field">
            <span>جنسیت</span>
            <div className="chamber-choice">
              <label>
                <input
                  type="radio"
                  name="gender"
                  value="MALE"
                  defaultChecked={values.gender === "MALE"}
                />
                پسر
              </label>
              <label>
                <input
                  type="radio"
                  name="gender"
                  value="FEMALE"
                  defaultChecked={values.gender === "FEMALE"}
                />
                دختر
              </label>
            </div>
            <FieldError message={fieldErrors.gender} />
          </div>

          <div className="chamber-field">
            <label htmlFor="province">استان</label>
            <select
              id="province"
              name="province"
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
            <FieldError message={fieldErrors.province} />
          </div>

          <div className="chamber-field">
            <label htmlFor="city">شهر</label>
            <input
              id="city"
              name="city"
              type="text"
              defaultValue={values.city}
              aria-invalid={Boolean(fieldErrors.city)}
            />
            <FieldError message={fieldErrors.city} />
          </div>

          <div className="chamber-field">
            <label htmlFor="mobileDisplay">موبایل</label>
            <input id="mobileDisplay" type="tel" value={mobile} readOnly />
          </div>

          <div className="chamber-field">
            <label htmlFor="parentMobile">موبایل والد (اختیاری)</label>
            <input
              id="parentMobile"
              name="parentMobile"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              defaultValue={values.parentMobile}
              aria-invalid={Boolean(fieldErrors.parentMobile)}
            />
            <FieldError message={fieldErrors.parentMobile} />
          </div>

          {mode === "identity" ? (
            <div className="chamber-sign">
              <p>امضا</p>
              <strong>رضا ابراهیمی</strong>
            </div>
          ) : null}
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
            <p>گواهی تحصیلی</p>
            <h2 id="intake-academic">تصویر تحصیلی</h2>
          </header>

          <div className="chamber-field">
            <label htmlFor="graduationYear">سال فارغ‌التحصیلی (شمسی)</label>
            <input
              id="graduationYear"
              name="graduationYear"
              type="text"
              inputMode="numeric"
              placeholder="مثلاً ۱۴۰۴"
              defaultValue={values.graduationYear}
              aria-invalid={Boolean(fieldErrors.graduationYear)}
            />
            <FieldError message={fieldErrors.graduationYear} />
          </div>

          <div className="chamber-field">
            <label htmlFor="highSchoolMajor">رشته دبیرستان</label>
            <select
              id="highSchoolMajor"
              name="highSchoolMajor"
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
            <FieldError message={fieldErrors.highSchoolMajor} />
          </div>

          <div className="chamber-field">
            <label htmlFor="schoolName">نام مدرسه</label>
            <input
              id="schoolName"
              name="schoolName"
              type="text"
              defaultValue={values.schoolName}
              aria-invalid={Boolean(fieldErrors.schoolName)}
            />
            <FieldError message={fieldErrors.schoolName} />
          </div>

          <div className="chamber-field">
            <label htmlFor="quota">سهمیه پذیرش</label>
            <select
              id="quota"
              name="quota"
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
            <FieldError message={fieldErrors.quota} />
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
          className="chamber-go"
        />
      ) : continueHref ? (
        <a href={continueHref} className="chamber-go">
          ادامه مسیر
        </a>
      ) : null}
    </form>
  );
}

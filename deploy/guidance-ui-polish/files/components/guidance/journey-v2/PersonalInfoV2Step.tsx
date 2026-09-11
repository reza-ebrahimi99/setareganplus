"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  submitGuidanceV2Step1Action,
  type JourneyV2FormState,
} from "@/app/portal/student/services/guidance/journey/steps/actions/step1";
import { GuidanceJourneyV2Nav } from "@/components/guidance/journey-v2/GuidanceJourneyV2Nav";
import { GuidanceJourneyV2Shell } from "@/components/guidance/journey-v2/GuidanceJourneyV2Shell";
import { RequiredStar } from "@/components/guidance/journey-v2/GuidanceV2Icons";
import {
  JalaliBirthDateSelects,
  type JalaliBirthDateParts,
} from "@/components/registration/JalaliBirthDateSelects";
import { GUIDANCE_QUOTA_OPTIONS } from "@/lib/guidance/journey/reference-data/quota";
import { guidanceJourneyV2StepPath } from "@/lib/guidance/journey-v2/steps";
import type { GuidanceJourneySidebarStep } from "@/lib/guidance/journey/types";

const initial: JourneyV2FormState = {};

function parts(value: string): JalaliBirthDateParts {
  const m = /^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/.exec(value);

  return m
    ? {
        birthYear: m[1]!,
        birthMonth: String(Number(m[2])),
        birthDay: String(Number(m[3])),
      }
    : { birthYear: "", birthMonth: "", birthDay: "" };
}

export function PersonalInfoV2Step(props: {
  sidebarSteps: readonly GuidanceJourneySidebarStep[];
  completionPercentage: number;
  mobile: string;
  provinces: readonly string[];
  prefill: Record<string, string>;
}) {
  const router = useRouter();
  const [state, action] = useActionState(submitGuidanceV2Step1Action, initial);

  const [dob, setDob] = useState<JalaliBirthDateParts>(() =>
    parts(props.prefill.birthDateJalali ?? ""),
  );

  const dobValue = useMemo(
    () =>
      dob.birthYear && dob.birthMonth && dob.birthDay
        ? `${dob.birthYear}/${dob.birthMonth.padStart(2, "0")}/${dob.birthDay.padStart(2, "0")}`
        : "",
    [dob],
  );

  if (state.ok) {
    router.replace(guidanceJourneyV2StepPath(2));
  }

  const e = state.fieldErrors ?? {};

  return (
    <GuidanceJourneyV2Shell
      stepId={1}
      stepCount={18}
      title="ثبت اطلاعات اولیه"
      description="اطلاعات فردی دانش‌آموز را دقیق و مطابق مدارک رسمی وارد کنید."
      sidebarSteps={props.sidebarSteps}
      completionPercentage={props.completionPercentage}
    >
      <form action={action} className="gjv2-form-card" noValidate>
        {state.error ? (
          <p className="gpj-banner gpj-banner--error" role="alert">
            {state.error}
          </p>
        ) : null}

        <div className="gjv2-form-grid">
          <Field
            label="نام"
            name="firstName"
            defaultValue={props.prefill.firstName}
            error={e.firstName}
          />

          <Field
            label="نام خانوادگی"
            name="lastName"
            defaultValue={props.prefill.lastName}
            error={e.lastName}
          />

          <Field
            label="کد ملی"
            name="nationalId"
            defaultValue={props.prefill.nationalId}
            error={e.nationalId}
            inputMode="numeric"
          />

          <div className="gjv2-form-field">
            <label className="gjv2-form-label">
              شماره موبایل اصلی
              <RequiredStar />
            </label>
            <input
              className="gjv2-form-input gjv2-form-input--readonly"
              value={props.mobile}
              readOnly
              disabled
            />
            <p className="gjv2-form-hint">
              این شماره از ورود با رمز یکبارمصرف ثبت شده است.
            </p>
          </div>

          <div className="gjv2-form-field">
            <label className="gjv2-form-label" htmlFor="alternateMobile">
              شماره تماس دوم
            </label>
            <input
              id="alternateMobile"
              name="alternateMobile"
              defaultValue={props.prefill.alternateMobile ?? ""}
              inputMode="tel"
              placeholder="مثلاً 09121234567"
              className="gjv2-form-input"
              aria-invalid={Boolean(e.alternateMobile)}
            />
            <p className="gjv2-form-hint">
              در صورت در دسترس نبودن شماره اصلی با این شماره تماس می‌گیریم.
            </p>
            {e.alternateMobile ? (
              <p className="gjv2-form-error">{e.alternateMobile}</p>
            ) : null}
          </div>

          <div className="gjv2-form-field">
            <span className="gjv2-form-label">
              جنسیت
              <RequiredStar />
            </span>

            <div className="gjv2-gender-grid">
              <label className="gjv2-gender-card">
                <input
                  type="radio"
                  name="gender"
                  value="MALE"
                  defaultChecked={props.prefill.gender === "MALE"}
                />
                <span className="gjv2-gender-icon">👨‍🎓</span>
                <strong>پسر</strong>
              </label>

              <label className="gjv2-gender-card">
                <input
                  type="radio"
                  name="gender"
                  value="FEMALE"
                  defaultChecked={props.prefill.gender === "FEMALE"}
                />
                <span className="gjv2-gender-icon">👩‍🎓</span>
                <strong>دختر</strong>
              </label>
            </div>

            {e.gender ? <p className="gjv2-form-error">{e.gender}</p> : null}
          </div>

          <div className="gjv2-form-field gjv2-form-field--wide">
            <span className="gjv2-form-label">
              تاریخ تولد شمسی
              <RequiredStar />
            </span>

            <JalaliBirthDateSelects
              value={dob}
              onChange={setDob}
              hasError={Boolean(e.birthDateJalali)}
              minYear={1320}
              maxYear={1405}
            />

            <input type="hidden" name="birthDateJalali" value={dobValue} />

            {e.birthDateJalali ? (
              <p className="gjv2-form-error">{e.birthDateJalali}</p>
            ) : null}
          </div>

          <Select
            label="استان بومی"
            name="nativeProvince"
            defaultValue={props.prefill.nativeProvince}
            error={e.nativeProvince}
            options={props.provinces.map((value) => ({
              value,
              label: value,
            }))}
          />

          <Select
            label="سهمیه مناطق"
            name="regionQuota"
            defaultValue={props.prefill.regionQuota}
            error={e.regionQuota}
            options={[1, 2, 3].map((value) => ({
              value: String(value),
              label: `منطقه ${value}`,
            }))}
          />

          <Select
            label="سهمیه خاص"
            name="specialQuota"
            defaultValue={props.prefill.specialQuota || "NORMAL"}
            error={e.specialQuota}
            options={GUIDANCE_QUOTA_OPTIONS.map((value) => ({
              value: value.id,
              label: value.label,
            }))}
          />

          <Field
            label="معدل نهایی"
            name="highSchoolAverage"
            defaultValue={props.prefill.highSchoolAverage}
            error={e.highSchoolAverage}
            inputMode="decimal"
          />
        </div>

        <GuidanceJourneyV2Nav
          leading={
            <span className="gjv2-required-note">
              <RequiredStar />
              موارد ستاره‌دار اجباری هستند.
            </span>
          }
          next={{ label: "ذخیره و رفتن به مرحله بعد" }}
        />
      </form>
    </GuidanceJourneyV2Shell>
  );
}

function Field({
  label,
  name,
  defaultValue,
  error,
  inputMode,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  error?: string;
  inputMode?: "numeric" | "decimal";
}) {
  return (
    <div className="gjv2-form-field">
      <label className="gjv2-form-label" htmlFor={name}>
        {label}
        <RequiredStar />
      </label>

      <input
        id={name}
        name={name}
        defaultValue={defaultValue}
        inputMode={inputMode}
        className="gjv2-form-input"
        aria-invalid={Boolean(error)}
      />

      {error ? <p className="gjv2-form-error">{error}</p> : null}
    </div>
  );
}

function Select({
  label,
  name,
  defaultValue,
  error,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  error?: string;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <div className="gjv2-form-field">
      <label className="gjv2-form-label" htmlFor={name}>
        {label}
        <RequiredStar />
      </label>

      <select
        id={name}
        name={name}
        defaultValue={defaultValue || ""}
        className="gjv2-form-select"
        aria-invalid={Boolean(error)}
      >
        <option value="" disabled>
          انتخاب کنید
        </option>

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error ? <p className="gjv2-form-error">{error}</p> : null}
    </div>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Gender,
  RegistrationParentRelationship,
} from "@/generated/prisma/enums";
import { JalaliDatePicker } from "@/components/booking/JalaliDatePicker";
import {
  RegistrationField,
  registrationControlClass,
} from "@/components/registration/Field";
import { RegistrationStepper } from "@/components/registration/RegistrationStepper";
import { submitRegistrationAction } from "@/app/ghalamchi/register/actions";
import { formatRials } from "@/lib/registration/format";
import { IRAN_PROVINCES } from "@/lib/registration/iran-locations";
import type { RegistrationFlowCatalog } from "@/lib/registration/types";
import {
  PARENT_RELATIONSHIP_LABELS,
  type DetailsStepInput,
  type ParentStepInput,
  type StudentStepInput,
} from "@/lib/registration/types";
import {
  resolvePricing,
  validateDetailsStep,
  validateParentStep,
  validateStudentStep,
} from "@/lib/registration/validate";
import {
  REGISTRATION_GRADES,
  REGISTRATION_MAJORS,
  registrationGradeRequiresMajor,
} from "@/lib/registration/options";
import { toPersianDigits } from "@/lib/persian";

const STEPS = [
  { id: 1, label: "دانش‌آموز" },
  { id: 2, label: "ولی" },
  { id: 3, label: "ثبت‌نام" },
  { id: 4, label: "بازبینی" },
  { id: 5, label: "پرداخت" },
] as const;

const GENDER_LABELS: Record<Gender, string> = {
  MALE: "پسر",
  FEMALE: "دختر",
  UNSPECIFIED: "ترجیح می‌دهم نگویم",
};

type RegistrationWizardProps = {
  catalog: RegistrationFlowCatalog;
};

function emptyStudent(): StudentStepInput {
  return {
    firstName: "",
    lastName: "",
    nationalCode: "",
    birthDate: null,
    gender: "",
    gradeSlug: "",
    gradeLabel: "",
    majorSlug: "",
    majorLabel: "",
    schoolName: "",
    province: "تهران",
    city: "نسیم‌شهر",
  };
}

function emptyParent(): ParentStepInput {
  return {
    parentName: "",
    relationship: "",
    mobile: "",
    secondaryMobile: "",
    email: "",
    address: "",
  };
}

function emptyDetails(): DetailsStepInput {
  return {
    productKey: "",
    sessionKey: "",
    packageKey: "",
    venueBranchKey: "",
    discountCode: "",
  };
}

export function RegistrationWizard({ catalog }: RegistrationWizardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState(1);
  const [student, setStudent] = useState<StudentStepInput>(emptyStudent);
  const [parent, setParent] = useState<ParentStepInput>(emptyParent);
  const [details, setDetails] = useState<DetailsStepInput>(emptyDetails);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const [agreed, setAgreed] = useState(false);

  const pricing = useMemo(
    () => resolvePricing(catalog.flowKey, details),
    [catalog.flowKey, details],
  );

  const majorRequired = registrationGradeRequiresMajor(student.gradeSlug);

  function goNext() {
    setFormError(null);
    if (step === 1) {
      const result = validateStudentStep(student);
      if (!result.ok) {
        setErrors(result.errors);
        return;
      }
      setErrors({});
      setStep(2);
      return;
    }
    if (step === 2) {
      const result = validateParentStep(parent);
      if (!result.ok) {
        setErrors(result.errors);
        return;
      }
      setErrors({});
      setStep(3);
      return;
    }
    if (step === 3) {
      const result = validateDetailsStep(catalog.flowKey, details);
      if (!result.ok) {
        setErrors(result.errors);
        return;
      }
      setErrors({});
      setStep(4);
      return;
    }
    if (step === 4) {
      setStep(5);
    }
  }

  function goBack() {
    setFormError(null);
    setErrors({});
    setStep((current) => Math.max(1, current - 1));
  }

  function submitPayment() {
    if (!agreed) {
      setFormError("برای ادامه، پذیرش قوانین و شرایط الزامی است.");
      return;
    }

    const birthDate = student.birthDate;
    const gender = student.gender;
    const relationship = parent.relationship;
    if (!birthDate || !gender || !relationship) {
      setFormError("اطلاعات فرم ناقص است. لطفاً مراحل قبل را تکمیل کنید.");
      return;
    }

    startTransition(async () => {
      const result = await submitRegistrationAction({
        flowKey: catalog.flowKey,
        honeypot,
        student: {
          firstName: student.firstName,
          lastName: student.lastName,
          nationalCode: student.nationalCode,
          birthDate,
          gender,
          gradeLabel: student.gradeLabel,
          majorLabel: student.majorLabel || null,
          schoolName: student.schoolName,
          province: student.province,
          city: student.city,
        },
        parent: {
          parentName: parent.parentName,
          relationship,
          mobile: parent.mobile,
          secondaryMobile: parent.secondaryMobile || null,
          email: parent.email,
          address: parent.address || null,
        },
        details: {
          productKey: details.productKey,
          sessionKey: details.sessionKey,
          packageKey: details.packageKey,
          venueBranchKey: details.venueBranchKey,
          discountCode: details.discountCode || null,
        },
      });

      if (!result.ok) {
        setFormError(result.error);
        if (result.fieldErrors) setErrors(result.fieldErrors);
        return;
      }

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }

      router.push(
        `/ghalamchi/register/receipt/${encodeURIComponent(result.registrationNumber)}`,
      );
    });
  }

  return (
    <div className="registration-wizard relative rounded-3xl border border-border bg-surface p-5 shadow-[0_12px_40px_rgb(15_23_42_/_0.06)] sm:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-primary sm:text-2xl">
          {catalog.title}
        </h1>
        <p className="mt-2 text-sm leading-7 text-muted">{catalog.subtitle}</p>
      </div>

      <RegistrationStepper steps={STEPS} currentStep={step} />

      {formError ? (
        <div
          className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger"
          role="alert"
        >
          {formError}
        </div>
      ) : null}

      <div className="registration-step-panel space-y-5" key={step}>
        {step === 1 ? (
          <StudentStep
            value={student}
            errors={errors}
            majorRequired={majorRequired}
            onChange={setStudent}
          />
        ) : null}

        {step === 2 ? (
          <ParentStep value={parent} errors={errors} onChange={setParent} />
        ) : null}

        {step === 3 ? (
          <DetailsStep
            catalog={catalog}
            value={details}
            errors={errors}
            pricing={pricing}
            onChange={setDetails}
          />
        ) : null}

        {step === 4 ? (
          <ReviewStep
            student={student}
            parent={parent}
            details={details}
            pricing={pricing}
            onEdit={setStep}
          />
        ) : null}

        {step === 5 ? (
          <PaymentStep
            student={student}
            parent={parent}
            details={details}
            pricing={pricing}
            pending={pending}
            agreed={agreed}
            onAgreedChange={setAgreed}
            onPay={submitPayment}
            onEdit={setStep}
          />
        ) : null}
      </div>

      {/* Honeypot */}
      <div className="absolute -left-[9999px] opacity-0" aria-hidden="true">
        <label htmlFor="company_url">Company</label>
        <input
          id="company_url"
          name="company_url"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
        />
      </div>

      {step < 5 ? (
        <div className="public-form-submit-bar mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 1 || pending}
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-white px-5 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:opacity-40"
          >
            مرحله قبل
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={pending}
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary/92 disabled:opacity-60"
          >
            {step === 4 ? "ادامه به پرداخت" : "مرحله بعد"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function StudentStep({
  value,
  errors,
  majorRequired,
  onChange,
}: {
  value: StudentStepInput;
  errors: Record<string, string>;
  majorRequired: boolean;
  onChange: (value: StudentStepInput) => void;
}) {
  return (
    <section aria-labelledby="student-step-title" className="space-y-4">
      <h2 id="student-step-title" className="text-base font-semibold text-primary">
        اطلاعات دانش‌آموز
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <RegistrationField id="firstName" label="نام" required error={errors.firstName}>
          <input
            id="firstName"
            className={registrationControlClass(Boolean(errors.firstName))}
            value={value.firstName}
            onChange={(e) => onChange({ ...value, firstName: e.target.value })}
            autoComplete="given-name"
          />
        </RegistrationField>
        <RegistrationField
          id="lastName"
          label="نام خانوادگی"
          required
          error={errors.lastName}
        >
          <input
            id="lastName"
            className={registrationControlClass(Boolean(errors.lastName))}
            value={value.lastName}
            onChange={(e) => onChange({ ...value, lastName: e.target.value })}
            autoComplete="family-name"
          />
        </RegistrationField>
      </div>

      <RegistrationField
        id="nationalCode"
        label="کد ملی"
        required
        error={errors.nationalCode}
      >
        <input
          id="nationalCode"
          inputMode="numeric"
          className={registrationControlClass(Boolean(errors.nationalCode))}
          value={value.nationalCode}
          onChange={(e) => onChange({ ...value, nationalCode: e.target.value })}
        />
      </RegistrationField>

      <RegistrationField
        id="birthDate"
        label="تاریخ تولد (شمسی)"
        required
        error={errors.birthDate}
      >
        <JalaliDatePicker
          value={value.birthDate}
          onChange={(birthDate) => onChange({ ...value, birthDate })}
          onClear={() => onChange({ ...value, birthDate: null })}
          label="انتخاب تاریخ تولد"
          max={{ jy: 1405, jm: 12, jd: 29 }}
        />
      </RegistrationField>

      <RegistrationField id="gender" label="جنسیت" required error={errors.gender}>
        <select
          id="gender"
          className={registrationControlClass(Boolean(errors.gender))}
          value={value.gender}
          onChange={(e) =>
            onChange({ ...value, gender: e.target.value as Gender | "" })
          }
        >
          <option value="">انتخاب کنید</option>
          {(Object.keys(GENDER_LABELS) as Gender[]).map((key) => (
            <option key={key} value={key}>
              {GENDER_LABELS[key]}
            </option>
          ))}
        </select>
      </RegistrationField>

      <div className="grid gap-4 sm:grid-cols-2">
        <RegistrationField
          id="gradeSlug"
          label="پایه"
          required
          error={errors.gradeSlug}
        >
          <select
            id="gradeSlug"
            className={registrationControlClass(Boolean(errors.gradeSlug))}
            value={value.gradeSlug}
            onChange={(e) => {
              const grade = REGISTRATION_GRADES.find(
                (item) => item.slug === e.target.value,
              );
              const needsMajor = registrationGradeRequiresMajor(e.target.value);
              onChange({
                ...value,
                gradeSlug: e.target.value,
                gradeLabel: grade?.name ?? "",
                majorSlug: needsMajor ? value.majorSlug : "",
                majorLabel: needsMajor ? value.majorLabel : "",
              });
            }}
          >
            <option value="">انتخاب پایه</option>
            {REGISTRATION_GRADES.map((grade) => (
              <option key={grade.slug} value={grade.slug}>
                {grade.name}
              </option>
            ))}
          </select>
        </RegistrationField>

        <RegistrationField
          id="majorSlug"
          label="رشته"
          required={majorRequired}
          error={errors.majorSlug}
          hint={majorRequired ? undefined : "برای پایه‌های دهم تا دوازدهم"}
        >
          <select
            id="majorSlug"
            disabled={!majorRequired}
            className={registrationControlClass(Boolean(errors.majorSlug))}
            value={value.majorSlug}
            onChange={(e) => {
              const major = REGISTRATION_MAJORS.find(
                (item) => item.slug === e.target.value,
              );
              onChange({
                ...value,
                majorSlug: e.target.value,
                majorLabel: major?.name ?? "",
              });
            }}
          >
            <option value="">انتخاب رشته</option>
            {REGISTRATION_MAJORS.map((major) => (
              <option key={major.slug} value={major.slug}>
                {major.name}
              </option>
            ))}
          </select>
        </RegistrationField>
      </div>

      <RegistrationField
        id="schoolName"
        label="نام مدرسه"
        required
        error={errors.schoolName}
      >
        <input
          id="schoolName"
          className={registrationControlClass(Boolean(errors.schoolName))}
          value={value.schoolName}
          onChange={(e) => onChange({ ...value, schoolName: e.target.value })}
        />
      </RegistrationField>

      <div className="grid gap-4 sm:grid-cols-2">
        <RegistrationField
          id="province"
          label="استان"
          required
          error={errors.province}
        >
          <select
            id="province"
            className={registrationControlClass(Boolean(errors.province))}
            value={value.province}
            onChange={(e) => onChange({ ...value, province: e.target.value })}
          >
            {IRAN_PROVINCES.map((province) => (
              <option key={province} value={province}>
                {province}
              </option>
            ))}
          </select>
        </RegistrationField>
        <RegistrationField id="city" label="شهر" required error={errors.city}>
          <input
            id="city"
            className={registrationControlClass(Boolean(errors.city))}
            value={value.city}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
          />
        </RegistrationField>
      </div>
    </section>
  );
}

function ParentStep({
  value,
  errors,
  onChange,
}: {
  value: ParentStepInput;
  errors: Record<string, string>;
  onChange: (value: ParentStepInput) => void;
}) {
  return (
    <section aria-labelledby="parent-step-title" className="space-y-4">
      <h2 id="parent-step-title" className="text-base font-semibold text-primary">
        اطلاعات ولی
      </h2>
      <RegistrationField
        id="parentName"
        label="نام ولی"
        required
        error={errors.parentName}
      >
        <input
          id="parentName"
          className={registrationControlClass(Boolean(errors.parentName))}
          value={value.parentName}
          onChange={(e) => onChange({ ...value, parentName: e.target.value })}
        />
      </RegistrationField>

      <RegistrationField
        id="relationship"
        label="نسبت"
        required
        error={errors.relationship}
      >
        <select
          id="relationship"
          className={registrationControlClass(Boolean(errors.relationship))}
          value={value.relationship}
          onChange={(e) =>
            onChange({
              ...value,
              relationship: e.target.value as RegistrationParentRelationship | "",
            })
          }
        >
          <option value="">انتخاب کنید</option>
          {(
            Object.keys(PARENT_RELATIONSHIP_LABELS) as RegistrationParentRelationship[]
          ).map((key) => (
            <option key={key} value={key}>
              {PARENT_RELATIONSHIP_LABELS[key]}
            </option>
          ))}
        </select>
      </RegistrationField>

      <div className="grid gap-4 sm:grid-cols-2">
        <RegistrationField
          id="mobile"
          label="موبایل"
          required
          error={errors.mobile}
        >
          <input
            id="mobile"
            inputMode="tel"
            dir="ltr"
            className={`${registrationControlClass(Boolean(errors.mobile))} text-left`}
            value={value.mobile}
            onChange={(e) => onChange({ ...value, mobile: e.target.value })}
            placeholder="09xxxxxxxxx"
          />
        </RegistrationField>
        <RegistrationField
          id="secondaryMobile"
          label="موبایل دوم"
          error={errors.secondaryMobile}
        >
          <input
            id="secondaryMobile"
            inputMode="tel"
            dir="ltr"
            className={`${registrationControlClass(Boolean(errors.secondaryMobile))} text-left`}
            value={value.secondaryMobile}
            onChange={(e) =>
              onChange({ ...value, secondaryMobile: e.target.value })
            }
          />
        </RegistrationField>
      </div>

      <RegistrationField id="email" label="ایمیل" required error={errors.email}>
        <input
          id="email"
          type="email"
          dir="ltr"
          className={`${registrationControlClass(Boolean(errors.email))} text-left`}
          value={value.email}
          onChange={(e) => onChange({ ...value, email: e.target.value })}
          autoComplete="email"
        />
      </RegistrationField>

      <RegistrationField id="address" label="آدرس" error={errors.address}>
        <textarea
          id="address"
          rows={3}
          className={registrationControlClass(Boolean(errors.address))}
          value={value.address}
          onChange={(e) => onChange({ ...value, address: e.target.value })}
        />
      </RegistrationField>
    </section>
  );
}

function DetailsStep({
  catalog,
  value,
  errors,
  pricing,
  onChange,
}: {
  catalog: RegistrationFlowCatalog;
  value: DetailsStepInput;
  errors: Record<string, string>;
  pricing: ReturnType<typeof resolvePricing>;
  onChange: (value: DetailsStepInput) => void;
}) {
  return (
    <section aria-labelledby="details-step-title" className="space-y-4">
      <h2 id="details-step-title" className="text-base font-semibold text-primary">
        جزئیات ثبت‌نام
      </h2>
      <p className="text-sm text-muted">
        این بخش برای هر نوع ثبت‌نام (آزمون، کلاس، اردو و …) قابل استفاده است.
      </p>

      <OptionCards
        label="انتخاب آزمون"
        error={errors.productKey}
        options={catalog.products}
        value={value.productKey}
        onSelect={(productKey) => onChange({ ...value, productKey })}
      />
      <OptionCards
        label="نوبت"
        error={errors.sessionKey}
        options={catalog.sessions}
        value={value.sessionKey}
        onSelect={(sessionKey) => onChange({ ...value, sessionKey })}
      />
      <OptionCards
        label="بسته"
        error={errors.packageKey}
        options={catalog.packages.map((pkg) => ({
          ...pkg,
          description: `${pkg.description ?? ""} · ${formatRials(pkg.amountRials)}`,
        }))}
        value={value.packageKey}
        onSelect={(packageKey) => onChange({ ...value, packageKey })}
      />
      <OptionCards
        label="شعبه"
        error={errors.venueBranchKey}
        options={catalog.venueBranches}
        value={value.venueBranchKey}
        onSelect={(venueBranchKey) => onChange({ ...value, venueBranchKey })}
      />

      <RegistrationField
        id="discountCode"
        label="کد تخفیف"
        error={errors.discountCode}
        hint="در صورت داشتن کد، وارد کنید"
      >
        <input
          id="discountCode"
          className={registrationControlClass(Boolean(errors.discountCode))}
          value={value.discountCode}
          onChange={(e) =>
            onChange({ ...value, discountCode: e.target.value.toUpperCase() })
          }
        />
      </RegistrationField>

      {pricing.ok ? (
        <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm">
          <p>
            مبلغ پایه:{" "}
            <strong>{formatRials(pricing.amountRials)}</strong>
          </p>
          {pricing.discountRials > 0 ? (
            <p className="mt-1 text-primary">
              تخفیف: {formatRials(pricing.discountRials)}
            </p>
          ) : null}
          <p className="mt-1 font-semibold text-primary">
            مبلغ نهایی: {formatRials(pricing.finalAmountRials)}
          </p>
        </div>
      ) : null}
    </section>
  );
}

function OptionCards({
  label,
  options,
  value,
  error,
  onSelect,
}: {
  label: string;
  options: Array<{ key: string; title: string; description?: string }>;
  value: string;
  error?: string;
  onSelect: (key: string) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-primary">{label}</legend>
      <div className="grid gap-2">
        {options.map((option) => {
          const selected = value === option.key;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onSelect(option.key)}
              className={[
                "rounded-2xl border px-4 py-3 text-right transition-all duration-200",
                selected
                  ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20"
                  : "border-border bg-white hover:border-primary/30",
              ].join(" ")}
              aria-pressed={selected}
            >
              <span className="block text-sm font-semibold text-primary">
                {option.title}
              </span>
              {option.description ? (
                <span className="mt-1 block text-xs leading-6 text-muted">
                  {option.description}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

function ReviewStep({
  student,
  parent,
  details,
  pricing,
  onEdit,
}: {
  student: StudentStepInput;
  parent: ParentStepInput;
  details: DetailsStepInput;
  pricing: ReturnType<typeof resolvePricing>;
  onEdit: (step: number) => void;
}) {
  return (
    <section aria-labelledby="review-step-title" className="space-y-4">
      <h2 id="review-step-title" className="text-base font-semibold text-primary">
        بازبینی اطلاعات
      </h2>

      <SummaryCard
        title="دانش‌آموز"
        onEdit={() => onEdit(1)}
        rows={[
          ["نام", `${student.firstName} ${student.lastName}`],
          ["کد ملی", toPersianDigits(student.nationalCode)],
          [
            "تاریخ تولد",
            student.birthDate
              ? toPersianDigits(
                  `${student.birthDate.jy}/${student.birthDate.jm}/${student.birthDate.jd}`,
                )
              : "—",
          ],
          [
            "جنسیت",
            student.gender ? GENDER_LABELS[student.gender] : "—",
          ],
          ["پایه", student.gradeLabel],
          ["رشته", student.majorLabel || "—"],
          ["مدرسه", student.schoolName],
          ["محل", `${student.city}، ${student.province}`],
        ]}
      />

      <SummaryCard
        title="ولی"
        onEdit={() => onEdit(2)}
        rows={[
          ["نام", parent.parentName],
          [
            "نسبت",
            parent.relationship
              ? PARENT_RELATIONSHIP_LABELS[parent.relationship]
              : "—",
          ],
          ["موبایل", toPersianDigits(parent.mobile)],
          [
            "موبایل دوم",
            parent.secondaryMobile
              ? toPersianDigits(parent.secondaryMobile)
              : "—",
          ],
          ["ایمیل", parent.email || "—"],
          ["آدرس", parent.address || "—"],
        ]}
      />

      <SummaryCard
        title="ثبت‌نام"
        onEdit={() => onEdit(3)}
        rows={[
          [
            "آزمون",
            pricing.ok ? pricing.productTitle : details.productKey || "—",
          ],
          [
            "نوبت",
            pricing.ok ? pricing.sessionTitle : details.sessionKey || "—",
          ],
          [
            "بسته",
            pricing.ok ? pricing.packageTitle : details.packageKey || "—",
          ],
          [
            "شعبه",
            pricing.ok
              ? pricing.venueBranchTitle
              : details.venueBranchKey || "—",
          ],
        ]}
      />

      {pricing.ok ? (
        <div className="rounded-2xl border border-border bg-gradient-to-l from-primary/5 to-white px-5 py-4">
          <p className="text-sm text-muted">
            مبلغ: {formatRials(pricing.amountRials)}
          </p>
          <p className="mt-1 text-sm text-muted">
            تخفیف:{" "}
            {pricing.discountRials > 0
              ? formatRials(pricing.discountRials)
              : "—"}
          </p>
          <p className="mt-2 text-lg font-bold text-primary">
            مبلغ نهایی: {formatRials(pricing.finalAmountRials)}
          </p>
        </div>
      ) : null}
    </section>
  );
}

function SummaryCard({
  title,
  rows,
  onEdit,
}: {
  title: string;
  rows: Array<[string, string]>;
  onEdit: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-primary">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-medium text-secondary underline-offset-2 hover:underline"
        >
          ویرایش
        </button>
      </div>
      <dl className="grid gap-2 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-background/80 px-3 py-2">
            <dt className="text-[11px] text-muted">{label}</dt>
            <dd className="mt-0.5 text-sm font-medium text-foreground">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function PaymentStep({
  student,
  parent,
  details,
  pricing,
  pending,
  agreed,
  onAgreedChange,
  onPay,
  onEdit,
}: {
  student: StudentStepInput;
  parent: ParentStepInput;
  details: DetailsStepInput;
  pricing: ReturnType<typeof resolvePricing>;
  pending: boolean;
  agreed: boolean;
  onAgreedChange: (value: boolean) => void;
  onPay: () => void;
  onEdit: (step: number) => void;
}) {
  return (
    <section aria-labelledby="payment-step-title" className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-l from-primary/10 via-secondary/5 to-white px-5 py-5">
        <p className="text-xs font-medium text-secondary">خلاصه نهایی</p>
        <h2
          id="payment-step-title"
          className="mt-1 text-lg font-bold text-primary sm:text-xl"
        >
          بازبینی و پرداخت
        </h2>
        <p className="mt-2 text-sm leading-7 text-muted">
          قبل از انتقال به درگاه، اطلاعات و مبلغ قابل پرداخت را تأیید کنید.
        </p>
      </div>

      <SummaryCard
        title="دانش‌آموز"
        onEdit={() => onEdit(1)}
        rows={[
          ["نام", `${student.firstName} ${student.lastName}`],
          ["پایه", student.gradeLabel || "—"],
          ["رشته", student.majorLabel || "—"],
          ["مدرسه", student.schoolName || "—"],
        ]}
      />

      <SummaryCard
        title="ولی"
        onEdit={() => onEdit(2)}
        rows={[
          ["نام", parent.parentName],
          [
            "نسبت",
            parent.relationship
              ? PARENT_RELATIONSHIP_LABELS[parent.relationship]
              : "—",
          ],
          ["موبایل", toPersianDigits(parent.mobile)],
        ]}
      />

      <SummaryCard
        title="انتخاب ثبت‌نام"
        onEdit={() => onEdit(3)}
        rows={[
          [
            "آزمون",
            pricing.ok ? pricing.productTitle : details.productKey || "—",
          ],
          [
            "نوبت",
            pricing.ok ? pricing.sessionTitle : details.sessionKey || "—",
          ],
          [
            "بسته",
            pricing.ok ? pricing.packageTitle : details.packageKey || "—",
          ],
          [
            "شعبه",
            pricing.ok
              ? pricing.venueBranchTitle
              : details.venueBranchKey || "—",
          ],
        ]}
      />

      <div className="rounded-2xl border border-border bg-white px-5 py-5">
        <h3 className="text-sm font-semibold text-primary">اسناد و مدارک</h3>
        <p className="mt-2 text-sm leading-7 text-muted">
          در این جریان، اطلاعات هویتی دانش‌آموز و ولی به‌عنوان مدارک ثبت‌نام
          ذخیره می‌شود. بارگذاری فایل جداگانه در نسخه بعدی فعال می‌شود.
        </p>
      </div>

      {pricing.ok ? (
        <div className="rounded-2xl border border-secondary/30 bg-gradient-to-l from-secondary/10 to-white px-5 py-5">
          <h3 className="text-sm font-semibold text-primary">هزینه‌ها</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">مبلغ بسته</dt>
              <dd>{formatRials(pricing.amountRials)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">تخفیف</dt>
              <dd>
                {pricing.discountRials > 0
                  ? formatRials(pricing.discountRials)
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-border pt-2 text-base font-bold text-primary">
              <dt>مبلغ قابل پرداخت</dt>
              <dd>{formatRials(pricing.finalAmountRials)}</dd>
            </div>
          </dl>
        </div>
      ) : null}

      <label className="flex items-start gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm leading-7 text-foreground">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(event) => onAgreedChange(event.target.checked)}
          className="mt-1 size-4 rounded border-border"
        />
        <span>
          قوانین ثبت‌نام، صحت اطلاعات واردشده و مبلغ نهایی را می‌پذیرم و با
          انتقال به درگاه پرداخت موافقم.
        </span>
      </label>

      <div className="public-form-submit-bar flex flex-col gap-3">
        <button
          type="button"
          onClick={onPay}
          disabled={pending || !pricing.ok || !agreed}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary/92 disabled:opacity-60"
        >
          {pending ? "در حال انتقال به درگاه…" : "پرداخت و تکمیل ثبت‌نام"}
        </button>
      </div>
    </section>
  );
}

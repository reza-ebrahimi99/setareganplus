"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { ComponentProps } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Gender,
  RegistrationParentRelationship,
} from "@/generated/prisma/enums";
import { DocumentUploadStep } from "@/components/registration/DocumentUploadStep";
import { JalaliBirthDateSelects } from "@/components/registration/JalaliBirthDateSelects";
import {
  RegistrationField,
  registrationControlClass,
} from "@/components/registration/Field";
import { DiscountCountdown } from "@/components/registration/DiscountCountdown";
import { RegistrationPricingCard } from "@/components/registration/RegistrationPricingCard";
import { RegistrationStatusBanners } from "@/components/registration/RegistrationStatusBanners";
import { RegistrationStepper } from "@/components/registration/RegistrationStepper";
import {
  saveRegistrationProgressAction as defaultSaveProgressAction,
  submitRegistrationAction as defaultSubmitAction,
} from "@/app/ghalamchi/register/actions";
import { formatTomansFromRials } from "@/lib/registration/format";
import {
  hydrateRegistrationFlow,
  type RegistrationFlowPublicView,
  type RegistrationFlowSnapshot,
} from "@/lib/registration/flow-config-shared";
import { IRAN_PROVINCES } from "@/lib/registration/iran-locations";
import {
  REGISTRATION_GRADES,
  REGISTRATION_MAJORS,
  registrationGradeRequiresMajor,
} from "@/lib/registration/options";
import { computeCompletionPercent } from "@/lib/registration/progress";
import {
  resolveRegistrationPricing,
  type ResolvedRegistrationPricing,
} from "@/lib/registration/pricing";
import {
  WIZARD_STEP_LABELS,
  WIZARD_TOTAL_STEPS,
} from "@/lib/registration/status";
import type { RegistrationFlowCatalog } from "@/lib/registration/types";
import {
  PARENT_RELATIONSHIP_LABELS,
  type DetailsStepInput,
  type ParentStepInput,
  type StudentStepInput,
} from "@/lib/registration/types";
import {
  studentBirthDateFromParts,
  validateDetailsStep,
  validateParentStep,
  validateStudentStep,
} from "@/lib/registration/validate";
import { toPersianDigits } from "@/lib/persian";
import { formatJalaliDate } from "@/lib/datetime/jalali";

const STEPS = Array.from({ length: WIZARD_TOTAL_STEPS }, (_, index) => {
  const id = index + 1;
  return { id, label: WIZARD_STEP_LABELS[id] ?? `مرحله ${id}` };
});

const GENDER_LABELS = {
  MALE: "پسر",
  FEMALE: "دختر",
} as const;

type WizardPricing =
  | ResolvedRegistrationPricing
  | { ok: false; error: string };

const GLASS_CARD =
  "rounded-3xl border border-white/60 bg-white/80 backdrop-blur-md shadow-[0_20px_50px_rgb(15_23_42_/_0.08)]";

const BUTTON_MICRO =
  "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98]";

type UploadedDocument = ComponentProps<typeof DocumentUploadStep>["documents"][number];

export type RegistrationWizardInitialDraft = {
  student?: StudentStepInput;
  parent?: ParentStepInput;
  details?: DetailsStepInput;
  currentStep?: number;
  lastCompletedStep?: number;
  documents?: UploadedDocument[];
};

type RegistrationWizardProps = {
  catalog: RegistrationFlowCatalog;
  initialResumeToken?: string | null;
  initialDraft?: RegistrationWizardInitialDraft | null;
  receiptBasePath?: string;
  saveProgressAction?: typeof defaultSaveProgressAction;
  submitAction?: typeof defaultSubmitAction;
  uploadDocumentAction?: ComponentProps<
    typeof DocumentUploadStep
  >["uploadDocumentAction"];
  flowSnapshot?: RegistrationFlowSnapshot;
  flowPublic?: RegistrationFlowPublicView;
};

const DEFAULT_RECEIPT_BASE_PATH = "/ghalamchi/register/receipt";

function resumeStorageKey(flowKey: string) {
  return `reg-resume-${flowKey}`;
}

function emptyStudent(): StudentStepInput {
  return {
    firstName: "",
    lastName: "",
    nationalCode: "",
    birthYear: "",
    birthMonth: "",
    birthDay: "",
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

function clampWizardStep(value: number | undefined, fallback: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.max(1, Math.min(WIZARD_TOTAL_STEPS, Math.floor(value)));
}

function clampCompletedStep(value: number | undefined, fallback: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(WIZARD_TOTAL_STEPS, Math.floor(value)));
}

function WizardPricingBlock({
  pricing,
  showDiscountCountdown,
  onDiscountExpired,
}: {
  pricing: WizardPricing;
  showDiscountCountdown: boolean;
  onDiscountExpired: () => void;
}) {
  if (!pricing.ok) return null;

  const endsAtIso = pricing.discountEndsAt
    ? pricing.discountEndsAt.toISOString()
    : null;

  return (
    <div className="space-y-3">
      <RegistrationPricingCard
        amountRials={pricing.amountRials}
        finalAmountRials={pricing.finalAmountRials}
        discountRials={pricing.discountRials}
        discountPercent={pricing.discountPercent}
        isFree={pricing.isFree}
        discountActive={pricing.discountActive}
        pricingBadge={pricing.pricingBadge}
      />
      {showDiscountCountdown && endsAtIso && pricing.discountActive ? (
        <DiscountCountdown
          endsAtIso={endsAtIso}
          enabled
          onExpired={onDiscountExpired}
        />
      ) : null}
    </div>
  );
}

export function RegistrationWizard({
  catalog,
  initialResumeToken = null,
  initialDraft = null,
  receiptBasePath = DEFAULT_RECEIPT_BASE_PATH,
  saveProgressAction = defaultSaveProgressAction,
  submitAction = defaultSubmitAction,
  uploadDocumentAction,
  flowSnapshot,
  flowPublic,
}: RegistrationWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(() =>
    clampWizardStep(initialDraft?.currentStep, 1),
  );
  const [lastCompletedStep, setLastCompletedStep] = useState(() =>
    clampCompletedStep(initialDraft?.lastCompletedStep, 0),
  );
  const [student, setStudent] = useState<StudentStepInput>(
    () => initialDraft?.student ?? emptyStudent(),
  );
  const [parent, setParent] = useState<ParentStepInput>(
    () => initialDraft?.parent ?? emptyParent(),
  );
  const [details, setDetails] = useState<DetailsStepInput>(
    () => initialDraft?.details ?? emptyDetails(),
  );
  const [documents, setDocuments] = useState<UploadedDocument[]>(
    () => initialDraft?.documents ?? [],
  );
  const [resumeToken, setResumeToken] = useState<string | null>(
    initialResumeToken,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [tokenHydrated, setTokenHydrated] = useState(false);
  const [discountExpired, setDiscountExpired] = useState(false);

  const flow = useMemo(
    () =>
      flowSnapshot ? hydrateRegistrationFlow(flowSnapshot) : null,
    [flowSnapshot],
  );

  const showDiscountCountdown = flow?.showDiscountCountdown ?? false;

  const pricing = useMemo(() => {
    const effectiveFlow =
      discountExpired && flow
        ? {
            ...flow,
            saleAmountRials: null,
            discountEndsAt: new Date(0),
          }
        : flow;
    return resolveRegistrationPricing({
      flowKey: catalog.flowKey,
      details,
      flow: effectiveFlow,
    });
  }, [catalog.flowKey, details, discountExpired, flow]);

  const majorRequired = registrationGradeRequiresMajor(student.gradeSlug);
  const completionPercent = computeCompletionPercent(lastCompletedStep);
  const registrationBlocked =
    flowPublic != null &&
    (!flowPublic.window.open || flowPublic.remainingCapacity === 0);

  useEffect(() => {
    if (tokenHydrated) return;
    const urlToken = searchParams.get("token")?.trim() || null;
    let storedToken: string | null = null;
    try {
      storedToken = window.localStorage.getItem(
        resumeStorageKey(catalog.flowKey),
      );
    } catch {
      storedToken = null;
    }
    const resolved =
      initialResumeToken?.trim() ||
      urlToken ||
      storedToken?.trim() ||
      null;
    if (resolved) {
      setResumeToken(resolved);
      try {
        window.localStorage.setItem(
          resumeStorageKey(catalog.flowKey),
          resolved,
        );
      } catch {
        /* ignore quota / private mode */
      }
    }
    setTokenHydrated(true);
  }, [catalog.flowKey, initialResumeToken, searchParams, tokenHydrated]);

  function persistResumeToken(token: string) {
    setResumeToken(token);
    try {
      window.localStorage.setItem(resumeStorageKey(catalog.flowKey), token);
    } catch {
      /* ignore */
    }
  }

  async function autosave(nextStep: number, completedThrough: number) {
    setSaving(true);
    setFormError(null);
    try {
      const result = await saveProgressAction({
        flowKey: catalog.flowKey,
        resumeToken,
        currentStep: nextStep,
        lastCompletedStep: completedThrough,
        student,
        parent,
        details,
        documentIds: documents.map((doc) => doc.documentId),
      });
      if (!result.ok) {
        setFormError(result.error);
        return null;
      }
      persistResumeToken(result.resumeToken);
      setLastCompletedStep(completedThrough);
      return result.resumeToken;
    } finally {
      setSaving(false);
    }
  }

  async function goNext() {
    if (registrationBlocked) return;

    if (step === 1) {
      const result = validateStudentStep(student);
      if (!result.ok) {
        setErrors(result.errors);
        return;
      }
      setErrors({});
      const token = await autosave(2, 1);
      if (!token) return;
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
      const token = await autosave(3, 2);
      if (!token) return;
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
      const token = await autosave(4, 3);
      if (!token) return;
      setStep(4);
      return;
    }

    if (step === 4) {
      // Documents are optional in v1 — advance without requiring uploads.
      setErrors({});
      const token = await autosave(5, 4);
      if (!token) return;
      setStep(5);
      return;
    }

    if (step === 5) {
      setErrors({});
      const token = await autosave(6, 5);
      if (!token) return;
      setStep(6);
    }
  }

  function goBack() {
    setFormError(null);
    setErrors({});
    setStep((current) => Math.max(1, current - 1));
  }

  async function ensureSavedForUpload(): Promise<string | null> {
    if (resumeToken) return resumeToken;
    return autosave(Math.max(step, 4), Math.max(lastCompletedStep, 3));
  }

  function submitPayment() {
    if (registrationBlocked) return;
    if (!agreed) {
      setFormError("برای ادامه، پذیرش قوانین و شرایط الزامی است.");
      return;
    }

    const birthDate = studentBirthDateFromParts(student);
    const gender = student.gender;
    const relationship = parent.relationship;
    if (!birthDate || !gender || !relationship) {
      setFormError("اطلاعات فرم ناقص است. لطفاً مراحل قبل را تکمیل کنید.");
      return;
    }

    startTransition(async () => {
      const result = await submitAction({
        flowKey: catalog.flowKey,
        resumeToken,
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

      setLastCompletedStep(WIZARD_TOTAL_STEPS);

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }

      router.push(
        `${receiptBasePath}/${encodeURIComponent(result.registrationNumber)}`,
      );
    });
  }

  const busy = pending || saving;

  return (
    <div
      className={`registration-wizard relative w-full min-w-0 max-w-full overflow-x-hidden p-4 sm:p-8 ${GLASS_CARD}`}
      dir="rtl"
    >
      <div className="mb-6">
        <h1 className="text-xl font-bold text-primary sm:text-2xl">
          {catalog.title}
        </h1>
        <p className="mt-2 text-sm leading-7 text-muted">{catalog.subtitle}</p>
      </div>

      {flowPublic ? (
        <div className="mb-6">
          <RegistrationStatusBanners flow={flowPublic} />
        </div>
      ) : null}

      {registrationBlocked ? (
        <p className="text-sm leading-7 text-muted">
          در حال حاضر امکان ادامه ثبت‌نام وجود ندارد. لطفاً بعداً دوباره تلاش
          کنید یا با پشتیبانی تماس بگیرید.
        </p>
      ) : (
        <>
          <div className="mb-5 space-y-2">
            <div className="flex items-center justify-between gap-3 text-xs text-muted">
              <span>
                پیشرفت ثبت‌نام
                {saving ? (
                  <span className="ms-2 text-secondary">ذخیره پیشرفت…</span>
                ) : null}
              </span>
              <span className="font-medium text-primary tabular-nums">
                {toPersianDigits(String(completionPercent))}٪
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-slate-100/90"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={completionPercent}
              aria-label="درصد تکمیل ثبت‌نام"
            >
              <div
                className="h-full rounded-full bg-gradient-to-l from-primary to-secondary transition-[width] duration-500 ease-out"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>

          <RegistrationStepper steps={STEPS} currentStep={step} />

          {formError ? (
            <div
              className="mb-4 rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-danger backdrop-blur-sm"
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
                onChange={(next) => {
                  setStudent(next);
                  if (errors.birthDate && studentBirthDateFromParts(next)) {
                    setErrors((current) => {
                      const { birthDate: _removed, ...rest } = current;
                      return rest;
                    });
                  }
                }}
              />
            ) : null}

            {step === 2 ? (
              <ParentStep value={parent} errors={errors} onChange={setParent} />
            ) : null}

            {step === 3 ? (
              <DetailsStep
                catalog={catalog}
                flowSnapshot={flowSnapshot}
                value={details}
                errors={errors}
                pricing={pricing}
                showDiscountCountdown={showDiscountCountdown}
                onDiscountExpired={() => setDiscountExpired(true)}
                onChange={setDetails}
              />
            ) : null}

            {step === 4 ? (
              <DocumentUploadStep
                resumeToken={resumeToken}
                documents={documents}
                uploadDocumentAction={uploadDocumentAction}
                onUploaded={(doc) =>
                  setDocuments((current) => {
                    if (
                      current.some((item) => item.documentId === doc.documentId)
                    ) {
                      return current;
                    }
                    return [...current, doc];
                  })
                }
                onNeedSaveFirst={ensureSavedForUpload}
              />
            ) : null}

            {step === 5 ? (
              <ReviewStep
                student={student}
                parent={parent}
                details={details}
                documents={documents}
                pricing={pricing}
                showDiscountCountdown={showDiscountCountdown}
                onDiscountExpired={() => setDiscountExpired(true)}
                onEdit={setStep}
              />
            ) : null}

            {step === 6 ? (
              <PaymentStep
                student={student}
                parent={parent}
                details={details}
                pricing={pricing}
                showDiscountCountdown={showDiscountCountdown}
                onDiscountExpired={() => setDiscountExpired(true)}
                pending={pending}
                agreed={agreed}
                onAgreedChange={setAgreed}
                onPay={submitPayment}
                onEdit={setStep}
              />
            ) : null}
          </div>

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

          <div className="public-form-submit-bar mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 1 || busy}
              className={`inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-border bg-white/90 px-5 text-sm font-medium text-foreground disabled:opacity-40 sm:w-auto ${BUTTON_MICRO}`}
            >
              مرحله قبل
            </button>

            {step < WIZARD_TOTAL_STEPS ? (
              <button
                type="button"
                onClick={() => {
                  void goNext();
                }}
                disabled={busy}
                className={`inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-white shadow-sm disabled:opacity-60 sm:w-auto ${BUTTON_MICRO}`}
              >
                {saving
                  ? "ذخیره پیشرفت…"
                  : step === 5
                    ? "ادامه به پرداخت"
                    : "مرحله بعد"}
              </button>
            ) : (
              <button
                type="button"
                onClick={submitPayment}
                disabled={busy || !pricing.ok || !agreed}
                className={`inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-white shadow-sm disabled:opacity-60 sm:w-auto ${BUTTON_MICRO}`}
              >
                {pending ? "در حال انتقال به درگاه…" : "پرداخت و تکمیل ثبت‌نام"}
              </button>
            )}
          </div>
        </>
      )}
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
    <section
      aria-labelledby="student-step-title"
      className={`space-y-4 p-4 sm:p-5 ${GLASS_CARD}`}
    >
      <h2 id="student-step-title" className="text-base font-semibold text-primary">
        {WIZARD_STEP_LABELS[1]}
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
        label="تاریخ تولد"
        required
        error={errors.birthDate}
      >
        <JalaliBirthDateSelects
          id="birthDate"
          hasError={Boolean(errors.birthDate)}
          value={{
            birthYear: value.birthYear,
            birthMonth: value.birthMonth,
            birthDay: value.birthDay,
          }}
          onChange={(parts) =>
            onChange({
              ...value,
              birthYear: parts.birthYear,
              birthMonth: parts.birthMonth,
              birthDay: parts.birthDay,
            })
          }
        />
      </RegistrationField>

      <RegistrationField id="gender" label="جنسیت" required error={errors.gender}>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(GENDER_LABELS) as Array<keyof typeof GENDER_LABELS>).map(
            (key) => {
            const selected = value.gender === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onChange({ ...value, gender: key })}
                aria-pressed={selected}
                className={[
                  "rounded-2xl border px-3 py-3 text-sm font-medium",
                  BUTTON_MICRO,
                  selected
                    ? "border-primary bg-primary/8 text-primary ring-2 ring-primary/20"
                    : "border-border bg-white/90 text-foreground hover:border-primary/30",
                ].join(" ")}
              >
                {GENDER_LABELS[key]}
              </button>
            );
          },
          )}
        </div>
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
    <section
      aria-labelledby="parent-step-title"
      className={`space-y-4 p-4 sm:p-5 ${GLASS_CARD}`}
    >
      <h2 id="parent-step-title" className="text-base font-semibold text-primary">
        {WIZARD_STEP_LABELS[2]}
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
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            Object.keys(
              PARENT_RELATIONSHIP_LABELS,
            ) as RegistrationParentRelationship[]
          ).map((key) => {
            const selected = value.relationship === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onChange({ ...value, relationship: key })}
                aria-pressed={selected}
                className={[
                  "rounded-2xl border px-3 py-3 text-sm font-medium",
                  BUTTON_MICRO,
                  selected
                    ? "border-primary bg-primary/8 text-primary ring-2 ring-primary/20"
                    : "border-border bg-white/90 text-foreground hover:border-primary/30",
                ].join(" ")}
              >
                {PARENT_RELATIONSHIP_LABELS[key]}
              </button>
            );
          })}
        </div>
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
  flowSnapshot: _flowSnapshot,
  value,
  errors,
  pricing,
  showDiscountCountdown,
  onDiscountExpired,
  onChange,
}: {
  catalog: RegistrationFlowCatalog;
  flowSnapshot?: RegistrationFlowSnapshot;
  value: DetailsStepInput;
  errors: Record<string, string>;
  pricing: WizardPricing;
  showDiscountCountdown: boolean;
  onDiscountExpired: () => void;
  onChange: (value: DetailsStepInput) => void;
}) {
  return (
    <section
      aria-labelledby="details-step-title"
      className={`space-y-4 p-4 sm:p-5 ${GLASS_CARD}`}
    >
      <h2 id="details-step-title" className="text-base font-semibold text-primary">
        {WIZARD_STEP_LABELS[3]}
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
          description: `${pkg.description ?? ""} · ${formatTomansFromRials(pkg.amountRials)}`,
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

      <WizardPricingBlock
        pricing={pricing}
        showDiscountCountdown={showDiscountCountdown}
        onDiscountExpired={onDiscountExpired}
      />
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
                "rounded-2xl border px-4 py-3 text-right",
                BUTTON_MICRO,
                selected
                  ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20"
                  : "border-border bg-white/90 hover:border-primary/30",
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
  documents,
  pricing,
  showDiscountCountdown,
  onDiscountExpired,
  onEdit,
}: {
  student: StudentStepInput;
  parent: ParentStepInput;
  details: DetailsStepInput;
  documents: UploadedDocument[];
  pricing: WizardPricing;
  showDiscountCountdown: boolean;
  onDiscountExpired: () => void;
  onEdit: (step: number) => void;
}) {
  const genderLabel =
    student.gender === "MALE" || student.gender === "FEMALE"
      ? GENDER_LABELS[student.gender]
      : "—";

  return (
    <section aria-labelledby="review-step-title" className="space-y-4">
      <h2 id="review-step-title" className="text-base font-semibold text-primary">
        {WIZARD_STEP_LABELS[5]}
      </h2>

      <SummaryCard
        title="دانش‌آموز"
        onEdit={() => onEdit(1)}
        rows={[
          ["نام", `${student.firstName} ${student.lastName}`],
          ["کد ملی", toPersianDigits(student.nationalCode)],
          [
            "تاریخ تولد",
            (() => {
              const birthDate = studentBirthDateFromParts(student);
              return birthDate
                ? formatJalaliDate(birthDate.jy, birthDate.jm, birthDate.jd)
                : "—";
            })(),
          ],
          ["جنسیت", genderLabel],
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

      <SummaryCard
        title="مدارک"
        onEdit={() => onEdit(4)}
        rows={[
          [
            "تعداد فایل",
            documents.length > 0
              ? toPersianDigits(String(documents.length))
              : "بارگذاری نشده",
          ],
        ]}
      />

      <WizardPricingBlock
        pricing={pricing}
        showDiscountCountdown={showDiscountCountdown}
        onDiscountExpired={onDiscountExpired}
      />
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
    <div className={`p-4 sm:p-5 ${GLASS_CARD}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-primary">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className={`text-xs font-medium text-secondary underline-offset-2 hover:underline ${BUTTON_MICRO}`}
        >
          ویرایش
        </button>
      </div>
      <dl className="grid gap-2 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-white/50 bg-background/70 px-3 py-2 backdrop-blur-sm"
          >
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
  showDiscountCountdown,
  onDiscountExpired,
  pending,
  agreed,
  onAgreedChange,
  onPay,
  onEdit,
}: {
  student: StudentStepInput;
  parent: ParentStepInput;
  details: DetailsStepInput;
  pricing: WizardPricing;
  showDiscountCountdown: boolean;
  onDiscountExpired: () => void;
  pending: boolean;
  agreed: boolean;
  onAgreedChange: (value: boolean) => void;
  onPay: () => void;
  onEdit: (step: number) => void;
}) {
  return (
    <section
      aria-labelledby="payment-step-title"
      className={`space-y-5 p-4 sm:p-5 ${GLASS_CARD}`}
    >
      <div className="rounded-2xl bg-gradient-to-l from-primary/10 via-secondary/5 to-white px-5 py-5">
        <p className="text-xs font-medium text-secondary">خلاصه نهایی</p>
        <h2
          id="payment-step-title"
          className="mt-1 text-lg font-bold text-primary sm:text-xl"
        >
          {WIZARD_STEP_LABELS[6]}
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

      <div className="rounded-2xl border border-border bg-white/80 px-5 py-5 backdrop-blur-sm">
        <h3 className="text-sm font-semibold text-primary">اسناد و مدارک</h3>
        <p className="mt-2 text-sm leading-7 text-muted">
          مدارک بارگذاری‌شده در مرحله قبل در پرونده ثبت‌نام ذخیره می‌شوند.
        </p>
      </div>

      <WizardPricingBlock
        pricing={pricing}
        showDiscountCountdown={showDiscountCountdown}
        onDiscountExpired={onDiscountExpired}
      />

      <label className="flex items-start gap-3 rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm leading-7 text-foreground backdrop-blur-sm">
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
          className={`inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary/92 disabled:opacity-60 ${BUTTON_MICRO}`}
        >
          {pending ? "در حال انتقال به درگاه…" : "پرداخت و تکمیل ثبت‌نام"}
        </button>
      </div>
    </section>
  );
}

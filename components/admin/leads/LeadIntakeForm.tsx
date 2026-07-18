"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useRef, useState } from "react";
import {
  createLeadAction,
  type CreateLeadState,
} from "@/app/admin/(dashboard)/leads/actions";
import { JalaliDatePicker } from "@/components/booking/JalaliDatePicker";
import { PersianTimePicker } from "@/components/datetime/PersianTimePicker";
import {
  jalaliTehranLocalToUtc,
  type JalaliDate,
  utcToJalaliInTehran,
} from "@/lib/datetime/jalali";
import {
  formatTehranTime24,
  parseLocalTimeHm,
} from "@/lib/datetime/tehran-zone";
import type { LeadOwnerOption } from "@/lib/crm/lead-owners";

export type LeadIntakeBranchOption = {
  id: string;
  name: string;
};

export type LeadIntakeAdvisorOption = LeadOwnerOption;

type LeadIntakeFormProps = {
  branches: LeadIntakeBranchOption[];
  advisors: LeadIntakeAdvisorOption[];
  canAssign: boolean;
};

const initialState: CreateLeadState = {};

const PREDEFINED_LEAD_SOURCES = [
  "تماس تلفنی",
  "مراجعه حضوری",
  "معرفی",
  "شبکه‌های اجتماعی",
  "کمپین تبلیغاتی",
] as const;

const LEAD_SOURCE_OTHER = "__other__";

type LeadSourceSelectValue = "" | (typeof PREDEFINED_LEAD_SOURCES)[number] | typeof LEAD_SOURCE_OTHER;

function resolveLeadSourceUi(source: string | undefined): {
  selectValue: LeadSourceSelectValue;
  customText: string;
} {
  const trimmed = source?.trim() ?? "";
  // Backend falls back empty → "MANUAL"; keep the select empty so the user
  // still sees the optional default rather than a fake "سایر" value.
  if (!trimmed || trimmed === "MANUAL") {
    return { selectValue: "", customText: "" };
  }
  if (
    (PREDEFINED_LEAD_SOURCES as readonly string[]).includes(trimmed)
  ) {
    return {
      selectValue: trimmed as (typeof PREDEFINED_LEAD_SOURCES)[number],
      customText: "",
    };
  }
  return { selectValue: LEAD_SOURCE_OTHER, customText: trimmed };
}

function fieldClassName(hasError: boolean): string {
  const base =
    "mt-1.5 w-full rounded-xl border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";
  return hasError
    ? `${base} border-red-400`
    : `${base} border-border hover:border-secondary/40`;
}

function sourceFieldClassName(hasError: boolean): string {
  return `${fieldClassName(hasError)} min-h-11`;
}

const FOLLOW_UP_INCOMPLETE_MESSAGE =
  "تاریخ و ساعت پیگیری باید هر دو انتخاب شوند یا هر دو خالی بمانند.";

function resolveFollowUpFromIso(isoValue: string | undefined): {
  date: JalaliDate | null;
  time: string | null;
} {
  if (!isoValue?.trim()) {
    return { date: null, time: null };
  }
  const instant = new Date(isoValue);
  if (Number.isNaN(instant.getTime())) {
    return { date: null, time: null };
  }
  return {
    date: utcToJalaliInTehran(instant),
    time: formatTehranTime24(instant),
  };
}

function FieldError({
  id,
  message,
}: {
  id: string;
  message: string | undefined;
}) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-sm leading-6 text-red-700">
      {message}
    </p>
  );
}

function SectionHeading({
  id,
  title,
  description,
  step,
}: {
  id: string;
  title: string;
  description: string;
  step: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3 border-b border-border pb-4">
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white shadow-sm"
        aria-hidden="true"
      >
        {step}
      </span>
      <div>
        <h2 id={id} className="font-semibold text-primary sm:text-lg">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
      </div>
    </div>
  );
}

export function LeadIntakeForm({
  branches,
  advisors,
  canAssign,
}: LeadIntakeFormProps) {
  const router = useRouter();
  const idempotencyKey = useRef("");
  const initialBranchId =
    initialState.values?.branchId || (branches.length === 1 ? branches[0]!.id : "");
  const [selectedBranchId, setSelectedBranchId] = useState(initialBranchId);
  const [selectedAdvisorId, setSelectedAdvisorId] = useState(
    initialState.values?.ownerUserId ?? "",
  );
  const [sourceSelect, setSourceSelect] = useState<LeadSourceSelectValue>("");
  const [sourceCustom, setSourceCustom] = useState("");
  const [syncedSourceValue, setSyncedSourceValue] = useState<
    string | undefined
  >(undefined);
  const [followUpDate, setFollowUpDate] = useState<JalaliDate | null>(null);
  const [followUpTime, setFollowUpTime] = useState<string | null>(null);
  const [syncedFollowUpIso, setSyncedFollowUpIso] = useState<
    string | undefined
  >(undefined);
  const [followUpPairError, setFollowUpPairError] = useState<
    string | undefined
  >(undefined);

  const [state, formAction, pending] = useActionState(
    async (previousState: CreateLeadState, formData: FormData) => {
      if (!idempotencyKey.current) {
        idempotencyKey.current = crypto.randomUUID();
      }
      formData.set("idempotencyKey", idempotencyKey.current);

      const dueIso = String(formData.get("followUpDueAt") ?? "").trim();
      const hasDate = Boolean(formData.get("followUpDateSelected"));
      const hasTime = Boolean(formData.get("followUpTimeSelected"));
      if (hasDate !== hasTime || ((hasDate || hasTime) && !dueIso)) {
        return {
          status: "error" as const,
          fieldErrors: { followUpDueAt: FOLLOW_UP_INCOMPLETE_MESSAGE },
          values: {
            firstName: String(formData.get("firstName") ?? ""),
            lastName: String(formData.get("lastName") ?? ""),
            mobile: String(formData.get("mobile") ?? ""),
            branchId: String(formData.get("branchId") ?? ""),
            source: String(formData.get("source") ?? ""),
            ownerUserId: String(formData.get("ownerUserId") ?? ""),
            notes: String(formData.get("notes") ?? ""),
            createFollowUpTask:
              String(formData.get("createFollowUpTask") ?? "") === "true",
            followUpDueAt: "",
            idempotencyKey: idempotencyKey.current,
          },
        };
      }

      const result = await createLeadAction(previousState, formData);
      if (result.status === "created" && result.leadId) {
        router.push(`/admin/leads/${result.leadId}`);
      }
      return result;
    },
    initialState,
  );

  const values = state.values;
  const errors = state.fieldErrors;
  const visibleAdvisors = advisors.filter(
    (advisor) =>
      advisor.branchIds.length === 0 ||
      !selectedBranchId ||
      advisor.branchIds.includes(selectedBranchId),
  );

  // Re-hydrate source UI after server validation returns values (no first-paint mismatch).
  if (values?.source !== syncedSourceValue) {
    const resolved = resolveLeadSourceUi(values?.source);
    setSyncedSourceValue(values?.source);
    setSourceSelect(resolved.selectValue);
    setSourceCustom(resolved.customText);
  }

  if (values?.followUpDueAt !== syncedFollowUpIso) {
    const resolved = resolveFollowUpFromIso(values?.followUpDueAt);
    setSyncedFollowUpIso(values?.followUpDueAt);
    setFollowUpDate(resolved.date);
    setFollowUpTime(resolved.time);
    setFollowUpPairError(undefined);
  }

  const submittedSource =
    sourceSelect === LEAD_SOURCE_OTHER
      ? sourceCustom.trim()
      : sourceSelect;

  const followUpIncomplete =
    Boolean(followUpDate) !== Boolean(followUpTime);
  const followUpHm = followUpTime ? parseLocalTimeHm(followUpTime) : null;
  const submittedFollowUpIso =
    followUpDate && followUpHm
      ? jalaliTehranLocalToUtc(
          followUpDate.jy,
          followUpDate.jm,
          followUpDate.jd,
          followUpHm.hour,
          followUpHm.minute,
        ).toISOString()
      : "";

  function handleBranchChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const branchId = event.target.value;
    setSelectedBranchId(branchId);
    const selectedAdvisor = advisors.find(
      (advisor) => advisor.id === selectedAdvisorId,
    );
    if (
      selectedAdvisor &&
      selectedAdvisor.branchIds.length > 0 &&
      !selectedAdvisor.branchIds.includes(branchId)
    ) {
      setSelectedAdvisorId("");
    }
  }

  return (
    <div className="space-y-5">
      {state.status === "duplicate" ? (
        <section
          role="status"
          aria-live="polite"
          className="admin-card border-amber-200 bg-amber-50 px-5 py-5"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-amber-950">
                این شماره موبایل قبلاً ثبت شده است
              </h2>
              <p className="mt-1 text-sm leading-7 text-amber-900">
                برای جلوگیری از ایجاد پرونده تکراری، لید جدیدی ساخته نشد.
              </p>
            </div>
            {state.duplicateLeadId ? (
              <Link
                href={`/admin/leads/${state.duplicateLeadId}`}
                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
              >
                باز کردن لید
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      <form action={formAction} className="space-y-5" noValidate>
        {state.formError ? (
          <div
            role="alert"
            className="admin-card border-red-200 bg-red-50 px-5 py-4 text-sm leading-7 text-red-800"
          >
            {state.formError}
          </div>
        ) : null}

        <section
          aria-labelledby="lead-personal-heading"
          className="admin-card p-5 sm:p-6"
        >
          <SectionHeading
            id="lead-personal-heading"
            step="۱"
            title="اطلاعات فردی"
            description="نام و شماره تماس اصلی متقاضی را وارد کنید."
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="lead-first-name" className="text-sm font-medium text-primary">
                نام
              </label>
              <input
                id="lead-first-name"
                name="firstName"
                required
                maxLength={100}
                autoComplete="given-name"
                defaultValue={values?.firstName ?? ""}
                aria-invalid={errors?.firstName ? true : undefined}
                aria-describedby={errors?.firstName ? "lead-first-name-error" : undefined}
                className={fieldClassName(Boolean(errors?.firstName))}
              />
              <FieldError id="lead-first-name-error" message={errors?.firstName} />
            </div>

            <div>
              <label htmlFor="lead-last-name" className="text-sm font-medium text-primary">
                نام خانوادگی
              </label>
              <input
                id="lead-last-name"
                name="lastName"
                required
                maxLength={100}
                autoComplete="family-name"
                defaultValue={values?.lastName ?? ""}
                aria-invalid={errors?.lastName ? true : undefined}
                aria-describedby={errors?.lastName ? "lead-last-name-error" : undefined}
                className={fieldClassName(Boolean(errors?.lastName))}
              />
              <FieldError id="lead-last-name-error" message={errors?.lastName} />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="lead-mobile" className="text-sm font-medium text-primary">
                شماره موبایل
              </label>
              <input
                id="lead-mobile"
                name="mobile"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                required
                maxLength={32}
                dir="ltr"
                defaultValue={values?.mobile ?? ""}
                aria-invalid={errors?.mobile ? true : undefined}
                aria-describedby={
                  errors?.mobile
                    ? "lead-mobile-hint lead-mobile-error"
                    : "lead-mobile-hint"
                }
                className={fieldClassName(Boolean(errors?.mobile))}
                placeholder="09121234567"
              />
              <p id="lead-mobile-hint" className="mt-1.5 text-xs leading-6 text-muted">
                اعداد فارسی و قالب‌های رایج ایران پذیرفته می‌شوند.
              </p>
              <FieldError id="lead-mobile-error" message={errors?.mobile} />
            </div>
          </div>
        </section>

        <section
          aria-labelledby="lead-admissions-heading"
          className="admin-card p-5 sm:p-6"
        >
          <SectionHeading
            id="lead-admissions-heading"
            step="۲"
            title="پذیرش"
            description="شعبه، مسئول پیگیری و منبع ورود لید را مشخص کنید."
          />
          {branches.length === 0 ? (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-900"
            >
              شعبه فعالی در محدوده دسترسی شما وجود ندارد.
            </div>
          ) : null}
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="lead-branch" className="text-sm font-medium text-primary">
                شعبه
              </label>
              <select
                id="lead-branch"
                name="branchId"
                required
                value={selectedBranchId}
                onChange={handleBranchChange}
                aria-invalid={errors?.branchId ? true : undefined}
                aria-describedby={errors?.branchId ? "lead-branch-error" : undefined}
                className={fieldClassName(Boolean(errors?.branchId))}
              >
                <option value="" disabled>
                  انتخاب شعبه
                </option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
              <FieldError id="lead-branch-error" message={errors?.branchId} />
            </div>

            {canAssign ? <div>
              <label htmlFor="lead-advisor" className="text-sm font-medium text-primary">
                مسئول لید
              </label>
              <select
                id="lead-advisor"
                name="ownerUserId"
                value={selectedAdvisorId}
                onChange={(event) => setSelectedAdvisorId(event.target.value)}
                aria-invalid={errors?.ownerUserId ? true : undefined}
                aria-describedby={
                  errors?.ownerUserId
                    ? "lead-advisor-hint lead-advisor-error"
                    : "lead-advisor-hint"
                }
                className={fieldClassName(Boolean(errors?.ownerUserId))}
              >
                <option value="">بدون مسئول</option>
                {visibleAdvisors.map((advisor) => (
                  <option key={advisor.id} value={advisor.id}>
                    {advisor.name} — {advisor.roleLabel}
                  </option>
                ))}
              </select>
              <p id="lead-advisor-hint" className="mt-1.5 text-xs leading-6 text-muted">
                فقط همکاران مجاز برای شعبه انتخاب‌شده نمایش داده می‌شوند.
              </p>
              <FieldError id="lead-advisor-error" message={errors?.ownerUserId} />
            </div> : null}

            <div className="sm:col-span-2">
              <label htmlFor="lead-source" className="text-sm font-medium text-primary">
                منبع لید
              </label>
              <input type="hidden" name="source" value={submittedSource} />
              <select
                id="lead-source"
                dir="rtl"
                value={sourceSelect}
                onChange={(event) => {
                  const next = event.target.value as LeadSourceSelectValue;
                  setSourceSelect(next);
                  if (next !== LEAD_SOURCE_OTHER) {
                    setSourceCustom("");
                  }
                }}
                aria-invalid={errors?.source ? true : undefined}
                aria-describedby={
                  errors?.source
                    ? "lead-source-hint lead-source-error"
                    : "lead-source-hint"
                }
                className={sourceFieldClassName(Boolean(errors?.source))}
              >
                <option value="">انتخاب منبع لید</option>
                {PREDEFINED_LEAD_SOURCES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
                <option value={LEAD_SOURCE_OTHER}>سایر</option>
              </select>
              {sourceSelect === LEAD_SOURCE_OTHER ? (
                <div className="mt-3">
                  <label
                    htmlFor="lead-source-custom"
                    className="text-sm font-medium text-primary"
                  >
                    منبع سفارشی
                  </label>
                  <input
                    id="lead-source-custom"
                    dir="rtl"
                    value={sourceCustom}
                    onChange={(event) => setSourceCustom(event.target.value)}
                    maxLength={100}
                    autoComplete="off"
                    aria-invalid={errors?.source ? true : undefined}
                    aria-describedby={
                      errors?.source
                        ? "lead-source-hint lead-source-error"
                        : "lead-source-hint"
                    }
                    className={sourceFieldClassName(Boolean(errors?.source))}
                    placeholder="منبع را بنویسید"
                  />
                </div>
              ) : null}
              <p id="lead-source-hint" className="mt-1.5 text-xs leading-6 text-muted">
                در صورت خالی بودن، منبع «MANUAL» ثبت می‌شود.
              </p>
              <FieldError id="lead-source-error" message={errors?.source} />
            </div>
          </div>
        </section>

        <section
          aria-labelledby="lead-notes-heading"
          className="admin-card p-5 sm:p-6"
        >
          <SectionHeading
            id="lead-notes-heading"
            step="۳"
            title="یادداشت"
            description="اطلاعات تکمیلی تماس یا درخواست متقاضی را ثبت کنید."
          />
          <label htmlFor="lead-notes" className="text-sm font-medium text-primary">
            توضیحات
          </label>
          <textarea
            id="lead-notes"
            name="notes"
            rows={5}
            maxLength={1000}
            defaultValue={values?.notes ?? ""}
            aria-invalid={errors?.notes ? true : undefined}
            aria-describedby={
              errors?.notes ? "lead-notes-hint lead-notes-error" : "lead-notes-hint"
            }
            className={fieldClassName(Boolean(errors?.notes))}
            placeholder="خلاصه درخواست، زمان مناسب تماس یا نکات مهم..."
          />
          <p id="lead-notes-hint" className="mt-1.5 text-xs leading-6 text-muted">
            حداکثر ۱۰۰۰ کاراکتر
          </p>
          <FieldError id="lead-notes-error" message={errors?.notes} />
        </section>

        <section
          aria-labelledby="lead-follow-up-heading"
          className="admin-card p-5 sm:p-6"
        >
          <SectionHeading
            id="lead-follow-up-heading"
            step="۴"
            title="پیگیری"
            description="وظیفه پیگیری اولیه و زمان سررسید آن را تنظیم کنید."
          />
          <div className="space-y-5">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background px-4 py-3">
              <input type="hidden" name="createFollowUpTask" value="false" />
              <input
                name="createFollowUpTask"
                type="checkbox"
                value="true"
                defaultChecked={values?.createFollowUpTask ?? true}
                className="mt-1 size-4 accent-slate-900"
              />
              <span>
                <span className="block text-sm font-medium text-primary">
                  ایجاد وظیفه پیگیری
                </span>
                <span className="mt-1 block text-xs leading-6 text-muted">
                  اگر زمان مشخص نشود، سررسید به‌صورت خودکار ۲۴ ساعت بعد تنظیم می‌شود.
                </span>
              </span>
            </label>

            <div className="space-y-4">
              <input
                type="hidden"
                name="followUpDueAt"
                value={followUpIncomplete ? "" : submittedFollowUpIso}
              />
              <input
                type="hidden"
                name="followUpDateSelected"
                value={followUpDate ? "1" : ""}
              />
              <input
                type="hidden"
                name="followUpTimeSelected"
                value={followUpTime ? "1" : ""}
              />

              <div>
                <p className="text-sm font-medium text-primary">تاریخ سررسید</p>
                <div className="mt-1.5">
                  <JalaliDatePicker
                    label="تاریخ پیگیری (شمسی)"
                    value={followUpDate}
                    onChange={(next) => {
                      setFollowUpDate(next);
                      setFollowUpPairError(undefined);
                    }}
                    onClear={() => {
                      setFollowUpDate(null);
                      setFollowUpPairError(undefined);
                    }}
                    disabled={pending}
                  />
                </div>
              </div>

              <PersianTimePicker
                id="lead-follow-up-time"
                label="ساعت سررسید"
                value={followUpTime}
                disabled={pending}
                onChange={(next) => {
                  setFollowUpTime(next);
                  setFollowUpPairError(undefined);
                }}
                aria-invalid={
                  errors?.followUpDueAt || followUpPairError ? true : undefined
                }
                aria-describedby={
                  errors?.followUpDueAt || followUpPairError
                    ? "lead-follow-up-hint lead-follow-up-error"
                    : "lead-follow-up-hint"
                }
              />

              <p id="lead-follow-up-hint" className="text-xs leading-6 text-muted">
                {followUpIncomplete
                  ? FOLLOW_UP_INCOMPLETE_MESSAGE
                  : "اختیاری؛ زمان بر اساس تقویم تهران (نه منطقه زمانی دستگاه) ثبت می‌شود. در صورت خالی بودن و فعال بودن وظیفه، سررسید ۲۴ ساعت بعد است."}
              </p>
              <FieldError
                id="lead-follow-up-error"
                message={errors?.followUpDueAt ?? followUpPairError}
              />
            </div>
          </div>
        </section>

        <div className="admin-card flex flex-col-reverse gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Link
            href="/admin/leads"
            className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-secondary/40 hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
          >
            انصراف
          </Link>
          <button
            type="submit"
            disabled={pending || branches.length === 0}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary/92 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "در حال ثبت..." : "ثبت متقاضی"}
          </button>
        </div>
      </form>
    </div>
  );
}

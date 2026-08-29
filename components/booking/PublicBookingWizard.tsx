"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { JalaliDatePicker } from "@/components/booking/JalaliDatePicker";
import type { JalaliDate } from "@/lib/datetime/jalali";
import {
  formatPersianTimeRange,
  todayJalaliInTehran,
} from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";
import {
  createPublicReservationAction,
  loadSlotsAction,
  type PublicSlotDto,
} from "@/app/book/[serviceSlug]/actions";

type Advisor = {
  id: string;
  displayName: string;
  description: string | null;
};

type PublicBookingWizardProps = {
  serviceSlug: string;
  serviceTitle: string;
  serviceId: string;
  advisors: Advisor[];
  allowAdvisorSelection: boolean;
  showRemainingCapacity: boolean;
  meetingTypes: string[];
  recommendationMessage?: string | null;
};

const MEETING_LABELS: Record<string, string> = {
  IN_PERSON: "حضوری",
  ONLINE: "آنلاین",
  PHONE: "تلفنی",
};

export function PublicBookingWizard({
  serviceSlug,
  serviceTitle,
  serviceId,
  advisors,
  allowAdvisorSelection,
  showRemainingCapacity,
  meetingTypes,
  recommendationMessage,
}: PublicBookingWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const formSubmissionId = searchParams.get("submissionId");
  const [pending, startTransition] = useTransition();
  const today = todayJalaliInTehran();
  const [step, setStep] = useState(allowAdvisorSelection ? 3 : 4);
  const [advisorId, setAdvisorId] = useState<string>(
    allowAdvisorSelection ? "" : (advisors[0]?.id ?? ""),
  );
  const [day, setDay] = useState<JalaliDate | null>(null);
  const [slots, setSlots] = useState<PublicSlotDto[]>([]);
  const [slotId, setSlotId] = useState("");
  const [meetingType, setMeetingType] = useState(meetingTypes[0] ?? "IN_PERSON");
  const [error, setError] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    mobile: "",
    email: "",
    nationalId: "",
    notes: "",
  });

  const selectedSlot = useMemo(
    () => slots.find((slot) => slot.id === slotId) ?? null,
    [slots, slotId],
  );

  function loadDay(next: JalaliDate) {
    setDay(next);
    setSlotId("");
    setError(null);
    startTransition(async () => {
      const result = await loadSlotsAction({
        serviceSlug,
        serviceId,
        advisorId: advisorId || null,
        day: next,
      });
      if (!result.ok) {
        setError(result.error);
        setSlots([]);
        return;
      }
      setSlots(result.slots);
      setStep(5);
    });
  }

  function submit() {
    setError(null);
    if (!form.firstName.trim() || !form.lastName.trim() || !form.mobile.trim()) {
      setError("نام، نام خانوادگی و موبایل الزامی است.");
      return;
    }
    startTransition(async () => {
      const result = await createPublicReservationAction({
        serviceSlug,
        slotId,
        meetingType,
        company_url: honeypot,
        formSubmissionId,
        ...form,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (returnTo && returnTo.startsWith("/forms/")) {
        const sep = returnTo.includes("?") ? "&" : "?";
        router.push(
          `${returnTo}${sep}bookingProof=${encodeURIComponent(result.bookingProof)}`,
        );
        return;
      }
      router.push(
        `/book/${serviceSlug}/confirmation/${encodeURIComponent(result.trackingCode)}?t=${encodeURIComponent(result.checkInToken)}`,
      );
    });
  }

  return (
    <div className="space-y-6" dir="rtl">
      <header className="space-y-2">
        <p className="text-xs font-medium text-muted">رزرو نوبت</p>
        <h1 className="text-2xl font-bold text-primary">{serviceTitle}</h1>
        <p className="text-sm text-muted">
          جریان رزرو · مرحله {toPersianDigits(Math.min(step, 7))}
        </p>
        {recommendationMessage ? (
          <p className="rounded-xl border border-secondary/30 bg-secondary/10 px-4 py-3 text-sm leading-7 text-primary">
            {recommendationMessage}
          </p>
        ) : null}
      </header>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </div>
      ) : null}

      {step >= 3 && allowAdvisorSelection ? (
        <section className="space-y-3 rounded-2xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-primary">۳. انتخاب مشاور</h2>
          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => setAdvisorId("")}
              className={`rounded-xl border px-3 py-2.5 text-sm ${
                advisorId === ""
                  ? "border-primary bg-primary/5"
                  : "border-border"
              }`}
            >
              هر مشاور آزاد
            </button>
            {advisors.map((advisor) => (
              <button
                key={advisor.id}
                type="button"
                onClick={() => setAdvisorId(advisor.id)}
                className={`rounded-xl border px-3 py-2.5 text-start text-sm ${
                  advisorId === advisor.id
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
              >
                <span className="font-medium">{advisor.displayName}</span>
                {advisor.description ? (
                  <span className="mt-1 block text-xs text-muted">
                    {advisor.description}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="rounded-xl bg-primary px-4 py-2.5 text-sm text-white"
            onClick={() => setStep(4)}
          >
            ادامه
          </button>
        </section>
      ) : null}

      {(step >= 4 || (!allowAdvisorSelection && step >= 3)) && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-primary">۴. انتخاب تاریخ شمسی</h2>
          <JalaliDatePicker value={day} onChange={loadDay} min={today} />
        </section>
      )}

      {step >= 5 ? (
        <section className="space-y-3 rounded-2xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-primary">۵. انتخاب ساعت</h2>
          {pending && slots.length === 0 ? (
            <p className="text-sm text-muted">در حال بارگذاری نوبت‌ها…</p>
          ) : null}
          <ul className="space-y-2">
            {slots.map((slot) => {
              const label = `${formatPersianTimeRange(new Date(slot.startsAt), new Date(slot.endsAt))}${
                showRemainingCapacity
                  ? slot.remaining > 0
                    ? ` — ${toPersianDigits(slot.remaining)} ظرفیت باقی‌مانده`
                    : " — تکمیل ظرفیت"
                  : slot.selectable
                    ? " — قابل رزرو"
                    : " — تکمیل ظرفیت"
              }`;
              return (
                <li key={slot.id}>
                  <button
                    type="button"
                    disabled={!slot.selectable || pending}
                    onClick={() => {
                      setSlotId(slot.id);
                      setStep(6);
                    }}
                    className={`w-full rounded-xl border px-3 py-3 text-start text-sm ${
                      slotId === slot.id
                        ? "border-primary bg-primary/5"
                        : slot.selectable
                          ? "border-border hover:bg-background"
                          : "cursor-not-allowed border-border bg-slate-50 text-muted"
                    }`}
                  >
                    <span className="font-medium">{label}</span>
                    <span className="mt-1 block text-xs text-muted">
                      {slot.advisor.displayName}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {slots.length === 0 && !pending ? (
            <p className="text-sm text-muted">برای این روز نوبت آزادی نیست.</p>
          ) : null}
        </section>
      ) : null}

      {step >= 6 && selectedSlot ? (
        <section className="space-y-3 rounded-2xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-primary">۶. تکمیل مشخصات</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["firstName", "نام"],
                ["lastName", "نام خانوادگی"],
                ["mobile", "موبایل"],
                ["email", "ایمیل (اختیاری)"],
                ["nationalId", "کد ملی (اختیاری)"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-sm">
                <span className="text-muted">{label}</span>
                <input
                  value={form[key]}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, [key]: event.target.value }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5"
                  dir={key === "mobile" || key === "email" || key === "nationalId" ? "ltr" : "rtl"}
                />
              </label>
            ))}
          </div>
          <label className="block text-sm">
            <span className="text-muted">نوع جلسه</span>
            <select
              value={meetingType}
              onChange={(event) => setMeetingType(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5"
            >
              {meetingTypes.map((type) => (
                <option key={type} value={type}>
                  {MEETING_LABELS[type] ?? type}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-muted">یادداشت (اختیاری)</span>
            <textarea
              value={form.notes}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, notes: event.target.value }))
              }
              rows={3}
              className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5"
            />
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={() => setStep(7)}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm text-white disabled:opacity-60"
          >
            بررسی نهایی
          </button>
        </section>
      ) : null}

      {step >= 7 && selectedSlot ? (
        <section className="space-y-3 rounded-2xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-primary">۷. تأیید رزرو</h2>
          <ul className="space-y-1 text-sm leading-7 text-foreground">
            <li>خدمت: {serviceTitle}</li>
            <li>مشاور: {selectedSlot.advisor.displayName}</li>
            <li>
              زمان:{" "}
              {formatPersianTimeRange(
                new Date(selectedSlot.startsAt),
                new Date(selectedSlot.endsAt),
              )}
            </li>
            <li>
              نام: {form.firstName} {form.lastName}
            </li>
            <li>موبایل: {toPersianDigits(form.mobile)}</li>
            <li>نوع جلسه: {MEETING_LABELS[meetingType] ?? meetingType}</li>
          </ul>
          {/* Honeypot */}
          <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
            <label htmlFor="company_url">شرکت</label>
            <input
              id="company_url"
              name="company_url"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(event) => setHoneypot(event.target.value)}
            />
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={submit}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-white disabled:opacity-60 sm:w-auto"
          >
            {pending ? "در حال ثبت…" : "ثبت نهایی رزرو"}
          </button>
        </section>
      ) : null}

    </div>
  );
}

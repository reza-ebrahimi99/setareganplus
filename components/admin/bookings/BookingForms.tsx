"use client";

import { useActionState, useState } from "react";
import {
  createAdvisorAction,
  createAvailabilityRuleAction,
  createBookingServiceAction,
  generateSlotsAction,
  previewSlotsAction,
  updateBookingServiceAction,
  type BookingActionState,
} from "@/app/admin/(dashboard)/bookings/actions";
import { JalaliDatePicker } from "@/components/booking/JalaliDatePicker";
import type { JalaliDate } from "@/lib/datetime/jalali";
import {
  parseBookingServiceSettings,
  parseMeetingTypes,
} from "@/lib/booking/service-settings";
import { MAX_SLOT_GENERATION_DAYS } from "@/lib/booking/constants";
import { toPersianDigits } from "@/lib/persian";

const empty: BookingActionState = {};
const input =
  "mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:border-secondary";

function Notice({ state }: { state: BookingActionState }) {
  return state.error ? (
    <p className="text-sm text-red-700">{state.error}</p>
  ) : state.success ? (
    <p className="text-sm text-emerald-700">{state.success}</p>
  ) : null;
}

function MeetingTypeFields({ defaults }: { defaults?: string[] }) {
  const selected = new Set(parseMeetingTypes(defaults ?? ["IN_PERSON"]));
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-primary">نوع جلسه</legend>
      {(
        [
          ["IN_PERSON", "حضوری"],
          ["ONLINE", "آنلاین"],
          ["PHONE", "تلفنی"],
        ] as const
      ).map(([value, label]) => (
        <label key={value} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="meetingTypes"
            value={value}
            defaultChecked={selected.has(value)}
          />
          {label}
        </label>
      ))}
    </fieldset>
  );
}

function PolicyFields({ settingsRaw }: { settingsRaw?: unknown }) {
  const settings = parseBookingServiceSettings(settingsRaw);
  const keys = new Set(settings.duplicateKeys);
  return (
    <div className="space-y-3 rounded-xl border border-border bg-background/50 p-3">
      <p className="text-sm font-medium text-primary">قوانین رزرو</p>
      <label className="flex gap-2 text-sm">
        <input
          name="allowWaitingList"
          type="checkbox"
          defaultChecked={settings.allowWaitingList}
        />
        لیست انتظار
      </label>
      <label className="flex gap-2 text-sm">
        <input
          name="allowAdvisorSelection"
          type="checkbox"
          defaultChecked={settings.allowAdvisorSelection}
        />
        انتخاب مشاور توسط کاربر
      </label>
      <label className="flex gap-2 text-sm">
        <input
          name="showRemainingCapacity"
          type="checkbox"
          defaultChecked={settings.showRemainingCapacity}
        />
        نمایش ظرفیت باقی‌مانده
      </label>
      <label className="flex gap-2 text-sm">
        <input
          name="autoConfirm"
          type="checkbox"
          defaultChecked={settings.autoConfirm}
        />
        تأیید خودکار رزرو
      </label>
      <fieldset className="space-y-1">
        <legend className="text-xs text-muted">کلیدهای جلوگیری از رزرو تکراری</legend>
        {(
          [
            ["normalizedMobile", "موبایل"],
            ["normalizedNationalId", "کد ملی"],
            ["service", "خدمت"],
            ["advisor", "مشاور"],
            ["bookingDate", "تاریخ نوبت"],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="duplicateKeys"
              value={value}
              defaultChecked={keys.has(value)}
            />
            {label}
          </label>
        ))}
      </fieldset>
    </div>
  );
}

export function CreateBookingServiceForm() {
  const [state, action, pending] = useActionState(
    createBookingServiceAction,
    empty,
  );
  return (
    <form action={action} className="admin-card space-y-4 p-5">
      <div>
        <label>عنوان خدمت</label>
        <input
          name="title"
          required
          className={input}
          placeholder="مشاوره تحصیلی"
        />
      </div>
      <div>
        <label>نامک انگلیسی</label>
        <input
          name="slug"
          required
          dir="ltr"
          className={input}
          placeholder="academic-consultation"
        />
      </div>
      <div>
        <label>توضیحات</label>
        <textarea name="description" className={input} rows={3} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label>مدت جلسه (دقیقه)</label>
          <input
            name="durationMinutes"
            type="number"
            min="5"
            defaultValue="30"
            className={input}
          />
        </div>
        <div>
          <label>حداقل زمان رزرو (دقیقه)</label>
          <input
            name="minimumLeadTimeMinutes"
            type="number"
            min="0"
            defaultValue="60"
            className={input}
          />
        </div>
        <div>
          <label>بافر پیش از جلسه</label>
          <input
            name="bufferBeforeMinutes"
            type="number"
            min="0"
            defaultValue="0"
            className={input}
          />
        </div>
        <div>
          <label>بافر پس از جلسه</label>
          <input
            name="bufferAfterMinutes"
            type="number"
            min="0"
            defaultValue="0"
            className={input}
          />
        </div>
        <div>
          <label>حداکثر روز پیش‌رزرو</label>
          <input
            name="maximumAdvanceDays"
            type="number"
            min="1"
            defaultValue="30"
            className={input}
          />
        </div>
      </div>
      <MeetingTypeFields />
      <PolicyFields />
      <Notice state={state} />
      <button
        disabled={pending}
        className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "در حال ذخیره…" : "ساخت خدمت"}
      </button>
    </form>
  );
}

export function ServiceSettingsForm({
  service,
}: {
  service: {
    id: string;
    title: string;
    description: string | null;
    durationMinutes: number;
    bufferBeforeMinutes: number;
    bufferAfterMinutes: number;
    minimumLeadTimeMinutes: number;
    maximumAdvanceDays: number;
    isActive: boolean;
    meetingTypes: unknown;
    settings: unknown;
  };
}) {
  const [state, action, pending] = useActionState(
    updateBookingServiceAction,
    empty,
  );
  return (
    <form action={action} className="admin-card space-y-4 p-5">
      <input type="hidden" name="serviceId" value={service.id} />
      <div>
        <label>عنوان خدمت</label>
        <input
          name="title"
          required
          defaultValue={service.title}
          className={input}
        />
      </div>
      <div>
        <label>توضیحات</label>
        <textarea
          name="description"
          defaultValue={service.description ?? ""}
          className={input}
          rows={2}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {(
          [
            ["durationMinutes", "مدت جلسه", service.durationMinutes],
            [
              "minimumLeadTimeMinutes",
              "حداقل زمان رزرو",
              service.minimumLeadTimeMinutes,
            ],
            ["bufferBeforeMinutes", "بافر پیش از جلسه", service.bufferBeforeMinutes],
            ["bufferAfterMinutes", "بافر پس از جلسه", service.bufferAfterMinutes],
            [
              "maximumAdvanceDays",
              "حداکثر روز پیش‌رزرو",
              service.maximumAdvanceDays,
            ],
          ] as const
        ).map(([name, label, value]) => (
          <div key={name}>
            <label>{label}</label>
            <input
              name={name}
              type="number"
              min={name === "durationMinutes" ? 5 : 0}
              defaultValue={value}
              className={input}
            />
          </div>
        ))}
      </div>
      <MeetingTypeFields defaults={parseMeetingTypes(service.meetingTypes)} />
      <PolicyFields settingsRaw={service.settings} />
      <label className="flex gap-2 text-sm">
        <input name="isActive" type="checkbox" defaultChecked={service.isActive} />
        فعال بودن خدمت
      </label>
      <Notice state={state} />
      <button
        disabled={pending}
        className="rounded-xl bg-primary px-5 py-2 text-sm text-white"
      >
        ذخیره تنظیمات
      </button>
    </form>
  );
}

export function AdvisorRuleForms({
  serviceId,
  advisors,
}: {
  serviceId: string;
  advisors: Array<{ id: string; displayName: string }>;
}) {
  const [advisorState, advisorAction, advisorPending] = useActionState(
    createAdvisorAction,
    empty,
  );
  const [ruleState, ruleAction, rulePending] = useActionState(
    createAvailabilityRuleAction,
    empty,
  );
  const [previewState, previewAction, previewPending] = useActionState(
    previewSlotsAction,
    empty,
  );
  const [slotState, slotAction, slotPending] = useActionState(
    generateSlotsAction,
    empty,
  );
  const [from, setFrom] = useState<JalaliDate | null>(null);
  const [to, setTo] = useState<JalaliDate | null>(null);
  const [validFrom, setValidFrom] = useState<JalaliDate | null>(null);
  const [validUntil, setValidUntil] = useState<JalaliDate | null>(null);
  const formatted = (value: JalaliDate | null) =>
    value ? `${value.jy}/${value.jm}/${value.jd}` : "";

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <form action={advisorAction} className="admin-card space-y-3 p-5">
        <input type="hidden" name="serviceId" value={serviceId} />
        <h2 className="font-semibold text-primary">افزودن مشاور</h2>
        <input
          name="displayName"
          required
          className={input}
          placeholder="نام نمایشی مشاور"
        />
        <textarea
          name="description"
          className={input}
          rows={2}
          placeholder="توضیحات اختیاری"
        />
        <Notice state={advisorState} />
        <button
          disabled={advisorPending}
          className="rounded-xl border border-border px-4 py-2 text-sm"
        >
          ثبت مشاور
        </button>
      </form>

      <form action={ruleAction} className="admin-card space-y-3 p-5">
        <input type="hidden" name="serviceId" value={serviceId} />
        <input type="hidden" name="validFrom" value={formatted(validFrom)} />
        <input type="hidden" name="validUntil" value={formatted(validUntil)} />
        <h2 className="font-semibold text-primary">قاعده دسترسی</h2>
        <select name="advisorId" required className={input}>
          <option value="">انتخاب مشاور</option>
          {advisors.map((a) => (
            <option key={a.id} value={a.id}>
              {a.displayName}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <select name="weekday" defaultValue="0" className={input}>
            {[
              "شنبه",
              "یکشنبه",
              "دوشنبه",
              "سه‌شنبه",
              "چهارشنبه",
              "پنجشنبه",
              "جمعه",
            ].map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
          <input
            name="slotCapacity"
            type="number"
            min="1"
            defaultValue="1"
            className={input}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            name="startLocalTime"
            type="time"
            defaultValue="09:00"
            className={input}
          />
          <input
            name="endLocalTime"
            type="time"
            defaultValue="14:00"
            className={input}
          />
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <JalaliDatePicker
            value={validFrom}
            onChange={setValidFrom}
            label="معتبر از (اختیاری)"
          />
          <JalaliDatePicker
            value={validUntil}
            onChange={setValidUntil}
            label="معتبر تا (اختیاری)"
          />
        </div>
        <Notice state={ruleState} />
        <button
          disabled={rulePending}
          className="rounded-xl border border-border px-4 py-2 text-sm"
        >
          ثبت قاعده
        </button>
      </form>

      <div className="admin-card space-y-3 p-5 lg:col-span-2">
        <h2 className="font-semibold text-primary">تولید نوبت‌ها</h2>
        <p className="text-xs text-muted">
          حداکثر بازه امن: {toPersianDigits(MAX_SLOT_GENERATION_DAYS)} روز. ابتدا
          پیش‌نمایش بگیرید، سپس تأیید کنید.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <JalaliDatePicker value={from} onChange={setFrom} label="از تاریخ" />
          <JalaliDatePicker value={to} onChange={setTo} label="تا تاریخ" />
        </div>
        <form action={previewAction} className="flex flex-wrap gap-2">
          <input type="hidden" name="serviceId" value={serviceId} />
          <input type="hidden" name="from" value={formatted(from)} />
          <input type="hidden" name="to" value={formatted(to)} />
          <select name="advisorId" required className={`${input} max-w-xs`}>
            <option value="">انتخاب مشاور</option>
            {advisors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.displayName}
              </option>
            ))}
          </select>
          <button
            disabled={previewPending || !from || !to}
            className="rounded-xl border border-border px-4 py-2 text-sm disabled:opacity-50"
          >
            پیش‌نمایش تعداد
          </button>
        </form>
        <Notice state={previewState} />
        <form action={slotAction} className="flex flex-wrap gap-2">
          <input type="hidden" name="serviceId" value={serviceId} />
          <input type="hidden" name="from" value={formatted(from)} />
          <input type="hidden" name="to" value={formatted(to)} />
          <select name="advisorId" required className={`${input} max-w-xs`}>
            <option value="">انتخاب مشاور</option>
            {advisors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.displayName}
              </option>
            ))}
          </select>
          <button
            disabled={slotPending || !from || !to}
            className="rounded-xl bg-primary px-5 py-2 text-sm text-white disabled:opacity-50"
            onClick={(event) => {
              if (
                !window.confirm(
                  "نوبت‌ها برای بازه انتخاب‌شده تولید شوند؟",
                )
              ) {
                event.preventDefault();
              }
            }}
          >
            تأیید و تولید نوبت‌ها
          </button>
        </form>
        <Notice state={slotState} />
      </div>
    </div>
  );
}

"use client";

import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";
import type { RegistrationFlowPublicView } from "@/lib/registration/flow-config-shared";

type RegistrationStatusBannersProps = {
  flow: RegistrationFlowPublicView;
};

export function RegistrationStatusBanners({
  flow,
}: RegistrationStatusBannersProps) {
  if (!flow.window.open) {
    if (flow.window.reason === "not_started") {
      const startsAt = flow.registrationStartsAt
        ? formatJalaliDateTimeShort(new Date(flow.registrationStartsAt))
        : null;
      return (
        <div
          className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm leading-7 text-sky-950"
          role="status"
        >
          <p className="font-semibold">ثبت‌نام هنوز آغاز نشده است.</p>
          {startsAt ? (
            <p className="mt-1">ثبت‌نام از {startsAt} آغاز می‌شود.</p>
          ) : null}
        </div>
      );
    }
    if (flow.window.reason === "ended") {
      return (
        <div
          className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-7 text-rose-950"
          role="status"
        >
          <p className="font-semibold">مهلت ثبت‌نام به پایان رسیده است.</p>
        </div>
      );
    }
    return (
      <div
        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-800"
        role="status"
      >
        ثبت‌نام در حال حاضر غیرفعال است.
      </div>
    );
  }

  if (
    flow.showRemainingCapacity &&
    flow.capacity != null &&
    flow.remainingCapacity != null
  ) {
    if (flow.remainingCapacity <= 0) {
      return (
        <div
          className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-900"
          role="status"
        >
          ظرفیت تکمیل شده است.
        </div>
      );
    }
    if (flow.remainingCapacity <= 10) {
      return (
        <div
          className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-950"
          role="status"
        >
          <span aria-hidden="true">🔥 </span>
          فقط {toPersianDigits(flow.remainingCapacity)} ظرفیت باقی مانده
        </div>
      );
    }
  }

  return null;
}

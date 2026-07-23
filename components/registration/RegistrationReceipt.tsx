"use client";

import Link from "next/link";
import { RegistrationStatus } from "@/generated/prisma/enums";
import { formatRegistrationDate, formatRials } from "@/lib/registration/format";
import type { RegistrationPublicView } from "@/lib/registration/types";
import { REGISTRATION_STATUS_LABELS } from "@/lib/registration/types";
import { toPersianDigits } from "@/lib/persian";

type RegistrationReceiptProps = {
  registration: RegistrationPublicView;
  paymentMessage?: string | null;
};

export function RegistrationReceipt({
  registration,
  paymentMessage,
}: RegistrationReceiptProps) {
  return (
    <article className="registration-receipt rounded-3xl border border-border bg-surface p-5 shadow-[0_12px_40px_rgb(15_23_42_/_0.06)] sm:p-8">
      <div className="rounded-2xl bg-gradient-to-l from-primary/10 to-secondary/10 px-5 py-6 text-center">
        <p className="text-xs font-medium text-secondary">رسید ثبت‌نام</p>
        <h1 className="mt-2 text-xl font-bold text-primary sm:text-2xl">
          {registration.status === RegistrationStatus.COMPLETED ||
          registration.status === RegistrationStatus.PAID
            ? "ثبت‌نام تکمیل شد"
            : "ثبت‌نام ایجاد شد"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          شماره ثبت‌نام:{" "}
          <strong className="text-primary" dir="ltr">
            {toPersianDigits(registration.registrationNumber)}
          </strong>
        </p>
      </div>

      {paymentMessage ? (
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-950">
          {paymentMessage}
        </p>
      ) : null}

      <dl className="mt-6 grid gap-3 sm:grid-cols-2">
        <ReceiptRow
          label="وضعیت"
          value={REGISTRATION_STATUS_LABELS[registration.status]}
        />
        <ReceiptRow label="نام دانش‌آموز" value={registration.studentFullName} />
        <ReceiptRow label="آزمون" value={registration.productTitle} />
        <ReceiptRow label="نوبت" value={registration.sessionTitle ?? "—"} />
        <ReceiptRow label="بسته" value={registration.packageTitle ?? "—"} />
        <ReceiptRow label="شعبه" value={registration.venueBranchTitle ?? "—"} />
        <ReceiptRow
          label="مبلغ"
          value={formatRials(registration.finalAmountRials)}
        />
        <ReceiptRow
          label="تاریخ"
          value={formatRegistrationDate(registration.createdAt)}
        />
        <ReceiptRow
          label="کد پیگیری پرداخت"
          value={
            registration.trackingCode
              ? toPersianDigits(registration.trackingCode)
              : "پس از اتصال درگاه تکمیل می‌شود"
          }
        />
      </dl>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-white"
        >
          چاپ
        </button>
        <button
          type="button"
          disabled
          title="به‌زودی"
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-border bg-white px-5 text-sm font-medium text-muted opacity-70"
        >
          دانلود PDF
        </button>
        <Link
          href="/"
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-border bg-white px-5 text-sm font-medium text-foreground"
        >
          بازگشت به صفحه اصلی
        </Link>
        <Link
          href="/portal"
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-secondary/30 bg-secondary/10 px-5 text-sm font-medium text-primary"
        >
          پرتال دانش‌آموز
        </Link>
      </div>
    </article>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-white px-4 py-3">
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}

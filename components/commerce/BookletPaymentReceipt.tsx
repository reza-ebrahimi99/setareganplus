import Image from "next/image";
import { Timeline } from "@/components/admin/Timeline";
import { CommerceQrImg } from "@/components/commerce/CommerceQrImg";
import { BookletReceiptActions } from "@/components/commerce/BookletReceiptActions";
import { buildOpsTimelineNodes } from "@/lib/commerce/orders/timeline-view";
import type { BookletReceiptView } from "@/lib/commerce/orders/receipt";
import { toPersianDigits } from "@/lib/persian";

const SETAREGAN_LOGO_SRC = "/images/brand/logo.png";

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="booklet-receipt-card rounded-2xl border border-white/70 bg-white/80 p-4 shadow-[0_8px_30px_rgb(15_23_42_/_0.06)] backdrop-blur-md sm:p-5">
      <h2 className="text-sm font-semibold text-primary">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Row({
  label,
  value,
  ltr,
}: {
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 py-2.5 last:border-b-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-left text-sm font-medium text-foreground" dir={ltr ? "ltr" : undefined}>
        {value}
      </dd>
    </div>
  );
}

export function BookletPaymentReceipt({
  receipt,
  statusHref,
}: {
  receipt: BookletReceiptView;
  statusHref: string;
}) {
  const timeline = buildOpsTimelineNodes({
    current: receipt.opsStage,
    events: [],
  });

  return (
    <article
      id="booklet-receipt"
      className="booklet-receipt mx-auto max-w-2xl overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/70 shadow-[0_20px_60px_rgb(15_23_42_/_0.1)] backdrop-blur-xl"
    >
      <header className="relative overflow-hidden bg-gradient-to-br from-emerald-700 via-primary to-[#1e3a5f] px-6 py-10 text-center text-white sm:px-8 sm:py-12">
        <div className="mx-auto mb-5 flex size-20 items-center justify-center rounded-full bg-white/15 text-4xl shadow-[0_0_0_8px_rgb(255_255_255_/_0.08)]">
          ✓
        </div>
        <h1 className="text-2xl font-bold leading-snug sm:text-3xl">پرداخت با موفقیت انجام شد</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-8 text-white/90">
          پس از آماده شدن جزوه، پیامک اطلاع‌رسانی برای شما ارسال خواهد شد.
        </p>
      </header>

      <div className="space-y-4 px-4 py-5 sm:px-6 sm:py-6">
        <div className="hidden justify-center print:flex">
          <Image src={SETAREGAN_LOGO_SRC} alt="ستارگان پلاس" width={160} height={54} className="h-12 w-auto" />
        </div>

        <Card title="اطلاعات دانش‌آموز">
          <dl>
            <Row label="نام و نام خانوادگی" value={receipt.studentName} />
            <Row label="نام پدر" value={receipt.parentName ?? "—"} />
            <Row
              label="شماره موبایل"
              value={receipt.mobile ? toPersianDigits(receipt.mobile) : "—"}
              ltr
            />
            {receipt.nationalCode ? (
              <Row label="کد ملی" value={toPersianDigits(receipt.nationalCode)} ltr />
            ) : null}
            <Row label="پایه تحصیلی" value={receipt.gradeLabel ?? "—"} />
            {receipt.majorLabel ? <Row label="رشته" value={receipt.majorLabel} /> : null}
          </dl>
        </Card>

        <Card title="اطلاعات سفارش">
          <dl>
            <Row label="شماره سفارش" value={toPersianDigits(receipt.orderNumber)} ltr />
            <Row
              label="کد پیگیری پرداخت"
              value={receipt.trackingCode ? toPersianDigits(receipt.trackingCode) : "—"}
              ltr
            />
            <Row label="مبلغ" value={receipt.amountLabel} />
            <Row label="تاریخ" value={receipt.dateLabel} />
            <Row label="ساعت" value={receipt.timeLabel} />
            <Row label="روش پرداخت" value={receipt.paymentMethodLabel} />
            <Row label="وضعیت سفارش" value={receipt.orderStatusLabel} />
          </dl>
        </Card>

        <Card title="جزوه">
          <ul className="space-y-3">
            {receipt.lines.map((line) => (
              <li key={`${line.title}-${line.quantity}`} className="rounded-xl bg-background/80 px-3 py-3">
                <p className="font-medium text-foreground">{line.title}</p>
                <p className="mt-1 text-xs text-muted">
                  {line.instructor ? `مدرس: ${line.instructor}` : "مدرس: —"}
                  {receipt.gradeLabel ? ` · پایه ${receipt.gradeLabel}` : ""}
                  {receipt.majorLabel ? ` · ${receipt.majorLabel}` : ""}
                  {` · تعداد ${toPersianDigits(line.quantity)}`}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="محل دریافت">
          {receipt.pickupBranch ? (
            <div className="flex items-start gap-3">
              <span
                className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-2xl text-white"
                style={{ backgroundColor: receipt.pickupBranch.accentColor }}
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z" />
                  <circle cx="12" cy="10" r="2.2" />
                </svg>
              </span>
              <div>
                <p className="font-semibold text-foreground">{receipt.pickupBranch.name}</p>
                {receipt.pickupBranch.address ? (
                  <p className="mt-1 text-sm leading-7 text-muted">{receipt.pickupBranch.address}</p>
                ) : null}
                <p className="mt-2 text-sm text-muted">ساعات کاری: {receipt.hours}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">محل دریافت هنوز مشخص نشده است.</p>
          )}
        </Card>

        <Card title="مسیر سفارش">
          <div id="pipeline">
            <Timeline nodes={timeline} />
          </div>
        </Card>

        <section
          className={`rounded-2xl border px-4 py-4 sm:px-5 ${
            receipt.eta.ready
              ? "border-emerald-200 bg-emerald-50 text-emerald-950"
              : "border-amber-200 bg-amber-50 text-amber-950"
          }`}
        >
          <p className="text-xs font-medium opacity-80">{receipt.eta.heading}</p>
          <p className="mt-1 text-lg font-bold">{receipt.eta.text}</p>
        </section>

        <section className="booklet-receipt-qr rounded-2xl border border-primary/15 bg-white px-4 py-6 text-center">
          <p className="text-sm font-semibold text-primary">کد دریافت حضوری</p>
          <CommerceQrImg
            src={receipt.qrDataUrl}
            alt="کد QR دریافت جزوه"
            size={280}
            className="mx-auto mt-4"
          />
          <p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-muted">
            {receipt.instructions}
          </p>
          <p className="mt-2 font-mono text-base font-bold text-primary" dir="ltr">
            {toPersianDigits(receipt.orderNumber)}
          </p>
        </section>

        <BookletReceiptActions
          orderNumber={receipt.orderNumber}
          statusHref={`${statusHref}#pipeline`}
          qrHref={receipt.qrImagePath}
        />

        <footer className="border-t border-border/70 pt-4 text-center text-xs leading-6 text-muted">
          <p>ستارگان پلاس</p>
          <p>Booklet Operations Center</p>
          <p>تاریخ صدور: {receipt.generatedAtLabel}</p>
        </footer>
      </div>
    </article>
  );
}

import Link from "next/link";
import { Timeline } from "@/components/admin/Timeline";
import { CommerceQrImg } from "@/components/commerce/CommerceQrImg";
import { buildOpsTimelineNodes } from "@/lib/commerce/orders/timeline-view";
import type { PublicOrderTracking } from "@/lib/commerce/orders/public-ticket";
import { toPersianDigits } from "@/lib/persian";

function StatusPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "neutral" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200"
        : "border-border bg-background text-foreground dark:border-white/10 dark:bg-white/5 dark:text-slate-100";
  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <p className="text-xs opacity-70">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-[0_8px_30px_rgb(15_23_42_/_0.06)] backdrop-blur-md dark:border-white/10 dark:bg-slate-900/70 dark:shadow-none sm:p-5">
      <h2 className="text-sm font-semibold text-primary dark:text-slate-100">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function OrderTrackingPage({ tracking }: { tracking: PublicOrderTracking }) {
  const timeline = buildOpsTimelineNodes({
    current: tracking.opsStage,
    events: tracking.events,
  });

  return (
    <article className="mx-auto max-w-2xl space-y-4">
      <header
        className={`overflow-hidden rounded-[1.75rem] px-6 py-8 text-center text-white shadow-[0_20px_60px_rgb(15_23_42_/_0.12)] sm:px-8 ${
          tracking.delivered
            ? "bg-gradient-to-br from-emerald-700 via-emerald-600 to-primary"
            : "bg-gradient-to-br from-primary via-primary to-[#1e3a5f]"
        }`}
      >
        <p className="text-xs font-medium text-white/80">پیگیری سفارش</p>
        <p className="mt-2 font-mono text-lg font-bold" dir="ltr">
          {toPersianDigits(tracking.orderNumber)}
        </p>
        <h1 className="mt-3 text-xl font-bold leading-snug sm:text-2xl">
          {tracking.statusLabel}
        </h1>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatusPill
          label="وضعیت پرداخت"
          value={tracking.paymentStatusLabel}
          tone={tracking.paymentPaid ? "success" : "warning"}
        />
        <StatusPill label="وضعیت سفارش" value={tracking.statusLabel} tone="neutral" />
        <StatusPill
          label="وضعیت ارسال"
          value={tracking.shippingStatusLabel}
          tone={tracking.delivered ? "success" : "neutral"}
        />
      </div>

      <Card title="محصولات">
        <ul className="divide-y divide-border dark:divide-white/10">
          {tracking.invoice.lines.map((line) => (
            <li
              key={line.title}
              className="flex items-start justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0"
            >
              <div>
                <p className="font-medium text-foreground dark:text-slate-100">{line.title}</p>
                <p className="text-xs text-muted dark:text-slate-400">
                  تعداد {line.quantityLabel} · {line.unitPriceLabel}
                </p>
              </div>
              <p className="whitespace-nowrap font-medium text-foreground dark:text-slate-100">
                {line.totalLabel}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="فاکتور">
        <dl className="space-y-2 text-sm">
          <InvoiceRow label="جمع اقلام" value={tracking.invoice.subtotalLabel} />
          <InvoiceRow label="تخفیف" value={tracking.invoice.discountLabel} />
          <InvoiceRow label="مالیات" value={tracking.invoice.taxLabel} />
          <InvoiceRow label="هزینه ارسال" value={tracking.invoice.shippingLabel} />
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-base font-bold text-primary dark:border-white/10 dark:text-white">
            <dt>مبلغ نهایی</dt>
            <dd>{tracking.invoice.grandTotalLabel}</dd>
          </div>
        </dl>
      </Card>

      {tracking.pickupBranch ? (
        <Card title="محل دریافت">
          <div className="flex items-start gap-3">
            <span
              className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-2xl text-white"
              style={{ backgroundColor: tracking.pickupBranch.accentColor }}
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z" />
                <circle cx="12" cy="10" r="2.2" />
              </svg>
            </span>
            <div>
              <p className="font-semibold text-foreground dark:text-slate-100">
                {tracking.pickupBranch.name}
              </p>
              {tracking.pickupBranch.address ? (
                <p className="mt-1 text-sm leading-7 text-muted dark:text-slate-400">
                  {tracking.pickupBranch.address}
                </p>
              ) : null}
            </div>
          </div>
        </Card>
      ) : null}

      <Card title="مسیر سفارش">
        <div id="pipeline">
          <Timeline nodes={timeline} />
        </div>
      </Card>

      <Card title="کد پیگیری">
        <div className="flex flex-col items-center gap-3 text-center">
          <CommerceQrImg
            src={tracking.trackingQrDataUrl}
            alt="QR پیگیری سفارش"
            size={220}
            className="mx-auto"
          />
          <p className="text-xs leading-6 text-muted dark:text-slate-400">
            این QR همیشه به همین صفحه پیگیری منتهی می‌شود.
          </p>
          <p className="break-all font-mono text-xs text-muted dark:text-slate-400" dir="ltr">
            {tracking.shortUrl}
          </p>
        </div>
      </Card>

      <div className="grid gap-2 sm:grid-cols-2">
        <Link
          href="/contact"
          className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-semibold text-white hover:bg-primary/92 dark:bg-white/10 dark:hover:bg-white/15"
        >
          پشتیبانی و تماس
        </Link>
        <Link
          href="/"
          className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-border bg-background px-5 text-sm font-medium text-muted dark:border-white/10 dark:bg-transparent dark:text-slate-300"
        >
          بازگشت به صفحه اصلی
        </Link>
      </div>
    </article>
  );
}

function InvoiceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-muted dark:text-slate-400">
      <dt>{label}</dt>
      <dd className="text-foreground dark:text-slate-200">{value}</dd>
    </div>
  );
}
